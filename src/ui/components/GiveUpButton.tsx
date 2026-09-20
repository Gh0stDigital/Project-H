import { useState } from 'react'
import { useDungeonStore } from '@/state/dungeonStore'
import { useUiStore } from '@/state/uiStore'
import { curtain } from '@/state/transitionStore'
import { curtainTiming } from '@/config/transitions'

/**
 * The way out of a run.
 *
 * There was none: once a dungeon started, the only exit was an Escape Rope
 * the player might not be carrying, so someone who simply had to stop had
 * to close the game. It sits in the HUD because the HUD is the one thing on
 * screen in every run state, including the middle of a fight.
 *
 * Two taps, and the second one is a dialogue that says what is lost. An
 * always-visible quit next to the buttons the player is actually aiming for
 * has to be hard to hit by accident.
 */
export function GiveUpButton() {
  const giveUpRun = useDungeonStore((s) => s.giveUpRun)
  const goTo = useUiStore((s) => s.goTo)
  const [confirming, setConfirming] = useState(false)

  function giveUp() {
    setConfirming(false)
    void curtain({
      holdMs: curtainTiming.hold.toMenu,
      onCovered: () => {
        giveUpRun()
        goTo('menu')
      },
    })
  }

  return (
    <>
      <button
        className="run-hud-giveup"
        data-sfx="cancel"
        onClick={() => setConfirming(true)}
        title="던전 포기"
        aria-label="던전 포기"
      >
        ⏻
      </button>

      {confirming && (
        <div className="overlay-backdrop" onClick={() => setConfirming(false)}>
          <div className="slide-panel" onClick={(e) => e.stopPropagation()}>
            <div className="row">
              <h2>던전을 포기할까요?</h2>
            </div>
            <div className="slide-panel-body">
              <p>
                지금 나가면 이번 탐험은 <strong>기록되지 않습니다</strong>. 결과 화면도 없고, 전적에도
                남지 않습니다.
              </p>
              <p className="faint">
                생명력은 잃지 않습니다. 탐험 중에 이미 얻은 경험치와 돈, 입은 피해는 그대로 남습니다.
              </p>
              <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)}>
                  계속하기
                </button>
                <button className="btn btn-danger btn-sm" data-sfx="cancel" onClick={giveUp}>
                  포기하고 나가기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
