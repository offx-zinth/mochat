import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'MoChat',
  description: 'Private two-person chat'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
