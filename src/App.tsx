import { useUiStore } from '@/state/uiStore'
import { MainMenuScreen } from '@/ui/screens/MainMenu/MainMenuScreen'
import { CompendiumScreen } from '@/ui/screens/Compendium/CompendiumScreen'
import { TotemScreen } from '@/ui/screens/Totem/TotemScreen'
import { DungeonScreen } from '@/ui/screens/Dungeon/DungeonScreen'
import { RecordsScreen } from '@/ui/screens/Records/RecordsScreen'

export default function App() {
  const screen = useUiStore((s) => s.screen)

  return (
    <div className="app-shell">
      {screen === 'menu' && <MainMenuScreen />}
      {screen === 'compendium' && <CompendiumScreen />}
      {screen === 'totem' && <TotemScreen />}
      {screen === 'dungeon' && <DungeonScreen />}
      {screen === 'records' && <RecordsScreen />}
    </div>
  )
}
