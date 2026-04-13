import XCTest
@testable import THDRoomFinder

final class RoomPriorityPolicyTests: XCTestCase {
    func testLabsOnMainCampusArePriority() {
        let room = Room(
            id: 1,
            ident: "A008",
            name: "A008 - Labor",
            building: "A",
            floor: 0,
            displayName: "Labor",
            seatsRegular: 40,
            seatsExam: 20,
            facilities: [],
            bookable: true,
            inChargeName: nil,
            inChargeEmail: nil,
            untisLongname: nil
        )

        XCTAssertTrue(RoomPriorityPolicy.isPriority(room))
    }

    func testMeetingRoomsStayInLowerBucket() {
        let room = Room(
            id: 2,
            ident: "A215",
            name: "A215 - Besprechungsraum",
            building: "A",
            floor: 2,
            displayName: "Besprechungsraum",
            seatsRegular: 12,
            seatsExam: 8,
            facilities: [],
            bookable: true,
            inChargeName: nil,
            inChargeEmail: nil,
            untisLongname: nil
        )

        XCTAssertFalse(RoomPriorityPolicy.isPriority(room))
    }
}
