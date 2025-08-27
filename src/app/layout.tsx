import React from 'react';
import './globals.css';
export const metadata = { title: 'Rotten Olives', description: 'Community music reviews (MENA-friendly)' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-50 text-neutral-900">
        <header className="sticky top-0 z-10 border-b bg-white/70 backdrop-blur">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <a href="/" className="font-bold">Rotten Olives</a>
            <nav className="text-sm flex gap-4">
              <a href="/?region=mena" className="hover:underline">MENA</a>
              <a href="/about" className="hover:underline">About</a>
            </nav>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
