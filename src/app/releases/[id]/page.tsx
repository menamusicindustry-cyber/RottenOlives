<section className="card">
  <h3>Write a review</h3>
  <form
    className="form-row"
    onSubmit={async (e) => {
      e.preventDefault();
      const form = e.currentTarget as HTMLFormElement;
      const stars = Number((form.querySelector('[name=stars]') as HTMLInputElement).value);
      const comment = (form.querySelector('[name=comment]') as HTMLInputElement).value;
      const name = (form.querySelector('[name=name]') as HTMLInputElement).value;

      const res = await fetch("/api/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ releaseId: /* your release id */ "{{RELEASE_ID}}", stars, comment, name }),
      });

      if (res.ok) location.reload();
      else {
        const j = await res.json().catch(() => ({}));
        alert(j.error || "Could not submit review.");
      }
    }}
  >
    <label className="meta">Name (optional)</label>
    <input name="name" type="text" placeholder="e.g., Lina" className="input" />

    <label className="meta">Stars</label>
    <input name="stars" type="number" min={1} max={10} defaultValue={8} className="input" required />

    <input name="comment" type="text" placeholder="Say something helpful…" className="input--wide" />
    <button className="btn btn--primary" type="submit">Post</button>
  </form>
  <div className="help">Please avoid posting lyrics or long copyrighted text.</div>
</section>
