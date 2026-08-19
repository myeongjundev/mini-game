import { MEMO } from '../config'
import { ALERTS } from '../data/alerts'
import { MEMOS } from '../data/memos'
import type { Memo, Tier } from '../types'

/**
 * 메모 배치. 규칙은 `docs/GAME_SPEC.md` 13절이다.
 *
 * 슬롯 1·2는 티어 2 경보를, 슬롯 3·4는 티어 3 경보를 돕는 메모를 뽑는다.
 * 큐가 티어별 봉지라 그 티어의 경보는 해당 구간에 반드시 나오므로,
 * 티어가 시작되기 전에 띄우면 짝이 자동으로 맞는다.
 */
export type MemoSlot = {
  /** 이 시각을 지난 뒤 새 경보가 뜨면 표시한다. 발화 시각이 아니라 자격 시각이다. */
  dueAtMs: number
  memo: Memo
}

export type MemoPlan = {
  slots: readonly MemoSlot[]
  /** 이미 표시한 슬롯 수. 남은 슬롯은 slots[shown] 부터다. */
  shown: number
}

const SLOT_TIERS: readonly Tier[] = [2, 2, 3, 3]

function tierOf(memo: Memo): Tier | null {
  return ALERTS.find((alert) => alert.id === memo.alertId)?.tier ?? null
}

/** alertQueue와 같은 선형 합동 생성기다. 시드가 같으면 배치도 같다. */
const RANDOM_MULTIPLIER = 1_664_525
const RANDOM_INCREMENT = 1_013_904_223
const RANDOM_DIVISOR = 0x1_0000_0000

function nextRandom(state: number): { value: number; state: number } {
  const nextState = (Math.imul(state, RANDOM_MULTIPLIER) + RANDOM_INCREMENT) >>> 0

  return { value: nextState / RANDOM_DIVISOR, state: nextState }
}

export function createMemoPlan(seed: number, memos: readonly Memo[] = MEMOS): MemoPlan {
  const byTier = new Map<Tier, Memo[]>()

  for (const memo of memos) {
    const tier = tierOf(memo)
    if (tier === null) continue
    byTier.set(tier, [...(byTier.get(tier) ?? []), memo])
  }

  const slots: MemoSlot[] = []
  let randomState = seed >>> 0

  for (let index = 0; index < MEMO.perShift; index += 1) {
    const tier = SLOT_TIERS[index]
    const pool = byTier.get(tier) ?? []

    if (pool.length === 0) continue

    const random = nextRandom(randomState)
    randomState = random.state
    const [picked] = pool.splice(Math.floor(random.value * pool.length), 1)
    byTier.set(tier, pool)

    slots.push({ dueAtMs: MEMO.slotsMs[index], memo: picked })
  }

  return { slots, shown: 0 }
}

/**
 * 자격 시각을 지난 다음 슬롯을 돌려준다. 없으면 null이다.
 * 호출은 새 경보가 뜨는 순간에만 한다.
 */
export function takeDueMemo(
  plan: MemoPlan,
  elapsedMs: number,
): { memo: Memo; plan: MemoPlan } | null {
  const next = plan.slots[plan.shown]

  if (!next || elapsedMs < next.dueAtMs) {
    return null
  }

  return { memo: next.memo, plan: { ...plan, shown: plan.shown + 1 } }
}
