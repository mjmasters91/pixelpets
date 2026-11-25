import { hungerBand, moodBand } from "../lib/rules";

export function Spark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 0l1.6 5.2L15 6.4l-4.2 2.8L12.2 15 8 11.6 3.8 15l1.4-5.8L1 6.4l5.4-1.2z" fill="#fff4c4" stroke="#8a5a08" strokeWidth="1" />
    </svg>
  );
}

export function Glims({ amount }: { amount: number | null }) {
  return (
    <span className="glim-pill" title="Glims">
      <Spark />
      {amount === null ? "—" : amount.toLocaleString()} Glims
    </span>
  );
}

export function Meter({ kind, value }: { kind: "hunger" | "mood"; value: number }) {
  const label = kind === "hunger" ? hungerBand(value) : moodBand(value);
  const tone = value >= 55 ? "good" : value >= 35 ? "ok" : "low";
  return (
    <div className={`meter tone-${tone}`}>
      <div className="meter-top">
        <span>{kind === "hunger" ? "Hunger" : "Mood"}</span>
        <strong>{label}</strong>
      </div>
      <div className="meter-track" aria-hidden="true">
        <div style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

export function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="18" fill="#fff6d4" stroke="#c88810" strokeWidth="3" />
      <path d="M32 8l3.2 10h-6.4L32 8z" fill="#ffe08a" stroke="#2c241c" strokeWidth="2" />
      <rect x="22" y="18" width="20" height="24" rx="8" fill="#f6c445" stroke="#2c241c" strokeWidth="3" />
      <ellipse cx="32" cy="28" rx="5" ry="4" fill="#fff6cc" />
      <path d="M24 42h16l-2.5 8h-11L24 42z" fill="#f0b429" stroke="#2c241c" strokeWidth="3" />
    </svg>
  );
}
