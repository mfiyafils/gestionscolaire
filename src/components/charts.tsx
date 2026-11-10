"use client";
import { useId } from "react";

/* ── Stacked bars (boys/girls per class) ───────────────────── */
export function StackedBars({ items, colorA, colorB, labelA, labelB, height = 210 }: {
  items: { label: string; a: number; b: number }[];
  colorA: string; colorB: string; labelA: string; labelB: string; height?: number;
}) {
  const max = Math.max(4, ...items.map((i) => i.a + i.b));
  const step = Math.max(1, Math.ceil(max / 4));
  const top = step * 4;
  const W = Math.max(320, items.length * 74);
  const H = height;
  const padB = 30, padT = 18, padL = 30;
  const bw = Math.min(40, (W - padL) / items.length - 22);
  return (
    <div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", minWidth: Math.min(W, 560) }} role="img">
          {[0, 1, 2, 3, 4].map((i) => {
            const y = padT + (H - padB - padT) * (1 - i / 4);
            return (
              <g key={i}>
                <line x1={padL} x2={W - 6} y1={y} y2={y} stroke="#173f2f" strokeOpacity="0.1" strokeDasharray={i === 0 ? "" : "3 4"} />
                <text x={padL - 6} y={y + 3.5} fontSize="9.5" fill="#5c6657" textAnchor="end">{step * i}</text>
              </g>
            );
          })}
          {items.map((it, idx) => {
            const x = padL + ((W - padL - 10) / items.length) * idx + ((W - padL - 10) / items.length - bw) / 2;
            const unit = (H - padB - padT) / top;
            const hA = it.a * unit, hB = it.b * unit;
            const yA = H - padB - hA, yB = yA - hB;
            return (
              <g key={it.label} className="anim-bar" style={{ animationDelay: `${idx * 70}ms`, transformOrigin: `${x}px ${H - padB}px` }}>
                <title>{`${it.label} — ${labelA}: ${it.a} · ${labelB}: ${it.b}`}</title>
                <rect x={x} y={yA} width={bw} height={Math.max(0, hA - 1)} rx="4" fill={colorA} className="hover:opacity-80 transition-opacity" />
                <rect x={x} y={yB} width={bw} height={Math.max(0, hB - 1)} rx="4" fill={colorB} className="hover:opacity-80 transition-opacity" />
                <text x={x + bw / 2} y={yB - 5} fontSize="10" fontWeight="700" fill="#22301f" textAnchor="middle">{it.a + it.b}</text>
                <text x={x + bw / 2} y={H - padB + 14} fontSize="9.5" fontWeight="600" fill="#5c6657" textAnchor="middle">{it.label}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="flex gap-4 justify-center mt-1 text-[11px] font-bold text-inkmut">
        <span className="inline-flex items-center gap-1.5"><i className="w-3 h-3 rounded-[4px]" style={{ background: colorA }} /> {labelA}</span>
        <span className="inline-flex items-center gap-1.5"><i className="w-3 h-3 rounded-[4px]" style={{ background: colorB }} /> {labelB}</span>
      </div>
    </div>
  );
}

/* ── Donut with direct labels ──────────────────────────────── */
export function Donut({ slices, centerLabel, centerValue, size = 168 }: {
  slices: { label: string; value: number; color: string }[];
  centerLabel: string; centerValue: string; size?: number;
}) {
  const total = Math.max(1, slices.reduce((a, s) => a + s.value, 0));
  const R = 56, C = 2 * Math.PI * R;
  let acc = 0;
  const id = useId();
  return (
    <div className="flex items-center gap-5 flex-wrap justify-center">
      <svg width={size} height={size} viewBox="0 0 160 160" role="img">
        <circle cx="80" cy="80" r={R} fill="none" stroke="#e8e1cc" strokeWidth="20" />
        {slices.map((s, i) => {
          const frac = s.value / total;
          const dash = frac * C;
          const off = acc * C;
          acc += frac;
          if (s.value === 0) return null;
          return (
            <circle key={id + i} cx="80" cy="80" r={R} fill="none" stroke={s.color} strokeWidth="20"
              strokeDasharray={`${Math.max(0, dash - 2)} ${C - dash + 2}`} strokeDashoffset={-off}
              transform="rotate(-90 80 80)" strokeLinecap="butt" className="transition-all hover:opacity-80">
              <title>{`${s.label}: ${s.value} (${Math.round(frac * 100)}%)`}</title>
            </circle>
          );
        })}
        <text x="80" y="76" textAnchor="middle" fontSize="24" fontWeight="800" fill="#173f2f" fontFamily="Fraunces, serif">{centerValue}</text>
        <text x="80" y="94" textAnchor="middle" fontSize="9" fontWeight="600" fill="#5c6657" letterSpacing="1">{centerLabel.toUpperCase()}</text>
      </svg>
      <ul className="space-y-2 min-w-[130px]">
        {slices.map((s, i) => (
          <li key={i} className="flex items-center gap-2 text-xs font-semibold text-ink">
            <i className="w-3 h-3 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="grow">{s.label}</span>
            <b className="tabular">{s.value}</b>
            <span className="text-inkmut tabular w-9 text-right">{Math.round((s.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Area sparkline (cash last 14 days) ────────────────────── */
export function Sparkline({ points, labels, color = "#2E9E6B", height = 74, format }: {
  points: number[]; labels: string[]; color?: string; height?: number; format: (n: number) => string;
}) {
  const id = useId();
  const W = 320, H = height, pad = 6;
  const max = Math.max(1, ...points);
  const stepX = (W - pad * 2) / Math.max(1, points.length - 1);
  const coords = points.map((p, i) => [pad + i * stepX, H - pad - (p / max) * (H - pad * 2 - 8)] as const);
  const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${coords[coords.length - 1][0]},${H - pad} L${coords[0][0]},${H - pad} Z`;
  const last = coords[coords.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%" }} role="img">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeDasharray="240" style={{ animation: "dashDraw 1.4s ease-out both" }} />
      {coords.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="7" fill="transparent">
          <title>{`${labels[i]}: ${format(points[i])}`}</title>
        </circle>
      ))}
      <circle cx={last[0]} cy={last[1]} r="3.6" fill={color} style={{ animation: "pulseDot 2s infinite" }} />
    </svg>
  );
}

/* ── Horizontal progress ───────────────────────────────────── */
export function HBar({ label, value, max, color, right }: {
  label: string; value: number; max: number; color: string; right: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between items-baseline text-xs font-semibold mb-1">
        <span className="text-ink">{label}</span>
        <span className="tabular text-inkmut">{right}</span>
      </div>
      <div className="h-2.5 rounded-full bg-board/10 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
