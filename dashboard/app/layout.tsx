import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Demos Marketing Intelligence',
  description: 'AI-powered marketing automation for Demos Network',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
