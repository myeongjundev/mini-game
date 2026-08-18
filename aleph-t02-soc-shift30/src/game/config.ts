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
