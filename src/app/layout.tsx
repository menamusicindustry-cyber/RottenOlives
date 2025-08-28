import React from "react";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Rotten Olives",
  description: "Community music reviews (MENA-friendly)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="header">
          <div className="container header__row">
            <Link href="/" className="brand" aria-label="Rotten Olives home">
              <Image
                src="/rotten-olives-logo.png"  // must be in public/ to work
                alt="Rotten Olives"
                width={180}
                height={72}
                priority
              />
            </Link>
            <nav className="nav">
              <Link href="/?region=mena">MENA</Link>
              <Link href="/about">About</Link>
            </nav>
          </div>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
