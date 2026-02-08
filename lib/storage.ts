import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { env, hasS3 } from './env';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const client = hasS3
  ? new S3Client({
      region: env.s3.region,
      endpoint: env.s3.endpoint,
      credentials: {
        accessKeyId: env.s3.accessKeyId,
        secretAccessKey: env.s3.secretAccessKey
      }
    })
  : null;

export async function storeFile(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const fileId = randomUUID();
  const ext = path.extname(file.name) || '';
  const fileName = `${fileId}${ext}`;

  if (hasS3 && client) {
    await client.send(
      new PutObjectCommand({
        Bucket: env.s3.bucket,
        Key: fileName,
        Body: buffer,
        ContentType: file.type
      })
    );
    const baseUrl = env.s3.publicUrl || env.s3.endpoint;
    const url = `${baseUrl.replace(/\/$/, '')}/${env.s3.bucket}/${fileName}`;
    return url;
  }

  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(path.join(uploadDir, fileName), buffer);
  return `/uploads/${fileName}`;
}
