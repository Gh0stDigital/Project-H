import { useUiStore } from '@/state/uiStore'
import { useGameAudio } from '@/ui/hooks/useGameAudio'
import { useSoundtrack } from '@/ui/hooks/useSoundtrack'
import { useUiSounds } from '@/ui/hooks/useUiSounds'
import { useTransitions } from '@/ui/hooks/useTransitions'
import { TransitionCurtain } from '@/ui/components/TransitionCurtain'
import { MainMenuScreen } from '@/ui/screens/MainMenu/MainMenuScreen'
import { CompendiumScreen } from '@/ui/screens/Compendium/CompendiumScreen'
import { TotemScreen } from '@/ui/screens/Totem/TotemScreen'
import { DungeonScreen } from '@/ui/screens/Dungeon/DungeonScreen'
import { RecordsScreen } from '@/ui/screens/Records/RecordsScreen'

export default function App() {
  const screen = useUiStore((s) => s.screen)

  // Sound is mounted once, here. None of it can throw, and none of it is
  // awaited: the game runs identically with the speakers off.
  useGameAudio()
  useSoundtrack()
  useUiSounds()
  useTransitions()

  return (
    <div className="app-shell">
      {screen === 'menu' && <MainMenuScreen />}
      {screen === 'compendium' && <CompendiumScreen />}
      {screen === 'totem' && <TotemScreen />}
      {screen === 'dungeon' && <DungeonScreen />}
      {screen === 'records' && <RecordsScreen />}
      <TransitionCurtain />
    </div>
  )
}
