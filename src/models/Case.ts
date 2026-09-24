import mongoose, { Document, Schema } from "mongoose";

// Sub-document: Individual Co-Petitioner
export interface IPetitioner {
  _id?: mongoose.Types.ObjectId;
  rollNo: string;
  name: string;
  fatherName?: string;
  role: "Lead Petitioner" | "Co-Petitioner";
  categoryClaimed?: string;
  postClaimed?: string;
  district?: string;
  status: "ACTIVE" | "WITHDRAWN" | "DISMISSED_ON_MERIT" | "COMPLIED";
  meritGrievance?: string;
}

// Sub-document: Discovery Match Log
export interface IDiscoveryItem extends Document {
  court: string;
  caseNo: string;
  cnrNumber: string;
  parties: string;
  matchedKeyword: string;
  matchScore: number;
  courtHall: string;
  itemNo: string;
  hearingDate: string;
  counselName: string;
  status: "UNCLAIMED" | "ACCEPTED" | "IGNORED";
}

// Primary Case Document
export interface ICase extends Document {
  fileDocketNo: string; // e.g. PRPB-R/938/2026
  cnrNumber: string;    // 16-Digit CNR (e.g. UPHC010041122026)
  court: string;        // High Court Allahabad / Lucknow Bench / Supreme Court
  courtCode: string;
  caseType: string;     // WRIT-A, CONT, SPL-AD
  caseNumber: string;   // 4012
  caseYear: number;     // 2026
  leadPetitioner: string;
  respondentString: string;
  
  // Attribution & Custodianship
  assignedOIC: string;
  assignedPairokar: string;
  sectionWing: string;
  category: string;
  examCycle: string;
  disputeSubject: string;

  stage: string;        
  judicialStatus: "ACTIVE" | "PENDING_PWC" | "STAY_IN_FORCE" | "CONTEMPT_NOTICE" | "DISPOSED" | "ARCHIVED";
  ndoh: Date | null;    // Next Date of Hearing
  courtRoomNo?: string;
  coramBench?: string;

  hasActiveStay: boolean;
  stayGrantedDate?: Date;
  stayVacationDueDate?: Date;
  isContemptNotice: boolean;
  contemptDeadlineDate?: Date;

  // Sub-documents
  petitioners: IPetitioner[];

  // eCourts Sync Telemetry
  lastSyncedAt: Date;
  syncStatus: "SUCCESS" | "SYNCING" | "FAILED";
}

const PetitionerSchema = new Schema<IPetitioner>({
  rollNo: { type: String, required: true },
  name: { type: String, required: true },
  fatherName: { type: String, default: "--" },
  role: { type: String, enum: ["Lead Petitioner", "Co-Petitioner"], default: "Co-Petitioner" },
  categoryClaimed: { type: String, default: "--" },
  postClaimed: { type: String, default: "Constable Civil Police" },
  district: { type: String, default: "--" },
  status: { type: String, enum: ["ACTIVE", "WITHDRAWN", "DISMISSED_ON_MERIT", "COMPLIED"], default: "ACTIVE" },
  meritGrievance: { type: String, default: "--" },
});

const CaseSchema = new Schema<ICase>(
  {
    fileDocketNo: { type: String, required: true, unique: true },
    cnrNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    court: { type: String, required: true },
    courtCode: { type: String, default: "HC-ALD" },
    caseType: { type: String, required: true },
    caseNumber: { type: String, required: true },
    caseYear: { type: Number, required: true },
    leadPetitioner: { type: String, required: true },
    respondentString: { type: String, required: true },

    assignedOIC: { type: String, default: "Unassigned" },
    assignedPairokar: { type: String, default: "Unassigned" },
    sectionWing: { type: String, default: "Recruitment Wing" },
    category: { type: String, default: "Constable Recruitment" },
    examCycle: { type: String, default: "Civil Police 2023-24" },
    disputeSubject: { type: String, default: "General Service Matter" },

    stage: { type: String, default: "Freshly Ingested" },
    judicialStatus: {
      type: String,
      enum: ["ACTIVE", "PENDING_PWC", "STAY_IN_FORCE", "CONTEMPT_NOTICE", "DISPOSED", "ARCHIVED"],
      default: "ACTIVE",
    },
    ndoh: { type: Date, default: null },
    courtRoomNo: { type: String, default: "--" },
    coramBench: { type: String, default: "--" },

    hasActiveStay: { type: Boolean, default: false },
    stayGrantedDate: { type: Date },
    stayVacationDueDate: { type: Date },
    isContemptNotice: { type: Boolean, default: false },
    contemptDeadlineDate: { type: Date },

    petitioners: [PetitionerSchema],

    lastSyncedAt: { type: Date, default: Date.now },
    syncStatus: { type: String, enum: ["SUCCESS", "SYNCING", "FAILED"], default: "SUCCESS" },
  },
  { timestamps: true }
);

export const Case = mongoose.model<ICase>("Case", CaseSchema);

// Discovery Item Schema
const DiscoverySchema = new Schema<IDiscoveryItem>(
  {
    court: { type: String, required: true },
    caseNo: { type: String, required: true },
    cnrNumber: { type: String, required: true },
    parties: { type: String, required: true },
    matchedKeyword: { type: String, required: true },
    matchScore: { type: Number, required: true },
    courtHall: { type: String, default: "--" },
    itemNo: { type: String, default: "--" },
    hearingDate: { type: String, required: true },
    counselName: { type: String, default: "--" },
    status: { type: String, enum: ["UNCLAIMED", "ACCEPTED", "IGNORED"], default: "UNCLAIMED" },
  },
  { timestamps: true }
);

export const Discovery = mongoose.model<IDiscoveryItem>("Discovery", DiscoverySchema);