import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type HomeProps = { searchParams?: { q?: string; page?: string } };

export default async function HomePage({ searchParams }: HomeProps) {
  const q = (searchParams?.q ?? "").toString().trim().slice(0, 80);
  const page = Math.max(1, Number(searchParams?.page) || 1);
  const per = 60; // items per page

  const where = q
    ? {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { artist: { name: { contains: q, mode: "insensitive" } } },
        ],
      }
    : undefined;

  const [total, releases] = await Promise.all([
    prisma.release.count({ where }),
    prisma.release.findMany({
      where,
      include: { artist: true, scores: true },
      orderBy: [{ releaseDate: "desc" }, { id: "desc" }], // stable tie-break
      skip: (page - 1) * per,
      take: per,
    }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / per));
  const rangeFrom = total === 0 ? 0 : (page - 1) * per + 1;
  const rangeTo = Math.min(total, page * per);

  // prev/next hrefs while preserving `q`
  const prevParams = new URLSearchParams();
  if (q) prevParams.set("q", q);
  prevParams.set("page", String(Math.max(1, page - 1)));
  const nextParams = new URLSearchParams();
  if (q) nextParams.set("q", q);
  nextParams.set("page", String(Math.min(pageCount, page + 1)));

  const prevHref = `/?${prevParams.toString()}`;
  const nextHref = `/?${nextParams.toString()}`;

  return (
    <div className="section container">
      {q ? (
        <div className="card">
          <h1 style={{ margin: 0 }}>Search results</h1>
          <div className="meta">
            Query: “{q}” — {total} release{total === 1 ? "" : "s"} found
          </div>
        </div>
      ) : (
        <h1>Rotten Olives — Latest Releases</h1>
      )}

      {releases.length === 0 ? (
        <div className="card">
          <div className="meta">{q ? "No releases found." : "No releases yet."}</div>
        </div>
      ) : (
        <>
          <div className="grid grid--mobile-3">
            {releases.map((r) => (
              <Link
                key={r.id}
                href={`/releases/${r.id}`}
                className="card col"
                aria-label={`${r.title} by ${r.artist?.name || "Unknown"}`}
              >
                <div className="song-cover">
                  {r.coverUrl ? (
                    <img src={r.coverUrl} alt={`${r.title} cover`} />
                  ) : (
                    <span>No Cover</span>
                  )}
                </div>
                <h3 className="title">{r.title}</h3>
                <div className="meta">{r.artist?.name || "Unknown Artist"}</div>
                <div className="meta">
                  Audience score: {Math.round(r.scores?.audienceScore ?? 0)} ·{" "}
                  {r.scores?.audienceCount ?? 0} ratings
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          <nav className="pager">
            <Link
              href={prevHref}
              className="btn"
              aria-disabled={page <= 1}
              style={page <= 1 ? { pointerEvents: "none", opacity: 0.5 } : undefined}
            >
              ← Prev
            </Link>

            <div className="pager__info">
              Page {page} of {pageCount} · Showing {rangeFrom}–{rangeTo} of {total}
            </div>

            <Link
              href={nextHref}
              className="btn"
              aria-disabled={page >= pageCount}
              style={page >= pageCount ? { pointerEvents: "none", opacity: 0.5 } : undefined}
            >
              Next →
            </Link>
          </nav>
        </>
      )}
    </div>
  );
}
