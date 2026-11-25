import { useEffect, useRef, useState } from "react";

type Done = (score: number) => void;

export function LanternCatch({ active, onDone }: { active: boolean; onDone: Done }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const finish = useRef(onDone);
  finish.current = onDone;
  useEffect(() => {
    if (!active || !ref.current) return;
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const colors = ["#f0b429", "#2eb6c7", "#f07830", "#8a64c4"];
    type Body = { x: number; y: number; r: number; vy: number; color: string; kind: "lantern" | "cloud"; sway: number };
    const bodies: Body[] = [];
    let score = 0;
    let combo = 0;
    let last = "";
    let spawn = 0;
    let start = 0;
    let raf = 0;
    let alive = true;
    const click = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
      const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
      const hit = [...bodies].reverse().find((body) => Math.hypot(body.x - x, body.y - y) < body.r + 8);
      if (!hit) return;
      if (hit.kind === "cloud") combo = 0;
      else {
        combo = hit.color === last ? combo + 1 : 1;
        last = hit.color;
        score = Math.min(25000, score + 100 * combo);
      }
      bodies.splice(bodies.indexOf(hit), 1);
    };
    canvas.addEventListener("click", click);
    const frame = (time: number) => {
      if (!alive) return;
      if (!start) start = time;
      const elapsed = time - start;
      if (elapsed > 50000) {
        finish.current(score);
        return;
      }
      if (time - spawn > 680) {
        spawn = time;
        const cloud = Math.random() < 0.18;
        bodies.push({ x: 40 + Math.random() * 720, y: 520, r: cloud ? 34 : 22, vy: cloud ? 38 : 46 + Math.random() * 30, color: colors[Math.floor(Math.random() * colors.length)], kind: cloud ? "cloud" : "lantern", sway: Math.random() * 6 });
      }
      ctx.clearRect(0, 0, 800, 500);
      const sky = ctx.createLinearGradient(0, 0, 0, 500);
      sky.addColorStop(0, "#8fdfff");
      sky.addColorStop(1, "#fff3c4");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, 800, 500);
      for (const body of bodies) {
        body.y -= body.vy * 0.016;
        body.x += Math.sin((time / 400) + body.sway) * 0.6;
        ctx.beginPath();
        if (body.kind === "cloud") {
          ctx.fillStyle = "#f7fbff";
          ctx.strokeStyle = "#2c241c";
          ctx.lineWidth = 3;
          ctx.ellipse(body.x, body.y, body.r, body.r * 0.6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillStyle = body.color;
          ctx.strokeStyle = "#2c241c";
          ctx.lineWidth = 3;
          ctx.arc(body.x, body.y, body.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "rgba(255,255,255,.7)";
          ctx.beginPath();
          ctx.arc(body.x - 6, body.y - 6, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      for (let i = bodies.length - 1; i >= 0; i -= 1) {
        if (bodies[i].y < -40) {
          if (bodies[i].kind === "lantern") combo = 0;
          bodies.splice(i, 1);
        }
      }
      ctx.fillStyle = "#2c241c";
      ctx.font = "700 22px Nunito, sans-serif";
      ctx.fillText(`Score ${score}   combo ${combo}   ${Math.ceil((50000 - elapsed) / 1000)}s`, 16, 32);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      canvas.removeEventListener("click", click);
    };
  }, [active]);
  return <canvas ref={ref} width={800} height={500} className="play-canvas" />;
}

const ICONS = ["🐚", "⭐", "🥐", "🍵", "🔔", "🫧", "🌙", "🔥"];

export function ShoalPairs({ active, onDone }: { active: boolean; onDone: Done }) {
  const [deck, setDeck] = useState<string[]>([]);
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [flips, setFlips] = useState(0);
  const [left, setLeft] = useState(90);
  const done = useRef(false);
  const finish = useRef(onDone);
  finish.current = onDone;
  useEffect(() => {
    if (!active) return;
    const cards = [...ICONS, ...ICONS].sort(() => Math.random() - 0.5);
    setDeck(cards);
    setOpen([]);
    setMatched([]);
    setFlips(0);
    setLeft(90);
    done.current = false;
    const timer = window.setInterval(() => setLeft((value) => value - 1), 1000);
    return () => window.clearInterval(timer);
  }, [active]);
  useEffect(() => {
    if (!active || done.current) return;
    if (left <= 0 || (deck.length > 0 && matched.length === deck.length)) {
      done.current = true;
      const seconds = Math.max(0, left);
      const cleared = matched.length === deck.length && deck.length > 0;
      const score = cleared ? Math.max(0, Math.min(12000, 5000 + seconds * 60 + Math.max(0, 40 - flips) * 80)) : Math.min(12000, (matched.length / 2) * 400);
      finish.current(score);
    }
  }, [active, left, matched.length, deck.length, flips]);
  function turn(index: number) {
    if (!active || matched.includes(index) || open.includes(index) || open.length === 2) return;
    const next = [...open, index];
    setOpen(next);
    setFlips((value) => value + 1);
    if (next.length === 2) {
      const [a, b] = next;
      window.setTimeout(() => {
        if (deck[a] === deck[b]) setMatched((list) => [...list, a, b]);
        setOpen([]);
      }, 550);
    }
  }
  if (!active) return null;
  return (
    <div>
      <p className="muted">{left}s · flips {flips}</p>
      <div className="pairs">
        {deck.map((icon, index) => {
          const shown = open.includes(index) || matched.includes(index);
          return <button key={index} type="button" className={`pair ${shown ? "open" : ""}`} onClick={() => turn(index)}>{shown ? icon : ""}</button>;
        })}
      </div>
    </div>
  );
}

export function ParcelSort({ active, onDone }: { active: boolean; onDone: Done }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const finish = useRef(onDone);
  finish.current = onDone;
  useEffect(() => {
    if (!active || !ref.current) return;
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const kinds = [
      { id: 0, name: "Bun", color: "#f0b429" },
      { id: 1, name: "Tea", color: "#7dcc8e" },
      { id: 2, name: "Spice", color: "#f07830" },
    ];
    let parcel = { y: -20, kind: 0 };
    let score = 0;
    let combo = 1;
    let start = 0;
    let alive = true;
    let raf = 0;
    const spawn = () => { parcel = { y: -30, kind: Math.floor(Math.random() * 3) }; };
    spawn();
    const sort = (bin: number) => {
      if (parcel.y < 300) return;
      if (bin === parcel.kind) {
        score = Math.min(18000, score + 200 * combo);
        combo = Math.min(12, combo + 1);
      } else combo = 1;
      spawn();
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "1" || event.key === "2" || event.key === "3") sort(Number(event.key) - 1);
    };
    const click = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
      sort(x < 266 ? 0 : x < 534 ? 1 : 2);
    };
    window.addEventListener("keydown", key);
    canvas.addEventListener("click", click);
    const frame = (time: number) => {
      if (!alive) return;
      if (!start) start = time;
      const elapsed = time - start;
      if (elapsed > 60000) {
        finish.current(score);
        return;
      }
      parcel.y += 2.2;
      if (parcel.y > 470) { combo = 1; spawn(); }
      ctx.clearRect(0, 0, 800, 500);
      ctx.fillStyle = "#fff6e4";
      ctx.fillRect(0, 0, 800, 500);
      kinds.forEach((kind, index) => {
        ctx.fillStyle = kind.color;
        ctx.strokeStyle = "#2c241c";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.roundRect(20 + index * 260, 400, 230, 80, 18);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#2c241c";
        ctx.font = "800 22px Nunito, sans-serif";
        ctx.fillText(`${index + 1} ${kind.name}`, 70 + index * 260, 448);
      });
      const kind = kinds[parcel.kind];
      ctx.fillStyle = kind.color;
      ctx.strokeStyle = "#2c241c";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(360, parcel.y, 80, 64, 16);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#2c241c";
      ctx.font = "800 18px Nunito, sans-serif";
      ctx.fillText(kind.name, 376, parcel.y + 38);
      ctx.font = "700 22px Nunito, sans-serif";
      ctx.fillText(`Score ${score}  combo ${combo}  ${Math.ceil((60000 - elapsed) / 1000)}s`, 16, 32);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", key);
      canvas.removeEventListener("click", click);
    };
  }, [active]);
  return <canvas ref={ref} width={800} height={500} className="play-canvas" />;
}

export function QuayDash({ active, onDone }: { active: boolean; onDone: Done }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const finish = useRef(onDone);
  finish.current = onDone;
  useEffect(() => {
    if (!active || !ref.current) return;
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let y = 360;
    let vy = 0;
    let score = 0;
    let hits = 0;
    let start = 0;
    let alive = true;
    let raf = 0;
    let stumble = 0;
    const things: { x: number; kind: "spark" | "crate" }[] = [];
    let cursor = 900;
    const hop = () => { if (y >= 358) vy = -13; };
    const key = (event: KeyboardEvent) => { if (event.code === "Space") { event.preventDefault(); hop(); } };
    canvas.addEventListener("pointerdown", hop);
    window.addEventListener("keydown", key);
    const frame = (time: number) => {
      if (!alive) return;
      if (!start) start = time;
      const elapsed = time - start;
      if (elapsed > 45000 || hits >= 3) {
        finish.current(Math.min(20000, score));
        return;
      }
      const speed = stumble > time ? 3 : 6;
      vy += 0.55;
      y = Math.min(360, y + vy);
      if (y >= 360) vy = 0;
      while (cursor < 900) {
        things.push({ x: 860 + Math.random() * 40, kind: Math.random() < 0.55 ? "spark" : "crate" });
        cursor += 180;
      }
      cursor -= speed;
      for (const thing of things) thing.x -= speed;
      for (let i = things.length - 1; i >= 0; i -= 1) {
        const thing = things[i];
        const near = thing.x < 180 && thing.x > 100;
        if (!near) continue;
        if (thing.kind === "spark" && y < 340) {
          score = Math.min(20000, score + 120);
          things.splice(i, 1);
        } else if (thing.kind === "crate" && y > 320 && stumble < time) {
          hits += 1;
          stumble = time + 700;
          things.splice(i, 1);
        }
      }
      score = Math.min(20000, score + (stumble > time ? 0 : 1));
      ctx.clearRect(0, 0, 800, 500);
      const sky = ctx.createLinearGradient(0, 0, 0, 500);
      sky.addColorStop(0, "#7fd4f5");
      sky.addColorStop(1, "#ffe7b0");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, 800, 500);
      ctx.fillStyle = "#f4d7a2";
      ctx.fillRect(0, 410, 800, 90);
      ctx.strokeStyle = "#2c241c";
      ctx.lineWidth = 4;
      ctx.strokeRect(0, 410, 800, 90);
      ctx.fillStyle = stumble > time ? "#d4537e" : "#f0b429";
      ctx.beginPath();
      ctx.roundRect(120, y, 46, 52, 14);
      ctx.fill();
      ctx.stroke();
      for (const thing of things) {
        if (thing.kind === "spark") {
          ctx.fillStyle = "#fff4c4";
          ctx.beginPath();
          ctx.arc(thing.x, 360, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillStyle = "#c47a3a";
          ctx.fillRect(thing.x, 370, 46, 40);
          ctx.strokeRect(thing.x, 370, 46, 40);
        }
      }
      ctx.fillStyle = "#2c241c";
      ctx.font = "700 22px Nunito, sans-serif";
      ctx.fillText(`Score ${score}  stumbles ${hits}/3  ${Math.ceil((45000 - elapsed) / 1000)}s`, 16, 32);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", hop);
      window.removeEventListener("keydown", key);
    };
  }, [active]);
  return <canvas ref={ref} width={800} height={500} className="play-canvas" />;
}
