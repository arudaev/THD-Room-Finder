import XCTest
@testable import THDRoomFinder

final class RoomPresentationFormatterTests: XCTestCase {
    private let formatter = RoomPresentationFormatter.shared

    func testRepresentativeNamesNormalizeToStudentFacingLabels() {
        let cases: [(String, String, RoomVisibilityClass)] = [
            ("A008 - Labor", "A008", .teachingRoom),
            ("ITC 2+ 1.31 (Labor Cyber Resilience)", "ITC 2+ 1.31", .teachingRoom),
            ("EC.B 1.06 a (Hörsaal)", "EC.B 1.06 a", .teachingRoom),
            ("LA 27-2.13 Seminar-/EDV-Raum", "LA 27-2.13", .teachingRoom),
            ("Deggs 2.06 (HPC Labor)", "Deggs 2.06", .teachingRoom),
            ("Vorplatz Geb. A", "Vorplatz Geb. A", .excludeDefault),
            ("Turnhalle Schulzentrum", "Turnhalle Schulzentrum", .excludeDefault),
            ("Kulturraum (nur bis 31.03.25!)", "Kulturraum", .secondaryVenue),
            ("Konferenzsaal (= 0.02 + 0.03 + 0.04)", "Konferenzsaal", .secondaryVenue),
            ("--", "--", .excludeDefault),
            ("50.2.19", "50.2.19", .excludeDefault),
        ]

        for (rawName, expectedPrimary, expectedVisibility) in cases {
            let presentation = formatter.present(
                Room(
                    id: 1,
                    ident: "r000000126",
                    name: rawName,
                    building: "",
                    floor: nil,
                    displayName: rawName,
                    seatsRegular: 0,
                    seatsExam: 0,
                    facilities: [],
                    bookable: false,
                    inChargeName: nil,
                    inChargeEmail: nil,
                    untisLongname: nil
                )
            )

            XCTAssertEqual(presentation.primaryLabel, expectedPrimary)
            XCTAssertEqual(presentation.location.visibilityClass, expectedVisibility)
        }
    }

    func testExceptionBuildingLabelsUseCapturedBuildingCode() {
        let presentation = formatter.present(
            Room(
                id: 1,
                ident: "r000000126",
                name: "Vorplatz Geb. A",
                building: "",
                floor: nil,
                displayName: "Vorplatz Geb. A",
                seatsRegular: 0,
                seatsExam: 0,
                facilities: [],
                bookable: false,
                inChargeName: nil,
                inChargeEmail: nil,
                untisLongname: nil
            )
        )

        XCTAssertEqual(presentation.location.building, "A")
        XCTAssertEqual(presentation.location.groupLabel, "A")
    }

    func testMeaningfulTitleSuppressesUnknownAndDuplicates() {
        let duplicate = ScheduledEvent(
            id: 1,
            roomIdent: "A008",
            roomName: "A008",
            startDateTime: Date(),
            endDateTime: Date().addingTimeInterval(3600),
            durationMinutes: 60,
            eventType: "Vorlesung",
            title: "Vorlesung"
        )
        XCTAssertNil(formatter.meaningfulTitle(for: duplicate))

        let useful = ScheduledEvent(
            id: 2,
            roomIdent: "A008",
            roomName: "A008",
            startDateTime: Date(),
            endDateTime: Date().addingTimeInterval(3600),
            durationMinutes: 60,
            eventType: "Vorlesung",
            title: "Mathematik I"
        )
        XCTAssertEqual(formatter.meaningfulTitle(for: useful), "Mathematik I")
    }
}
