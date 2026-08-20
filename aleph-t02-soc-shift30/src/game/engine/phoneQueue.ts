import { PHONE } from '../config'
import { PHONE_CALLER, PHONE_MESSAGES } from '../data/phoneCalls'
import type { Action, Alert, PhoneCall } from '../types'
import type { AlertQueueState } from './alertQueue'

/**
 * 상사의 전화 배치. 규칙은 `docs/GAME_SPEC.md` 14절이다.
 *
 * 지시는 판이 시작될 때 시드 난수로 정하고, 지목할 경보는 발화 시각에
 * 큐를 **읽어서** 고른다. 큐를 바꾸지 않는 것이 13.4의 약속이다.
 *
 * 지시를 정답 방향으로 정하지 않으므로 참·거짓이 1:1이 된다. 티어 3은
 * BLOCK 4 / ALLOW 1이라 "통과시켜"로 고정하면 지시의 80%가 거짓이 된다.
 */
export type PhonePlan = {
  order: Action
  /** 이미 걸려 왔는가. 한 판에 `PHONE.perShift`번뿐이다. */
  shown: number
}

/** alertQueue와 같은 선형 합동 생성기다. 시드가 같으면 지시도 같다. */
const RANDOM_MULTIPLIER = 1_664_525
const RANDOM_INCREMENT = 1_013_904_223
const RANDOM_DIVISOR = 0x1_0000_0000

/**
 * 한 번만 돌리면 이웃한 시드가 같은 지시로 몰린다. 선형 합동 생성기는
 * 한 걸음으로는 입력의 이웃 관계를 깨지 못한다. 시드 0~399를 넣었더니
 * 400개가 전부 ALLOW로 나왔다. 두 걸음 돌려서 섞는다.
 */
function nextRandom(state: number): number {
  return (Math.imul(state, RANDOM_MULTIPLIER) + RANDOM_INCREMENT) >>> 0
}

export function createPhonePlan(seed: number): PhonePlan {
  const state = nextRandom(nextRandom(seed >>> 0))

  return { order: state / RANDOM_DIVISOR < 0.5 ? 'ALLOW' : 'BLOCK', shown: 0 }
}

/** 자격 시각을 지났고 아직 안 걸려 왔으면 참이다. 호출은 새 경보가 뜰 때만 한다. */
export function isPhoneDue(plan: PhonePlan, elapsedMs: number): boolean {
  return plan.shown < PHONE.perShift && elapsedMs >= PHONE.slotMs
}

/**
 * 지목할 경보를 큐에서 읽는다. **큐는 바뀌지 않는다.**
 *
 * 맨 앞이 다음에 나올 티어 3 경보다. 다만 그 경보에 이번 판 공지가 이미
 * 떴다면 건너뛴다. 한 경보에 출처가 둘이면 전화가 알려줄 것이 없어지고
 * 받을 이유도 사라진다(14.4).
 *
 * 명세는 "지목한 경보의 메모를 띄우지 않는다"고 적었지만 그 순서로는 될 수
 * 없다. 메모는 3~18초에 이미 다 발화하고 전화는 21초다. 그래서 겹침을
 * 메모가 아니라 **전화 쪽에서** 피한다. 결과는 같다 — 한 경보에 출처는 하나다.
 */
export function resolvePhoneCall(
  queue: AlertQueueState,
  order: Action,
  shownMemoAlertIds: readonly string[],
): PhoneCall | null {
  // 봉지는 그 티어를 처음 뽑을 때 채워진다. 전화는 경보를 뽑은 **뒤에**
  // 부르므로 21초 시점에는 티어 3 봉지가 이미 차 있다. 그래도 비어 있는
  // 경우를 대비해 설정 순서로 물러선다.
  const remaining = queue.remainingByTier[3]
  const pool: readonly Alert[] =
    remaining.length > 0 ? remaining : queue.alertsByTier[3]

  if (pool.length === 0) {
    return null
  }

  const target =
    pool.find((alert) => !shownMemoAlertIds.includes(alert.id)) ?? pool[0]
  const message = PHONE_MESSAGES[target.id]?.[order]

  if (!message) {
    return null
  }

  return {
    alertId: target.id,
    order,
    truthful: order === target.correctAction,
    caller: PHONE_CALLER,
    message,
  }
}

/** 벨이 다 갔는지. 통화로 넘어갔으면 벨 시계는 보지 않는다. */
export function isRingExpired(
  ringStartedAtMs: number,
  elapsedMs: number,
): boolean {
  return elapsedMs - ringStartedAtMs >= PHONE.ringMs
}

/** 남은 벨 시간의 비율. 화면 눈금이 쓴다. */
export function ringProgress(
  ringStartedAtMs: number,
  elapsedMs: number,
): number {
  const left = PHONE.ringMs - (elapsedMs - ringStartedAtMs)

  return Math.min(1, Math.max(0, left / PHONE.ringMs))
}
