# DESIGN TOKENS — SOC SHIFT:30

디자인 컨셉: **NIGHT SHIFT 콘솔**
새벽 3시 17분의 관제실. 뉴트럴 다크 배경에 시안·앰버·레드 3축.

`src/styles/tokens.css`가 구현이고 이 문서가 근거다.
**컴포넌트에 hex를 직접 쓰지 않는다.** 전부 변수를 거친다.

---

## 1. 왜 이 색인가

일반적인 관제 UI는 초록=정상 / 빨강=위험의 **1축**이다.
이 게임은 **2축**이다. 너무 막아도 지고 너무 열어도 진다.

| 실패 | 이름 | 결과 | 색 |
|---|---|---|---|
| 정상을 막음 | False Positive | 서비스가 죽는다 | **Amber** |
| 위협을 통과시킴 | Missed Threat | 침해가 일어난다 | **Red** |

두 실패에 다른 색을 주면 결과 화면의 막대 길이만 봐도
"나는 과차단형인가 과허용형인가"가 한눈에 보인다.
색 체계가 곧 이 게임의 주장이다.

---

## 2. 토큰

```css
:root {
  /* 표면 */
  --bg:          #0A0C10;   /* 페이지 바닥 */
  --panel:       #12161D;   /* 경보 카드, 패널 */
  --line:        #232B36;   /* 기본 구분선 */
  --line-dim:    #1B2029;   /* 막대 그래프 트랙 */

  /* 글자 */
  --text:        #E8EAED;   /* 값, 본문 */
  --text-dim:    #7C8798;   /* 라벨, 부가 정보 */

  /* 신호 */
  --cyan:        #3FC8E0;   /* 시스템 정보, ALLOW */
  --amber:       #F0A93B;   /* 가용성 손실, BLOCK, 오탐 */
  --red:         #E2564D;   /* 위협, 미탐 */
  --green:       #6FCF6B;   /* 정답 순간에만 0.3초 */

  /* 타이포 */
  --font-mono:   'JetBrains Mono', 'D2Coding', ui-monospace, monospace;

  /* 레이아웃 */
  --card-w:      720px;
  --gap-xs:      6px;
  --gap-sm:      12px;
  --gap-md:      16px;
  --gap-lg:      24px;
  --radius:      4px;
}
```

배경을 네이비가 아니라 **뉴트럴 다크**로 내린 이유: 네이비+시안 조합은 보안 포트폴리오에서 가장 흔한 색이다.
뉴트럴로 내리면 앰버가 야간 조명처럼 살아나고, 흔한 사이버 테마에서 빠져나온다.

---

## 3. 색 사용 규칙

### 반드시 지킨다

- **ALLOW 버튼은 시안, BLOCK 버튼은 앰버.**
- **BLOCK을 빨강으로 만들지 않는다.** 빨강은 위협의 색이지 내 행동의 색이 아니다.
- 빨강은 위협 표시와 미탐에만 쓴다.
- 초록은 정답 피드백 0.3초에만 쓴다. 상시 표시에 쓰면 보상감이 사라진다.
- 오탐은 앰버, 미탐은 빨강. 결과 화면 두 막대가 색으로 갈린다.

BLOCK이 앰버인 이유: **차단은 공짜가 아니다.**
버튼 단계에서부터 "막으면 가용성을 깎는다"는 감각이 생기고, 그 앰버가 결과 화면의 오탐 막대로 그대로 이어진다.

### 사실 신호 표시

경보 카드의 사실 4개 중 `signal: 'suspicious'`인 항목만 표시한다.

| 신호 | 표시 |
|---|---|
| `suspicious` | 값 앞에 7×7 도트 마커 + 값을 `--amber`로. 스크린리더용 텍스트 `수상한 항목` |
| `normal` | **아무 표시도 하지 않는다.** `--text` 기본색 그대로 |

`normal`에 표시를 붙이지 않는 것이 핵심이다. 양쪽을 다 칠하면 화면이 정답표처럼 읽힌다.
"이 항목은 한 번 봐야 한다" 정도의 **약한 신호**로 유지한다.

마커는 앰버지만 색에만 의존하지 않는다. 도트 아이콘의 유무가 흑백에서도 구별되고, 스크린리더에도 전달된다.

경보 카드 상단에 이 표시의 의미를 한 줄로 둔다. 예: `수상한 항목에 표시가 붙습니다`.
이 문장이 없으면 앰버가 무엇을 뜻하는지 알 수 없다.

### 색만으로 정보를 전달하지 않는다

색각 이상 사용자에게도 동작해야 한다. 모든 상태는 **색 + 다른 신호**를 함께 쓴다.

### 심각도를 색으로 표시하지 않는다

경보 카드의 왼쪽 테두리와 카테고리 아이콘에 심각도 색을 쓰지 않는다.
심각도는 정답과 상관이 93%라 색만 보고 답을 고를 수 있게 된다.

- 카드 왼쪽 테두리는 `--line` 중립색으로 고정한다
- 카테고리 아이콘은 항상 `--cyan`이다
- 카드에는 `TIER`만 표시하고 심각도 텍스트는 넣지 않는다
- 심각도는 판정이 끝난 뒤 SHIFT LOG에서 드러난다

근거는 `docs/ALERT_DATASET.md`의 "심각도는 판정 전에 노출하지 않는다" 절에 있다.

| 상태 | 색 | 함께 쓰는 신호 |
|---|---|---|
| 위협 경보 | 빨강 | 판정 후에만. 카드에는 쓰지 않는다 |
| 정답 | 초록 | `correct` 도트 아이콘 + `CORRECT` 텍스트 |
| 오탐 | 앰버 | `falsePositive` 아이콘 + `FALSE POSITIVE` 텍스트 |
| 미탐 | 빨강 | `missedThreat` 아이콘 + `MISSED THREAT` 텍스트 |
| 라이프 소진 | 회색 | `heartEmpty` 도트 (모양 자체가 다름) |

---

## 4. 타이포그래피

전부 모노스페이스 한 벌로 간다. **웹폰트를 CDN에서 불러오지 않는다.**
외부 요청이 없어야 콘솔 오류 0건과 오프라인 동작이 구조적으로 보장된다.

| 용도 | 크기 | 색 |
|---|---|---|
| HUD 수치 (TIME, SCORE) | 26px | `--cyan` / `--text` |
| HUD 라벨 | 11px | `--text-dim` |
| 경보 제목 | 11px, letter-spacing 1.5px | 심각도 색 |
| 경보 사실값 | 14px | `--text` |
| 경보 사실라벨 | 14px | `--text-dim` |
| 버튼 | 14px, letter-spacing 1px | `--cyan` / `--amber` |
| 결과 항목 | 12px | 항목별 |

- 숫자에는 `font-variant-numeric: tabular-nums`를 건다. 타이머가 매 프레임 떨리는 것을 막는다.
- 대문자 라벨에는 `letter-spacing`을 준다. 모노스페이스 대문자는 붙으면 뭉친다.
- 사실 라벨과 값은 **2열 그리드**로 정렬한다. 값의 시작 x좌표가 고정되어야 스캔이 빨라진다.

---

## 5. 레이아웃

```text
┌───────────────── 화면 ─────────────────┐
│                                        │
│        ┌──── 720px 고정 ────┐          │
│        │  HUD               │          │
│        │  경보 카드          │          │
│        │  [ALLOW]  [BLOCK]  │          │
│        └────────────────────┘          │
│                                        │
└────────────────────────────────────────┘
```

- 중앙 고정폭 `--card-w: 720px` + 좌우 여백.
- **해상도가 바뀌어도 카드 폭을 키우지 않는다.** 1366과 1920에서 같은 크기로 보인다.
- 이 구조 덕분에 가로 넘침이 발생할 수 없다. 과제의 두 해상도 검사가 구조적으로 통과된다.
- 세로가 부족한 경우에만 `--gap-*`를 줄인다. 폰트 크기는 줄이지 않는다.

---

## 6. 모션

| 사건 | 기본 | Reduce Motion |
|---|---|---|
| 경보 등장 | 아래 → 위 슬라이드 인 180ms | 즉시 표시 |
| ALLOW 판정 | 카드가 왼쪽으로 슬라이드 아웃 160ms | 테두리 시안 플래시 200ms |
| BLOCK 판정 | 카드가 오른쪽으로 슬라이드 아웃 160ms | 테두리 앰버 플래시 200ms |
| 오답 | 화면 흔들림 120ms | **완전 제거**, 테두리 빨강 플래시만 |
| 라이프 감소 | 하트 축소 후 복귀 | 색 전환만 |

판정 방향이 곧 내 선택이라 결과가 몸으로 기억된다.

Reduce Motion에서 **정보 손실이 0**인 것이 중요하다.
기능을 없애는 게 아니라 동등한 대체를 제공하는 것이며, 이 문장은 검증 안내서에 그대로 쓸 수 있다.

---

## 7. 도트 아이콘

도트는 **글자에서 빼고 아이콘에만** 넣는다.
픽셀 폰트로 `FAILED LOGIN: 87`을 0.3초에 읽는 건 불가능하고, 판독 실패가 곧 게임의 실패가 된다.

| 그룹 | 그리드 | 표시 크기 |
|---|---|---|
| 카테고리 | 12×12 | 24px (2x) |
| 라이프 | 9×8 | 18px (2x) |
| 사실 신호 | 7×7 | 14px (2x) |
| 판정 | 16×16 | 48px (3x) |
| 토글 | 12×12 | 24px (2x) |
| 등급 | 16×16 | 48px (3x) |

- **정수 배율만 쓴다.** 소수 배율은 픽셀을 뭉갠다.
- 해상도가 바뀌어도 표시 크기를 바꾸지 않는다.
- 색은 `fill="currentColor"`로 CSS가 정한다. 아이콘 하나가 모든 상태를 처리한다.
- 구현 규칙은 `BUILD_ORDER.md` 6절을 따른다.

---

## 8. 하지 말 것

- 그라디언트, 글로우, 네온, 블러
- 스캔라인 오버레이 (판독성과 Reduce Motion 양쪽에서 손해)
- CSS 프레임워크
- 외부 폰트·아이콘·이미지
- 컴포넌트 안 하드코딩 hex
- 색만으로 구분되는 상태
- 11px 미만 글자

---

## 9. 로비 화면 유리 좌표

로비는 배경 그림 `lobby-office-blank.webp`의 모니터 화면 안에 실제 UI를
띄운다. 그림의 화면은 비어 있고, 글자와 버튼은 전부 HTML이다.

### 배경 그림 만들기

원본 PNG를 받아 1180px WebP로 줄여서 `public/`에 넣는다.

**셸 최대 폭이 1440px으로 넓어져서 1920×1080에서는 이 그림이 1.22배
확대되어 그려진다.** 평면 음영이라 티가 크지 않고 CRT 안의 글자는 전부
HTML이라 또렷하지만, 배경을 더 선명하게 하려면 1440px으로 다시 뽑으면
된다. 유리 비율은 그대로라 좌표는 손댈 필요가 없다.

```bash
npm i -D sharp
node --input-type=module -e "
import sharp from 'sharp'
const out = await sharp('원본.png').resize({ width: 1180 })
  .webp({ quality: 92, effort: 6 })
  .toFile('public/lobby-office-blank.webp')
console.log(out.width + 'x' + out.height, (out.size / 1024).toFixed(1) + ' KB')
"
npm uninstall sharp
```

**변환 후에는 sharp를 지운다.** 20MB짜리 네이티브 모듈인데 lint·build·test
어디에도 쓰이지 않아서, 남겨두면 CI의 `npm ci`가 매번 내려받는다.

품질 92에서 143KB다. 이 그림은 평면 음영이 많아 잘 눌린다. 참고로
q82는 79KB, 원본 해상도(1672px) q92는 244KB다.

### 변수

`global.css`의 `.lobby-scene`에 있다. `.crt-display`는 이 값만 읽는다.

```css
--glass-left / --glass-top / --glass-width / --glass-height
--scene-zoom                       /* 배경 확대 배율, 기본 1 */
--glass-origin-x / --glass-origin-y /* 확대 기준점, 기본 46.65% 33.2% */
```

**그림을 바꾸면 유리를 다시 재서 이 값만 넣는다.** 다른 곳은 손대지 않는다.

### 지금 값

원본 1672×941에서 실측한 유리는 `31.7 / 13.6 / 29.9 / 39.21`(%)이고,
1100px 초과 구간은 이 값을 **그대로** 쓴다. 상자가 그려진 유리에 정확히
얹힌다.

| 구간 | 확대 | 기준점 x | left | top | width | height |
|---|---|---|---|---|---|---|
| 1101px 이상 | 1 | 46.65% | 31.70% | 13.60% | 29.90% | 39.21% |
| 821~1100px | 1.35 | 46.65% | 26.47% | 6.74% | 40.37% | 52.93% |
| 641~820px | 1.5 | 46.65% | 24.23% | 3.79% | 44.85% | 58.82% |
| 640px 이하 | 1.44 | 50% | 2.19% | 4.98% | 95.63% | 56.46% |

좌표는 기준점 `O`에 대해 `O + (기준값 - O) × 배율`로 옮긴다.
세로 기준점은 어느 구간에서나 33.2%다.

### 왜 확대하는가

셸이 좁아지면 그려진 모니터도 같이 작아진다. 글자는 11px 아래로 못 내리므로
(8절), 좁은 화면에서는 **배경을 확대해 모니터를 키운다.** 확대 기준점을
유리의 중심에 두면 확대해도 유리가 제자리에 있고, `--glass-*`에 배율만
곱하면 된다.

```
중심 = (left + width/2, top + height/2) = (46.65%, 33.2%)
확대 후 left   = 중심x - width×배율/2
확대 후 width  = width × 배율
```

640px 이하는 씬 비율이 `4 / 5`로 바뀌어 `object-fit: cover`가 좌우를
잘라낸다. 보이는 그림의 가로 폭이 씬의 `1.25 × 1672/941 = 2.22104`배라
유리 폭 29.9%가 씬 기준 `29.9 × 2.22104 = 66.409%`가 된다.

기본 크롭(`object-position: 50%`)은 그림 중심을 잡는데 유리 중심은
46.65%라 유리가 씬의 42.56%로 치우친다. 그 상태로는 폭을 85.12%
(= 42.56 × 2) 넘게 키우면 왼쪽이 씬 밖으로 나가 잘린다.

그래서 크롭을 유리 중심에 맞춘다.

```
보이는 폭 = 1 / 2.22104 = 0.45024,  넘치는 폭 = 0.54976
창 왼쪽이 그림의 46.65 - 45.024/2 = 24.138%에 오면 되므로
object-position = 24.138 / 54.976 = 43.91%
```

이러면 유리 중심이 씬의 50%가 되어 `--glass-origin-x`도 50%가 되고,
좌우 대칭이라 320px에서도 잘리지 않는다. 확대 1.44배는 390×844에서
CRT를 화면 가로의 89.3%로 만드는 값이다. 세로는 잘리지 않아 중심이
그대로다.

배경 그림에서 모니터가 더 커지면 확대 배율을 1에 가깝게 되돌릴 수 있다.
유리가 씬 높이의 **52% 이상**이면 어느 구간에서도 확대가 필요 없다.

### 유리 재는 법

**WebP가 아니라 변환 전 원본 PNG로 잰다.** 1180px으로 줄이고 손실 압축을
거치면 경계가 흐려져 값이 0.1~0.2%p 흔들린다. 실측하면 WebP 쪽이
`31.78 / 13.70 / 29.75 / 39.01`로 나오는데, 화면에서 1px쯤 어긋난다.
원본에서 잰 값이 맞다.

이미지 도구 없이 브라우저로 잰다. 원본 PNG를 잠시 `public/`에 두고
개발 서버를 띄운 뒤 콘솔에 넣는다.

```js
const im = new Image()
im.src = '/mini-game/원본.png'
await im.decode()
const c = document.createElement('canvas')
c.width = im.naturalWidth; c.height = im.naturalHeight
const g = c.getContext('2d', { willReadFrequently: true })
g.drawImage(im, 0, 0)
// 유리는 r<=4, g>=6, b>g 인 아주 어두운 청록이다. 밤하늘도 r=0이므로
// 모니터 주변으로 범위를 좁혀서 찾는다.
const x0 = 380, x1 = 1220, y0 = 60, y1 = 660, W = x1 - x0, H = y1 - y0
const d = g.getImageData(x0, y0, W, H).data
const col = Array(W).fill(0), row = Array(H).fill(0)
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = (y * W + x) * 4
  if (d[i] <= 4 && d[i + 1] >= 6 && d[i + 2] > d[i + 1] && d[i + 2] < 40) {
    col[x]++; row[y]++
  }
}
const pick = (a) => { const t = Math.max(...a) * 0.5
  const k = a.map((v, i) => v > t ? i : -1).filter((i) => i >= 0)
  return [k[0], k[k.length - 1]] }
const [cl, cr] = pick(col), [rt, rb] = pick(row)
console.log({
  left: (x0 + cl) / im.naturalWidth * 100,
  top: (y0 + rt) / im.naturalHeight * 100,
  width: (cr - cl) / im.naturalWidth * 100,
  height: (rb - rt) / im.naturalHeight * 100,
})
```

`x0 x1 y0 y1`은 모니터를 넉넉히 감싸는 범위다. 모니터가 커지면 넓힌다.

### 정렬이 맞는지 확인하는 법

계산만 믿지 말고 실제로 얹혔는지 본다. 그려진 유리의 최종 화면 좌표를
역산해 `.crt-display`와 비교한다. **오차가 1px 미만이면 통과다.**

```js
const img = document.querySelector('.lobby-office')
const crt = document.querySelector('.crt-display')
const scene = document.querySelector('.lobby-scene').getBoundingClientRect()
const cs = getComputedStyle(img)
const ew = img.offsetWidth, eh = img.offsetHeight
const ir = 1672 / 941, er = ew / eh
const [cw, ch] = er > ir ? [ew, ew / ir] : [eh * ir, eh]
const cx = scene.left + (ew - cw) / 2, cy = scene.top + (eh - ch) / 2
let gx = cx + 0.317 * cw, gy = cy + 0.136 * ch
let gw = 0.299 * cw, gh = 0.3921 * ch
const z = parseFloat(cs.getPropertyValue('--scene-zoom')) || 1
const [tox, toy] = cs.transformOrigin.split(' ').map(parseFloat)
const ox = scene.left + tox, oy = scene.top + toy
gx = ox + (gx - ox) * z; gy = oy + (gy - oy) * z; gw *= z; gh *= z
const c = crt.getBoundingClientRect()
console.log({ left: c.left - gx, top: c.top - gy,
  right: c.left + c.width - (gx + gw), bottom: c.top + c.height - (gy + gh) })
```

실측 기준 오차는 1366에서 0.04px, 800에서 0.1px, 375에서 0.1px이다.

### 알아둘 것

- 씬의 `aspect-ratio: 1672 / 941`은 원본 이미지 비율이다. 새 그림이 다른
  비율이면 이 값도 같이 바꿔야 하고, 그러면 좌표를 전부 다시 잡아야 한다.
  **가능하면 16:9를 유지한다.**
- `.crt-display`는 배경·테두리·안쪽 그림자를 **그리지 않는다.** 그림의 유리가
  이미 화면이므로, 상자가 화면을 한 겹 더 그리면 UI가 화면 안이 아니라
  화면 앞에 붙은 것처럼 보인다.
- 스캔라인 오버레이도 같은 이유로 제거했다. 그림에 이미 주사선이 있다.
- 베젤과 유리 반사를 알파 PNG로 따로 받으면 UI 위에 얹어 3층으로 만들 수
  있다. 글자가 유리 밑으로 들어가서 정렬 오차가 훨씬 덜 보인다.
