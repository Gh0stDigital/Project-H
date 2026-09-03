import { useState } from 'react'
import { useUiStore } from '@/state/uiStore'
import { TopBar } from '@/ui/components/TopBar'
import { SpellListTab } from './SpellListTab'
import { SpellSetsTab } from './SpellSetsTab'

type Tab = 'spells' | 'sets'

export function CompendiumScreen() {
  const goTo = useUiStore((s) => s.goTo)
  const [tab, setTab] = useState<Tab>('spells')

  return (
    <div className="screen screen-scroll">
      <TopBar title="Compendium" onBack={() => goTo('menu')} />

      <div className="btn-row">
        <button className={`btn btn-sm ${tab === 'spells' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('spells')}>
          Spell Words
        </button>
        <button className={`btn btn-sm ${tab === 'sets' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('sets')}>
          Spell Sets
        </button>
      </div>

      {tab === 'spells' ? <SpellListTab /> : <SpellSetsTab />}
    </div>
  )
}
