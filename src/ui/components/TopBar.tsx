import type { ReactNode } from 'react'

interface TopBarProps {
  title: string
  onBack?: () => void
  right?: ReactNode
}

export function TopBar({ title, onBack, right }: TopBarProps) {
  return (
    <div className="top-bar">
      {onBack && (
        <button className="btn btn-ghost btn-sm" onClick={onBack}>
          ← Back
        </button>
      )}
      <h1>{title}</h1>
      {right}
    </div>
  )
}
