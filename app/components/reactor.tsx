/**
 * Reactor — marca visual do BlackBox Vault.
 * Clone do "Reactor" do QuadCore: quatro arcos-núcleo orbitando um cilindro
 * de banco de dados com uma agulha de injeção. Serve também como indicador
 * de atividade (respira quando ocioso, gira rápido + pulsa âmbar quando ativo).
 * SVG puro + classes animate-* do tema — sem dependências externas.
 */

interface ReactorProps {
  size?: number;
  active?: boolean;
  className?: string;
  title?: string;
}

export function Reactor({ size = 40, active = false, className = "", title }: ReactorProps) {
  const cx = 24;
  const cy = 24;
  const rOuter = 20;
  const rMid = 14;

  const cOuter = 2 * Math.PI * rOuter;
  const seg = cOuter / 4;
  const dashOuter = `${seg * 0.62} ${seg * 0.38}`;

  const cMid = 2 * Math.PI * rMid;
  const dashMid = `${cMid / 8} ${cMid / 8}`;

  const spin = active ? "animate-spin-med" : "animate-spin-slow";
  const spinRev = active ? "animate-spin-fast" : "animate-spin-slow";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label={title ?? "BlackBox reactor"}
      className={className}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <radialGradient id="qc-core" cx="50%" cy="42%" r="65%">
          <stop offset="0%" stopColor="#7ff5e4" />
          <stop offset="55%" stopColor="#35E4C6" />
          <stop offset="100%" stopColor="#1CA890" />
        </radialGradient>
        <linearGradient id="qc-cyl" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0E3A34" />
          <stop offset="100%" stopColor="#06201d" />
        </linearGradient>
      </defs>

      {/* Órbita externa — quatro núcleos */}
      <g
        className={spin}
        style={{ transformOrigin: "24px 24px" }}
        stroke="#35E4C6"
        strokeWidth={2.4}
        strokeLinecap="round"
        fill="none"
      >
        <circle
          cx={cx}
          cy={cy}
          r={rOuter}
          strokeDasharray={dashOuter}
          opacity={active ? 0.95 : 0.7}
        />
        <g stroke="none" fill={active ? "#F6B23C" : "#35E4C6"}>
          <circle cx={cx} cy={cy - rOuter} r={1.7} />
          <circle cx={cx + rOuter} cy={cy} r={1.7} />
          <circle cx={cx} cy={cy + rOuter} r={1.7} />
          <circle cx={cx - rOuter} cy={cy} r={1.7} />
        </g>
      </g>

      {/* Órbita média — anel tracejado contra-rotativo */}
      <circle
        cx={cx}
        cy={cy}
        r={rMid}
        stroke="#1CA890"
        strokeWidth={1.2}
        strokeDasharray={dashMid}
        opacity={0.55}
        className={spinRev}
        style={{ transformOrigin: "24px 24px", animationDirection: "reverse" }}
        fill="none"
      />

      {/* Cilindro central de banco de dados com agulha de injeção */}
      <g className={active ? "animate-breathe" : ""} style={{ transformOrigin: "24px 24px" }}>
        <path
          d="M17 18 a7 2.6 0 0 1 14 0 v8 a7 2.6 0 0 1 -14 0 z"
          fill="url(#qc-cyl)"
          stroke="#35E4C6"
          strokeWidth={1.4}
        />
        <ellipse cx={cx} cy={18} rx={7} ry={2.6} fill="url(#qc-core)" />
        <path d="M17 22 a7 2.6 0 0 0 14 0" stroke="#35E4C6" strokeWidth={1} opacity={0.6} fill="none" />
        <path
          d="M24 30 v4"
          stroke={active ? "#F6B23C" : "#35E4C6"}
          strokeWidth={1.6}
          strokeLinecap="round"
        />
        <path
          d="M22.4 33 L24 35 L25.6 33"
          stroke={active ? "#F6B23C" : "#35E4C6"}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
    </svg>
  );
}

/** Lockup completo: marca reactor + wordmark. */
export function LogoLockup({ active = false }: { active?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Reactor size={38} active={active} />
      <div className="leading-none">
        <div className="font-display text-[17px] font-bold tracking-tight text-ink">
          Black<span className="text-accent">Box</span>
        </div>
        <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.34em] text-muted">
          Vault
        </div>
      </div>
    </div>
  );
}
