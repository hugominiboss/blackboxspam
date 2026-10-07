'use client'

/**
 * Símbolo minimalista de crédito do BlackBox Vault.
 * Linha fina (stroke 1.5) — substitui o texto "CR" em toda a UI.
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
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      {/* anel da moeda */}
      <circle cx="16" cy="16" r="12.5" />
      {/* raio estilizado em linha fina */}
      <path d="M18.5 8.5 11 18.5h5l-2.5 5 7.5-10h-5l2.5-5z" />
    </svg>
  )
}
