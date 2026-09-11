import { useEffect, useRef } from 'react'
import { audio } from '@/systems/audioEngine'
import { useDungeonStore } from '@/state/dungeonStore'
import { usePersistentStore } from '@/state/persistentStore'
import { useUiStore } from '@/state/uiStore'
import type { MusicCue, AmbientCue } from '@/config/audio'

/**
 * Turns what the game is doing into what the game sounds like.
 *
 * All of it lives here rather than in the stores. The stores stay about
 * rules, this stays about sound, and the whole mapping — which track plays
 * when, which sting fires on which transition — can be read in one file
 * instead of being scattered across thirty call sites.
 *
 * Everything is edge-triggered off state the game already keeps, so nothing
 * needed a new field to make a noise.
 */

const ambienceFor = (state: string | undefined): AmbientCue[] => {
  if (!state) return []
  if (state === 'Rest') return ['drip']
  if (state === 'Battle' || state === 'BossBattle') return []
  return ['wind', 'drip']
}

function musicFor(screen: string, state: string | undefined): MusicCue | null {
  // The menu theme covers everything outside a run. Letting it stop on the
  // Compendium meant silence while you worked, and a track that restarted
  // from the top every time you came back.
  if (screen !== 'dungeon') return 'menu'
  switch (state) {
    case undefined:
    case 'DungeonSetup':
      return 'menu'
    case 'Battle':
      return 'battle'
    case 'BossBattle':
      return 'boss'
    case 'Rest':
      return 'rest'
    case 'Results':
    case 'Defeat':
      return 'results'
    default:
      return 'dungeon'
  }
}

export function useSoundtrack(): void {
  const screen = useUiStore((s) => s.screen)
  const run = useDungeonStore((s) => s.run)
  const battle = useDungeonStore((s) => s.battle)
  const totems = usePersistentStore((s) => s.totems)

  const totem = totems.find((t) => t.id === run?.config.totemId)
  const previous = useRef({
    state: undefined as string | undefined,
    phase: undefined as string | undefined,
    enemyHp: 0,
    totemHp: 0,
    level: 0,
    money: 0,
    keyFound: false,
    bossDoorFound: false,
    lastResult: null as string | null,
  })

  // ---- Beds -------------------------------------------------------------
  useEffect(() => {
    audio.setWorld(run?.config.worldId ?? null)
  }, [run?.config.worldId])

  useEffect(() => {
    audio.setMusic(musicFor(screen, run?.state))
  }, [screen, run?.state])

  useEffect(() => {
    audio.setAmbience(screen === 'dungeon' ? ambienceFor(run?.state) : [])
  }, [screen, run?.state])

  // ---- Stings -----------------------------------------------------------
  useEffect(() => {
    const p = previous.current
    const state = run?.state

    if (state !== p.state) {
      if (state === 'Battle' || state === 'BossBattle') {
        audio.play(state === 'BossBattle' ? 'bossDoor' : 'battleStart')
        audio.duck()
      }
      if (state === 'Rolling') audio.play('diceRoll')
      if (state === 'Defeat') { audio.play('defeat'); audio.duck() }
      if (state === 'Results') { audio.play('victory'); audio.duck() }
      p.state = state
    }

    // A hit is a drop in someone's health, whoever took it.
    const enemyHp = battle?.enemy.currentHp ?? 0
    if (battle && enemyHp < p.enemyHp) audio.play('damage')
    p.enemyHp = enemyHp

    const totemHp = totem?.currentHp ?? 0
    if (totem && totemHp < p.totemHp) audio.play('damage')
    p.totemHp = totemHp

    if (battle?.phase !== p.phase) {
      if (battle?.phase === 'enemy_challenge') audio.play('enemyAttack')
      if (battle?.phase === 'player_resolve') audio.play('playerAttack')
      p.phase = battle?.phase
    }

    if (battle?.lastResult && battle.lastResult !== p.lastResult) {
      audio.play(battle.lastResult === 'correct' ? 'correct' : 'wrong')
    }
    p.lastResult = battle?.lastResult ?? null

    if (totem && totem.level > p.level && p.level > 0) { audio.play('levelUp'); audio.duck() }
    p.level = totem?.level ?? 0

    if (totem && totem.money > p.money && p.money > 0) audio.play('reward')
    p.money = totem?.money ?? 0

    if (run?.keyFound && !p.keyFound) audio.play('discovery')
    p.keyFound = run?.keyFound ?? false

    if (run?.bossDoorFound && !p.bossDoorFound) audio.play('discovery')
    p.bossDoorFound = run?.bossDoorFound ?? false
  }, [run, battle, totem])
}
