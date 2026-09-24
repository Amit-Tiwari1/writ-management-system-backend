import {
  District,
  Department,
  Rank,
  Designation,
  Court,
  CaseType,
  Taxonomy,
  CustodianMap,
  RespondentGroup,
  ActionMapping,
  Alias,
  StandingCounsel,
} from "../models/Masters";

export const seedMasters = async () => {
  try {
    // 6.1 Districts
    if ((await District.countDocuments()) === 0) {
      await District.insertMany([
        { districtName: "Lucknow", zone: "Lucknow Zone", range: "Lucknow Range", activeWritsCount: 142 },
        { districtName: "Prayagraj", zone: "Prayagraj Zone", range: "Prayagraj Range", activeWritsCount: 98 },
        { districtName: "Kanpur Nagar", zone: "Kanpur Zone", range: "Kanpur Range", activeWritsCount: 64 },
        { districtName: "Varanasi", zone: "Varanasi Zone", range: "Varanasi Range", activeWritsCount: 52 },
        { districtName: "Meerut", zone: "Meerut Zone", range: "Meerut Range", activeWritsCount: 88 },
        { districtName: "Gorakhpur", zone: "Gorakhpur Zone", range: "Gorakhpur Range", activeWritsCount: 45 },
      ]);
    }

    // 6.2 Departments
    if ((await Department.countDocuments()) === 0) {
      await Department.insertMany([
        { unitCode: "PRPB-HQ", unitName: "Police Bharti Board Headquarters", parentFormation: "Apex Board", headquarters: "Lucknow", activeWritsCount: 198 },
        { unitCode: "DGP-PHQ", unitName: "Director General of Police Headquarters", parentFormation: "Home Dept", headquarters: "Signature Building, Lucknow", activeWritsCount: 124 },
        { unitCode: "PAC-HQ", unitName: "Provincial Armed Constabulary Headquarters", parentFormation: "DGP HQ", headquarters: "Mahanagar, Lucknow", activeWritsCount: 46 },
        { unitCode: "INTEL-UP", unitName: "State Intelligence Directorate", parentFormation: "DGP HQ", headquarters: "Lucknow", activeWritsCount: 18 },
      ]);
    }

    // 6.3 Ranks
    if ((await Rank.countDocuments()) === 0) {
      await Rank.insertMany([
        { rankName: "Director General of Police", shortCode: "DGP", cadreType: "IPS (Apex Scale)", payLevelGrade: "Level 17" },
        { rankName: "Additional Director General", shortCode: "ADG", cadreType: "IPS (HAG+ Scale)", payLevelGrade: "Level 16" },
        { rankName: "Superintendent of Police", shortCode: "SP", cadreType: "IPS / PPS (Selection)", payLevelGrade: "Level 13" },
        { rankName: "Deputy Superintendent of Police", shortCode: "DySP", cadreType: "PPS (Senior Time Scale)", payLevelGrade: "Level 10" },
        { rankName: "Sub Inspector of Police", shortCode: "SI", cadreType: "Subordinate Police Cadre", payLevelGrade: "Level 6" },
        { rankName: "Constable Civil Police", shortCode: "CONST", cadreType: "Subordinate Police Cadre", payLevelGrade: "Level 3" },
      ]);
    }

    // 6.4 Designations
    if ((await Designation.countDocuments()) === 0) {
      await Designation.insertMany([
        { title: "Chairman / DG UPPRPB", authorityLevel: "Apex Final Decision Authority", canSignPWC: true, canForwardFiles: true, defaultRole: "Super Admin" },
        { title: "Member Secretary / ADG", authorityLevel: "Head of Legal Cell", canSignPWC: true, canForwardFiles: true, defaultRole: "Head of Legal Cell" },
        { title: "Additional Secretary (Recruitment)", authorityLevel: "Section Head / Custodian", canSignPWC: true, canForwardFiles: true, defaultRole: "Section Nodal Officer" },
        { title: "Superintendent of Police (Legal)", authorityLevel: "Officer-in-Charge (OIC)", canSignPWC: true, canForwardFiles: true, defaultRole: "Officer-in-Charge (OIC)" },
        { title: "Sub Inspector Legal Desk", authorityLevel: "Legal Clerk / Docket Operator", canSignPWC: false, canForwardFiles: true, defaultRole: "Legal Clerk / Operator" },
      ]);
    }

    // 6.5 Courts & Case Types
    if ((await Court.countDocuments()) === 0) {
      await Court.insertMany([
        { courtName: "High Court of Judicature at Allahabad", shortCode: "HC-ALD", courtType: "Constitutional High Court", location: "Prayagraj" },
        { courtName: "High Court Allahabad (Lucknow Bench)", shortCode: "HC-LKO", courtType: "Constitutional High Court", location: "Lucknow" },
        { courtName: "Supreme Court of India", shortCode: "SCI", courtType: "Apex Court", location: "New Delhi" },
        { courtName: "State Public Services Tribunal", shortCode: "SPST", courtType: "Administrative Tribunal", location: "Lucknow" },
      ]);

      await CaseType.insertMany([
        { code: "WRIT-A", title: "Civil Writ (Service & Recruitment Matters)", court: "High Court Allahabad", activeWritsCount: 312 },
        { code: "CONT", title: "Civil Contempt Petition", court: "High Court Allahabad", activeWritsCount: 42 },
        { code: "SPL-AD", title: "Special Appeal (Defective / Division Bench)", court: "High Court Allahabad", activeWritsCount: 68 },
        { code: "SLP-CIVIL", title: "Special Leave Petition (Civil)", court: "Supreme Court of India", activeWritsCount: 14 },
      ]);
    }

    // 6.6 Taxonomy
    if ((await Taxonomy.countDocuments()) === 0) {
      await Taxonomy.insertMany([
        { category: "Constable Recruitment", examCycle: "Civil Police / PAC 2023-24", issue: "Height Measurement (PST Grievance)", mappedNodalOfficer: "SP Recruitment Wing", activeCasesCount: 54 },
        { category: "Constable Recruitment", examCycle: "Civil Police / PAC 2023-24", issue: "Normalisation & Shift Evaluation", mappedNodalOfficer: "Additional Secretary (Exam)", activeCasesCount: 48 },
        { category: "Sub Inspector (SI) Direct Recruitment", examCycle: "SI Direct Recruitment 2021", issue: "Biometric & Impersonation Mismatch", mappedNodalOfficer: "SP Cyber / Legal Cell", activeCasesCount: 22 },
        { category: "Departmental Promotion", examCycle: "Head Constable to Sub Inspector 2022", issue: "Seniority List & ACR Scoring", mappedNodalOfficer: "Additional Secretary (Promotion)", activeCasesCount: 19 },
      ]);
    }

    // 6.7 Custodian Map
    if ((await CustodianMap.countDocuments()) === 0) {
      await CustodianMap.insertMany([
        { subjectMatter: "Height / Chest (PST) Re-measurement", assignedOfficerName: "Padmaja Chauhan", officerDesignation: "Additional Secretary", sectionWing: "Recruitment Wing" },
        { subjectMatter: "OMR Sheet Re-evaluation & Answer Keys", assignedOfficerName: "R.K. Swarnkar", officerDesignation: "Member Secretary/ADG", sectionWing: "Examination Cell" },
        { subjectMatter: "Document Verification (OBC/EWS Validity)", assignedOfficerName: "Ramakant Prashad", officerDesignation: "Superintendent of Police", sectionWing: "Scrutiny Wing" },
        { subjectMatter: "Contempt & Show Cause Legal Notice", assignedOfficerName: "SP Legal Cell", officerDesignation: "Superintendent of Police", sectionWing: "Legal Cell Desk" },
      ]);
    }

    // 6.8 Respondents
    if ((await RespondentGroup.countDocuments()) === 0) {
      await RespondentGroup.insertMany([
        { groupName: "BHARTI BOARD", defaultRankTitle: "Chairman, UPPRPB", defaultAddress: "Tulsi Ganga Complex, 19-C Vidhan Sabha Marg, Lucknow", isOurOffice: true },
        { groupName: "DGP / PHQ HEAD QUARTER", defaultRankTitle: "Director General of Police", defaultAddress: "Police Headquarters, Signature Building, Lucknow", isOurOffice: false },
        { groupName: "UP GOVERNMENT (Home Dept)", defaultRankTitle: "Principal Secretary (Home)", defaultAddress: "Civil Secretariat, Vidhan Sabha Marg, Lucknow", isOurOffice: false },
        { groupName: "DISTRICT MAGISTRATE", defaultRankTitle: "District Magistrate / Collector", defaultAddress: "Collectorate Office (Concerned District)", isOurOffice: false },
        { groupName: "CHIEF MEDICAL OFFICER (CMO)", defaultRankTitle: "Chief Medical Officer", defaultAddress: "District Hospital / Medical Board", isOurOffice: false },
        { groupName: "PAC UNIT / COMMANDANT", defaultRankTitle: "Commandant PAC Battalion", defaultAddress: "Concerned PAC Battalion Headquarters", isOurOffice: false },
        { groupName: "RAILWAYS / RPF", defaultRankTitle: "Chief Security Commissioner (RPF)", defaultAddress: "Northern Railway Headquarters", isOurOffice: false },
      ]);
    }

    // 6.9 Action Taken Mapping
    if ((await ActionMapping.countDocuments()) === 0) {
      await ActionMapping.insertMany([
        { courtDecision: "Dismissed on Merit", actionStatus: "Order Received in Board - File Closed", actionNotTaken: "Order NOT Received in Board", requiresComplianceDeadline: false, defaultDeadlineDays: 0, impactScope: "Case permanently closed; no compliance obligation" },
        { courtDecision: "Allowed with Directions", actionStatus: "Compliance Directions Issued to Section", actionNotTaken: "Compliance Pending / Overdue", requiresComplianceDeadline: true, defaultDeadlineDays: 42, impactScope: "Starts compliance countdown; prompts contempt watch" },
        { courtDecision: "Interim Stay Granted", actionStatus: "Stay Received - Draft Vacation Initiated", actionNotTaken: "Vacation of Stay NOT Filed", requiresComplianceDeadline: true, defaultDeadlineDays: 14, impactScope: "Adds case to 5.1 Active Stays Roster" },
        { courtDecision: "Disposed with Direction to Decide Representation", actionStatus: "Speaking Order Passed by Authority", actionNotTaken: "Representation Awaiting Decision", requiresComplianceDeadline: true, defaultDeadlineDays: 28, impactScope: "Requires speaking order upload before closure" },
        { courtDecision: "Withdrawn by Petitioner", actionStatus: "File Consigned to Record Room", actionNotTaken: "Withdrawal Order Copy Awaited", requiresComplianceDeadline: false, defaultDeadlineDays: 0, impactScope: "Immediate archival" },
      ]);
    }

    // 6.10 Aliases & Standing Counsels
    if ((await Alias.countDocuments()) === 0) {
      await Alias.insertMany([
        { keyword: "UPPRPB", language: "English (Abbr)", category: "Primary Institution Code", matchWeight: "Exact (100%)" },
        { keyword: "Bharti Board", language: "English (Colloquial)", category: "Informal Court Name", matchWeight: "High (90%)" },
        { keyword: "उत्तर प्रदेश पुलिस भर्ती एवं प्रोन्नति बोर्ड", language: "Hindi (Devanagari)", category: "Full Official Name", matchWeight: "Exact (100%)" },
        { keyword: "Police Recruitment Board", language: "English (General)", category: "Alternative Entity", matchWeight: "Medium (80%)" },
      ]);

      await StandingCounsel.insertMany([
        { name: "Chief Standing Counsel (High Court Allahabad)", monitoredBenches: "Bench 1, Bench 12, Bench 34", autoFlag: true },
        { name: "Chief Standing Counsel (High Court Lucknow)", monitoredBenches: "Court No. 1, Court No. 18", autoFlag: true },
        { name: "M.C. Chaturvedi (Senior Additional Advocate General)", monitoredBenches: "Division Benches", autoFlag: true },
      ]);
    }

    console.log("🌱 [Seed] All 10 System Masters (6.1 to 6.10) verified & initialized.");
  } catch (error) {
    console.error("❌ Masters seeding error:", error);
  }
};