import { useState } from 'react'
import { useUiStore } from '@/state/uiStore'
import { usePersistentStore } from '@/state/persistentStore'
import { TopBar } from '@/ui/components/TopBar'
import { AssetImage } from '@/ui/components/AssetImage'
import { Bar } from '@/ui/components/Bar'
import { SlidePanel } from '@/ui/components/SlidePanel'
import { totemBalance } from '@/config/balance'
import { assetKeys } from '@/config/assets'
import { isUsable, nameFromAvatarKey } from '@/systems/totemManager'

export function TotemScreen() {
  const goTo = useUiStore((s) => s.goTo)
  const totems = usePersistentStore((s) => s.totems)
  const activeTotemId = usePersistentStore((s) => s.activeTotemId)
  const spellSets = usePersistentStore((s) => s.spellSets)
  const equipTotemSpellSet = usePersistentStore((s) => s.equipTotemSpellSet)
  const editName = usePersistentStore((s) => s.replaceTotem)
  const createNewTotem = usePersistentStore((s) => s.createTotem)
  const setTotemAvatar = usePersistentStore((s) => s.setTotemAvatar)
  const setActiveTotem = usePersistentStore((s) => s.setActiveTotem)

  // Prefer a Totem that can still be played; a destroyed one is only shown
  // as a memorial when nothing usable is left.
  const totem = totems.find((t) => t.id === activeTotemId) ?? totems.find(isUsable) ?? totems[0]
  const usable = totems.filter(isUsable)
  const [renaming, setRenaming] = useState(false)
  const [nameDraft, setNameDraft] = useState(totem?.name ?? '')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false)
  const [rosterOpen, setRosterOpen] = useState(false)

  // Switching Totem changes who the rename field is editing, so the draft
  // has to follow. Without this, opening rename on a freshly switched Totem
  // would offer the previous one's name and save it over this one.
  const [nameOwner, setNameOwner] = useState(totem?.id)
  if (totem && nameOwner !== totem.id) {
    setNameOwner(totem.id)
    setNameDraft(totem.name)
    setRenaming(false)
  }

  if (!totem) {
    return (
      <div className="screen">
        <TopBar title="토템" onBack={() => goTo('menu')} />
        <p className="muted">토템이 없습니다.</p>
      </div>
    )
  }

  const equippedSet = spellSets.find((s) => s.id === totem.equippedSpellSetId) ?? null
  const xpNeeded = totemBalance.xpToNextLevel(totem.level)

  return (
    // Scrolls: the portrait grows with the screen, and this is a screen you
    // read rather than play. Nothing below it may end up out of reach the
    // way the dungeon setup screen's start button once did.
    <div className="screen screen-scroll">
      <TopBar title="토템" onBack={() => goTo('menu')} />

      <div className="panel" style={{ textAlign: 'center' }}>
        <button className="totem-hero-frame" onClick={() => setRosterOpen(true)} title="토템 교체">
          <AssetImage category="totems" assetKey={totem.avatarKey} alt={totem.name} className="avatar-img avatar-hero" />
        </button>
        {/* Below the frame, not over the art. Switching is the primary
            action — each Totem is its own character, with its own level and
            record. Repainting the one you have is the rarer, cosmetic case. */}
        <div className="btn-row" style={{ justifyContent: 'center' }}>
          <button className="totem-hero-edit" onClick={() => setRosterOpen(true)}>
            토템 교체
          </button>
          <button className="totem-hero-edit" onClick={() => setAvatarPickerOpen(true)}>
            초상화 변경
          </button>
        </div>

        {renaming ? (
          <div className="btn-row" style={{ justifyContent: 'center' }}>
            <input type="text" value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} style={{ maxWidth: 180 }} />
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                editName(totem.id, (t) => ({ ...t, name: nameDraft.trim() || t.name }))
                setRenaming(false)
              }}
            >
              저장
            </button>
          </div>
        ) : (
          <h2 onClick={() => setRenaming(true)} style={{ cursor: 'pointer' }}>
            {totem.name} ✏️
          </h2>
        )}

        <p className="muted">레벨 {totem.level}</p>

        <div className="life-points" title="생명력">
          {Array.from({ length: totem.maxLifePoints }, (_, i) => (
            <span key={i} className={`life-pip${i < totem.lifePoints ? ' lit' : ''}`}>
              {i < totem.lifePoints ? '◆' : '◇'}
            </span>
          ))}
          <span className="faint">
            {totem.lifePoints}/{totem.maxLifePoints} 생명력
          </span>
        </div>

        {totem.destroyed && (
          <div className="feedback-banner incorrect">
            💀 이 토템은 파괴되어 더 이상 던전에 들어갈 수 없습니다.
          </div>
        )}

        <div style={{ margin: '6px 0' }}>
          <Bar value={totem.experience} max={xpNeeded} kind="xp" />
          <p className="faint">다음 레벨까지 경험치 {totem.experience}/{xpNeeded}</p>
        </div>

        <div className="row" style={{ marginTop: 10 }}>
          <div>
            <div className="faint">HP</div>
            <b>{totem.currentHp}/{totem.maxHp}</b>
          </div>
          <div>
            <div className="faint">돈</div>
            <b>💰 {totem.money}</b>
          </div>
          <div>
            <div className="faint">처치한 보스</div>
            <b>{totem.stats.bossesDefeated}</b>
          </div>
        </div>
      </div>

      <div className="field">
        <label>전투 덱 (장착한 주문 세트)</label>
        <button className="card row" style={{ width: '100%', textAlign: 'left' }} onClick={() => setPickerOpen(true)}>
          <div>
            <div style={{ fontWeight: 700 }}>{equippedSet ? equippedSet.name : '장착 없음'}</div>
            <div className="faint">{equippedSet ? `${equippedSet.spellIds.length} Spells` : '눌러서 주문 세트를 고르세요'}</div>
          </div>
          <span className="faint">변경</span>
        </button>
      </div>

      <div className="field">
        <label>내 토템들</label>
        <button className="card row" style={{ width: '100%', textAlign: 'left' }} onClick={() => setRosterOpen(true)}>
          <div>
            <div style={{ fontWeight: 700 }}>
              {totems.length} raised{usable.length < totems.length ? ` · ${usable.length}기 살아 있음` : ''}
            </div>
            <div className="faint">다른 토템으로 바꾸거나, 새로 기릅니다</div>
          </div>
          <span className="faint">교체</span>
        </button>
      </div>

      <div style={{ flex: 1 }} />

      {rosterOpen && (
        <SlidePanel title="내 토템들" onClose={() => setRosterOpen(false)}>
          <p className="faint">
            Each Totem is its own character — its own level, experience, HP, money, 생명력 and record.
            Switching changes who you play as; it is not a change of portrait.
          </p>

          <div className="list">
            {totems.map((t) => (
              <button
                key={t.id}
                className="card row"
                disabled={!isUsable(t)}
                style={{ width: '100%', textAlign: 'left', opacity: isUsable(t) ? 1 : 0.5 }}
                onClick={() => {
                  setActiveTotem(t.id)
                  setRosterOpen(false)
                }}
              >
                <AssetImage category="totems" assetKey={t.avatarKey} alt={t.name} className="avatar-img" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{t.name}</div>
                  <div className="faint">
                    Lv {t.level} · {t.destroyed ? '파괴됨' : `❤️ ${t.currentHp}/${t.maxHp} · ◆ ${t.lifePoints}/${t.maxLifePoints}`}
                  </div>
                </div>
                {t.id === totem.id ? <span style={{ color: 'var(--accent-gold)' }}>✓ 사용 중</span> : null}
              </button>
            ))}
          </div>

          <h3>새 토템 기르기</h3>
          <p className="faint">
            Starts at level 1 with a full set of 생명력, named after its portrait. Every portrait in{' '}
            <code>public/assets/totems</code> is available.
          </p>
          <div className="avatar-grid">
            {assetKeys('totems').map((key) => (
              <button
                key={key}
                className="avatar-option"
                onClick={() => {
                  createNewTotem(nameFromAvatarKey(key), key)
                  setRosterOpen(false)
                }}
              >
                <AssetImage category="totems" assetKey={key} alt={key} className="avatar-img" />
                <span className="avatar-option-name">{nameFromAvatarKey(key)}</span>
              </button>
            ))}
          </div>
        </SlidePanel>
      )}

      {avatarPickerOpen && (
        <SlidePanel title="초상화 고르기" onClose={() => setAvatarPickerOpen(false)}>
          <p className="faint">
            <code>public/assets/totems</code>에 있는 모든 초상화입니다. 겉모습만 바뀌고 토템의 다른 것은
            그대로입니다.
          </p>
          <div className="avatar-grid">
            {assetKeys('totems').map((key) => (
              <button
                key={key}
                className={`avatar-option${key === totem.avatarKey ? ' selected' : ''}`}
                onClick={() => {
                  setTotemAvatar(totem.id, key)
                  setAvatarPickerOpen(false)
                }}
              >
                <AssetImage category="totems" assetKey={key} alt={key} className="avatar-img" />
                <span className="avatar-option-name">{key}</span>
              </button>
            ))}
          </div>
        </SlidePanel>
      )}

      {pickerOpen && (
        <SlidePanel title="주문 세트 고르기" onClose={() => setPickerOpen(false)}>
          {spellSets.length === 0 && (
            <div className="empty-state">
              <span className="glyph">🗂️</span>
              <p>아직 주문 세트가 없습니다 — 먼저 도감에서 만드세요.</p>
            </div>
          )}

          <div className="list">
            {spellSets.map((set) => (
              <button
                key={set.id}
                className="card row"
                style={{
                  width: '100%',
                  textAlign: 'left',
                  borderColor: set.id === totem.equippedSpellSetId ? 'var(--accent-gold)' : undefined,
                }}
                onClick={() => {
                  equipTotemSpellSet(totem.id, set.id)
                  setPickerOpen(false)
                }}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>{set.name}</div>
                  <div className="faint">주문 {set.spellIds.length}개</div>
                </div>
                {set.id === totem.equippedSpellSetId ? (
                  <span style={{ color: 'var(--accent-gold)' }}>✓ 장착됨</span>
                ) : (
                  <span className="faint">장착</span>
                )}
              </button>
            ))}
          </div>

          {equippedSet && (
            <button
              className="btn btn-ghost btn-block"
              onClick={() => {
                equipTotemSpellSet(totem.id, null)
                setPickerOpen(false)
              }}
            >
              주문 세트 해제
            </button>
          )}
        </SlidePanel>
      )}
    </div>
  )
}
