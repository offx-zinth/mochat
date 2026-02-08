import { redirect } from 'next/navigation';
import { readSessionCookie } from '../../lib/auth';
import ChatClient from '../../components/ChatClient';

export default function ChatPage() {
  const session = readSessionCookie();
  if (!session) {
    redirect('/');
  }
  return <ChatClient />;
}
