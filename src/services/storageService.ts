import cloudinary from "../config/cloudinary";
import { FileOptimizer } from "../utils/fileOptimizer";

export interface StorageResult {
  secureUrl: string;
  publicId: string;
  fileSize: number;
  formattedSize: string;
  sha256Hash: string;
  mimeType: string;
}

export class StorageService {
  /**
   * Upload file buffer to Cloudinary with compression & SHA-256 hash
   */
  static async uploadFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    folderPath: string
  ): Promise<StorageResult> {
    const sha256Hash = FileOptimizer.generateSHA256(buffer);
    const { optimizedBuffer, finalMime } = await FileOptimizer.optimizeBuffer(buffer, mimeType);

    const isPdfOrRaw =
      finalMime.includes("pdf") || finalMime.includes("word") || finalMime.includes("document");

    const sanitizedName = originalName
      .substring(0, originalName.lastIndexOf(".") || originalName.length)
      .replace(/[^a-zA-Z0-9_-]/g, "_");

    const publicId = `${Date.now()}_${sanitizedName}`;

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `upprpb/${folderPath}`,
          public_id: publicId,
          resource_type: isPdfOrRaw ? "raw" : "auto",
        },
        (error, result) => {
          if (error) return reject(new Error(`Storage error: ${error.message}`));
          if (!result) return reject(new Error("Storage returned empty result."));

          const finalSize = result.bytes || optimizedBuffer.length;
          resolve({
            secureUrl: result.secure_url,
            publicId: result.public_id,
            fileSize: finalSize,
            formattedSize: FileOptimizer.formatBytes(finalSize),
            sha256Hash,
            mimeType: finalMime,
          });
        }
      );
      stream.end(optimizedBuffer);
    });
  }

  /**
   * Replace existing file (Uploads new version, purges old version)
   */
  static async replaceFile(
    oldPublicId: string,
    newBuffer: Buffer,
    newOriginalName: string,
    newMimeType: string,
    folderPath: string,
    isOldRaw: boolean = false
  ): Promise<StorageResult> {
    const newUpload = await this.uploadFile(newBuffer, newOriginalName, newMimeType, folderPath);
    if (oldPublicId) {
      await this.deleteFile(oldPublicId, isOldRaw).catch(() => {});
    }
    return newUpload;
  }

  /**
   * Permanent Delete
   */
  static async deleteFile(publicId: string, isRaw: boolean = false): Promise<boolean> {
    if (!publicId) return false;
    try {
      const res = await cloudinary.uploader.destroy(publicId, {
        resource_type: isRaw ? "raw" : "image",
        invalidate: true,
      });
      return res.result === "ok";
    } catch {
      return false;
    }
  }
}