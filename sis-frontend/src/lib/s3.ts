// src/lib/s3.ts
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const REGION = process.env.AWS_REGION || 'us-east-1';
export const S3_BUCKET = process.env.S3_BUCKET || '';

if (!S3_BUCKET) {
  console.warn('Warning: S3_BUCKET is not set in env');
}

export const s3Client = new S3Client({
  region: REGION,
});

/** slugify - remove acentos/espacos e limita */
export function slugifyFileName(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9.\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 120);
}

/** gera chave conforme convenção */
export function makeFileKey(
  companyId: number,
  reportId: number,
  versionSuffix: number,
  originalName: string
) {
  const slug = slugifyFileName(originalName).replace(/\.pdf$/i, '');
  return `reports/${companyId}/${reportId}-${versionSuffix}-${slug}.pdf`;
}

/** presign PUT (upload) */
export async function presignUploadUrl(
  key: string,
  contentType: string,
  expiresIn = Number(process.env.S3_UPLOAD_EXPIRES ?? 900) // 15 min
) {
  if (!S3_BUCKET) {
    throw new Error('S3_BUCKET is not set');
  }

  const cmd = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType || 'application/pdf',
  });

  const url = await getSignedUrl(s3Client, cmd, { expiresIn });
  return url;
}

/** presign GET (download/view) */
export async function presignGetUrl(key: string, expiresIn = 60) {
  if (!S3_BUCKET) {
    throw new Error('S3_BUCKET is not set');
  }

  const cmd = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  });
  const url = await getSignedUrl(s3Client, cmd, { expiresIn });
  return url;
}
