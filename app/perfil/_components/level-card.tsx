import { Award, Medal, Trophy, Crown, Gem } from 'lucide-react'
import { metaNivel, type ProgressoNivel } from '@/app/lib/levels'
import CoinIcon from '@/app/components/coin-icon'

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
 */
export default function LevelCard({ progresso }: { progresso: ProgressoNivel | null }) {
  if (!progresso) return null

  const meta = metaNivel(progresso.atual)
  const Icone = ICONES_NIVEL[progresso.atual as keyof typeof ICONES_NIVEL] ?? Medal

  return (
    <div className="mb-6 rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-black p-5">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl bg-zinc-800/60 shrink-0 ${meta.cor}`}>
          <Icone className={`w-7 h-7 ${meta.glow}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">Seu Status</p>
          <p className={`text-2xl font-extrabold tracking-tight ${meta.cor}`}>
            {progresso.atual}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">Gasto total</p>
          <p className="font-mono font-bold text-white text-sm flex items-center gap-1 justify-end">
            <CoinIcon size={14} />
            {progresso.gasto}
          </p>
        </div>
      </div>

      {/* Barra de progresso para o próximo nível */}
      <div className="mt-4">
        <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${meta.barra} transition-all duration-500`}
            style={{ width: `${progresso.percentual}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-zinc-400">
          {progresso.proximo ? (
            <>
              Gaste mais{' '}
              <span className="font-mono font-bold text-white">{progresso.falta}</span>{' '}
              créditos para subir para o nível{' '}
              <span className="font-bold text-white">{progresso.proximo}</span>.
            </>
          ) : (
            <>Você atingiu o nível máximo — <span className="font-bold text-white">Black</span>.</>
          )}
        </p>
      </div>
    </div>
  )
}
