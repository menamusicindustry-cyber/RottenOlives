import React from 'react';
import './globals.css';
export const metadata = { title: 'Rotten Olives', description: 'Community music reviews (MENA-friendly)' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="header">
  <div className="container header__row">
    <a href="/" className="brand">Rotten Olives</a>
    <nav className="nav">
      <a href="/?region=mena">MENA</a>
      <a href="/about">About</a>
    </nav>
  </div>
</header>

        <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
