import mongoose, { Document, Schema } from "mongoose";

export interface ISubMenu {
  _id?: mongoose.Types.ObjectId;
  key: string;
  label: string;
  path: string;
  icon: string;
  badge?: string;
  badgeColor?: string;
  order: number;
}

const SubMenuSchema = new Schema<ISubMenu>({
  key: { type: String, required: true },
  label: { type: String, required: true },
  path: { type: String, required: true },
  icon: { type: String, default: "chevron_right" },
  badge: { type: String, default: "" },
  badgeColor: { type: String, default: "default" },
  order: { type: Number, default: 0 },
});

export interface IMenu extends Document {
  groupKey: string;
  groupTitle: string;
  key: string;
  label: string;
  path: string;
  icon: string;
  order: number;
  subMenus: ISubMenu[];
  createdAt: Date;
  updatedAt: Date;
}

const MenuSchema = new Schema<IMenu>(
  {
    groupKey: { type: String, required: true },
    groupTitle: { type: String, required: true },
    key: { type: String, required: true, unique: true },
    label: { type: String, required: true },
    path: { type: String, required: true },
    icon: { type: String, required: true },
    order: { type: Number, default: 0 },
    subMenus: [SubMenuSchema],
  },
  { timestamps: true }
);

export const Menu = mongoose.model<IMenu>("Menu", MenuSchema);