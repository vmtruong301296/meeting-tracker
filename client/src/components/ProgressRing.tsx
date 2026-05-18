export function ProgressRing({ pct, size = 48 }: { pct: number; size?: number }) {
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const cx = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="text-accent">
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--bg-elev-3)" strokeWidth="3" />
      <circle
        cx={cx} cy={cx} r={r} fill="none"
        stroke="currentColor" strokeWidth="3"
        strokeDasharray={c} strokeDashoffset={offset}
        strokeLinecap="round" transform={`rotate(-90 ${cx} ${cx})`}
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
      <text
        x={cx} y={cx + 4} textAnchor="middle" fontSize="11"
        fontFamily="Fraunces, serif" fontStyle="italic" fill="currentColor"
      >
        {pct}
      </text>
    </svg>
  );
}
