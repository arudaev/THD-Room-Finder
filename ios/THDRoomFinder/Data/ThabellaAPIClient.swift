import Foundation

struct ThabellaAPIClient {
    private let baseURL = URL(string: "https://thabella.th-deg.de/thabella/opn/")!
    private let session: URLSession

    init(session: URLSession = .shared) {
        self.session = session
    }

    func fetchRooms() async throws -> [Room] {
        let requestURL = baseURL.appending(path: "room/findRooms")
        let response: [RoomDTO] = try await post(
            url: requestURL,
            requestBody: EmptyRequestBody()
        )
        return response.map { $0.toDomainModel() }
    }

    func fetchScheduledEvents(at date: Date) async throws -> [ScheduledEvent] {
        let formattedDate = Self.remoteDateFormatter.string(from: date)
        let requestURL = baseURL.appending(path: "period/findByDate/\(formattedDate)")
        let response: [PeriodDTO] = try await post(
            url: requestURL,
            requestBody: FindByDateRequestBody(sqlDate: formattedDate)
        )

        return response.flatMap { $0.toDomainModels() }.sorted { $0.startDateTime < $1.startDateTime }
    }

    private static let encoder = JSONEncoder()
    private static let decoder = JSONDecoder()

    private func post<Response: Decodable, RequestBody: Encodable>(
        url: URL,
        requestBody: RequestBody
    ) async throws -> Response {
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try Self.encoder.encode(requestBody)

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              (200 ..< 300).contains(httpResponse.statusCode) else {
            throw URLError(.badServerResponse)
        }

        return try Self.decoder.decode(Response.self, from: data)
    }

    private static let remoteDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = .current
        formatter.dateFormat = "yyyy-MM-dd HH:mm"
        return formatter
    }()
}

private struct EmptyRequestBody: Encodable {}

private struct FindByDateRequestBody: Encodable {
    let sqlDate: String
}

private struct RoomDTO: Decodable {
    let id: Int
    let ident: String
    let name: String
    let seatsRegular: Int?
    let seatsExam: Int?
    let facilities: String?
    let untisLongname: String?
    let bookable: Bool?
    let inCharge: InChargeDTO?

    func toDomainModel() -> Room {
        Room(
            id: id,
            ident: ident,
            name: name,
            building: parseBuilding(name),
            floor: parseFloor(name),
            displayName: parseDisplayName(name),
            seatsRegular: seatsRegular ?? 0,
            seatsExam: seatsExam ?? 0,
            facilities: parseFacilities(facilities),
            bookable: bookable ?? false,
            inChargeName: [inCharge?.firstname, inCharge?.lastname]
                .compactMap { $0?.nilIfBlank }
                .joined(separator: " ")
                .nilIfBlank,
            inChargeEmail: inCharge?.email?.nilIfBlank,
            untisLongname: untisLongname?.nilIfBlank
        )
    }

    private func parseBuilding(_ name: String) -> String {
        let roomCode = name.components(separatedBy: " - ").first?.trimmingCharacters(in: .whitespacesAndNewlines) ?? name
        let firstPart = roomCode.components(separatedBy: " ").first ?? roomCode
        let letters = String(firstPart.prefix { $0.isLetter })
        return letters.isEmpty ? firstPart : letters
    }

    private func parseFloor(_ name: String) -> Int? {
        let roomCode = name.components(separatedBy: " - ").first?.trimmingCharacters(in: .whitespacesAndNewlines) ?? name
        let digits = roomCode.filter(\.isNumber)
        return digits.first.flatMap { Int(String($0)) }
    }

    private func parseDisplayName(_ name: String) -> String {
        let parts = name.components(separatedBy: " - ")
        return parts.count > 1 ? parts[1].trimmingCharacters(in: .whitespacesAndNewlines) : name.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func parseFacilities(_ facilities: String?) -> [String] {
        guard let facilities, !facilities.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return []
        }

        return facilities
            .components(separatedBy: ",")
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
    }
}

private struct InChargeDTO: Decodable {
    let firstname: String?
    let lastname: String?
    let email: String?
}

private struct PeriodDTO: Decodable {
    let id: Int
    let startDateTime: String
    let roomIdent: [String: String]
    let duration: Int
    let eventTypeDescription: String?
    let titleText: String?

    enum CodingKeys: String, CodingKey {
        case id
        case startDateTime
        case roomIdent = "room_ident"
        case duration
        case eventTypeDescription
        case titleText
    }

    func toDomainModels() -> [ScheduledEvent] {
        guard let start = ThabellaAPIClient.dateFormatter.date(from: startDateTime) else {
            return []
        }

        let end = start.addingTimeInterval(TimeInterval(duration * 60))
        return roomIdent.map { ident, roomName in
            ScheduledEvent(
                id: id,
                roomIdent: ident,
                roomName: roomName,
                startDateTime: start,
                endDateTime: end,
                durationMinutes: duration,
                eventType: eventTypeDescription ?? "Unknown",
                title: titleText ?? eventTypeDescription ?? "Unknown"
            )
        }
    }
}

private extension String {
    var nilIfBlank: String? {
        let trimmed = trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }
}

private extension ThabellaAPIClient {
    static var dateFormatter: DateFormatter {
        remoteDateFormatter
    }
}
