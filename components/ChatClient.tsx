'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Message = {
  id: string;
  senderId: string;
  content: string | null;
  type: 'text' | 'image' | 'video' | 'file';
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  status: 'sent' | 'delivered';
  createdAt: string;
};

type UploadResponse = {
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
};

export default function ChatClient() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [status, setStatus] = useState('Connecting…');
  const [clientId, setClientId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const lastMessageAt = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [messages]
  );

  useEffect(() => {
    const stored = localStorage.getItem('mochat_client_id');
    if (stored) {
      setClientId(stored);
      return;
    }
    const id = crypto.randomUUID();
    localStorage.setItem('mochat_client_id', id);
    setClientId(id);
  }, []);

  useEffect(() => {
    if (!clientId) return;
    const load = async () => {
      const res = await fetch('/api/messages', { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as { messages: Message[] };
      setMessages(data.messages);
      const last = data.messages.at(-1);
      if (last) lastMessageAt.current = last.createdAt;
      acknowledgeDelivered(data.messages, clientId);
      scrollToBottom();
    };
    load();
  }, [clientId]);

  useEffect(() => {
    if (!clientId) return;
    const connect = () => {
      const source = new EventSource('/api/stream');
      setStatus('Live');

      source.addEventListener('message', (event) => {
        const data = JSON.parse((event as MessageEvent).data) as Message;
        setMessages((prev) => {
          if (prev.some((msg) => msg.id === data.id)) return prev;
          return [...prev, data];
        });
        lastMessageAt.current = data.createdAt;
        if (data.senderId !== clientId) {
          acknowledgeDelivered([data], clientId);
        }
        scrollToBottom();
      });

      source.addEventListener('status', (event) => {
        const data = JSON.parse((event as MessageEvent).data) as { messageIds: string[] };
        if (!data.messageIds?.length) return;
        setMessages((prev) =>
          prev.map((msg) =>
            data.messageIds.includes(msg.id) ? { ...msg, status: 'delivered' } : msg
          )
        );
      });

      source.addEventListener('error', () => {
        setStatus('Reconnecting…');
        source.close();
        startPolling();
      });

      return () => source.close();
    };

    const cleanup = connect();
    return () => {
      cleanup();
      stopPolling();
    };
  }, [clientId]);

  const startPolling = () => {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(async () => {
      await syncMessages();
    }, 5000);
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const syncMessages = async () => {
    const params = lastMessageAt.current ? `?after=${encodeURIComponent(lastMessageAt.current)}` : '';
    const res = await fetch(`/api/messages${params}`, { cache: 'no-store' });
    if (!res.ok) return;
    const data = (await res.json()) as { messages: Message[] };
    if (data.messages.length) {
      setMessages((prev) => [...prev, ...data.messages]);
      const last = data.messages.at(-1);
      if (last) lastMessageAt.current = last.createdAt;
      acknowledgeDelivered(data.messages, clientId);
      scrollToBottom();
    }
  };

  const acknowledgeDelivered = async (incoming: Message[], sender: string) => {
    const ids = incoming.filter((msg) => msg.senderId !== sender && msg.status === 'sent').map((msg) => msg.id);
    if (!ids.length) return;
    await fetch('/api/messages/ack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageIds: ids })
    });
  };

  const sendMessage = async () => {
    if (!clientId) return;
    if (!text.trim() && !file) return;
    setSending(true);
    setError('');

    try {
      let payload: Partial<Message> & { senderId: string; type: Message['type'] } = {
        senderId: clientId,
        type: 'text',
        content: text.trim()
      };

      if (file) {
        const upload = new FormData();
        upload.append('file', file);
        const uploadRes = await fetch('/api/messages/upload', {
          method: 'POST',
          body: upload
        });
        if (!uploadRes.ok) {
          const message = (await uploadRes.json()) as { error?: string };
          throw new Error(message.error ?? 'Upload failed');
        }
        const data = (await uploadRes.json()) as UploadResponse;
        const type = data.mimeType.startsWith('image')
          ? 'image'
          : data.mimeType.startsWith('video')
          ? 'video'
          : 'file';
        payload = {
          senderId: clientId,
          type,
          content: text.trim() || null,
          fileUrl: data.url,
          fileName: data.fileName,
          fileSize: data.fileSize,
          mimeType: data.mimeType
        };
      }

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        throw new Error('Send failed');
      }
      const data = (await res.json()) as { message: Message };
      setMessages((prev) => [...prev, data.message]);
      lastMessageAt.current = data.message.createdAt;
      setText('');
      setFile(null);
      scrollToBottom();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed.');
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    });
  };

  return (
    <div className="chat-shell">
      <header className="chat-header">
        <div>
          <div className="badge">Private Link</div>
          <div className="caption">Only two devices should see this.</div>
        </div>
        <div className="status">{status}</div>
      </header>
      <div className="chat-body" ref={scrollRef}>
        {sortedMessages.map((message) => (
          <div key={message.id} className={`message ${message.senderId === clientId ? 'self' : ''}`}>
            {message.type === 'text' && <div>{message.content}</div>}
            {message.type !== 'text' && message.fileUrl ? (
              <div>
                {message.type === 'image' ? (
                  <img src={message.fileUrl} alt={message.fileName ?? 'image'} style={{ maxWidth: '100%', borderRadius: 12 }} />
                ) : message.type === 'video' ? (
                  <video controls style={{ maxWidth: '100%', borderRadius: 12 }}>
                    <source src={message.fileUrl} />
                  </video>
                ) : (
                  <a href={message.fileUrl} target="_blank" rel="noreferrer">
                    {message.fileName ?? 'Download file'}
                  </a>
                )}
                {message.content ? <div style={{ marginTop: 8 }}>{message.content}</div> : null}
              </div>
            ) : null}
            <div className="message-meta">
              <span>{new Date(message.createdAt).toLocaleString()}</span>
              {message.senderId === clientId ? <span>{message.status}</span> : null}
            </div>
          </div>
        ))}
      </div>
      <div className="chat-input">
        <textarea
          rows={3}
          placeholder="Write a message..."
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <div className="chat-actions">
          <input
            type="file"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          {file ? (
            <span className="file-pill">
              {file.name} ({Math.round(file.size / 1024)} KB)
            </span>
          ) : null}
          <button type="button" onClick={sendMessage} disabled={sending}>
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
        {error ? <div className="alert">{error}</div> : null}
      </div>
    </div>
  );
}
