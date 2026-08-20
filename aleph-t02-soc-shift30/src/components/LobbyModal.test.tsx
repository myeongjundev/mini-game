// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ReadyScreen, { GUIDE_PAGE_COUNT } from './screens/ReadyScreen'

/**
 * 로비 가이드·설정 모달. 규격은
 * `prompts/04_LOBBY_MODAL_WINDOW_HANDOFF.md`에 있다.
 *
 * 모달은 리듀서가 아니라 화면이 들고 있는 상태다. 리듀서 검사로는 열림·닫힘도
 * 포커스도 증명되지 않으므로 실제로 렌더해서 누른다. 메모 멈춤 버그에서
 * 배운 것이다(docs/TROUBLESHOOTING.md 1-1).
 */
describe('로비 모달', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  const handlers = {
    onIntroComplete: vi.fn(),
    onStart: vi.fn(),
    onToggleMute: vi.fn(),
    onSetVolume: vi.fn(),
    onToggleReduceMotion: vi.fn(),
  }

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    for (const fn of Object.values(handlers)) fn.mockClear()
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  /** 인트로는 건너뛰고 로비부터 시작한다. */
  const renderLobby = (overrides: { mute?: boolean; volume?: 0 | 1 | 2; reduceMotion?: boolean } = {}) => {
    act(() =>
      root.render(
        <ReadyScreen
          bestScore={0}
          mute={overrides.mute ?? true}
          volume={overrides.volume ?? 1}
          reduceMotion={overrides.reduceMotion ?? false}
          playIntro={false}
          {...handlers}
        />,
      ),
    )
  }

  const button = (label: string) =>
    [...container.querySelectorAll('button')].find(
      (item) => item.textContent?.trim() === label,
    )

  const modal = () => container.querySelector('.lobby-modal')
  const commands = () => [...container.querySelectorAll('.lobby-modal-command')]
  const click = (element: Element | undefined) => act(() => (element as HTMLElement)?.click())
  const closeButton = () => container.querySelector('.lobby-modal-close')
  const toggle = (index: number) =>
    container.querySelectorAll('.lobby-settings-row button')[index]
  const press = (key: string) =>
    act(() => {
      modal()?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
    })

  it('HOW TO PLAY를 누르면 가이드 모달이 열리고 기존 가이드 내용이 보인다', () => {
    renderLobby()
    expect(modal()).toBeNull()

    click(button('HOW TO PLAY'))

    const dialog = modal()
    expect(dialog).not.toBeNull()
    expect(dialog?.getAttribute('role')).toBe('dialog')
    expect(dialog?.getAttribute('aria-modal')).toBe('true')
    expect(container.querySelector('.lobby-modal-title')?.textContent).toBe('HOW TO PLAY')
    // 기존 LobbyGuidePage 내용을 그대로 쓴다.
    expect(dialog?.textContent).toContain('근무 요령')
    expect(dialog?.textContent).toContain('ALLOW')
  })

  it('SETTINGS를 누르면 같은 프레임에 설정이 보인다', () => {
    renderLobby()

    click(button('SETTINGS'))

    expect(container.querySelector('.lobby-modal-title')?.textContent).toBe('SYSTEM SETTINGS')
    expect(modal()?.textContent).toContain('SOUND')
    expect(modal()?.textContent).toContain('REDUCE MOTION')
    // 같은 그림 한 장을 공용으로 쓴다.
    expect(container.querySelector('.lobby-modal-frame')?.getAttribute('src')).toContain(
      'lobby-modal-window.webp',
    )
  })

  it('모달은 한 번에 하나만 열린다', () => {
    renderLobby()

    click(button('HOW TO PLAY'))
    expect(container.querySelectorAll('.lobby-modal')).toHaveLength(1)

    // 모달이 떠 있는 동안 뒤쪽 버튼은 막혀 있으므로 닫고 다시 연다.
    press('Escape')
    click(button('SETTINGS'))

    expect(container.querySelectorAll('.lobby-modal')).toHaveLength(1)
    expect(container.querySelector('.lobby-modal-title')?.textContent).toBe('SYSTEM SETTINGS')
  })

  it('Escape·우측 상단 닫기·하단 CLOSE가 모두 같은 종료 동작을 한다', () => {
    renderLobby()

    click(button('SETTINGS'))
    press('Escape')
    expect(modal()).toBeNull()

    click(button('SETTINGS'))
    click(container.querySelector('.lobby-modal-close') ?? undefined)
    expect(modal()).toBeNull()

    click(button('SETTINGS'))
    // 설정의 하단 버튼은 RESET / CLOSE다.
    click(commands()[1])
    expect(modal()).toBeNull()
  })

  it('열리면 모달 안으로 포커스가 가고 닫으면 열었던 버튼으로 돌아온다', () => {
    renderLobby()

    const trigger = button('HOW TO PLAY')
    act(() => trigger?.focus())
    click(trigger)

    expect(modal()?.contains(document.activeElement)).toBe(true)

    press('Escape')

    expect(document.activeElement).toBe(trigger)
  })

  it('모달이 열린 동안 뒤쪽 로비는 입력을 받지 않는다', () => {
    renderLobby()

    click(button('HOW TO PLAY'))

    const console_ = container.querySelector('.lobby-console')
    expect(console_?.hasAttribute('inert')).toBe(true)
    // START SHIFT가 막힌 영역 안에 있다.
    expect(container.querySelector('.lobby-start')?.closest('[inert]')).toBe(console_)

    press('Escape')

    expect(container.querySelector('.lobby-console')?.hasAttribute('inert')).toBe(false)
    expect(handlers.onStart).not.toHaveBeenCalled()
  })

  it('가이드는 쪽을 앞뒤로 넘기고 마지막 쪽에서 하단 버튼이 CLOSE가 된다', () => {
    renderLobby()
    click(button('HOW TO PLAY'))

    expect(commands().map((item) => item.textContent)).toEqual(['PREV', 'NEXT'])
    // 첫 쪽에서는 이전으로 갈 수 없다.
    expect((commands()[0] as HTMLButtonElement).disabled).toBe(true)

    click(commands()[1])
    // 두 번째 쪽은 근무 중 공지다. 근무 3초부터 뜨는 요소라 판단 교재보다 앞에 둔다.
    expect(modal()?.textContent).toContain('근무 중 공지')
    expect((commands()[0] as HTMLButtonElement).disabled).toBe(false)

    click(commands()[0])
    expect(modal()?.textContent).toContain('근무 요령')

    // 마지막 쪽까지 간다. 쪽 수가 늘어도 검사가 썩지 않게 상수에서 센다.
    for (let index = 0; index < GUIDE_PAGE_COUNT - 1; index += 1) click(commands()[1])
    expect(modal()?.textContent).toContain('자주 갈리는 지점')
    expect(commands().map((item) => item.textContent)).toEqual(['PREV', 'CLOSE'])

    click(commands()[1])
    expect(modal()).toBeNull()
  })

  it('가이드에서 좌우 방향키가 쪽을 넘기고 양 끝에서 멈춘다', () => {
    renderLobby()
    click(button('HOW TO PLAY'))

    // 읽는 중에 PREV·NEXT를 찾아 누르지 않아도 되게 한다.
    press('ArrowRight')
    expect(modal()?.textContent).toContain('근무 중 공지')
    press('ArrowLeft')
    expect(modal()?.textContent).toContain('근무 요령')

    // 첫 쪽에서 더 왼쪽은 없다. 하단 PREV가 비활성인 것과 같은 규칙이다.
    press('ArrowLeft')
    expect(modal()?.textContent).toContain('근무 요령')

    for (let index = 0; index < GUIDE_PAGE_COUNT; index += 1) press('ArrowRight')
    // 마지막 쪽을 넘어 닫히지 않는다. 닫는 것은 CLOSE와 Escape만 한다.
    expect(modal()?.textContent).toContain('자주 갈리는 지점')
  })

  it('모달 안에서 위아래 방향키가 버튼 사이를 돈다', () => {
    renderLobby()
    click(button('SETTINGS'))

    // 열리면 첫 조작 대상인 닫기 버튼을 잡고 있다.
    expect(document.activeElement).toBe(closeButton())

    press('ArrowDown')
    expect(document.activeElement).toBe(toggle(0))
    press('ArrowDown')
    // 소리가 꺼져 있어 크기는 비활성이다. 건너뛴다.
    expect(document.activeElement).toBe(toggle(2))

    press('ArrowUp')
    expect(document.activeElement).toBe(toggle(0))
  })

  it('쪽 넘김이 없는 모달에서는 좌우도 포커스를 옮긴다', () => {
    renderLobby()
    click(button('SETTINGS'))

    press('ArrowRight')
    expect(document.activeElement).toBe(toggle(0))
    press('ArrowLeft')
    expect(document.activeElement).toBe(closeButton())
  })

  it('방향키가 모달 밖으로 새지 않는다', () => {
    renderLobby()
    click(button('SETTINGS'))

    press('ArrowDown')

    // 뒤쪽 로비 버튼으로 넘어가면 막아둔 화면을 키보드로 조작하게 된다.
    expect(modal()?.contains(document.activeElement)).toBe(true)
  })

  it('누르고 있어도 쪽이 한 번에 넘어가지 않는다', () => {
    renderLobby()
    click(button('HOW TO PLAY'))

    act(() => {
      modal()?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', repeat: true, bubbles: true }),
      )
    })

    expect(modal()?.textContent).toContain('근무 요령')
  })

  it('누른 버튼이 비활성이 되면 포커스를 닫기 버튼이 받는다', () => {
    renderLobby()
    click(button('HOW TO PLAY'))

    // PREV는 첫 쪽으로 돌아온 순간 자기 자신이 비활성이 된다.
    click(commands()[1])
    const prev = commands()[0] as HTMLButtonElement
    act(() => prev.focus())
    click(prev)

    expect((commands()[0] as HTMLButtonElement).disabled).toBe(true)
    // 그대로 두면 포커스가 body로 떨어져 방향키도 Tab도 시작점을 잃는다.
    expect(modal()?.contains(document.activeElement)).toBe(true)
    expect(document.activeElement).toBe(closeButton())
  })

  it('SOUND와 REDUCE MOTION은 기존 콜백을 그대로 부른다', () => {
    renderLobby({ mute: true, reduceMotion: false })
    click(button('SETTINGS'))

    const toggles = [...container.querySelectorAll('.lobby-settings-row button')]
    // 소리 꺼짐(mute), 크기 MID, 움직임 줄이기 꺼짐 상태의 표시다.
    expect(toggles.map((item) => item.textContent?.trim())).toEqual([
      '// OFF', '// MID', '// OFF',
    ])

    click(toggles[0])
    expect(handlers.onToggleMute).toHaveBeenCalledTimes(1)

    click(toggles[2])
    expect(handlers.onToggleReduceMotion).toHaveBeenCalledTimes(1)
  })

  it('소리를 끈 상태에서는 크기를 고를 수 없다', () => {
    renderLobby({ mute: true })
    click(button('SETTINGS'))

    const volume = container.querySelectorAll('.lobby-settings-row button')[1] as HTMLButtonElement
    // 자리는 지키되 비활성이다. 사라지면 "어디 갔지"가 된다.
    expect(volume.disabled).toBe(true)
  })

  it('소리가 켜져 있으면 크기가 LOW MID HIGH로 돌아간다', () => {
    renderLobby({ mute: false, volume: 1 })
    click(button('SETTINGS'))

    const volume = () =>
      container.querySelectorAll('.lobby-settings-row button')[1] as HTMLButtonElement
    expect(volume().disabled).toBe(false)
    expect(volume().textContent?.trim()).toBe('// MID')

    click(volume())
    expect(handlers.onSetVolume).toHaveBeenCalledWith(2)

    // 마지막 단계에서 한 번 더 누르면 처음으로 돌아온다.
    handlers.onSetVolume.mockClear()
    renderLobby({ mute: false, volume: 2 })
    click(button('SETTINGS'))
    click(volume())
    expect(handlers.onSetVolume).toHaveBeenCalledWith(0)
  })

  it('설정이 기본값이 아니면 RESET이 기본값으로 되돌린다', () => {
    // 기본값은 storage.ts의 DEFAULTS다. 소리 꺼짐, 움직임 줄이기 꺼짐.
    renderLobby({ mute: false, reduceMotion: true })
    click(button('SETTINGS'))

    const reset = commands()[0] as HTMLButtonElement
    expect(reset.textContent).toBe('RESET')
    expect(reset.disabled).toBe(false)

    click(reset)

    expect(handlers.onToggleMute).toHaveBeenCalledTimes(1)
    expect(handlers.onToggleReduceMotion).toHaveBeenCalledTimes(1)
  })

  it('이미 기본값이면 RESET은 눌리지 않는다', () => {
    renderLobby({ mute: true, reduceMotion: false })
    click(button('SETTINGS'))

    expect((commands()[0] as HTMLButtonElement).disabled).toBe(true)
  })

  it('Reduce Motion이 켜져 있으면 모달 전환을 없앤다', () => {
    renderLobby({ reduceMotion: true })
    click(button('SETTINGS'))

    expect(
      container.querySelector('.lobby-modal-backdrop')?.getAttribute('data-reduce-motion'),
    ).toBe('true')
  })

  it('그림은 장식이라 이름을 읽지 않고 BASE_URL을 붙인다', () => {
    renderLobby()
    click(button('HOW TO PLAY'))

    const frame = container.querySelector('.lobby-modal-frame')
    expect(frame?.getAttribute('alt')).toBe('')
    expect(frame?.getAttribute('aria-hidden')).toBe('true')
    expect(frame?.getAttribute('src')).toBe(
      `${import.meta.env.BASE_URL}lobby-modal-window.webp`,
    )
  })

  // 하단 버튼 층(.lobby-modal-commands)이 inset: 0으로 모달 전체를 덮어
  // 닫기 버튼의 마우스 클릭을 가로채던 버그가 있었다. pointer-events로
  // 고쳤는데, jsdom은 스타일시트를 적용하지 않고 화면을 합성하지도 않아
  // elementFromPoint로 확인할 수 없다. 브라우저에서 실측했고 QA 12.7에
  // 사람이 볼 항목으로 남겼다.

  it('SHIFT RECORD는 그대로 패널로 열린다', () => {
    renderLobby()

    click(button('SHIFT RECORD'))

    // 모달이 아니라 기존 패널이다.
    expect(modal()).toBeNull()
    expect(container.textContent).toContain('SHIFT RECORD')
    expect(container.querySelector('.lobby-panel')).not.toBeNull()
  })
})
