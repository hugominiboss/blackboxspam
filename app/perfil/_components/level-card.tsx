import { Award, Medal, Trophy, Crown, Gem } from 'lucide-react'
import type { ProgressoNivel } from '@/app/lib/levels'
import CoinIcon from '@/app/components/coin-icon'
import { ProgressBar } from '@/app/components/qc-ui'

const ICONES_NIVEL = {
  Bronze: Medal,
  Silver: Award,
  Gold: Trophy,
  Platinum: Crown,
  Black: Gem,
} as const

/**
 * Card de Status — hierarquia Bronze → Black por créditos gastos.
 * Recebe o progresso já calculado pela API (`levelProgress`).
 * Estilo "Dark Terminal" (painel + barra com glow).
 */
export default function LevelCard({ progresso }: { progresso: ProgressoNivel | null }) {
  if (!progresso) return null

  const Icone = ICONES_NIVEL[progresso.atual as keyof typeof ICONES_NIVEL] ?? Medal

  return (
    <div className="mb-6 rounded-xl border border-line bg-raised/40 p-5">
      <div className="flex items-center gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-accent/30 bg-accent/10">
          <Icone className="h-6 w-6 text-accent" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="label mb-0">Seu Status</p>
          <p className="font-display text-2xl font-extrabold tracking-tight text-ink">
            {progresso.atual}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="label mb-0">Gasto total</p>
          <p className="flex items-center justify-end gap-1 font-mono text-sm font-bold text-ink">
            <CoinIcon size={14} />
            {progresso.gasto}
          </p>
        </div>
      </div>

      {/* Barra de progresso para o próximo nível */}
      <div className="mt-4">
        <ProgressBar value={progresso.percentual} />
        <p className="mt-2 text-xs text-muted">
          {progresso.proximo ? (
            <>
              Gaste mais{' '}
              <span className="font-mono font-bold text-ink">{progresso.falta}</span> créditos para
              subir para o nível <span className="font-bold text-ink">{progresso.proximo}</span>.
            </>
          ) : (
            <>
              Você atingiu o nível máximo — <span className="font-bold text-ink">Black</span>.
            </>
          )}
        </p>
      </div>
    </div>
  )
}
