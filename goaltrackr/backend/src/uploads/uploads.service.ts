import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadsService {
  private s3: S3Client;
  private bucket: string;
  private publicUrl: string;

  constructor(private config: ConfigService) {
    // Compatible with Cloudflare R2 and AWS S3
    this.s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${config.get('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.get('R2_ACCESS_KEY_ID'),
        secretAccessKey: config.get('R2_SECRET_ACCESS_KEY'),
      },
    });
    this.bucket = config.get('R2_BUCKET_NAME', 'goaltrackr-uploads');
    this.publicUrl = config.get('R2_PUBLIC_URL', '');
  }

  async getPresignedUrl(userId: string, filename: string, contentType: string) {
    const ext = filename.split('.').pop();
    const key = `submissions/${userId}/${uuidv4()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 300 }); // 5 min
    const fileUrl = `${this.publicUrl}/${key}`;

    return { uploadUrl, fileUrl, key };
  }
}
