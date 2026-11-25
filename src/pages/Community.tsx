import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import type { CircleView, InviteView, PostView, ThreadView } from "../lib/types";
import { useTown } from "../state/Town";

export function Boards() {
  const { api } = useTown();
  const [boards, setBoards] = useState<{ slug: string; title: string; blurb: string }[]>([]);
  useEffect(() => { api.boards().then(setBoards).catch(() => setBoards([])); }, [api]);
  return (
    <div>
      <p className="kicker">The Quay Boards</p>
      <h1>Plain talk only</h1>
      <p>No links, no outside contact, and no trades for real money. A steward can hide a post or lock a thread.</p>
      <div className="stack">
        {boards.map((board) => (
          <Link key={board.slug} className="card" to={`/boards/${board.slug}`}>
            <h2>{board.title}</h2>
            <p>{board.blurb}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function ThreadPage() {
  const { slug = "", threadId } = useParams();
  const { api, act, profile } = useTown();
  const [threads, setThreads] = useState<ThreadView[]>([]);
  const [detail, setDetail] = useState<{ title: string; locked: boolean; posts: PostView[] } | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [reason, setReason] = useState("Breaks the quay rules.");
  function load() {
    if (threadId) api.posts(threadId).then((row) => setDetail(row ? { title: row.thread.title, locked: row.thread.locked, posts: row.posts } : null));
    else api.threads(slug).then(setThreads).catch(() => setThreads([]));
  }
  useEffect(load, [api, slug, threadId]);
  if (!threadId) {
    return (
      <div className="stack">
        <p className="kicker">Board</p>
        <h1>{slug}</h1>
        {threads.map((thread) => (
          <Link key={thread.id} className="card" to={`/boards/${slug}/${thread.id}`}>
            <strong>{thread.title}</strong>
            <p className="muted">{thread.author} · {thread.locked ? "locked" : "open"}</p>
          </Link>
        ))}
        {profile && (
          <form className="card" onSubmit={(event) => { event.preventDefault(); void act(() => api.createThread(slug, title, body), "Thread posted.").then(load); }}>
            <h2>Start a thread</h2>
            <label className="field">Title<input value={title} onChange={(e) => setTitle(e.target.value)} required /></label>
            <label className="field">Post<textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} required /></label>
            <button className="btn" type="submit">Post</button>
          </form>
        )}
      </div>
    );
  }
  return (
    <div className="card">
      <p className="kicker"><Link to={`/boards/${slug}`}>Back</Link></p>
      <h1>{detail?.title ?? "Thread"}</h1>
      {detail?.posts.map((post) => (
        <article key={post.id} className="thread">
          <strong>{post.author}</strong>
          <p>{post.body}</p>
          {profile && (
            <form onSubmit={(event: FormEvent) => { event.preventDefault(); void act(() => api.report("post", post.id, reason), "Report sent to the desk."); }}>
              <input value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Report reason" />
              <button className="btn ghost" type="submit">Report</button>
              {profile.isAdmin && <button className="btn ghost" type="button" onClick={() => void act(() => api.stewardHide(post.id), "Post visibility changed.")}>Hide</button>}
            </form>
          )}
        </article>
      ))}
      {profile && detail && !detail.locked && (
        <form onSubmit={(event) => { event.preventDefault(); void act(() => api.reply(threadId, body), "Reply posted.").then(() => setBody("")).then(load); }}>
          <label className="field">Reply<textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} required /></label>
          <button className="btn" type="submit">Reply</button>
        </form>
      )}
      {profile?.isAdmin && <button className="btn secondary" type="button" onClick={() => void act(() => api.stewardLock(threadId, true), "Thread locked.")}>Lock thread</button>}
    </div>
  );
}

export function Circles() {
  const { api, act, profile } = useTown();
  const [rows, setRows] = useState<CircleView[]>([]);
  const [invites, setInvites] = useState<InviteView[]>([]);
  function load() {
    api.circles().then(setRows).catch(() => setRows([]));
    api.invites().then(setInvites).catch(() => setInvites([]));
  }
  useEffect(load, [api]);
  return (
    <div className="stack">
      <div>
        <p className="kicker">Circles</p>
        <h1>One circle at a time</h1>
        <p>A circle has a keeper, a motto, and a private board. You may belong to one.</p>
        {profile && <Link className="btn" to="/circles/new">Start a circle</Link>}
      </div>
      {invites.map((invite) => (
        <div key={invite.id} className="card">
          <p>Invite to {invite.circleName}</p>
          <button className="btn" type="button" onClick={() => void act(() => api.respondInvite(invite.id, true), "Joined.").then(load)}>Accept</button>
          <button className="btn secondary" type="button" onClick={() => void act(() => api.respondInvite(invite.id, false), "Declined.").then(load)}>Decline</button>
        </div>
      ))}
      {rows.map((circle) => (
        <Link key={circle.id} className="card" to={`/circles/${circle.slug}`}>
          <h2>{circle.name}</h2>
          <p>{circle.motto}</p>
          <p className="muted">{circle.members.length} members · {circle.isOpen ? "open" : "invite only"}</p>
        </Link>
      ))}
    </div>
  );
}

export function NewCircle() {
  const { api, act, profile } = useTown();
  const [form, setForm] = useState({ name: "", slug: "", motto: "", about: "", isOpen: true });
  if (!profile) return <p><Link to="/sign-in">Sign in</Link> to start a circle.</p>;
  return (
    <form className="card" onSubmit={(event) => { event.preventDefault(); void act(() => api.createCircle(form), "Circle founded."); }}>
      <h1>New circle</h1>
      <label className="field">Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
      <label className="field">Link<input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="quay-lanterns" required /></label>
      <label className="field">Motto<input value={form.motto} onChange={(e) => setForm({ ...form, motto: e.target.value })} required /></label>
      <label className="field">About<textarea value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} /></label>
      <label><input type="checkbox" checked={form.isOpen} onChange={(e) => setForm({ ...form, isOpen: e.target.checked })} /> Open to join</label>
      <button className="btn" type="submit">Create</button>
    </form>
  );
}

export function CirclePage() {
  const { slug = "" } = useParams();
  const { api, act, profile } = useTown();
  const [circle, setCircle] = useState<CircleView | null>(null);
  const [threads, setThreads] = useState<ThreadView[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [invite, setInvite] = useState("");
  function load() {
    api.circle(slug).then(setCircle);
    api.circleBoard(slug).then(setThreads).catch(() => setThreads([]));
  }
  useEffect(load, [api, slug]);
  if (!circle) return <div className="card"><h1>Circle not found</h1></div>;
  const mine = circle.members.some((member) => member.username === profile?.username);
  const keeper = circle.members.some((member) => member.username === profile?.username && (member.role === "keeper" || member.role === "guide"));
  return (
    <div className="stack">
      <section className="card">
        <p className="kicker">{circle.isOpen ? "Open circle" : "Invite only"}</p>
        <h1>{circle.name}</h1>
        <p>{circle.motto}</p>
        <p>{circle.about}</p>
        <ul>{circle.members.map((member) => <li key={member.username}>{member.username} · {member.role}</li>)}</ul>
        {profile && !mine && circle.isOpen && <button className="btn" type="button" onClick={() => void act(() => api.joinCircle(circle.id), "Welcome in.").then(load)}>Join</button>}
        {mine && <button className="btn secondary" type="button" onClick={() => void act(() => api.leaveCircle(circle.id), "You left the circle.").then(load)}>Leave</button>}
        {keeper && (
          <form onSubmit={(event) => { event.preventDefault(); void act(() => api.inviteCircle(circle.id, invite), "Invite sent."); }}>
            <label className="field">Invite by username<input value={invite} onChange={(e) => setInvite(e.target.value)} /></label>
            <button className="btn secondary" type="submit">Invite</button>
          </form>
        )}
      </section>
      {mine && (
        <section className="card">
          <h2>Circle board</h2>
          {threads.map((thread) => <p key={thread.id}><strong>{thread.title}</strong> · {thread.author}</p>)}
          <form onSubmit={(event) => { event.preventDefault(); void act(() => api.createThread(`circle:${slug}`, title, body), "Posted to the circle.").then(load); }}>
            <label className="field">Title<input value={title} onChange={(e) => setTitle(e.target.value)} required /></label>
            <label className="field">Post<textarea value={body} onChange={(e) => setBody(e.target.value)} required /></label>
            <button className="btn" type="submit">Post</button>
          </form>
        </section>
      )}
    </div>
  );
}
