import type { Spell } from '@/domain/spell'
import { damageForSpell } from '@/systems/spellProgression'
import { pickFlavorKey } from '@/config/assets'
import { elementDefFor } from '@/config/wordTypes'
import { AssetImage } from './AssetImage'
import { Bar } from './Bar'

interface SpellCardProps {
  spell: Spell
  selected?: boolean
  disabled?: boolean
  /**
   * Masked hint built from the English meaning (Courage -> C_____E). The
   * full English is deliberately never rendered on a card front — that
   * would hand the player the answer they're about to be asked for.
   */
  clue?: string
  /** Boss-barrier state for this word, when a barrier is up. */
  barrierCleared?: boolean
  onClick?: () => void
}

/** A single battle-hand Spell card: word, level, charge, potential damage. */
export function SpellCard({ spell, selected, disabled, clue, barrierCleared, onClick }: SpellCardProps) {
  const artKey = pickFlavorKey('spells', spell.id)
  const element = elementDefFor(spell.wordType)
  return (
    <div
      className={`spell-card element-${element.id}${selected ? ' selected' : ''}${disabled ? ' disabled' : ''}${
        barrierCleared === true ? ' barrier-cleared' : barrierCleared === false ? ' barrier-pending' : ''
      }`}
      onClick={disabled ? undefined : onClick}
      role="button"
      tabIndex={disabled ? -1 : 0}
    >
      {/* An attack card is the clue and nothing else: no placeholder art,
          and no Korean — showing the word would hand over the answer the
          player is about to be asked to produce. */}
      {clue ? (
        <div className="word card-clue">{clue}</div>
      ) : (
        <>
          <div className="art">
            <AssetImage category="spells" assetKey={artKey} alt={spell.korean} />
          </div>
          <div className="word">{spell.korean}</div>
        </>
      )}
      {barrierCleared !== undefined && (
        <div className={`card-barrier ${barrierCleared ? 'done' : 'pending'}`}>
          {barrierCleared ? '🛡️ 해제됨' : '🛡️ 필요함'}
        </div>
      )}
      <div className="meta">
        <span title={element.label}>{element.icon} Lv {spell.level}</span>
        <span>피해 {damageForSpell(spell)}</span>
      </div>
      <Bar value={spell.charge} max={spell.maxCharge} kind="charge" thin />
    </div>
  )
}
