import { NextRequest } from 'next/server';
import { emitter } from '../../../lib/events';
import { verifySessionFromRequest } from '../../../lib/session';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  if (!verifySessionFromRequest(req)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown, id?: string) => {
        if (id) controller.enqueue(encoder.encode(`id: ${id}\n`));
        controller.enqueue(encoder.encode(`event: ${event}\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const onMessage = (message: unknown) => {
        const data = message as { id?: string };
        send('message', message, data.id);
      };
      const onStatus = (payload: unknown) => {
        send('status', payload);
      };

      const interval = setInterval(() => {
        send('ping', { time: Date.now() });
      }, 15000);

      emitter.on('message', onMessage);
      emitter.on('status', onStatus);

      controller.enqueue(encoder.encode(': connected\n\n'));

      controller.signal.addEventListener('abort', () => {
        clearInterval(interval);
        emitter.off('message', onMessage);
        emitter.off('status', onStatus);
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    }
  });
}
