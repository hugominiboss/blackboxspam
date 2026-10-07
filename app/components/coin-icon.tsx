'use client'

/**
 * Moeda dourada premium do BlackboxSpam.
 * Usada em todos os lugares onde antes aparecia "CR".
 */
export default function CoinIcon({
  size = 20,
  className = '',
}: {
  size?: number
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={`shrink-0 drop-shadow-[0_0_6px_rgba(250,204,21,0.55)] ${className}`}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="bbx-coin-face" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#FEF9C3" />
          <stop offset="35%" stopColor="#FDE047" />
          <stop offset="70%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </radialGradient>
        <linearGradient id="bbx-coin-rim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="50%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#92400E" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="14.5" fill="url(#bbx-coin-rim)" />
      <circle cx="16" cy="16" r="11.5" fill="url(#bbx-coin-face)" />
      <circle
        cx="16"
        cy="16"
        r="9"
        fill="none"
        stroke="#B45309"
        strokeOpacity="0.55"
        strokeWidth="1.4"
        strokeDasharray="2.5 2"
      />
      <path
        d="M17.8 8.5 11.5 17.2h4.4L14.2 23.5l6.6-9h-4.6l1.6-6z"
        fill="#92400E"
      />
      <ellipse cx="12.5" cy="10.5" rx="3.4" ry="1.8" fill="#fff" opacity="0.55" transform="rotate(-25 12.5 10.5)" />
    </svg>
  )
}
