import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { emitter } from '../../../../lib/events';
import { verifySessionFromRequest } from '../../../../lib/session';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!verifySessionFromRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json()) as { messageIds?: string[] };
  if (!body.messageIds?.length) {
    return NextResponse.json({ ok: true });
  }

  await prisma.message.updateMany({
    where: { id: { in: body.messageIds }, status: 'sent' },
    data: { status: 'delivered', deliveredAt: new Date() }
  });

  emitter.emit('status', { messageIds: body.messageIds });

  return NextResponse.json({ ok: true });
}
