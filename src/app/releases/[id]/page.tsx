import { prisma } from '@/lib/prisma';

export default async function ReleasePage({ params }: { params: { id: string }}) {
  const release = await prisma.release.findUnique({
    where: { id: params.id },
    include: {
      artist: true,
      scores: true,
      audience: { include: { user: true }, orderBy: { createdAt: 'desc' }, take: 20 }
    }
  });
  if (!release) return <div>Not found.</div>;

  return (
    <div className="grid gap-6">
      <div className="flex items-start gap-6">
        <div className="w-40 h-40 bg-neutral-200 rounded-xl" />
        <div className="flex-1">
          <h1 className="text-3xl font-semibold">{release.title}</h1>
          <div className="opacity-70">{release.artist.name}</div>
          <div className="mt-2 text-sm opacity-70">Audience Score: {release.scores?.audienceScore?.toFixed(0) ?? '—'} / 100</div>
        </div>
      </div>

      <section>
        <h2 className="font-semibold mb-2">Audience Ratings (open to all)</h2>
        <div className="grid gap-3">
          {release.audience.map(a => (
            <div key={a.id} className="border rounded-lg p-3 bg-white">
              <div className="text-sm opacity-70">{a.user.name ?? a.user.email}</div>
              <div className="text-sm">⭐ {a.stars} / 10</div>
              {a.comment && <div className="text-sm opacity-80 mt-1">{a.comment}</div>}
            </div>
          ))}
          {release.audience.length === 0 && <div className="text-sm opacity-70">No audience ratings yet.</div>}
        </div>
      </section>

      <section className="border rounded-2xl bg-white p-4">
        <h3 className="font-semibold mb-2">Write a review</h3>
        <AudienceForm releaseId={release.id} />
        <p className="text-xs opacity-60 mt-2">
          No lyrics or long copyrighted passages. Short quotes only with attribution.
        </p>
      </section>
    </div>
  );
}

function AudienceForm({ releaseId }: { releaseId: string }) {
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget as HTMLFormElement;
        const data = {
          releaseId,
          stars: Number((form.querySelector('[name=stars]') as HTMLInputElement).value),
          comment: (form.querySelector('[name=comment]') as HTMLInputElement).value
        };
        const res = await fetch('/api/rate', { method: 'POST', body: JSON.stringify(data) });
        if (res.ok) location.reload();
        else {
          const j = await res.json().catch(() => ({}));
          alert(j.error || 'Could not submit review.');
        }
      }}
      className="flex gap-3 items-center"
    >
      <label className="text-sm opacity-80">Stars:</label>
      <input name="stars" type="number" min={1} max={10} defaultValue={8} className="border rounded px-2 py-1 w-20" />
      <input name="comment" type="text" placeholder="Say something helpful..." className="flex-1 border rounded px-3 py-2" />
      <button className="px-3 py-2 rounded-lg border bg-neutral-900 text-white" type="submit">Post</button>
    </form>
  );
}
