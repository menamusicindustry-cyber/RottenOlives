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
            <div className="brand">
              <Link href="/" aria-label="Rotten Olives home">
                <Image
                  src="/rotten-olives-logo.png"
                  alt="Rotten Olives"
                  width={320}   // ⬅️ bigger by default
                  height={128}
                  priority
                  className="brand__logo"
                />
              </Link>

              <span className="brand__subtitle">
                by the idiots at
                {" "}
                <a
                  href="https://instagram.com/menamusicindustry"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  menamusicindustry
                </a>
              </span>
            </div>

            <form action="/" method="GET" className="search">
  <input
    type="text"
    name="q"
    placeholder="Search artists or songs…"
    aria-label="Search"
  />
</form>


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
