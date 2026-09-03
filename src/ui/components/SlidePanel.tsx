import type { ReactNode } from 'react'

interface SlidePanelProps {
  title: string
  onClose: () => void
  children: ReactNode
}

/** Bottom-sheet style overlay panel (used for the Word-Information panel, etc). */
export function SlidePanel({ title, onClose, children }: SlidePanelProps) {
  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="slide-panel" onClick={(e) => e.stopPropagation()}>
        <div className="row">
          <h2>{title}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="slide-panel-body">{children}</div>
      </div>
    </div>
  )
}
