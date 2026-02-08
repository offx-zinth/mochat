import { NextRequest, NextResponse } from 'next/server';
import { env } from '../../../../lib/env';
import { verifySessionFromRequest } from '../../../../lib/session';
import { storeFile } from '../../../../lib/storage';

export const runtime = 'nodejs';

const allowedTypes = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'application/pdf',
  'application/zip',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain'
]);

export async function POST(req: NextRequest) {
  if (!verifySessionFromRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
  }

  if (file.size > env.maxFileSizeMb * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large.' }, { status: 400 });
  }

  if (!allowedTypes.has(file.type)) {
    return NextResponse.json({ error: 'Unsupported file type.' }, { status: 400 });
  }

  const url = await storeFile(file);

  return NextResponse.json({
    url,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type
  });
}
