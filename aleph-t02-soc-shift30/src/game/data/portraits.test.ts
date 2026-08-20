import { describe, expect, it } from 'vitest'

import { ALERTS } from './alerts'
import { MEMOS } from './memos'
import { PORTRAIT_BY_ALERT, PORTRAIT_BY_DEPARTMENT, portraitUrl } from './portraits'

/**
 * 초상 연결표. 규격은 `prompts/05_CHARACTER_PORTRAITS_HANDOFF.md`에 있다.
 *
 * 여기서 지키는 것은 그림이 예쁘게 나오는지가 아니라 **그림이 정답을
 * 흘리지 않는지**다. 표시 하나가 정답과 상관을 가지면 읽지 않고 이기는
 * 길이 생긴다(`docs/ALERT_DATASET.md`의 심각도 누출).
 */
describe('초상 연결표', () => {
  it('얼굴이 붙은 경보의 정답이 한쪽으로 쏠리지 않는다', () => {
    const answers = Object.keys(PORTRAIT_BY_ALERT).map(
      (id) => ALERTS.find((alert) => alert.id === id)?.correctAction,
    )

    // "얼굴이 있으면 차단"이 통하면 안 된다.
    expect(answers.filter((action) => action === 'BLOCK')).toHaveLength(
      answers.filter((action) => action === 'ALLOW').length,
    )
    expect(answers.length).toBeGreaterThan(0)
  })

  it('얼굴이 없는 경보 쪽도 한쪽으로 쏠리지 않는다', () => {
    // 반대편이 쏠려도 같은 규칙이 뒤집힌 채로 성립한다.
    const rest = ALERTS.filter((alert) => PORTRAIT_BY_ALERT[alert.id] === undefined)
    const block = rest.filter((alert) => alert.correctAction === 'BLOCK').length

    expect(Math.abs(block - (rest.length - block))).toBeLessThanOrEqual(1)
  })

  it('없는 경보를 가리키지 않는다', () => {
    for (const id of Object.keys(PORTRAIT_BY_ALERT)) {
      expect(ALERTS.some((alert) => alert.id === id)).toBe(true)
    }
  })

  it('메모를 보내는 모든 부서에 얼굴이 있다', () => {
    for (const memo of MEMOS) {
      expect(PORTRAIT_BY_DEPARTMENT[memo.from]).toBeDefined()
    }
  })

  it('쓰지 않는 부서를 표에 남겨두지 않는다', () => {
    const senders = new Set(MEMOS.map((memo) => memo.from))

    for (const department of Object.keys(PORTRAIT_BY_DEPARTMENT)) {
      expect(senders.has(department)).toBe(true)
    }
  })

  it('부서마다 다른 얼굴이다', () => {
    const files = Object.values(PORTRAIT_BY_DEPARTMENT)

    // 같은 얼굴이 두 부서에 붙으면 출처를 구분하려던 목적이 사라진다.
    expect(new Set(files).size).toBe(files.length)
  })

  it('경보와 메모 모두 실제로 있는 초상 파일을 가리킨다', () => {
    const files = [
      ...Object.values(PORTRAIT_BY_DEPARTMENT),
      ...Object.values(PORTRAIT_BY_ALERT),
    ]

    for (const file of files) {
      // public/ 아래 128x128 PNG 8종이다. 이름 규칙이 곧 존재 확인이다.
      expect(file).toMatch(/^[a-z0-9-]+-portrait-128\.png$/)
    }
  })

  it('배포 base를 거쳐 경로를 만든다', () => {
    // `/`로 시작하는 문자열을 쓰면 하위 경로 배포에서 깨진다.
    expect(portraitUrl('team-lead-portrait-128.png')).toBe(
      `${import.meta.env.BASE_URL}team-lead-portrait-128.png`,
    )
  })
})
