export default function About() {
  return (
    <div className="prose prose-sm max-w-none">
      <h1>About Rotten Olives</h1>
      <p>Community-driven music reviews with a MENA-friendly focus. Audience ratings only (for now).</p>

      <h2>How tracks are added</h2>
      <ul>
        <li>We use the Spotify Web API to fetch release metadata (artist, title, cover art, release date, etc.).</li>
        <li>We regularly import songs from public playlists curated by MENA record labels and official regional editorial lists.</li>
        <li>If a track appears in those playlists, we queue it for ingestion and make it available for rating once processed.</li>
      </ul>

      <h2>If you can’t find a song</h2>
      <p>
        Missing something? DM us on Instagram at{" "}
        <a
          href="https://www.instagram.com/menamusicindustry/"
          target="_blank"
          rel="noopener noreferrer"
        >
          @menamusicindustry
        </a>{" "}
        with the Spotify link and we’ll add it.
      </p>

      <h2>Content policy</h2>
      <ul>
        <li>Don’t paste lyrics or long copyrighted text. Short quotes with attribution are okay.</li>
        <li>Cover art is shown via links/embeds only.</li>
        <li>One rating per user per release and one per IP per release to prevent spam.</li>
      </ul>

  );
}
