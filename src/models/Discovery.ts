import mongoose, { Document, Schema } from "mongoose";

export interface IDiscoveryItem extends Document {
  court: string;
  bench: "Allahabad" | "Lucknow";
  causeListDate: string;
  courtHall: string;
  itemNo: string;
  caseType: string;
  caseNo: string;
  caseYear: number;
  cnrNumber?: string;
  parties: string;
  petitionerCounsel: string;
  respondentCounsel: string;
  matchedKeyword: string;
  matchScore: number;
  linkedNoticeNumber?: string;
  status: "UNCLAIMED" | "ACCEPTED" | "IGNORED";
  createdAt: Date;
  updatedAt: Date;
}

const DiscoverySchema = new Schema<IDiscoveryItem>(
  {
    court: { type: String, required: true },
    bench: { type: String, enum: ["Allahabad", "Lucknow"], default: "Allahabad" },
    causeListDate: { type: String, required: true, index: true },
    courtHall: { type: String, default: "--" },
    itemNo: { type: String, default: "--" },
    caseType: { type: String, required: true },
    caseNo: { type: String, required: true },
    caseYear: { type: Number, required: true },
    cnrNumber: { type: String, default: "" },
    parties: { type: String, required: true },
    petitionerCounsel: { type: String, default: "--" },
    respondentCounsel: { type: String, default: "CSC" },
    matchedKeyword: { type: String, required: true },
    matchScore: { type: Number, required: true },
    linkedNoticeNumber: { type: String, default: "" },
    status: { type: String, enum: ["UNCLAIMED", "ACCEPTED", "IGNORED"], default: "UNCLAIMED", index: true },
  },
  { timestamps: true }
);

export const Discovery = mongoose.model<IDiscoveryItem>("Discovery", DiscoverySchema);