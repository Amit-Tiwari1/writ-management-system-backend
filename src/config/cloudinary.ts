import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export const verifyCloudinaryConnection = async () => {
  try {
    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      console.warn("⚠️ [Cloudinary] Warning: API credentials missing in .env!");
      return false;
    }
    const ping = await cloudinary.api.ping();
    if (ping.status === "ok") {
      console.log("☁️  [Cloudinary Connected]: Storage Engine Active & Ready.");
      return true;
    }
    return false;
  } catch (err: any) {
    console.error("❌ [Cloudinary Error]:", err.message);
    return false;
  }
};

export default cloudinary;