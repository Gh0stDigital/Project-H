import type { Totem } from '@/domain/totem'
import type { Spell } from '@/domain/spell'
import type { SpellSet } from '@/domain/spellSet'
import { elementDefs } from '@/config/wordTypes'
import { MAX_STARS, totemCard } from '@/systems/totemCard'
import { AvatarFrame } from './AvatarFrame'

interface TotemCardProps {
  totem: Totem
  spells: Spell[]
  spellSets: SpellSet[]
  /** Tapping the portrait — used on the Totem screen to switch character. */
  onPortraitClick?: () => void
}

/**
 * The Totem, laid out as a monster card.
 *
 * Name and attribute across the top, portrait, the bracketed type line, the
 * flavour text, and the two numbers at the bottom right — the shape anyone
 * who has held a trading card can read without being taught. It exists
 * because a Totem was a level and a health bar, which says what it can
 * survive but nothing about who it is.
 */
export function TotemCard({ totem, spells, spellSets, onPortraitClick }: TotemCardProps) {
  const card = totemCard(totem, spells, spellSets)
  const element = card.element ? elementDefs[card.element] : null

  return (
    <div className="totem-card">
      <div className="totem-card-head">
        <h3 className="totem-card-name">{card.name}</h3>
        {element ? (
          <span className="totem-card-attribute" style={{ color: `var(${element.colorVar})` }}>
            <span aria-hidden>{element.icon}</span> {element.label}
          </span>
        ) : (
          <span className="totem-card-attribute is-empty">무속성</span>
        )}
      </div>

      <div className="totem-card-stars" aria-label={`레벨 ${card.level}`}>
        {Array.from({ length: card.stars }, (_, i) => (
          <span key={i} className="totem-card-star" aria-hidden>
            ★
          </span>
        ))}
        {/* Past twelve there is nowhere left to put a star, so the number
            takes over rather than the row wrapping into a second line. */}
        {card.level > MAX_STARS && <span className="totem-card-level">Lv {card.level}</span>}
      </div>

      {onPortraitClick ? (
        <button className="totem-card-art" onClick={onPortraitClick} title="토템 교체">
          <AvatarFrame assetKey={totem.avatarKey} alt={totem.name} size="hero" />
        </button>
      ) : (
        <div className="totem-card-art">
          <AvatarFrame assetKey={totem.avatarKey} alt={totem.name} size="hero" />
        </div>
      )}

      <div className="totem-card-kind">[ {card.kind} ]</div>

      <p className="totem-card-text">{card.description}</p>

      <div className="totem-card-stats">
        <span className="totem-card-deck faint">
          {card.deckSize > 0 ? `장착 단어 ${card.deckSize}개` : '장착한 주문 세트 없음'}
        </span>
        <span className="totem-card-numbers">
          <span className="totem-card-atk">공격 {card.attack}</span>
          <span className="totem-card-def">방어 {card.defense}</span>
        </span>
      </div>
    </div>
  )
}
