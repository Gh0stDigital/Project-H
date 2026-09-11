import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { curtain, useTransitionStore } from './transitionStore'

describe('the screen curtain', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useTransitionStore.setState({ phase: 'idle', label: null })
  })
  afterEach(() => vi.useRealTimers())

  it('covers, holds, reveals, and ends idle', async () => {
    const seen: string[] = []
    const unsubscribe = useTransitionStore.subscribe((s) => {
      if (seen[seen.length - 1] !== s.phase) seen.push(s.phase)
    })
    const done = curtain({ coverMs: 100, holdMs: 100, revealMs: 100 })
    await vi.advanceTimersByTimeAsync(400)
    await done
    unsubscribe()
    expect(seen).toEqual(['covering', 'covered', 'revealing', 'idle'])
  })

  it('runs the swap while the screen is covered, never before', async () => {
    let phaseWhenCalled: string | null = null
    const done = curtain({
      coverMs: 100,
      holdMs: 100,
      revealMs: 100,
      onCovered: () => {
        phaseWhenCalled = useTransitionStore.getState().phase
      },
    })
    // Halfway through the cover, the callback must not have run: the whole
    // point is that nobody sees what it does.
    await vi.advanceTimersByTimeAsync(50)
    expect(phaseWhenCalled).toBeNull()
    await vi.advanceTimersByTimeAsync(350)
    await done
    expect(phaseWhenCalled).toBe('covered')
  })

  it('comes back up even when the swap throws', async () => {
    // A thrown callback must not strand the player behind a black rectangle.
    const done = curtain({
      coverMs: 10,
      holdMs: 10,
      revealMs: 10,
      onCovered: () => {
        throw new Error('boom')
      },
    })
    await vi.advanceTimersByTimeAsync(100)
    await done
    expect(useTransitionStore.getState().phase).toBe('idle')
  })

  it('lets a second transition take over from one still running', async () => {
    // The superseded run's own timers keep ticking — its promise only settles
    // when they drain — so what matters is that its remaining steps are
    // inert. A long hold is what makes the overlap visible here.
    const first = curtain({ coverMs: 100, holdMs: 4000, revealMs: 100, label: 'first' })
    await vi.advanceTimersByTimeAsync(150)
    expect(useTransitionStore.getState().label).toBe('first')

    const second = curtain({ coverMs: 10, holdMs: 10, revealMs: 10, label: 'second' })
    await vi.advanceTimersByTimeAsync(100)
    await second
    expect(useTransitionStore.getState().phase).toBe('idle')
    expect(useTransitionStore.getState().label).toBeNull()

    // Now let the first run finish its steps. It no longer owns the curtain,
    // so it must not raise it again over a screen that is already showing.
    await vi.advanceTimersByTimeAsync(5000)
    await first
    expect(useTransitionStore.getState().phase).toBe('idle')
    expect(useTransitionStore.getState().label).toBeNull()
  })
})
