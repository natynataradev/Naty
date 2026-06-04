import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Naty — Panel',
  description: 'Panel de gestión Natara La Cima',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body>{children}</body>
    </html>
  );
}
