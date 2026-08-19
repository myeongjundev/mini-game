/**
 * 판정 결과를 화면에 띄워두는 시간.
 * 난이도 실험의 통제 대상이 아니다. 전·후 20판 내내 이 값을 고정한다.
 * eventIntervalMs보다 반드시 짧아야 한다. 그렇지 않으면 판정 표시가 끊기지 않는다.
 */
export const VERDICT_FLASH_MS = 800

export const DIFFICULTY = {
  eventIntervalMs: 1400,
  totalTimeMs: 30_000,
  lives: 3,
} as const

/**
 * 근무 중 방해. 규칙은 `docs/GAME_SPEC.md` 13절이다.
 * 난이도 실험 중에는 이 값을 고정한다.
 *
 * slotsMs는 발화 시각이 아니라 **자격 시각**이다. 실제 표시는 그 시각을
 * 지난 뒤 새 경보가 뜨는 순간이다. 경보가 끝나갈 때 끼어들면 아무리 빨리
 * 닫아도 미판정이 되어 실력으로 피할 수 없다.
 */
export const MEMO = {
  perShift: 4,
  slotsMs: [3_000, 7_000, 12_000, 16_000],
  readThresholdMs: 600,
} as const
