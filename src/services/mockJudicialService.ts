export interface MockCNRDetails {
  cnrNumber: string;
  court: string;
  courtCode: string;
  caseType: string;
  caseNumber: string;
  caseYear: number;
  benchLocation: "Allahabad" | "Lucknow";
  courtRoomNo: string;
  coramBench: string;
  leadPetitioner: string;
  respondentString: string;
  petitionerAdvocate: string;
  stateCounsel: string;
  ndoh: Date;
  stage: string;
}

export interface MockCauseListFeedItem {
  court: string;
  bench: "Allahabad" | "Lucknow";
  causeListDate: string;
  courtHall: string;
  itemNo: string;
  caseType: string;
  caseNo: string;
  caseYear: number;
  cnrNumber: string;
  parties: string;
  petitionerCounsel: string;
  respondentCounsel: string;
  matchedKeyword: string;
  matchScore: number;
  status: "UNCLAIMED" | "ACCEPTED" | "IGNORED";
}

export class MockJudicialService {
  /**
   * Simulates High Court CIS / NAPIX verify endpoint
   */
  static async verifyCNR(cnrNumber: string): Promise<MockCNRDetails> {
    const cnr = cnrNumber.toUpperCase().trim();
    const isLucknow =
      cnr.includes("LKO") || cnr.startsWith("UPLC") || cnr.endsWith("2");
    const currentYear = new Date().getFullYear();

    // Default next hearing date 10 days in future
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);

    return {
      cnrNumber: cnr,
      court: isLucknow
        ? "High Court Allahabad (Lucknow Bench)"
        : "High Court of Judicature at Allahabad",
      courtCode: isLucknow ? "HC-LKO" : "HC-ALD",
      caseType: "WRIT-A",
      caseNumber: Math.floor(1000 + Math.random() * 9000).toString(),
      caseYear: currentYear,
      benchLocation: isLucknow ? "Lucknow" : "Allahabad",
      courtRoomNo: `Court No. ${Math.floor(1 + Math.random() * 35)}`,
      coramBench: isLucknow
        ? "Hon'ble Justice Vivek Chaudhary & Hon'ble Justice Manish Kumar"
        : "Hon'ble Justice Saurabh Shyam Shamshery",
      leadPetitioner: "Abhay Gupta & Ors.",
      respondentString: "State of U.P. thru ACS Home & Chairman UPPRPB",
      petitionerAdvocate: "R.K. Ojha (Senior Advocate)",
      stateCounsel: "Chief Standing Counsel (CSC)",
      ndoh: futureDate,
      stage: "Counter Affidavit Granted 3 Weeks",
    };
  }

  /**
   * Pre-registration advance notice lookup
   */
  static async lookupNotice(noticeNumber: string) {
    const currentYear = new Date().getFullYear();
    return {
      noticeNumber: noticeNumber.trim(),
      serviceDate: new Date(),
      leadPetitioner: "Sandeep Kumar & Ors.",
      advocateName: "P.K. Upadhyay (Advocate Roll: A/P0452/2012)",
      targetedDrive: "Constable Civil Police & PAC Exam 2023-24",
      defectStatus: "CLEARED",
      allocatedCaseType: "WRIT-A",
      allocatedCaseNo: String(Math.floor(1000 + Math.random() * 9000)),
      allocatedYear: currentYear,
    };
  }

  /**
   * Daily cause list scraper feed for Screen 2.4 Inward Discovery Desk
   */
  static async getDailyCauseListFeed(
    bench: "Allahabad" | "Lucknow"
  ): Promise<MockCauseListFeedItem[]> {
    const today = new Date().toISOString().split("T")[0];
    const isLucknow = bench === "Lucknow";

    return [
      {
        court: isLucknow
          ? "High Court Allahabad (Lucknow Bench)"
          : "High Court of Judicature at Allahabad",
        bench,
        causeListDate: today,
        courtHall: isLucknow ? "Court No. 18" : "Court No. 14",
        itemNo: "28",
        caseType: isLucknow ? "SS-WRIT" : "WRIT-A",
        caseNo: "4012",
        caseYear: 2026,
        cnrNumber: isLucknow ? "UPLC010040122026" : "UPHC010040122026",
        parties: "Abhay Gupta vs State of U.P. & Chairman UPPRPB",
        petitionerCounsel: "Amit Kumar Tiwari",
        respondentCounsel: "Chief Standing Counsel",
        matchedKeyword: "Chairman UPPRPB",
        matchScore: 96,
        status: "UNCLAIMED" as const,
      },
      {
        court: isLucknow
          ? "High Court Allahabad (Lucknow Bench)"
          : "High Court of Judicature at Allahabad",
        bench,
        causeListDate: today,
        courtHall: isLucknow ? "Court No. 21" : "Court No. 04",
        itemNo: "12",
        caseType: isLucknow ? "CONT-LKO" : "CONT-APP",
        caseNo: "1102",
        caseYear: 2026,
        cnrNumber: isLucknow ? "UPLC010011022026" : "UPHC010011022026",
        parties: "A. Qureshi vs Chairman Police Bharti Board",
        petitionerCounsel: "Vinod Kumar",
        respondentCounsel: "Standing Counsel",
        matchedKeyword: "Police Bharti Board",
        matchScore: 92,
        status: "UNCLAIMED" as const,
      },
    ];
  }
}