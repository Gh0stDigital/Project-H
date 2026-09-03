import { useState } from 'react'

interface StandbyActionsProps {
  canEnterBoss: boolean
  bossDoorFound: boolean
  keyFound: boolean
  restAreaFound: boolean
  onMove: () => void
  onCheckTotem: () => void
  onCheckWords: () => void
  onUseItem: () => void
  onEnterBoss: () => void
  onReturnToRest: () => void
}

/**
 * The Standby hub menu — the player's safe beat between events.
 *
 * Everything is one stacked column so the order never shifts: Move, Totem,
 * Tendency, Items. Places the run has already discovered (a Rest Area, the
 * Boss Door) are destinations rather than separate commands, so they hang
 * off Move instead of appearing as extra buttons elsewhere on the screen.
 *
 * Every action here is presentational; the store decides whether each one
 * is actually legal, so a stale render can't smuggle a Move through.
 */
export function StandbyActions({
  canEnterBoss,
  bossDoorFound,
  keyFound,
  restAreaFound,
  onMove,
  onCheckTotem,
  onCheckWords,
  onUseItem,
  onEnterBoss,
  onReturnToRest,
}: StandbyActionsProps) {
  const [destinationsOpen, setDestinationsOpen] = useState(false)
  const hasDestinations = restAreaFound || bossDoorFound

  function handleMove() {
    // With nowhere else to go, Move just moves — no menu in the way.
    if (!hasDestinations) {
      onMove()
      return
    }
    setDestinationsOpen(true)
  }

  return (
    <>
      <div className="room-actions">
        <button className="room-action primary" onClick={handleMove}>
          <span className="label">
            Move{hasDestinations && <span className="room-action-caret">▾</span>}
          </span>
          <span className="sub">
            {hasDestinations ? 'Press on, or head somewhere you found' : 'Press on into the dungeon'}
          </span>
        </button>
        <button className="room-action" onClick={onCheckTotem}>
          <span className="label">Totem</span>
          <span className="sub">Inspect your Totem</span>
        </button>
        <button className="room-action" onClick={onCheckWords}>
          <span className="label">Tendency</span>
          <span className="sub">Review this run's Spellwords</span>
        </button>
        <button className="room-action" onClick={onUseItem}>
          <span className="label">Items</span>
          <span className="sub">Heal, recharge, or leave the dungeon</span>
        </button>
      </div>

      {destinationsOpen && (
        <div className="overlay-backdrop" onClick={() => setDestinationsOpen(false)}>
          <div className="destination-menu" onClick={(e) => e.stopPropagation()}>
            <h2>Where to?</h2>

            <button
              className="destination-option"
              onClick={() => {
                setDestinationsOpen(false)
                onMove()
              }}
            >
              <span className="label">Press onward</span>
              <span className="sub">Roll for whatever lies ahead</span>
            </button>

            {restAreaFound && (
              <button
                className="destination-option"
                onClick={() => {
                  setDestinationsOpen(false)
                  onReturnToRest()
                }}
              >
                <span className="label">Rest Area</span>
                <span className="sub">Bind your wounds, for a price</span>
              </button>
            )}

            {bossDoorFound && (
              <button
                className={`destination-option${canEnterBoss ? ' danger' : ''}`}
                disabled={!canEnterBoss}
                onClick={() => {
                  setDestinationsOpen(false)
                  onEnterBoss()
                }}
              >
                <span className="label">Boss Door</span>
                <span className="sub">
                  {canEnterBoss ? 'The key turns. There is no way back.' : keyFound ? 'The key is spent' : 'Locked — find the key'}
                </span>
              </button>
            )}

            <button className="btn btn-ghost btn-block" onClick={() => setDestinationsOpen(false)}>
              Stay here
            </button>
          </div>
        </div>
      )}
    </>
  )
}
