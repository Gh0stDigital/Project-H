import { useTransitionStore } from '@/state/transitionStore'

/**
 * The thing that covers the screen.
 *
 * Mounted once, above everything. It is inert and invisible while idle, and
 * swallows taps while it is up — a player who taps twice during a transition
 * should not start the next thing twice.
 */
export function TransitionCurtain() {
  const phase = useTransitionStore((s) => s.phase)
  const kind = useTransitionStore((s) => s.kind)
  const label = useTransitionStore((s) => s.label)
  const durationMs = useTransitionStore((s) => s.durationMs)

  return (
    <div
      className={`curtain curtain-${kind} is-${phase}`}
      style={{ ['--curtain-ms' as string]: `${durationMs}ms` }}
      aria-hidden={phase === 'idle'}
      // Announced rather than shown silently: a screen reader should know
      // the game is between places, not that it has simply stopped.
      role={phase === 'idle' ? undefined : 'status'}
    >
      {label && <span className="curtain-label">{label}</span>}
    </div>
  )
}
