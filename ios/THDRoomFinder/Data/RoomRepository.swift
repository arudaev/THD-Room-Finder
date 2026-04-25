import Foundation

protocol RoomRepositoryProviding: AnyObject {
    func allRooms() async throws -> [Room]
    func room(id: Int) async throws -> Room
    func scheduledEvents(at date: Date) async throws -> [ScheduledEvent]
    func freeRooms(at date: Date) async throws -> [FreeRoom]
    func roomSchedule(for roomIdent: String, at date: Date) async throws -> [ScheduledEvent]
    func cachedRoomsForShortcuts() async -> [Room]
}

actor RoomRepository: RoomRepositoryProviding {
    static let shared = RoomRepository()

    private enum CacheKey {
        static let rooms = "rooms"
        static let eventsPrefix = "events_"
    }

    private static let roomsTTL: TimeInterval = 24 * 60 * 60
    private static let eventsTTL: TimeInterval = 5 * 60

    private let apiClient: ThabellaAPIClient
    private let cacheStore: RoomCacheStore
    private let roomCacheTTL: TimeInterval = Self.roomsTTL
    private let eventsCacheTTL: TimeInterval = Self.eventsTTL
    private var inMemoryRooms: [Room]?

    init(
        apiClient: ThabellaAPIClient = ThabellaAPIClient(),
        cacheStore: RoomCacheStore = RoomCacheStore()
    ) {
        self.apiClient = apiClient
        self.cacheStore = cacheStore
    }

    func allRooms() async throws -> [Room] {
        if let lastUpdated = try await cacheStore.metadata(for: CacheKey.rooms),
           isFresh(lastUpdated, ttl: roomCacheTTL) {
            if let rooms = inMemoryRooms, !rooms.isEmpty { return rooms }
            let cachedRooms = try await cacheStore.loadRooms()
            if !cachedRooms.isEmpty {
                inMemoryRooms = cachedRooms
                return cachedRooms
            }
        }

        do {
            let rooms = try await apiClient.fetchRooms()
            inMemoryRooms = rooms
            try await cacheStore.saveRooms(rooms)
            try await cacheStore.setMetadata(Date(), for: CacheKey.rooms)
            return rooms
        } catch {
            let cachedRooms = try await cacheStore.loadRooms()
            if !cachedRooms.isEmpty {
                inMemoryRooms = cachedRooms
                return cachedRooms
            }
            throw error
        }
    }

    func room(id: Int) async throws -> Room {
        if let cachedRoom = inMemoryRooms?.first(where: { $0.id == id }) {
            return cachedRoom
        }

        let rooms = try await allRooms()
        guard let room = rooms.first(where: { $0.id == id }) else {
            throw RepositoryError.roomNotFound(id)
        }
        return room
    }

    func scheduledEvents(at date: Date) async throws -> [ScheduledEvent] {
        let dateKey = Self.eventDateFormatter.string(from: date)
        let cacheKey = CacheKey.eventsPrefix + dateKey

        if let lastUpdated = try await cacheStore.metadata(for: cacheKey),
           isFresh(lastUpdated, ttl: eventsCacheTTL) {
            return try await cacheStore.loadEvents(for: cacheKey)
        }

        do {
            let events = try await apiClient.fetchScheduledEvents(at: date)
            try await cacheStore.saveEvents(events, for: cacheKey)
            try await cacheStore.setMetadata(Date(), for: cacheKey)
            return events
        } catch {
            let cachedEvents = try await cacheStore.loadEvents(for: cacheKey)
            if !cachedEvents.isEmpty {
                return cachedEvents
            }
            throw error
        }
    }

    func freeRooms(at date: Date) async throws -> [FreeRoom] {
        let rooms = try await allRooms()
        let events = (try? await scheduledEvents(at: date)) ?? []
        let occupiedIdents = Set(
            events
                .filter { $0.startDateTime <= date && $0.endDateTime > date }
                .map(\.roomIdent)
        )
        let futureEventsByRoom = Dictionary(
            grouping: events.filter { $0.startDateTime > date },
            by: \.roomIdent
        )

        return rooms
            .filter { !occupiedIdents.contains($0.ident) }
            .map { room in
                let nextEvent = futureEventsByRoom[room.ident]?.min(by: { $0.startDateTime < $1.startDateTime })
                return FreeRoom(room: room, freeUntil: nextEvent?.startDateTime)
            }
            .sorted(by: Self.freeRoomComparator)
    }

    func roomSchedule(for roomIdent: String, at date: Date) async throws -> [ScheduledEvent] {
        try await scheduledEvents(at: date)
            .filter { $0.roomIdent == roomIdent }
            .sorted { $0.startDateTime < $1.startDateTime }
    }

    func cachedRoomsForShortcuts() async -> [Room] {
        if let inMemoryRooms, !inMemoryRooms.isEmpty {
            return inMemoryRooms
        }

        return (try? await cacheStore.loadRooms()) ?? []
    }

    private func isFresh(_ timestamp: Date, ttl: TimeInterval) -> Bool {
        Date().timeIntervalSince(timestamp) < ttl
    }

    private static func freeRoomComparator(lhs: FreeRoom, rhs: FreeRoom) -> Bool {
        let lhsPriority = RoomPriorityPolicy.isPriority(lhs.room)
        let rhsPriority = RoomPriorityPolicy.isPriority(rhs.room)
        if lhsPriority != rhsPriority {
            return lhsPriority && !rhsPriority
        }

        let lhsHasEnd = lhs.freeUntil != nil
        let rhsHasEnd = rhs.freeUntil != nil
        if lhsHasEnd != rhsHasEnd {
            return !lhsHasEnd && rhsHasEnd
        }

        if lhs.freeUntil != rhs.freeUntil {
            return (lhs.freeUntil ?? .distantPast) > (rhs.freeUntil ?? .distantPast)
        }

        if lhs.room.building != rhs.room.building {
            return lhs.room.building < rhs.room.building
        }

        return lhs.room.name < rhs.room.name
    }

    private static let eventDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = .current
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()
}

extension RoomRepository {
    enum RepositoryError: LocalizedError {
        case roomNotFound(Int)

        var errorDescription: String? {
            switch self {
            case .roomNotFound(let id):
                return "Room not found: \(id)"
            }
        }
    }
}

actor RoomCacheStore {
    private let fileManager: FileManager
    private let baseURL: URL
    private let roomsURL: URL
    private let metadataURL: URL
    private let encoder: JSONEncoder
    private let decoder: JSONDecoder

    init(fileManager: FileManager = .default) {
        self.fileManager = fileManager

        let appSupportURL = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first ??
            fileManager.temporaryDirectory
        baseURL = appSupportURL.appending(path: "THDRoomFinderCache", directoryHint: .isDirectory)
        roomsURL = baseURL.appending(path: "rooms.json")
        metadataURL = baseURL.appending(path: "cache_metadata.json")

        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        encoder.dateEncodingStrategy = .iso8601
        self.encoder = encoder

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        self.decoder = decoder

        if !fileManager.fileExists(atPath: baseURL.path()) {
            try? fileManager.createDirectory(
                at: baseURL,
                withIntermediateDirectories: true,
                attributes: nil
            )
        }
    }

    func loadRooms() throws -> [Room] {
        guard fileManager.fileExists(atPath: roomsURL.path()) else {
            return []
        }
        return try decode([Room].self, from: roomsURL)
    }

    func saveRooms(_ rooms: [Room]) throws {
        try encode(rooms, to: roomsURL)
    }

    func loadEvents(for cacheKey: String) throws -> [ScheduledEvent] {
        let url = eventsURL(for: cacheKey)
        guard fileManager.fileExists(atPath: url.path()) else {
            return []
        }
        return try decode([ScheduledEvent].self, from: url)
    }

    func saveEvents(_ events: [ScheduledEvent], for cacheKey: String) throws {
        try encode(events, to: eventsURL(for: cacheKey))
    }

    func metadata(for key: String) throws -> Date? {
        try loadMetadata()[key]
    }

    func setMetadata(_ date: Date, for key: String) throws {
        var metadata = try loadMetadata()
        metadata[key] = date
        try encode(metadata, to: metadataURL)
    }

    private func loadMetadata() throws -> [String: Date] {
        guard fileManager.fileExists(atPath: metadataURL.path()) else {
            return [:]
        }
        return try decode([String: Date].self, from: metadataURL)
    }

    private func eventsURL(for cacheKey: String) -> URL {
        baseURL.appending(path: "\(cacheKey).json")
    }

    private func encode<Value: Encodable>(_ value: Value, to url: URL) throws {
        let data = try encoder.encode(value)
        try data.write(to: url, options: .atomic)
    }

    private func decode<Value: Decodable>(_ type: Value.Type, from url: URL) throws -> Value {
        let data = try Data(contentsOf: url)
        return try decoder.decode(type, from: data)
    }
}
