import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Peilingen — Café Claude',
  description: 'Herbruikbare poll-engine voor Café Claude.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700&family=Mulish:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
