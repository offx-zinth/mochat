import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';
import { emitter } from '../../../lib/events';
import { verifySessionFromRequest } from '../../../lib/session';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  if (!verifySessionFromRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const after = searchParams.get('after');
  const afterDate = after ? new Date(after) : null;

  const messages = await prisma.message.findMany({
    where: afterDate ? { createdAt: { gt: afterDate } } : undefined,
    orderBy: { createdAt: 'asc' },
    take: 200
  });

  return NextResponse.json({ messages });
}

export async function POST(req: NextRequest) {
  if (!verifySessionFromRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json()) as {
    senderId: string;
    content?: string;
    type: 'text' | 'image' | 'video' | 'file';
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
  };

  if (!body.senderId || !body.type) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
  }

  const message = await prisma.message.create({
    data: {
      senderId: body.senderId,
      content: body.content?.slice(0, 2000),
      type: body.type,
      fileUrl: body.fileUrl,
      fileName: body.fileName,
      fileSize: body.fileSize,
      mimeType: body.mimeType
    }
  });

  emitter.emit('message', message);

  return NextResponse.json({ message });
}
