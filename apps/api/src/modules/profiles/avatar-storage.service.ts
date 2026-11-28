import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { randomUUID } from "node:crypto";

const MAX_BYTES = 5 * 1024 * 1024;

@Injectable()
export class AvatarStorageService {
  private configured = false;

  private configure() {
    if (this.configured) return;
    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      throw new ServiceUnavailableException("Avatar storage is not configured on the server");
    }
    cloudinary.config({
      cloud_name: CLOUDINARY_CLOUD_NAME,
      api_key: CLOUDINARY_API_KEY,
      api_secret: CLOUDINARY_API_SECRET,
      secure: true,
    });
    this.configured = true;
  }

  async upload(userId: string, file: { buffer: Buffer; mimetype: string; size: number }): Promise<UploadApiResponse> {
    this.configure();
    if (!file.buffer?.length || file.size !== file.buffer.length || file.size > MAX_BYTES) {
      throw new Error("Avatar images must be valid and 5 MB or smaller");
    }

    const mime = this.detectMime(file.buffer);
    if (!mime || mime !== file.mimetype) {
      throw new Error("Upload a valid JPEG, PNG, or WebP image");
    }

    const dataUri = `data:${mime};base64,${file.buffer.toString("base64")}`;
    return cloudinary.uploader.upload(dataUri, {
      resource_type: "image",
      folder: `nomadly/avatars/${userId}`,
      public_id: randomUUID(),
      overwrite: false,
      unique_filename: false,
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      transformation: [{ width: 512, height: 512, crop: "limit" }],
    });
  }

  async delete(publicId: string) {
    this.configure();
    return cloudinary.uploader.destroy(publicId, { resource_type: "image", invalidate: true });
  }

  private detectMime(buffer: Buffer): string | null {
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
    if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))) return "image/png";
    if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "image/webp";
    return null;
  }
}
