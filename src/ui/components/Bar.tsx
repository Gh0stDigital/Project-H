interface BarProps {
  value: number
  max: number
  kind: 'hp' | 'charge' | 'xp' | 'plateau' | 'timer'
  thin?: boolean
}

/** Generic bounded progress bar used for HP, Charge, XP, Plateau, and battle timers. */
export function Bar({ value, max, kind, thin }: BarProps) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  return (
    <div className={`bar-track${thin ? ' thin' : ''}`}>
      <div className={`bar-fill ${kind}`} style={{ width: `${pct}%` }} />
    </div>
  )
}
