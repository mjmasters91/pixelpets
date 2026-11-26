import { Link } from "react-router-dom";

export function About() {
  return (
    <article className="card">
      <p className="kicker">About</p>
      <h1>What Lumenwick is</h1>
      <p>PixelPets is its own world, written and drawn for this site. Harborlight, Mossglen, Cinderreach, and Silvershoal are ferry stops. Companions are adopted, fed, and played with. Glims are the only currency, and they are not money.</p>
      <p>The site is not affiliated with any other virtual-pet game. Names, species, and rules here were made for Lumenwick.</p>
      <p>A hungry or gloomy companion only looks it. There is a free daily meal so an empty pantry is never a trap.</p>
    </article>
  );
}

export function Rules() {
  return (
    <article className="card">
      <p className="kicker">Rules</p>
      <h1>Conduct on the quay</h1>
      <ul>
        <li>Be decent. No slurs, no harassment, no dating, and no asking for real-world contact.</li>
        <li>Boards are plain text. Links and mail addresses are turned away.</li>
        <li>Trades are for Glims and items inside Lumenwick. Not for real money.</li>
        <li>A keeper may own four companions. Names stay reserved after a release.</li>
        <li>Arcade scores are capped. Cheating the books just gets a score rejected.</li>
        <li>Stewards may hide a post, lock a thread, clear basket junk, or ban a keeper.</li>
      </ul>
    </article>
  );
}

export function Privacy() {
  return (
    <article className="card">
      <p className="kicker">Privacy</p>
      <h1>What is kept</h1>
      <p>The site is a static page on GitHub Pages. Accounts, if you make one, are stored by the Supabase project for this game: email, a public username, a short bio, companions, and the Glims ledger.</p>
      <p>Usernames, bios, companion lineups, and Glim totals can be seen by other keepers. Satchels, offers you have not accepted, and game sessions stay private except to you and a steward.</p>
      <p>The sample town (<code>?demo=1</code>) never leaves your browser. There is no sale of this information, and there is no real-money shop.</p>
    </article>
  );
}

export function Missing() {
  return (
    <div className="card missing">
      <p className="kicker">404</p>
      <h1>This ferry does not stop here</h1>
      <p>That path is not on the quay map. The towns, the nest, and the Ember Ring are still lit.</p>
      <div className="row-actions">
        <Link className="btn" to="/">Back home</Link>
        <Link className="btn secondary" to="/towns">Visit the towns</Link>
      </div>
    </div>
  );
}
