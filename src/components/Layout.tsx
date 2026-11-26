import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { PetPortrait } from "./PetPortrait";
import { wickClock } from "../lib/rules";
import { useTown } from "../state/Town";
import { BrandMark, Glims } from "./Ui";

const SCENES: Record<string, string> = {
  home: "hero-home.webp",
  login: "login.webp",
  nest: "nest.webp",
  pets: "pet-room.webp",
  shop: "shop-interior.webp",
  arcade: "arcade.webp",
  trade: "trading.webp",
  ring: "ember-ring-arena.webp",
  "ring-fight": "ember-ring-arena.webp",
};

function sceneFor(path: string) {
  if (path === "/") return "home";
  if (path === "/join" || path === "/sign-in") return "login";
  if (path === "/create" || path === "/adopt") return "nest";
  if (path === "/pets" || path.startsWith("/pets/")) return "pets";
  if (path.startsWith("/shops/") && path !== "/shops") return "shop";
  if (path === "/arcade" || path.startsWith("/arcade/")) return "arcade";
  if (path === "/greenboard" || path.startsWith("/greenboard/")) return "trade";
  if (path === "/ring" || path === "/ring/rankings") return "ring";
  if (path.startsWith("/ring/")) return "ring-fight";
  return "";
}

const GROUPS: [string, [string, string][]][] = [
  ["Explore", [
    ["/lands", "Lands"],
    ["/shops", "Shops"],
    ["/arcade", "Arcade"],
    ["/ring", "Ember Ring"],
    ["/ring/rankings", "Rankings"],
  ]],
  ["My Stuff", [
    ["/pets", "My Pets"],
    ["/create", "Hatchery"],
    ["/satchel", "Satchel"],
    ["/dailies", "Dailies"],
  ]],
  ["Community", [
    ["/adopt", "Open Nest"],
    ["/greenboard", "Greenboard"],
    ["/boards", "Boards"],
    ["/circles", "Circles"],
  ]],
];

export function Layout() {
  const town = useTown();
  const location = useLocation();
  const [clock, setClock] = useState(wickClock());
  const [open, setOpen] = useState(false);
  const scene = sceneFor(location.pathname);
  const pet = town.companions[0];
  useEffect(() => {
    const timer = window.setInterval(() => setClock(wickClock()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    document.body.dataset.scene = scene;
    document.body.dataset.demo = town.demo ? "1" : "";
    const art = scene ? `${import.meta.env.BASE_URL}art/pass2/${SCENES[scene]}` : "";
    document.body.style.setProperty("--splash", art ? `url("${art}")` : "none");
    return () => {
      document.body.dataset.scene = "";
    };
  }, [scene, town.demo]);
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <>
      {town.demo && (
        <div className="demo-bar">
          <span>{town.asSender ? "Sample town · steward preview as Sender." : "Sample town · nothing here is written to the real quay."}</span>
          <button type="button" onClick={town.resetTown}>Reset</button>
          <a href={`${import.meta.env.BASE_URL}?demo=0`}>Leave</a>
        </div>
      )}
      <button
        className="menu-toggle"
        type="button"
        aria-expanded={open}
        aria-controls="quay-menu"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "Close" : "Menu"}
      </button>
      {open && <button className="drawer-scrim" type="button" aria-label="Close menu" onClick={() => setOpen(false)} />}
      <aside id="quay-menu" className={`sidebar ${open ? "open" : ""}`}>
        <NavLink to="/" className="brand" end>
          <BrandMark />
          <span>
            <strong className="brand-name">PixelPets</strong>
            <small>Lumenwick</small>
          </span>
        </NavLink>
        {town.profile ? (
          <NavLink className="user-box" to={`/keepers/${town.profile.username}`}>
            {pet ? <PetPortrait species={pet.speciesSlug} tint={pet.tintSlug} alt="" className="user-pet" /> : <span className="user-pet empty" />}
            <span>
              <strong>{town.profile.username}</strong>
              <small>{pet ? pet.name : "No companion yet"}</small>
              <Glims amount={town.glims} />
              <small className="wick-line">Wick {clock}</small>
            </span>
          </NavLink>
        ) : (
          <div className="user-box">
            <span className="user-pet empty" />
            <span>
              <NavLink to="/sign-in">Sign in</NavLink>
              <small className="wick-line">Wick {clock}</small>
            </span>
          </div>
        )}
        <nav className="side-nav">
          {GROUPS.map(([label, links]) => (
            <div key={label}>
              <p className="nav-label">{label}</p>
              {links.map(([to, name]) => (
                <NavLink key={to} to={to} end={to === "/"}>{name}</NavLink>
              ))}
            </div>
          ))}
          {town.profile?.isAdmin && (
            <div>
              <p className="nav-label">Steward</p>
              <NavLink to="/desk">Desk</NavLink>
            </div>
          )}
        </nav>
      </aside>
      <div className="main-col">
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
      </div>
      <div className="toasts">
        {town.toasts.map((item) => (
          <div key={item.id} className={`toast ${item.tone}`}>{item.text}</div>
        ))}
      </div>
    </>
  );
}
