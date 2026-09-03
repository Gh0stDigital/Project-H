import { useState } from 'react'
import type { Spell } from '@/domain/spell'
import { usePersistentStore } from '@/state/persistentStore'
import { validateNewSpell, DEFAULT_WORD_TYPE } from '@/systems/spellFactory'
import {
  allWordTypes,
  elementDefFor,
  futureLabelFor,
  showsConjugations,
  wordTypeDefs,
  type WordType,
} from '@/config/wordTypes'

interface SpellEditorFormProps {
  existing?: Spell
  onDone: () => void
  onCancel: () => void
}

/**
 * Create/edit form for a single vocabulary entry.
 *
 * No semantic validation is performed — only that the headword and
 * Definition 1 are present, per the prototype's scope. The Element is
 * never an input: it follows the Word Type and is shown read-only so the
 * player can see what their choice produced.
 */
export function SpellEditorForm({ existing, onDone, onCancel }: SpellEditorFormProps) {
  const createSpell = usePersistentStore((s) => s.createSpell)
  const editSpell = usePersistentStore((s) => s.editSpell)

  const [korean, setKorean] = useState(existing?.korean ?? '')
  const [wordType, setWordType] = useState<WordType>(existing?.wordType ?? DEFAULT_WORD_TYPE)
  const [english, setEnglish] = useState(existing?.english ?? '')
  const [definition2, setDefinition2] = useState(existing?.definition2 ?? '')
  const [definition3, setDefinition3] = useState(existing?.definition3 ?? '')
  const [sampleSentence, setSampleSentence] = useState(existing?.sampleSentence ?? '')
  const [sampleTranslation, setSampleTranslation] = useState(existing?.sampleTranslation ?? '')
  const [derivedVerb, setDerivedVerb] = useState(existing?.derivedVerb ?? '')
  const [presentForm, setPresentForm] = useState(existing?.presentForm ?? '')
  const [pastForm, setPastForm] = useState(existing?.pastForm ?? '')
  const [futureForm, setFutureForm] = useState(existing?.futureForm ?? '')
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [errors, setErrors] = useState<{ korean?: string; english?: string }>({})

  const typeDef = wordTypeDefs[wordType]
  // Element follows the type automatically — this is the only place it is
  // computed for display, and there is no way to set it by hand.
  const element = elementDefFor(wordType)
  const showForms = showsConjugations(wordType, derivedVerb)
  const futureLabel = futureLabelFor(wordType, derivedVerb)
  const formsSubject = typeDef.conjugates ? korean.trim() || 'this word' : derivedVerb.trim()

  function handleSave() {
    const validation = validateNewSpell({ korean, english })
    if (validation.length > 0) {
      const next: { korean?: string; english?: string } = {}
      for (const e of validation) next[e.field] = e.message
      setErrors(next)
      return
    }
    const content = {
      korean,
      english,
      definition2,
      definition3,
      notes,
      wordType,
      sampleSentence,
      sampleTranslation,
      derivedVerb,
      presentForm,
      pastForm,
      futureForm,
    }
    if (existing) editSpell(existing.id, content)
    else createSpell(content)
    onDone()
  }

  return (
    <div className="list spell-editor">
      <div className="field">
        <label htmlFor="kor-input">Word</label>
        <input
          id="kor-input"
          type="text"
          lang="ko"
          value={korean}
          onChange={(e) => setKorean(e.target.value)}
          placeholder="예: 전달하다"
        />
        {errors.korean && <span className="field-error">{errors.korean}</span>}
      </div>

      {/* ---- Word type, and the Element it produces ---- */}
      <div className="field">
        <label htmlFor="type-input">Word Type</label>
        <select id="type-input" value={wordType} onChange={(e) => setWordType(e.target.value as WordType)}>
          {allWordTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <span className="faint">{typeDef.hint}</span>
      </div>

      <div className={`element-readout element-${element.id}`}>
        <span className="element-icon">{element.icon}</span>
        <div>
          <div className="element-name">{element.label}</div>
          <div className="faint">Set automatically from the Word Type</div>
        </div>
      </div>

      {/* ---- Meanings ---- */}
      <div className="field">
        <label htmlFor="def1-input">Definition 1</label>
        <input
          id="def1-input"
          type="text"
          lang="en"
          spellCheck
          value={english}
          onChange={(e) => setEnglish(e.target.value)}
          placeholder="e.g. to deliver"
        />
        {errors.english && <span className="field-error">{errors.english}</span>}
      </div>

      <div className="field">
        <label htmlFor="def2-input">Definition 2 (optional)</label>
        <input
          id="def2-input"
          type="text"
          lang="en"
          spellCheck
          value={definition2}
          onChange={(e) => setDefinition2(e.target.value)}
          placeholder="e.g. to convey"
        />
      </div>

      <div className="field">
        <label htmlFor="def3-input">Definition 3 (optional)</label>
        <input
          id="def3-input"
          type="text"
          lang="en"
          spellCheck
          value={definition3}
          onChange={(e) => setDefinition3(e.target.value)}
          placeholder="e.g. to pass along"
        />
        <span className="faint">Any filled-in definition counts as a correct answer.</span>
      </div>

      {/* ---- Example usage ---- */}
      <div className="field">
        <label htmlFor="sample-input">Sample Sentence (optional)</label>
        <input
          id="sample-input"
          type="text"
          lang="ko"
          value={sampleSentence}
          onChange={(e) => setSampleSentence(e.target.value)}
          placeholder="예: 내용을 담당자에게 전달했어요."
        />
      </div>

      <div className="field">
        <label htmlFor="sample-tr-input">Sample Sentence Translation (optional)</label>
        <input
          id="sample-tr-input"
          type="text"
          lang="en"
          spellCheck
          value={sampleTranslation}
          onChange={(e) => setSampleTranslation(e.target.value)}
          placeholder="e.g. I passed the information along."
        />
      </div>

      {/* ---- Derived 하다 verb, for types that can take one ---- */}
      {typeDef.allowsDerivedVerb && (
        <div className="field">
          <label htmlFor="derived-input">Derived Verb (optional)</label>
          <input
            id="derived-input"
            type="text"
            lang="ko"
            value={derivedVerb}
            onChange={(e) => setDerivedVerb(e.target.value)}
            placeholder="예: 검토하다"
          />
          <span className="faint">
            A related 하다 verb, if this word has one. Adding it unlocks the conjugation fields below.
          </span>
        </div>
      )}

      {/* ---- Conjugations: verbs always, others only via a derived verb ---- */}
      {showForms && (
        <div className="conjugation-block">
          <div className="conjugation-head">
            Conjugations
            {formsSubject && <span className="faint"> — {formsSubject}</span>}
          </div>

          <div className="field">
            <label htmlFor="present-input">Present</label>
            <input
              id="present-input"
              type="text"
              lang="ko"
              value={presentForm}
              onChange={(e) => setPresentForm(e.target.value)}
              placeholder="예: 전달해요"
            />
          </div>

          <div className="field">
            <label htmlFor="past-input">Past</label>
            <input
              id="past-input"
              type="text"
              lang="ko"
              value={pastForm}
              onChange={(e) => setPastForm(e.target.value)}
              placeholder="예: 전달했어요"
            />
          </div>

          <div className="field">
            <label htmlFor="future-input">{futureLabel}</label>
            <input
              id="future-input"
              type="text"
              lang="ko"
              value={futureForm}
              onChange={(e) => setFutureForm(e.target.value)}
              placeholder="예: 전달할 거예요"
            />
          </div>
        </div>
      )}

      <div className="field">
        <label htmlFor="notes-input">Notes (optional)</label>
        <textarea
          id="notes-input"
          rows={3}
          spellCheck
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Usage notes, mnemonics, nuance..."
        />
      </div>

      <div className="btn-row">
        <button className="btn btn-primary btn-block" onClick={handleSave}>
          {existing ? 'Save Changes' : 'Create Entry'}
        </button>
      </div>
      <button className="btn btn-ghost btn-block" onClick={onCancel}>
        Cancel
      </button>
    </div>
  )
}
