import crypto from "crypto";
import sharp from "sharp";

export class FileOptimizer {
  static generateSHA256(buffer: Buffer): string {
    return crypto.createHash("sha256").update(buffer).digest("hex");
  }

  static formatBytes(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  static async optimizeBuffer(
    buffer: Buffer,
    mimeType: string
  ): Promise<{ optimizedBuffer: Buffer; finalMime: string }> {
    if (mimeType.startsWith("image/") && !mimeType.includes("gif")) {
      try {
        const optimized = await sharp(buffer)
          .rotate()
          .webp({ quality: 85, effort: 4 })
          .toBuffer();
        return { optimizedBuffer: optimized, finalMime: "image/webp" };
      } catch {
        return { optimizedBuffer: buffer, finalMime: mimeType };
      }
    }
    return { optimizedBuffer: buffer, finalMime: mimeType };
  }
}