import { useState } from 'react'
import type React from 'react'
import { LONG_PRESS_MS, useLongPress } from '@/ui/hooks/useLongPress'

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
 * Move stays a move. Once there is somewhere to go back to, holding it opens
 * the list of those places — pressing it still just moves, which is what the
 * player does nearly every turn and should never cost a second tap.
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

  const { holding, handlers } = useLongPress({
    enabled: hasDestinations,
    onTap: onMove,
    onLongPress: () => setDestinationsOpen(true),
  })

  return (
    <>
      <div className="room-actions">
        <button
          className={`room-action primary${hasDestinations ? ' holdable' : ''}${holding ? ' is-holding' : ''}`}
          // The fill has to reach the edge exactly as the timer fires, so
          // both read the same number rather than agreeing by hand.
          style={{ '--hold-ms': `${LONG_PRESS_MS}ms` } as React.CSSProperties}
          {...handlers}
        >
          <span className="label">
            이동{hasDestinations && <span className="room-action-caret">▾</span>}
          </span>
          <span className="sub">
            {hasDestinations ? '눌러서 나아가기 · 길게 눌러 다른 곳으로' : '던전 안으로 나아갑니다'}
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
        <div className="overlay-backdrop" onPointerDown={() => setDestinationsOpen(false)}>
          <div className="destination-menu" onPointerDown={(e) => e.stopPropagation()}>
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
