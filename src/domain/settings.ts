export interface GameSettings {
  /** Seconds allowed to answer an enemy attack. Configurable for a11y/testing. */
  enemyTimerSeconds: number
  /** Typewriter reveal speed, characters per second. */
  typewriterCharsPerSecond: number
}

export const defaultSettings: GameSettings = {
  enemyTimerSeconds: 12,
  typewriterCharsPerSecond: 38,
}
