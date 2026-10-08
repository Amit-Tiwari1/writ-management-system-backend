// src/services/mockJudicialService.ts

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

export class MockJudicialService {
  /**
   * 16-Digit CNR Verification Mock
   */
  static async verifyCNR(cnrNumber: string): Promise<MockCNRDetails> {
    const isLucknow = cnrNumber.toUpperCase().includes("LKO") || cnrNumber.endsWith("2");
    const currentYear = new Date().getFullYear();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    return {
      cnrNumber: cnrNumber.toUpperCase(),
      court: isLucknow
        ? "High Court of Judicature at Allahabad (Lucknow Bench)"
        : "High Court of Judicature at Allahabad",
      courtCode: isLucknow ? "HC-LKO" : "HC-ALD",
      caseType: "WRIT-A",
      caseNumber: Math.floor(1000 + Math.random() * 9000).toString(),
      caseYear: currentYear,
      benchLocation: isLucknow ? "Lucknow" : "Allahabad",
      courtRoomNo: `Court No. ${Math.floor(1 + Math.random() * 35)}`,
      coramBench: "Hon'ble Justice Vivek Chaudhary & Hon'ble Justice Manish Kumar",
      leadPetitioner: "Abhay Gupta & 4 Others",
      respondentString: "State of U.P. thru ACS Home & Chairman UPPRPB",
      petitionerAdvocate: "R.K. Ojha (Senior Advocate)",
      stateCounsel: "Chief Standing Counsel (CSC)",
      ndoh: futureDate,
      stage: "Counter Affidavit Granted 3 Weeks",
    };
  }

  /**
   * Advance Notice Lookup by Diary / Notice Number Mock
   */
  static async lookupNotice(noticeNumber: string) {
    return {
      noticeNumber,
      serviceDate: new Date(),
      leadPetitioner: "Sandeep Kumar & Ors.",
      advocateName: "P.K. Upadhyay (Advocate Roll: A/P0452/2012)",
      targetedDrive: "Constable Civil Police 2023-24",
      defectStatus: "CLEARED", // Cleared by Stamp Reporter
      allocatedCaseType: "WRIT-A",
      allocatedCaseNo: "5024",
      allocatedYear: new Date().getFullYear(),
    };
  }

  /**
   * Daily Cause List Feed Mock
   */
  static async getDailyCauseListFeed(bench: "Allahabad" | "Lucknow") {
    const today = new Date().toISOString().split("T")[0];
    return [
      {
        court: `High Court ${bench}`,
        bench,
        causeListDate: today,
        courtHall: "Court No. 14",
        itemNo: "28",
        caseType: "WRIT-A",
        caseNo: "4012",
        caseYear: 2026,
        cnrNumber: bench === "Lucknow" ? "UPHC020040122026" : "UPHC010040122026",
        parties: "Abhay Gupta vs State of U.P. & Chairman UPPRPB",
        petitionerCounsel: "Amit Kumar Tiwari",
        respondentCounsel: "C.S.C.",
        matchedKeyword: "Chairman UPPRPB",
        matchScore: 96,
        status: "UNCLAIMED",
      },
      {
        court: `High Court ${bench}`,
        bench,
        causeListDate: today,
        courtHall: "Court No. 04",
        itemNo: "12",
        caseType: "CONT",
        caseNo: "1102",
        caseYear: 2026,
        cnrNumber: bench === "Lucknow" ? "UPHC020011022026" : "UPHC010011022026",
        parties: "A. Qureshi vs Chairman Police Bharti Board",
        petitionerCounsel: "Vinod Kumar",
        respondentCounsel: "Standing Counsel",
        matchedKeyword: "Police Bharti Board",
        matchScore: 92,
        status: "UNCLAIMED",
      },
    ];
  }
}