# 로비 가이드·설정 모달 작업 인계서

## 목표

게임 로비의 `HOW TO PLAY` 또는 `SETTINGS`를 누르면 CRT 화면 안에 옛날 운영체제풍 모달 창을 띄운다.

한 장의 공용 창 이미지를 사용하고, 제목·본문·버튼·상태값은 React/HTML로 얹는다. 이미지 안에 문구를 합성하지 않는다.

## 준비된 이미지

| 용도 | 파일 | 규격 | 비고 |
| --- | --- | --- | --- |
| 공용 모달 창 껍데기 | `public/lobby-modal-window.webp` | 335×165 | 투명 배경, lossless WebP |

이미지는 다음 영역만 제공한다.

- 빈 제목 표시줄
- 우측 상단의 빈 닫기 버튼 자리
- 넓은 빈 본문 영역
- 우측 하단의 빈 버튼 자리 2개
- 앰버색 포커스 구분선

색상은 `#0A0C10`, `#12161D`, `#232B36`, `#F0A93B`만 사용한다. 외곽은 완전 투명이며 글자, 숫자, 아이콘, 로고, `X` 문양은 없다.

## 권장 동작

### HOW TO PLAY

1. 로비의 `HOW TO PLAY`를 누르면 기존 로비 화면 위에 모달을 연다.
2. 제목 표시줄에는 `HOW TO PLAY`를 HTML 텍스트로 표시한다.
3. 기존 `LobbyGuidePage` 내용과 페이지 이동 상태를 모달 본문으로 옮긴다.
4. 하단 두 버튼은 `PREV`, `NEXT`로 사용한다. 마지막 페이지에서는 두 번째 버튼을 `CLOSE`로 바꿔도 된다.
5. 닫으면 기존 로비 메뉴로 돌아가고 `HOW TO PLAY` 버튼에 포커스를 복원한다.

### SETTINGS

1. 로비 메뉴나 하단 푸터에 `SETTINGS` 버튼을 추가하고 같은 모달을 연다.
2. 제목은 `SYSTEM SETTINGS`로 표시한다.
3. 본문에는 현재 존재하는 설정을 묶는다.
   - `SOUND // ON | OFF`
   - `REDUCE MOTION // ON | OFF`
4. 설정은 누르는 즉시 적용한다. 별도의 저장 단계는 필요 없다.
5. 하단 버튼은 `DEFAULTS`, `CLOSE` 또는 `CANCEL`, `APPLY` 가운데 실제 동작에 맞는 두 개만 사용한다. 즉시 적용 방식을 유지한다면 `DEFAULTS`, `CLOSE`가 가장 자연스럽다.

## 현재 코드에서 바꿀 지점

주요 파일은 `src/components/screens/ReadyScreen.tsx`다.

- 현재 `LobbyPanel`은 `MENU | HOW_TO_PLAY | SHIFT_RECORD`로 구성되어 있다.
- 현재 `HOW_TO_PLAY`는 모달이 아니라 로비 패널 전체를 교체한다.
- `SOUND`와 `REDUCE MOTION`은 `lobby-console-footer`에 각각 별도 버튼으로 있다.
- 새 구현에서는 `SHIFT_RECORD` 동작은 그대로 두고, `HOW_TO_PLAY`만 모달로 전환한다.
- `SETTINGS` 모달을 열 버튼을 추가하고, 기존 두 설정 콜백을 그 안에서 재사용한다.

권장 상태 예시:

```ts
type LobbyModalType = 'GUIDE' | 'SETTINGS' | null

const [activeModal, setActiveModal] = useState<LobbyModalType>(null)
```

공용 컴포넌트 예시:

```tsx
<LobbyModal
  type={activeModal}
  onClose={() => setActiveModal(null)}
>
  {/* GUIDE 또는 SETTINGS의 실제 HTML 내용 */}
</LobbyModal>
```

구조와 이름은 기존 코드 스타일에 맞춰 조정해도 된다. 중요한 것은 이미지가 내용이 아니라 프레임 역할만 하는 것이다.

## 이미지 배치 규칙

```tsx
<img
  className="lobby-modal-frame"
  src={`${import.meta.env.BASE_URL}lobby-modal-window.webp`}
  alt=""
  aria-hidden="true"
/>
```

- `.crt-display` 또는 `.lobby-console` 안에 모달 레이어를 절대 배치한다.
- 이미지와 HTML 콘텐츠는 같은 크기의 그리드 셀에 겹치거나, 이미지 위에 `position: absolute`로 얹는다.
- `image-rendering: pixelated`를 사용한다.
- 원본 비율 `335 / 165`를 유지한다.
- 검은 반투명 배경막은 CSS로 만든다. 배경 블러는 사용하지 않는다.
- 모달은 CRT 화면 안쪽을 벗어나지 않아야 한다.
- 창의 제목·본문·버튼이 이미지 테두리와 겹치지 않도록 내부 여백을 CSS 변수로 관리한다.

권장 레이어:

```text
.crt-display
└─ .lobby-console
   ├─ 기존 로비 화면
   └─ .lobby-modal-backdrop
      └─ .lobby-modal
         ├─ 장식용 lobby-modal-window.webp
         ├─ 제목 + HTML 닫기 버튼
         ├─ 본문
         └─ HTML 동작 버튼 2개
```

## 접근성과 키보드

- 모달 루트는 네이티브 `<dialog>`를 쓰거나 `role="dialog"`, `aria-modal="true"`를 제공한다.
- `aria-labelledby`로 화면에 보이는 모달 제목을 연결한다.
- 열릴 때 첫 번째 조작 가능한 요소로 포커스를 보낸다.
- `Tab`과 `Shift+Tab` 포커스가 모달 밖으로 빠져나가지 않게 한다.
- `Escape`로 닫는다.
- 닫은 뒤 포커스를 모달을 연 버튼으로 돌려준다.
- 우측 상단 버튼은 이미지의 빈 사각형 위에 실제 `<button aria-label="닫기">`로 올린다.
- 모달이 열린 동안 로비 뒤쪽 버튼은 클릭·포커스·키보드 입력을 받지 않아야 한다.
- 기존 인트로의 `Enter / Space` 건너뛰기 이벤트와 충돌하지 않는지 확인한다.
- 방향키가 가이드 페이지 이동에 쓰이더라도 게임 입력 훅까지 전파되지 않도록 필요한 곳에서 이벤트를 처리한다.

## 모션과 반응형

- 기본 모션은 100~140ms 정도의 짧은 불투명도 전환만 허용한다.
- `reduceMotion === true` 또는 `prefers-reduced-motion: reduce`면 전환을 없앤다.
- 390px 모바일 폭과 640px 이상 폭에서 모두 확인한다.
- 작은 화면에서 글자 크기를 지나치게 줄이지 말고 본문 높이에 내부 스크롤을 허용한다.
- 스크롤이 생겨도 제목 표시줄과 하단 버튼은 고정하는 편이 좋다.

## 디자인 금지 사항

- 이미지 안에 제목이나 설명 문구를 새로 합성하지 않는다.
- 윈도우 로고나 상표를 사용하지 않는다. “옛날 운영체제풍”만 유지한다.
- 둥근 모서리, 유리 효과, 그라데이션, 블러, 네온 글로우를 추가하지 않는다.
- 모달 때문에 로비의 시작 버튼, 점수 기록, 게임 규칙을 변경하지 않는다.
- `public/password-locked.webp`, `public/password-unlocked.webp`는 물리 장치로 잘못 생성된 파일이므로 이 작업에 사용하지 않는다.

## 테스트 체크리스트

- `HOW TO PLAY` 클릭 시 모달이 열리고 기존 가이드 페이지가 보인다.
- `SETTINGS` 클릭 시 동일한 창 프레임에 설정 내용이 보인다.
- 두 모달을 동시에 열 수 없다.
- 닫기 버튼, `Escape`, 하단 닫기 버튼이 모두 같은 종료 동작을 한다.
- 모달이 열린 동안 뒤쪽 `START SHIFT`가 실행되지 않는다.
- 닫은 뒤 포커스가 원래 트리거로 돌아간다.
- `SOUND`와 `REDUCE MOTION` 상태 변경이 기존 콜백을 통해 즉시 반영된다.
- `reduceMotion`일 때 모달 전환 애니메이션이 없다.
- `npm test`와 `npm run build`가 통과한다.
- 브라우저 콘솔 오류가 없다.

## 클로드에게 바로 전달할 프롬프트

```text
mini-game/aleph-t02-soc-shift30/prompts/04_LOBBY_MODAL_WINDOW_HANDOFF.md를 읽고 구현해줘.

public/lobby-modal-window.webp는 가이드와 설정에서 공용으로 쓰는 빈 레트로 모달 프레임이다. 이미지 안에 글자를 합성하지 말고, 제목·본문·닫기 버튼·하단 버튼을 접근 가능한 React/HTML 요소로 정확히 겹쳐 배치해줘.

현재 ReadyScreen.tsx의 HOW_TO_PLAY 전체 패널 전환은 모달 방식으로 바꾸고, 기존 LobbyGuidePage 콘텐츠와 페이지 상태는 재사용해줘. SETTINGS 모달에는 기존 SOUND와 REDUCE MOTION 콜백을 연결해줘. SHIFT_RECORD와 게임 규칙은 건드리지 마.

Escape 닫기, 포커스 트랩과 복원, 배경 입력 차단, reduce motion, 390px/640px 반응형을 처리하고 관련 테스트를 추가한 뒤 npm test와 npm run build까지 확인해줘.
```

## 이미지 생성 기록

- 생성 방식: Codex 내장 ImageGen, 로컬 참고 이미지 2장을 스타일·구조 참고로 사용
- 참고 이미지: `public/lobby-office-blank.webp`, `public/password-window-locked.webp`
- 후처리: 최근접 이웃 축소, 지정 4색 팔레트 양자화, 알파 이진화, lossless WebP 저장
- 최종 파일: `public/lobby-modal-window.webp`

최종 생성 프롬프트:

```text
Use case: ui-mockup
Asset type: reusable raster shell for a game-lobby modal window
Input images: Image 1 is atmosphere and CRT-era palette reference only. Image 2 is the reference for flat software-window geometry, crisp pixel density, dark bevels, and transparent cutout treatment.
Primary request: create one front-facing, flat, late-1990s desktop operating-system dialog-window shell for the lobby monitor. It must work as a reusable empty container for either a Guide or Settings modal, with all real text and controls added later in HTML.
Canvas and composition: wide 335:165 aspect ratio. The window occupies about 90% of the canvas width and 86% of its height, centered, with a clean transparent margin on every side. No monitor hardware and no surrounding room. Perfectly orthographic, no perspective.
Window structure: hard rectangular 1–3 pixel stepped bevel border; one blank dark title bar across the top; one clearly recessed blank square close-button well at upper right but NO X symbol; one large completely blank inset content panel in the middle; one shallow bottom command strip containing exactly two empty rectangular beveled button wells aligned to the lower right. Leave generous blank surfaces for HTML overlay.
Style/medium: authentic restrained retro computer-game UI sprite, crisp rectangular pixels, simple low-color software chrome, matching Image 2. Not photorealistic, not painted, not a physical object.
Color palette: only near-black #0A0C10, dark navy #12161D, blue-gray #232B36, and a single muted amber #F0A93B focus stripe directly below the title bar. No other accent colors.
Constraints: genuine transparent background outside the window; no checkerboard pattern; no text; no letters; no numbers; no icons; no arrows; no X or close glyph; no logos; no trademarks; no watermark. Keep the central panel visually empty. Hard pixel edges only.
Avoid: gradients, glow, bloom, blur, rounded corners, modern glass UI, drop shadows, 3D depth, perspective, monitor bezels, room scenery, decorative clutter, fake text, extra controls.
```
