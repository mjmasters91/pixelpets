import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { checkDisplayName, checkUsername } from "../lib/rules";
import { useTown } from "../state/Town";

export function Join() {
  const { api, act, demo } = useTown();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "", username: "", displayName: "" });
  const [note, setNote] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      checkUsername(form.username);
      checkDisplayName(form.displayName || form.username);
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Check the form.");
      return;
    }
    const ok = await act(async () => {
      const result = await api.signUp({ ...form, displayName: form.displayName || form.username });
      setNote(result.needsConfirm ? "Check your mail for the quay lantern, then sign in." : "Welcome to Harborlight.");
      if (!result.needsConfirm) navigate("/pets");
    });
    if (!ok && !note) setNote("");
  }

  return (
    <form className="card" onSubmit={onSubmit} style={{ maxWidth: 520 }}>
      <p className="kicker">Join</p>
      <h1>Take a quay name</h1>
      <p>Usernames are public. The first confirmed signup is granted 500 Glims by the books, not by this page.</p>
      {demo && <p className="banner">This sample town keeps the account in your browser only.</p>}
      <label className="field">Username<input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required /></label>
      <label className="field">Display name<input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} /></label>
      <label className="field">Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
      <label className="field">Password<input type="password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label>
      {note && <p className="banner">{note}</p>}
      <button className="btn" type="submit">Create keeper</button>
      <p>Already known here? <Link to="/sign-in">Sign in</Link></p>
    </form>
  );
}

export function SignIn() {
  const { api, act, demo } = useTown();
  const navigate = useNavigate();
  const [email, setEmail] = useState(demo ? "mira@example.com" : "");
  const [password, setPassword] = useState("");
  const [reset, setReset] = useState(false);
  const [nextPassword, setNextPassword] = useState("");

  return (
    <div className="card" style={{ maxWidth: 520 }}>
      <p className="kicker">Sign in</p>
      <h1>Back to the quay</h1>
      {demo && <p className="banner">Sample mail: mira@example.com, or sender@example.com for the steward desk. Any password works here.</p>}
      <form onSubmit={(event) => { event.preventDefault(); void act(async () => { await api.signIn(email, password || "sample-town"); navigate("/"); }, "Signed in."); }}>
        <label className="field">Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        {!demo && <label className="field">Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>}
        <button className="btn" type="submit">Sign in</button>
      </form>
      <p><button className="btn ghost" type="button" onClick={() => setReset((v) => !v)}>Forgot password</button></p>
      {reset && (
        <form onSubmit={(event) => { event.preventDefault(); void act(async () => { await api.requestReset(email); }, "If that mail is known, a reset is on its way."); }}>
          <button className="btn secondary" type="submit">Send reset</button>
        </form>
      )}
      {!demo && (
        <form onSubmit={(event) => { event.preventDefault(); void act(async () => { await api.updatePassword(nextPassword); }, "Password updated."); }}>
          <label className="field">New password after a reset link<input type="password" minLength={8} value={nextPassword} onChange={(e) => setNextPassword(e.target.value)} /></label>
          <button className="btn secondary" type="submit">Save password</button>
        </form>
      )}
      <p><button className="btn ghost" type="button" onClick={() => void act(async () => { await api.signOut(); })}>Sign out</button></p>
      <p>New here? <Link to="/join">Join</Link></p>
    </div>
  );
}
