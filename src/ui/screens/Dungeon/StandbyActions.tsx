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
            {hasDestinations ? '계속 나아가거나, 찾아 둔 곳으로 갑니다' : '던전 안으로 나아갑니다'}
          </span>
        </button>
        <button className="room-action" onClick={onCheckTotem}>
          <span className="label">토템</span>
          <span className="sub">토템을 살펴봅니다</span>
        </button>
        <button className="room-action" onClick={onCheckWords}>
          <span className="label">성향</span>
          <span className="sub">이번 탐험의 주문 단어 보기</span>
        </button>
        <button className="room-action" onClick={onUseItem}>
          <span className="label">아이템</span>
          <span className="sub">회복하거나, 충전하거나, 던전을 떠납니다</span>
        </button>
      </div>

      {destinationsOpen && (
        <div className="overlay-backdrop" onClick={() => setDestinationsOpen(false)}>
          <div className="destination-menu" onClick={(e) => e.stopPropagation()}>
            <h2>어디로 갈까요?</h2>

            <button
              className="destination-option"
              onClick={() => {
                setDestinationsOpen(false)
                onMove()
              }}
            >
              <span className="label">계속 나아가기</span>
              <span className="sub">앞에 무엇이 있든 주사위를 굴립니다</span>
            </button>

            {restAreaFound && (
              <button
                className="destination-option"
                onClick={() => {
                  setDestinationsOpen(false)
                  onReturnToRest()
                }}
              >
                <span className="label">쉼터</span>
                <span className="sub">값을 치르고 상처를 돌봅니다</span>
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
                <span className="label">보스의 문</span>
                <span className="sub">
                  {canEnterBoss ? '열쇠가 돌아갑니다. 돌아갈 길은 없습니다.' : keyFound ? '열쇠는 이미 썼습니다' : '잠김 — 열쇠를 찾으세요'}
                </span>
              </button>
            )}

            <button className="btn btn-ghost btn-block" onClick={() => setDestinationsOpen(false)}>
              여기 머무르기
            </button>
          </div>
        </div>
      )}
    </>
  )
}
