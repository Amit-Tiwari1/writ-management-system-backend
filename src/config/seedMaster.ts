import {
  State,
  Zone,
  Range,
  District,
  Court,
  CaseType,
  CaseCategory,
  CaseSubCategory,
  CaseSubject,
  SubjectCustodian,
  Rank,
  Designation,
  Department,
  RespondentGroup,
  ActionMapping,
  Alias,
  StandingCounsel,
} from "../models/Masters";

export const seedMastersIfEmpty = async () => {
  console.log("\n========================================================");
  console.log("🌱 [BOOTSTRAP] Initiating Relational Masters Seeding...");
  console.log("========================================================");

  // 1. Geographic Hierarchy: State -> Zone -> Range -> District
  let upState = await State.findOne({ stateCode: "UP" });
  if (!upState) {
    upState = await State.create({ stateName: "Uttar Pradesh", stateCode: "UP", country: "India" });
    console.log("  [+] State Seeded: Uttar Pradesh (UP)");
  }

  let prayagrajZone = await Zone.findOne({ zoneName: "Prayagraj Zone", stateId: upState._id });
  if (!prayagrajZone) {
    prayagrajZone = await Zone.create({ zoneName: "Prayagraj Zone", stateId: upState._id, headquarters: "Prayagraj" });
    console.log("  [+] Zone Seeded: Prayagraj Zone");
  }

  let lucknowZone = await Zone.findOne({ zoneName: "Lucknow Zone", stateId: upState._id });
  if (!lucknowZone) {
    lucknowZone = await Zone.create({ zoneName: "Lucknow Zone", stateId: upState._id, headquarters: "Lucknow" });
    console.log("  [+] Zone Seeded: Lucknow Zone");
  }

  let kanpurZone = await Zone.findOne({ zoneName: "Kanpur Zone", stateId: upState._id });
  if (!kanpurZone) {
    kanpurZone = await Zone.create({ zoneName: "Kanpur Zone", stateId: upState._id, headquarters: "Kanpur" });
    console.log("  [+] Zone Seeded: Kanpur Zone");
  }

  let prayagrajRange = await Range.findOne({ rangeName: "Prayagraj Range", zoneId: prayagrajZone._id });
  if (!prayagrajRange) {
    prayagrajRange = await Range.create({ rangeName: "Prayagraj Range", zoneId: prayagrajZone._id, stateId: upState._id });
    console.log("  [+] Range Seeded: Prayagraj Range");
  }

  let lucknowRange = await Range.findOne({ rangeName: "Lucknow Range", zoneId: lucknowZone._id });
  if (!lucknowRange) {
    lucknowRange = await Range.create({ rangeName: "Lucknow Range", zoneId: lucknowZone._id, stateId: upState._id });
    console.log("  [+] Range Seeded: Lucknow Range");
  }

  const districtCount = await District.countDocuments({ stateId: upState._id });
  if (districtCount === 0) {
    await District.insertMany([
      { districtName: "Fatehpur", stateId: upState._id, zoneId: prayagrajZone._id, rangeId: prayagrajRange._id },
      { districtName: "Prayagraj", stateId: upState._id, zoneId: prayagrajZone._id, rangeId: prayagrajRange._id },
      { districtName: "Pratapgarh", stateId: upState._id, zoneId: prayagrajZone._id, rangeId: prayagrajRange._id },
      { districtName: "Kaushambi", stateId: upState._id, zoneId: prayagrajZone._id, rangeId: prayagrajRange._id },
      { districtName: "Lucknow", stateId: upState._id, zoneId: lucknowZone._id, rangeId: lucknowRange._id },
      { districtName: "Unnao", stateId: upState._id, zoneId: lucknowZone._id, rangeId: lucknowRange._id },
      { districtName: "Rae Bareli", stateId: upState._id, zoneId: lucknowZone._id, rangeId: lucknowRange._id },
    ]);
    console.log("  [+] Districts Seeded: 7 Relational Districts");
  }

  // 2. Judicial Hierarchy: Court -> CaseType
  let hcAllahabad = await Court.findOne({ shortCode: "HC-ALD" });
  if (!hcAllahabad) {
    hcAllahabad = await Court.create({
      courtName: "High Court Allahabad",
      shortCode: "HC-ALD",
      courtType: "HIGH_COURT",
      location: "Allahabad",
    });
    console.log("  [+] Court Seeded: High Court Allahabad");
  }

  let hcLucknow = await Court.findOne({ shortCode: "HC-LKO" });
  if (!hcLucknow) {
    hcLucknow = await Court.create({
      courtName: "High Court Lucknow",
      shortCode: "HC-LKO",
      courtType: "HIGH_COURT",
      location: "Lucknow",
    });
    console.log("  [+] Court Seeded: High Court Lucknow");
  }

  const caseTypeCount = await CaseType.countDocuments();
  if (caseTypeCount === 0 && hcAllahabad) {
    await CaseType.insertMany([
      { courtId: hcAllahabad._id, caseTypeName: "WRIT-A", shortName: "WRIT-A" },
      { courtId: hcAllahabad._id, caseTypeName: "CIVIL REVISION", shortName: "CR" },
      { courtId: hcAllahabad._id, caseTypeName: "CIVIL REVISION DEFECTIVE", shortName: "CRD" },
      { courtId: hcAllahabad._id, caseTypeName: "CONTEMPT APPEAL", shortName: "CA" },
      { courtId: hcAllahabad._id, caseTypeName: "CONTEMPT APPEAL DEFECTIVE", shortName: "CAD" },
      { courtId: hcAllahabad._id, caseTypeName: "CONTEMPT APPLICATION (CIVIL)", shortName: "CONT" },
      { courtId: hcAllahabad._id, caseTypeName: "CONTEMPT APPLICATION (CIVIL) DEFECTIVE", shortName: "CONTD" },
    ]);
    console.log("  [+] Case Types Seeded: 7 Records linked to HC Allahabad");
  }

  // 3. Board Taxonomy Hierarchy: Category -> SubCategory -> Subject -> Custodian
  let recCat = await CaseCategory.findOne({ categoryName: "Recruitment" });
  if (!recCat) {
    recCat = await CaseCategory.create({ categoryName: "Recruitment", order: 1 });
    await CaseCategory.create({ categoryName: "Promotion", order: 2 });
    await CaseCategory.create({ categoryName: "Establishment", order: 3 });
    await CaseCategory.create({ categoryName: "Others", order: 4 });
    console.log("  [+] Case Categories Seeded: Recruitment, Promotion, Establishment, Others");
  }

  let sub1 = await CaseSubCategory.findOne({ subCategoryName: "Constable Civil Police & PAC Recruitment -2009" });
  if (!sub1 && recCat) {
    sub1 = await CaseSubCategory.create({
      categoryId: recCat._id,
      subCategoryName: "Constable Civil Police & PAC Recruitment -2009",
      defaultOfficerName: "Swahleen Ahmad (S.I.(M))",
    });
    await CaseSubCategory.create({
      categoryId: recCat._id,
      subCategoryName: "Constable Civil Police and PAC Recruitment -2018",
      defaultOfficerName: "Himanshu Tiwari (A.S.I.(M))",
    });
    await CaseSubCategory.create({
      categoryId: recCat._id,
      subCategoryName: "UP Police Sub Inspector Civil Police & Platoon Cmdr. Rec. 2011",
      defaultOfficerName: "Rajveer Singh (S.I.(M))",
    });
    console.log("  [+] Case Sub-Categories Seeded for Recruitment");
  }

  let subj1 = await CaseSubject.findOne({ subjectTitle: "P.E.T. Fail" });
  if (!subj1 && recCat && sub1) {
    subj1 = await CaseSubject.create({
      categoryId: recCat._id,
      subCategoryId: sub1._id,
      subjectTitle: "P.E.T. Fail",
    });
    await CaseSubject.create({
      categoryId: recCat._id,
      subCategoryId: sub1._id,
      subjectTitle: "P.E.T. Absent",
    });
    console.log("  [+] Case Subjects Seeded: P.E.T. Fail, P.E.T. Absent");
  }

  const custodianCount = await SubjectCustodian.countDocuments();
  if (custodianCount === 0 && subj1 && recCat) {
    await SubjectCustodian.create({
      subjectId: subj1._id,
      categoryId: recCat._id,
      officerName: "Ravindra 42",
      designation: "S.I.(M)",
    });
    console.log("  [+] Subject Custodian Seeded: Ravindra 42 (S.I.(M))");
  }

  // 4. Institutional Ranks
  const rankCount = await Rank.countDocuments();
  if (rankCount === 0) {
    await Rank.insertMany([
      { rankName: "Constable", shortCode: "CT", cadreType: "Non-Gazetted", payLevelGrade: "Level-3" },
      { rankName: "Head Constable", shortCode: "HC", cadreType: "Non-Gazetted", payLevelGrade: "Level-4" },
      { rankName: "Sub-Inspector (SI)", shortCode: "SI", cadreType: "Subordinate", payLevelGrade: "Level-6" },
      { rankName: "Inspector", shortCode: "INSP", cadreType: "Subordinate", payLevelGrade: "Level-7" },
      { rankName: "Deputy SP (DySP)", shortCode: "DYSP", cadreType: "Gazetted PPS", payLevelGrade: "Level-10" },
      { rankName: "Superintendent of Police (SP)", shortCode: "SP", cadreType: "IPS", payLevelGrade: "Level-12" },
    ]);
    console.log("  [+] Police Ranks Seeded: 6 Ranks (CT to SP)");
  }

  // 5. Institutional Designations
  const designationCount = await Designation.countDocuments();
  if (designationCount === 0) {
    await Designation.insertMany([
      { title: "Officer-in-Charge (OIC)", authorityLevel: "State Level", canSignPWC: true, canForwardFiles: true, defaultRole: "OIC" },
      { title: "Pairokar", authorityLevel: "Court Level", canSignPWC: false, canForwardFiles: true, defaultRole: "Pairokar" },
      { title: "S.I.(M)", authorityLevel: "Desk Level", canSignPWC: false, canForwardFiles: true, defaultRole: "Dealing Assistant" },
      { title: "A.S.I.(M)", authorityLevel: "Desk Level", canSignPWC: false, canForwardFiles: true, defaultRole: "Dealing Assistant" },
      { title: "SP Legal", authorityLevel: "Apex Level", canSignPWC: true, canForwardFiles: true, defaultRole: "SP Legal" },
      { title: "Chairman UPPRPB", authorityLevel: "Apex Secretariat", canSignPWC: true, canForwardFiles: true, defaultRole: "Super Admin" },
    ]);
    console.log("  [+] Designations Seeded: 6 Key Board Designations");
  }

  // 6. Institutional Departments
  const deptCount = await Department.countDocuments();
  if (deptCount === 0) {
    await Department.insertMany([
      { unitCode: "REC-WING", unitName: "Recruitment Wing", parentFormation: "UPPRPB HQ", headquarters: "Lucknow", activeWritsCount: 0 },
      { unitCode: "PROM-WING", unitName: "Promotion Wing", parentFormation: "UPPRPB HQ", headquarters: "Lucknow", activeWritsCount: 0 },
      { unitCode: "LEGAL-CELL", unitName: "Legal Writ Cell", parentFormation: "UPPRPB HQ", headquarters: "Lucknow", activeWritsCount: 0 },
      { unitCode: "EXAM-CELL", unitName: "Confidential Exam Cell", parentFormation: "UPPRPB HQ", headquarters: "Lucknow", activeWritsCount: 0 },
    ]);
    console.log("  [+] Department/Units Seeded: 4 Units");
  }

  // 7. Respondent Groups
  const respCount = await RespondentGroup.countDocuments();
  if (respCount === 0) {
    await RespondentGroup.insertMany([
      { groupName: "BOARD_PRIMARY", defaultRankTitle: "Chairman, UPPRPB", defaultAddress: "Tulsi Ganga Complex, 19-C Vidhan Sabha Marg, Lucknow", isOurOffice: true },
      { groupName: "STATE_HOME", defaultRankTitle: "Additional Chief Secretary (Home)", defaultAddress: "Civil Secretariat, Govt of UP, Lucknow", isOurOffice: false },
      { groupName: "DGP_HQ", defaultRankTitle: "Director General of Police, UP", defaultAddress: "Signature Building, Gomti Nagar Extension, Lucknow", isOurOffice: false },
    ]);
    console.log("  [+] Respondent Groups Seeded: 3 Organizations");
  }

  // 8. Action Taken Mappings
  const actionCount = await ActionMapping.countDocuments();
  if (actionCount === 0) {
    await ActionMapping.insertMany([
      { courtDecision: "DISMISSED", actionStatus: "Disposed Off (No Compliance Needed)", actionNotTaken: "None", requiresComplianceDeadline: false, defaultDeadlineDays: 0 },
      { courtDecision: "ORDER_WITH_DIRECTION", actionStatus: "Pending Compliance at Board", actionNotTaken: "Speaking Order Not Issued", requiresComplianceDeadline: true, defaultDeadlineDays: 90 },
      { courtDecision: "INTERIM_STAY", actionStatus: "Stay Active (Urgent Vacation Motion)", actionNotTaken: "Vacation Application Under Art 226(3) Not Drafted", requiresComplianceDeadline: true, defaultDeadlineDays: 14 },
    ]);
    console.log("  [+] Action Taken Mappings Seeded: 3 Judicial Directives");
  }

  // 9. Institution Aliases & Monitored Counsels
  const aliasCount = await Alias.countDocuments();
  if (aliasCount === 0) {
    await Alias.insertMany([
      { keyword: "UPPRPB", language: "English", category: "Board Acronym", matchWeight: "High" },
      { keyword: "Police Bharti Board", language: "Hindi/English", category: "Public Term", matchWeight: "Exact" },
      { keyword: "Chairman Bharti Board", language: "English", category: "Designation", matchWeight: "High" },
    ]);
    await StandingCounsel.insertMany([
      { name: "Chief Standing Counsel (CSC)", monitoredBenches: "Both", autoFlag: true },
      { name: "Amit Kumar Tiwari", monitoredBenches: "Allahabad", autoFlag: true },
    ]);
    console.log("  [+] Aliases & Counsels Seeded");
  }

  // Verification Counts Summary Table
  const [
    cState, cZone, cRange, cDistrict,
    cCourt, cCaseType,
    cCat, cSubCat, cSubject, cCustodian,
    cRank, cDesig, cDept, cResp, cAction, cAlias
  ] = await Promise.all([
    State.countDocuments(), Zone.countDocuments(), Range.countDocuments(), District.countDocuments(),
    Court.countDocuments(), CaseType.countDocuments(),
    CaseCategory.countDocuments(), CaseSubCategory.countDocuments(), CaseSubject.countDocuments(), SubjectCustodian.countDocuments(),
    Rank.countDocuments(), Designation.countDocuments(), Department.countDocuments(),
    RespondentGroup.countDocuments(), ActionMapping.countDocuments(), Alias.countDocuments()
  ]);

  console.log("\n📊 [MASTER DATA METRIC AUDIT]:");
  console.table({
    "1. States": cState,
    "2. Zones": cZone,
    "3. Ranges": cRange,
    "4. Districts": cDistrict,
    "5. Courts": cCourt,
    "6. Case Types": cCaseType,
    "7. Categories": cCat,
    "8. Sub-Categories": cSubCat,
    "9. Subjects": cSubject,
    "10. Custodians": cCustodian,
    "11. Ranks": cRank,
    "12. Designations": cDesig,
    "13. Departments": cDept,
    "14. Respondent Groups": cResp,
    "15. Action Mappings": cAction,
    "16. Aliases": cAlias,
  });
  console.log("========================================================\n");
};