export function formatSeconds(milliseconds: number): string {
  return `${(Math.max(0, milliseconds) / 1_000).toFixed(1)}s`
}

export function formatScore(score: number): string {
  return Math.max(0, Math.trunc(score)).toLocaleString('en-US')
}

export function formatAccuracy(correct: number, reviewed: number): string {
  if (reviewed <= 0) {
    return '0.0%'
  }

  return `${((correct / reviewed) * 100).toFixed(1)}%`
}
