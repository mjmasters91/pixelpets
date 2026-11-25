import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { wickClock } from "../lib/rules";
import { useTown } from "../state/Town";
import { BrandMark, Glims } from "./Ui";

function sceneFor(path: string) {
  if (path === "/join" || path === "/sign-in") return "login";
  if (path === "/create" || path === "/adopt") return "nest";
  if (path === "/pets" || path.startsWith("/pets/")) return "pets";
  if (path.startsWith("/shops/") && path !== "/shops") return "shop";
  if (path === "/arcade" || path.startsWith("/arcade/")) return "arcade";
  if (path === "/greenboard" || path.startsWith("/greenboard/")) return "trade";
  if (path === "/ring") return "ring";
  if (path.startsWith("/ring/")) return "ring-fight";
  return "";
}

const LINKS = [
  ["/", "Harborlight"],
  ["/pets", "My Pets"],
  ["/create", "Hatchery"],
  ["/adopt", "Open Nest"],
  ["/lands", "Lands"],
  ["/shops", "Shops"],
  ["/ring", "Ember Ring"],
  ["/greenboard", "Greenboard"],
  ["/arcade", "Arcade"],
  ["/dailies", "Dailies"],
  ["/boards", "Boards"],
  ["/circles", "Circles"],
  ["/satchel", "Satchel"],
];

export function Layout() {
  const town = useTown();
  const location = useLocation();
  const [clock, setClock] = useState(wickClock());
  useEffect(() => {
    const timer = window.setInterval(() => setClock(wickClock()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    document.body.dataset.scene = sceneFor(location.pathname);
    return () => {
      document.body.dataset.scene = "";
    };
  }, [location.pathname]);
  return (
    <>
      {town.demo && (
        <div className="demo-bar">
          <span>{town.asSender ? "Sample town · steward preview as Sender." : "Sample town · nothing here is written to the real quay."}</span>
          <button type="button" onClick={town.resetTown}>Reset the town</button>
          <a href={`${import.meta.env.BASE_URL}?demo=0`}>Leave the sample</a>
        </div>
      )}
      <header className="topbar">
        <div className="topbar-row">
          <NavLink to="/" className="brand">
            <BrandMark />
            <span>
              <strong className="brand-name">PixelPets</strong>
              <small>Lumenwick</small>
            </span>
          </NavLink>
          <div className="top-meta">
            <span className="wick">Wick Time {clock}</span>
            {town.profile && <Glims amount={town.glims} />}
            {town.profile ? (
              <NavLink className="who" to={`/keepers/${town.profile.username}`}>{town.profile.username}</NavLink>
            ) : (
              <NavLink className="who" to="/sign-in">Sign in</NavLink>
            )}
          </div>
        </div>
        <div className="nav-wrap">
          <nav className="nav">
            {LINKS.map(([to, label]) => (
              <NavLink key={to} to={to} end={to === "/"}>{label}</NavLink>
            ))}
            {town.profile?.isAdmin && <NavLink to="/desk">Steward</NavLink>}
          </nav>
        </div>
      </header>
      <main className="shell">
        {town.banner && <p className="banner bad">{town.banner}</p>}
        <Outlet />
      </main>
      <footer className="footer">
        <span>PixelPets is an original world. Companions do not waste away.</span>
        <span>
          <NavLink to="/about">About</NavLink> · <NavLink to="/rules">Rules</NavLink> · <NavLink to="/privacy">Privacy</NavLink>
        </span>
      </footer>
      <div className="toasts">
        {town.toasts.map((item) => (
          <div key={item.id} className={`toast ${item.tone}`}>{item.text}</div>
        ))}
      </div>
    </>
  );
}
