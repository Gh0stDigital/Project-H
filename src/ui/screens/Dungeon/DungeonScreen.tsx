import { useDungeonStore } from '@/state/dungeonStore'
import { DungeonConfigScreen } from './DungeonConfigScreen'
import { ExploreView } from './ExploreView'
import { BattleView } from './BattleView'
import { ResultsView } from './ResultsView'

export function DungeonScreen() {
  const screenPhase = useDungeonStore((s) => s.screenPhase)
  const run = useDungeonStore((s) => s.run)
  const battle = useDungeonStore((s) => s.battle)

  if (screenPhase === 'results') return <ResultsView />
  if (screenPhase === 'config' || !run) return <DungeonConfigScreen />
  // A live battle owns the screen outright — Standby menus are unreachable
  // until it ends, which is what keeps exploration and combat from mixing.
  if (battle) return <BattleView />
  return <ExploreView />
}
