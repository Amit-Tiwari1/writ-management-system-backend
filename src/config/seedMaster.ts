import { District, Court, CaseType, Rank, Designation } from "../models/Masters";

export const seedMastersIfEmpty = async () => {
  const districtCount = await District.countDocuments();
  if (districtCount === 0) {
    console.log("🌱 [Seed] Seeding Uttar Pradesh District Masters...");
    await District.insertMany([
      { districtName: "Fatehpur", zone: "Prayagraj Zone", range: "Prayagraj Range", state: "Uttar Pradesh" },
      { districtName: "Prayagraj", zone: "Prayagraj Zone", range: "Prayagraj Range", state: "Uttar Pradesh" },
      { districtName: "Lucknow", zone: "Lucknow Zone", range: "Lucknow Range", state: "Uttar Pradesh" },
      { districtName: "Kanpur Nagar", zone: "Kanpur Zone", range: "Kanpur Range", state: "Uttar Pradesh" },
      { districtName: "Varanasi", zone: "Varanasi Zone", range: "Varanasi Range", state: "Uttar Pradesh" },
      { districtName: "Gorakhpur", zone: "Gorakhpur Zone", range: "Gorakhpur Range", state: "Uttar Pradesh" },
      { districtName: "Agra", zone: "Agra Zone", range: "Agra Range", state: "Uttar Pradesh" },
      { districtName: "Meerut", zone: "Meerut Zone", range: "Meerut Range", state: "Uttar Pradesh" },
      { districtName: "Bareilly", zone: "Bareilly Zone", range: "Bareilly Range", state: "Uttar Pradesh" },
      { districtName: "Ayodhya", zone: "Ayodhya Zone", range: "Ayodhya Range", state: "Uttar Pradesh" },
    ]);
  }

  const courtCount = await Court.countDocuments();
  if (courtCount === 0) {
    console.log("🌱 [Seed] Seeding Court Establishments...");
    await Court.insertMany([
      { courtName: "High Court of Judicature at Allahabad", shortCode: "HC-ALD", courtType: "HIGH_COURT", location: "Allahabad" },
      { courtName: "High Court of Judicature at Allahabad (Lucknow Bench)", shortCode: "HC-LKO", courtType: "HIGH_COURT", location: "Lucknow" },
      { courtName: "Supreme Court of India", shortCode: "SCI", courtType: "APEX_COURT", location: "New Delhi" },
      { courtName: "State Public Services Tribunal (SPST)", shortCode: "SPST-LKO", courtType: "TRIBUNAL", location: "Lucknow" },
    ]);
  }

  const caseTypeCount = await CaseType.countDocuments();
  if (caseTypeCount === 0) {
    console.log("🌱 [Seed] Seeding Judicial Case Types...");
    await CaseType.insertMany([
      { code: "WRIT-A", title: "Writ Petition (Civil Service Matters)", court: "High Court Allahabad" },
      { code: "CONT", title: "Civil Contempt Application", court: "High Court Allahabad" },
      { code: "SPL-AD", title: "Special Appeal (Division Bench)", court: "High Court Allahabad" },
      { code: "SLP-CIVIL", title: "Special Leave Petition (Civil)", court: "Supreme Court" },
      { code: "CLAIM-PET", title: "Claim Petition", court: "State Public Services Tribunal" },
    ]);
  }

  const rankCount = await Rank.countDocuments();
  if (rankCount === 0) {
    console.log("🌱 [Seed] Seeding Police Cadre Ranks...");
    await Rank.insertMany([
      { rankName: "Constable", shortCode: "CT", cadreType: "Non-Gazetted", payLevelGrade: "Level-3" },
      { rankName: "Head Constable", shortCode: "HC", cadreType: "Non-Gazetted", payLevelGrade: "Level-4" },
      { rankName: "Sub-Inspector (SI)", shortCode: "SI", cadreType: "Subordinate", payLevelGrade: "Level-6" },
      { rankName: "Inspector", shortCode: "INSP", cadreType: "Subordinate", payLevelGrade: "Level-7" },
      { rankName: "Deputy SP (DySP)", shortCode: "DYSP", cadreType: "Gazetted PPS", payLevelGrade: "Level-10" },
      { rankName: "Superintendent of Police (SP)", shortCode: "SP", cadreType: "IPS / Selection Grade", payLevelGrade: "Level-12" },
    ]);
  }
};