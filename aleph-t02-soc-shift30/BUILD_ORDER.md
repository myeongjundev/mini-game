# BUILD ORDER — SOC SHIFT:30

이 문서는 **AI 에이전트에게 넘기는 작업 지시서**다.
게임 규칙의 원본은 `docs/GAME_SPEC.md`이고, 이 문서는 "무엇을 어떤 순서로 만드는가"를 정한다.
둘이 충돌하면 `docs/GAME_SPEC.md`가 우선한다.

---

## 0. 확정 사항

| 항목 | 값 |
|---|---|
| 프로젝트명 | SOC SHIFT:30 |
| 한 줄 정의 | 30초 동안 SOC 분석가가 되어 보안 이벤트를 ALLOW / BLOCK으로 판단해 네트워크를 지키는 게임 |
| 스택 | Vite + React 18 + TypeScript |
| 백엔드 | **T02 범위 밖.** Spring Boot는 이후 과제로 분리한다 |
| 프로젝트 루트 | `mini-game/aleph-t02-soc-shift30/` |
| 배포 산출물 | `mini-game/site/` |
| 디자인 방향 | NIGHT SHIFT 콘솔 — 뉴트럴 다크 + 시안 / 앰버 / 레드 3축, 도트는 아이콘에만 |
| 난이도 실험 상수 | `eventIntervalMs` (A=1400 → B=1100) |
| 저장 | localStorage. 최고 점수와 접근성 설정만 |

---

## 1. 폴더 구조

아래 구조를 그대로 만든다. 임의로 폴더를 추가하지 않는다.

```text
mini-game/
├─ .github/
│  └─ workflows/
│     └─ deploy.yml                 GitHub Pages 배포
│
├─ aleph-t02-soc-shift30/           ← 프로젝트 루트
│  ├─ BUILD_ORDER.md                이 문서 (루트에 유지)
│  ├─ CLAUDE.md
│  ├─ AGENTS.md
│  ├─ README.md                     신규: 실행 방법, 스크립트 목록
│  ├─ index.html
│  ├─ package.json
│  ├─ tsconfig.json
│  ├─ vite.config.ts
│  ├─ eslint.config.js
│  ├─ .gitignore
│  │
│  ├─ docs/
│  │  ├─ GAME_SPEC.md               이동
│  │  ├─ ARCHITECTURE.md            이동 + 백엔드 절 정리
│  │  ├─ AI_DECISION_LOG.md         이동
│  │  ├─ HOOKS_SETUP.md             이동
│  │  ├─ FILE_INDEX.md              이동 + 실존 파일만 남기도록 정정
│  │  ├─ DESIGN_TOKENS.md           신규
│  │  ├─ ALERT_DATASET.md           신규
│  │  ├─ PIXEL_ICONS.md             신규: 도트 아이콘 그리드 원본
│  │  ├─ GAME_LOOP_SPEC.md          신규: 8단계 구현 명세
│  │  ├─ STORAGE_AND_RECOVERY.md    신규
│  │  └─ QA_CHECKLIST.md            신규
│  │
│  ├─ prompts/
│  │  └─ 00_MASTER_BOOTSTRAP.md     이동 + 참조 경로 정정
│  │
│  ├─ public/
│  │  └─ favicon.svg
│  │
│  └─ src/
│     ├─ main.tsx
│     ├─ App.tsx
│     ├─ game/
│     │  ├─ config.ts               난이도 상수 단일 소스
│     │  ├─ types.ts                Alert, GameState, Verdict
│     │  ├─ engine/
│     │  │  ├─ rules.ts             resolveAlert 순수 함수
│     │  │  ├─ machine.ts           상태 전이 순수 함수
│     │  │  ├─ scoring.ts           점수 / 콤보 계산
│     │  │  └─ alertQueue.ts        티어별 출제 순서
│     │  ├─ data/
│     │  │  ├─ alerts.ts            경보 데이터셋
│     │  │  └─ pixelArt.ts          도트 아이콘 그리드
│     │  └─ hooks/
│     │     ├─ useGameLoop.ts       rAF 타이머
│     │     ├─ useKeyboard.ts       키 입력 + 중복 방지
│     │     └─ useVisibilityPause.ts 포커스 이탈 자동 일시정지
│     ├─ components/
│     │  ├─ PixelIcon.tsx
│     │  ├─ Hud.tsx                 TIME / SCORE / SECURITY / COMBO
│     │  ├─ AlertCard.tsx
│     │  ├─ ActionButtons.tsx
│     │  ├─ VerdictFlash.tsx        판정 직후 피드백
│     │  ├─ SettingsBar.tsx         Mute / Reduce Motion / Pause
│     │  └─ screens/
│     │     ├─ ReadyScreen.tsx
│     │     ├─ PausedScreen.tsx
│     │     └─ ResultScreen.tsx
│     ├─ services/
│     │  └─ storage.ts              저장 + 손상값 복구
│     ├─ styles/
│     │  ├─ tokens.css              색 / 폰트 / 간격 변수
│     │  └─ global.css
│     └─ utils/
│        └─ format.ts
│
├─ site/                            빌드 산출물. 직접 편집 금지
├─ notes/                           과제 제출용 기록 (공개 배포 제외)
├─ records/                         플레이 10회 전·후 CSV
└─ evidence/                        검증 증거 원본 (Git 제외)
```

### 이동 작업

현재 `aleph-t02-soc-shift30/` 최상단에 평평하게 놓인 md 파일들을 위 구조대로 `docs/`와 `prompts/`로 옮긴다.
옮긴 뒤 `CLAUDE.md`, `AGENTS.md`, `prompts/00_MASTER_BOOTSTRAP.md` 안의 참조 경로가 실제 파일과 맞는지 확인한다.

**존재하지 않는 문서를 읽으라고 지시하는 문장은 삭제한다.**
`PROJECT_BRIEF.md`, `FRONTEND_SPEC.md`, `BACKEND_SPEC.md`, `API_CONTRACT.md`는 만들지 않는다.

---

## 2. 데이터 모델

```ts
export type Category = 'traffic' | 'login' | 'scan' | 'dns' | 'critical';
export type Action   = 'ALLOW' | 'BLOCK';
export type Tier     = 1 | 2 | 3;
export type Signal   = 'normal' | 'suspicious';

export type Alert = {
  id: string;
  tier: Tier;
  category: Category;
  title: string;
  facts: { label: string; value: string; signal: Signal }[];
  correctAction: Action;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  decisiveFact: string;      // facts 중 하나의 label
  explanation: string;
};

export type Verdict = 'CORRECT' | 'FALSE_POSITIVE' | 'MISSED_THREAT' | 'TIMEOUT';

export type GameState = {
  phase: 'READY' | 'PLAYING' | 'PAUSED' | 'SUCCESS' | 'FAILURE';
  timeLeftMs: number;
  lives: number;
  score: number;
  combo: number;
  maxCombo: number;
  reviewed: number;
  threatsBlocked: number;
  normalAllowed: number;
  falsePositives: number;
  missedThreats: number;
  timeouts: number;
  currentAlert: Alert | null;
  lastVerdict: Verdict | null;
  log: DecisionRecord[];
};

export type DecisionRecord = {
  alertId: string;
  title: string;
  category: Category;
  severity: Alert['severity'];
  action: Action | null;     // null이면 미판정
  verdict: Verdict;
  decisiveFact: string;
  explanation: string;
};
```

`facts`는 **4개로 고정**한다. 개수가 들쭉날쭉하면 카드 높이가 변해 시선이 흔들리고, 30초 게임에서 그 손해가 크다.

**`severity`는 경보 카드에 표시하지 않는다.** 정답과 상관이 93%라 카드에 띄우면 정답표가 된다.
판정이 끝난 뒤 SHIFT LOG에서만 드러낸다. 근거는 `docs/ALERT_DATASET.md`에 있다.

`signal`은 그 사실이 살펴볼 만한 항목인지를 나타낸다. 정답이 아니다.
수상한 항목 수를 세는 것만으로는 맞힐 수 없도록 설계했다 — 2:2 동률인 세 장의 정답이 서로 다르다.
전체 신호 배치와 근거는 `docs/ALERT_DATASET.md`에 있다.

---

## 3. 경보 데이터셋

`docs/ALERT_DATASET.md`에 표로 남기고 `src/game/data/alerts.ts`에 구현한다.
**최소 15개.** 티어별 비율은 T1 5개 / T2 5개 / T3 5개.

| id | tier | category | 핵심 사실 | 정답 | 근거 |
|---|---|---|---|---|---|
| `https-normal` | 1 | traffic | Port 443 / 8 req·s / 등록 기기 | ALLOW | 정상 웹 트래픽 |
| `dns-normal` | 1 | dns | Port 53 / 쿼리량 정상 / 내부 리졸버 | ALLOW | 정상 이름 질의 |
| `ssh-brute` | 1 | login | Port 22 / 실패 87회 / 출처 불명 | BLOCK | 무차별 대입 |
| `port-scan` | 1 | scan | 대상 포트 21,22,23,80,443 / 버스트 높음 | BLOCK | 포트 스캔 정찰 |
| `file-share` | 1 | traffic | 사내 파일 서버 / 근무 시간 / 등록 기기 | ALLOW | 업무 접근 |
| `known-user-new-device` | 2 | login | 알려진 사용자 / 미등록 기기 / MFA 통과 / 사내 IP | ALLOW | MFA 통과 + 사내망 |
| `typo-login` | 2 | login | 실패 8회 후 성공 / 등록 기기 / 근무 시간 | ALLOW | 오타 후 정상 로그인 |
| `traffic-spike` | 2 | traffic | 요청량 평소의 3배 / 프로모션 시간대 / 정상 패턴 | ALLOW | 예측된 부하 |
| `dns-tunnel` | 2 | dns | 무작위 서브도메인 다량 / 응답 크기 비정상 | BLOCK | DNS 터널링 |
| `slow-scan` | 2 | scan | 포트 1개씩 / 30분 간격 / 외부 단일 IP | BLOCK | 저속 스캔 회피 |
| `admin-breach` | 3 | critical | user admin / 미등록 기기 / 실패 132회 / 03:17 | BLOCK | 관리자 계정 탈취 시도 |
| `priv-esc` | 3 | critical | 일반 계정이 관리자 그룹 추가 시도 | BLOCK | 권한 상승 |
| `contractor-proddb` | 3 | critical | 계약직 역할 / Production DB / 최초 접근 | BLOCK | 최소권한 위반 |
| `exfil` | 3 | traffic | 아웃바운드 4.2GB / 02:40 / 외부 미상 호스트 | BLOCK | 데이터 반출 |
| `backup-job` | 3 | traffic | 아웃바운드 6.1GB / 02:00 / **등록 백업 서버** / 정기 작업 | ALLOW | 정상 야간 백업 |

`backup-job`은 의도적인 함정이다. 크리티컬처럼 보이지만 정답이 ALLOW다.
이 카드가 **오탐(False Positive)을 유발**해서 게임의 두 축이 실제로 작동하게 만든다. 반드시 넣는다.

`correctAction`은 화면 DOM에 미리 렌더하지 않는다.
정적 배포이므로 번들 안에는 존재한다 — 서버 판정은 T02 범위 밖이다.

---

## 4. 게임 엔진

### 순수 함수로 분리

```ts
resolveAlert(alert: Alert, action: Action): Verdict
applyVerdict(state: GameState, verdict: Verdict, alert: Alert): GameState
tick(state: GameState, deltaMs: number): GameState
```

이 3개는 React를 import하지 않는다. 단위 테스트가 가능해야 한다.

### 판정

- 정상 + ALLOW → `CORRECT`
- 위협 + BLOCK → `CORRECT`
- 정상 + BLOCK → `FALSE_POSITIVE`
- 위협 + ALLOW → `MISSED_THREAT`
- 제한시간 내 미입력 → `TIMEOUT`

오답은 종류와 무관하게 라이프 -1. `TIMEOUT`도 라이프 -1이다.

`TIMEOUT`은 `reviewed`를 포함한 어떤 통계 카운터도 증가시키지 않는다. 검토한 것이 아니기 때문이다.
그래야 결과 화면의 Accuracy가 "검토한 것 중 맞힌 비율"로 유지된다.
근거와 전체 설계는 `docs/GAME_LOOP_SPEC.md` 0절에 있다.

### 점수

- `CORRECT`: +100
- severity가 `CRITICAL`인 `CORRECT`: +300
- 오답과 `TIMEOUT`: +0, 콤보 0으로 리셋
- 콤보 3연속부터 보너스: `+100 * (combo - 2)`, 상한 `+300`

### 상태 전이

```text
READY --start--> PLAYING
PLAYING --pause--> PAUSED --resume--> PLAYING
PLAYING --lives == 0--> FAILURE
PLAYING --timeLeft == 0--> SUCCESS
PAUSED | SUCCESS | FAILURE --restart--> READY
```

일시정지 화면에서도 다시 시작할 수 있어야 한다. `notes/02-game-design.md`의 허용 입력과 맞춘다.

### 타이머

`setInterval` 금지. `requestAnimationFrame` + `performance.now()` 델타 누적을 쓴다.
배경 탭에서 rAF가 멈추는 것은 자동 일시정지와 결합해 정상 동작으로 처리한다.
언마운트와 상태 전이에서 rAF를 **반드시 취소**한다.

---

## 5. 디자인 토큰

`src/styles/tokens.css`에 정의하고 `docs/DESIGN_TOKENS.md`에 문서화한다.
컴포넌트에 hex를 직접 쓰지 않는다.

```css
:root {
  --bg:          #0A0C10;
  --panel:       #12161D;
  --line:        #232B36;
  --line-dim:    #1B2029;

  --text:        #E8EAED;
  --text-dim:    #7C8798;

  --cyan:        #3FC8E0;   /* 시스템 정보, ALLOW */
  --amber:       #F0A93B;   /* 가용성 손실, BLOCK, 오탐 */
  --red:         #E2564D;   /* 위협, 미탐 */
  --green:       #6FCF6B;   /* 정답 순간에만 0.3초 */

  --font-mono:   'JetBrains Mono', 'D2Coding', ui-monospace, monospace;
  --card-w:      720px;
}
```

### 색 규칙 — 반드시 지킨다

- **ALLOW 버튼은 시안, BLOCK 버튼은 앰버.** BLOCK을 빨강으로 만들지 않는다.
- 빨강은 **위협과 미탐**에만 쓴다. 내 행동의 색이 아니다.
- 초록은 정답 피드백 0.3초에만 쓴다. 상시 표시에 쓰지 않는다.
- 오탐은 앰버, 미탐은 빨강. 결과 화면에서 두 막대가 색으로 구분되어야 한다.

이 규칙이 이 게임의 핵심 개념(오탐과 미탐은 서로 다른 실패다)을 화면으로 증명한다.

### 레이아웃

- 중앙 고정폭 카드 `--card-w: 720px` + 좌우 여백.
- 해상도가 바뀌어도 카드 폭을 키우지 않는다. 1366과 1920에서 **같은 크기**로 보인다.
- 이 구조 덕분에 가로 넘침이 구조적으로 발생하지 않는다.

### 폰트

웹폰트를 CDN에서 불러오지 않는다. 시스템 모노스페이스 폴백만 쓴다.
숫자는 `font-variant-numeric: tabular-nums`로 자릿수를 고정한다. 타이머가 떨리는 것을 막는다.

---

## 6. 도트 아이콘 시스템

이미지 파일, 픽셀 폰트, 외부 애셋을 쓰지 않는다. **코드로만 만든다.**

### 정의 형식

`src/game/data/pixelArt.ts`에 문자열 배열로 둔다. `.` = 투명, `#` = 채움.

```ts
export const HEART_FULL = [
  '.##...##.',
  '####.####',
  '#########',
  '#########',
  '.#######.',
  '..#####..',
  '...###...',
  '....#....',
];
```

이 형식이면 diff에서 그림이 눈으로 보이고, 마음에 안 드는 픽셀을 문자 하나로 고칠 수 있다.

### 렌더러

`src/components/PixelIcon.tsx`

- 그리드를 받아 `<svg>` 반환, `viewBox`는 그리드 크기와 정확히 일치
- `#` 칸마다 `<rect width="1" height="1">`
- `fill="currentColor"` — 색은 CSS가 정한다
- `shape-rendering="crispEdges"`
- `<path>`, `<circle>`, 곡선 금지. `rect`만 쓴다
- 장식용은 `aria-hidden="true"`, 의미 있는 아이콘은 `<title>`

### 만들 아이콘

| 그룹 | 이름 | 크기 |
|---|---|---|
| 카테고리 | `traffic` `login` `scan` `dns` `critical` | 12×12 |
| 라이프 | `heartFull` `heartEmpty` | 9×8 |
| 판정 | `correct` `falsePositive` `missedThreat` | 16×16 |
| 토글 | `soundOn` `soundOff` `motionOn` `motionOff` | 12×12 |
| 등급 | `gradeA` ~ `gradeF` | 16×16 |
| 파비콘 | `public/favicon.svg` | 16×16 |

카테고리 아이콘이 최우선이다. 1.1초마다 뜨는 카드를 **글자를 읽기 전에 모양으로 선분류**하게 해주므로 게임성에 직접 기여한다.

### 검수 기준

- **흑백 테스트**: 색을 모두 제거하고 실루엣만으로 5개 카테고리가 구별되어야 한다. 안 되면 형태를 다시 잡는다. 색에만 의존하면 색각 이상 사용자에게 무너진다.
- 스케일은 정수배(2x, 3x)만. 소수 배율 금지.
- `♥` 같은 유니코드 글리프를 쓰지 않는다. OS마다 다르게 렌더된다.

**작업 방식: 아이콘의 ASCII 그리드를 먼저 출력해 승인받고, 그 다음에 컴포넌트 코드를 쓴다.**

---

## 7. 저장과 복구

`src/services/storage.ts`. 명세는 `docs/STORAGE_AND_RECOVERY.md`에 남긴다.

### 스키마

```ts
const KEY = 'socshift30:v1';

type Saved = {
  v: 1;
  bestScore: number;      // 0 이상 정수, 상한 999999
  mute: boolean;
  reduceMotion: boolean;
};

const DEFAULTS: Saved = { v: 1, bestScore: 0, mute: true, reduceMotion: false };
```

### 규칙

- **현재 판 상태(점수·시간·라이프·콤보·현재 경보)는 저장하지 않는다.** 새로 접속하면 항상 READY에서 시작한다.
- 읽기는 필드 단위로 검증한다. 한 필드가 깨져도 **그 필드만** 기본값으로 대체하고 나머지는 살린다.
- `Number.isFinite`와 범위를 검사한다. `NaN`, `Infinity`, 음수, 과대값은 기본값.
- 모든 읽기·쓰기를 `try/catch`로 감싼다. **저장 실패가 게임 실행을 막지 않는다** (시크릿 모드, 용량 초과).
- 알 수 없는 필드는 무시한다. `v`가 1이 아니면 전체 기본값.

### 반드시 통과할 8가지 입력

값 없음 / 빈 문자열 / `abc` / `{"bestScore":` / `{}` / `{"bestScore":"높음"}` / `{"bestScore":-5}` / 정상값

---

## 8. 접근성과 안정성

### Mute

- **첫 로드는 음소거 ON**으로 시작한다. 브라우저 자동재생 정책에 안전하고, 채점자가 갑자기 소리를 듣지 않는다.
- Web Audio API로 짧은 톤만 생성한다. 오디오 파일을 넣지 않는다.
- 토글은 **즉시** 반영된다. 다음 판까지 기다리지 않는다.

### Reduce Motion

- `prefers-reduced-motion: reduce`를 초기값으로 읽되, 사용자 토글이 우선한다.
- 기본 모션: 카드가 아래→위 슬라이드 인, 판정 시 ALLOW는 왼쪽 / BLOCK은 오른쪽으로 슬라이드 아웃. 방향이 곧 내 판단이라 결과가 몸으로 기억된다.
- Reduce Motion 시: 이동을 전부 제거하고 **테두리 색 플래시 0.2초로 대체**한다. 정보 손실 0.
- 화면 흔들림은 Reduce Motion에서 완전히 제거한다.

### 입력 중복 방지 — 최우선 요구사항

- `keydown`에서 `event.repeat === true`면 즉시 무시한다.
- 경보 하나당 판정은 **정확히 1회**. `resolvedRef`로 잠그고 다음 경보에서 해제한다.
- 버튼을 빠르게 두 번 클릭해도 게임 루프가 하나만 시작되어야 한다.
- `PLAYING`이 아닌 상태에서 `A`/`D`는 아무 일도 하지 않는다.
- 종료 후 키 입력으로 점수가 변하지 않는다.

### 포커스

- `visibilitychange` 또는 `blur`에서 **자동 일시정지**.
- 복귀 시 자동 재개하지 않는다. 사용자가 직접 재개한다.
- 일시정지 중 타이머와 경보 진행이 완전히 멈춘다.

### 정리

- 모든 `addEventListener`, `requestAnimationFrame`, `setTimeout`은 대응하는 해제 코드를 가진다.
- 다시 시작을 20회 반복해도 리스너가 누적되지 않아야 한다.

---

## 9. 난이도 실험

```ts
// src/game/config.ts
export const DIFFICULTY = {
  eventIntervalMs: 1400,   // ← 실험에서 바꾸는 유일한 값. B안은 1100
  totalTimeMs: 30_000,
  lives: 3,
} as const;
```

- 난이도에 영향을 주는 상수는 **이 파일 한 곳**에만 둔다. 컴포넌트에 숫자를 흩뿌리지 않는다.
- 전·후 실험에서 `eventIntervalMs` 외의 값은 바꾸지 않는다.
- 결과 화면에 실험에 필요한 숫자를 모두 표시한다: Score / Alerts Reviewed / Threats Blocked / Normal Allowed / False Positives / Missed Threats / **No Decision** / Accuracy / Max Combo / 생존 시간.
- 경보 하나의 제한시간은 `eventIntervalMs`와 같다. 별도 상수를 만들지 않는다. 그래야 이 값 하나로 "읽고 판단할 시간"과 "타임아웃까지의 시간"이 함께 움직인다.

### CSV 컬럼

`records/playtest-before.csv`와 `records/playtest-after.csv`의 헤더는 아래와 같다. **이미 반영되어 있다.**

```csv
run,setting_value,success,score,survival_seconds,alerts_reviewed,accuracy,false_positive,missed_threat,timeout,max_combo,failure_reason,notes
```

---

## 10. 배포

### vite.config.ts

```ts
export default defineConfig({
  base: '/mini-game/',              // GitHub Pages 프로젝트 페이지 경로
  build: { outDir: '../site', emptyOutDir: true },
});
```

`base`가 틀리면 배포 화면이 **흰 화면**으로 뜬다. 가장 흔한 실패 지점이니 배포 직후 반드시 공개 주소에서 확인한다.

### .github/workflows/deploy.yml

`mini-game/` 저장소 루트에 둔다.

- `main` 푸시에서 실행
- `aleph-t02-soc-shift30/`에서 `npm ci && npm run build`
- `site/`를 `actions/upload-pages-artifact`로 업로드 후 Pages 배포

`site/`는 빌드 산출물이므로 `mini-game/.gitignore`에서 **폴더 전체를 무시한다.**
`emptyOutDir: true`가 매 빌드마다 폴더를 비우므로 `.gitkeep` 같은 자리표시 파일도 두지 않는다. **이미 반영되어 있다.**

CI는 Node 24를 쓴다. `vite` 8과 `@vitejs/plugin-react` 6이 `^20.19.0 || >=22.12.0`을 요구하고, 개발 환경도 24이기 때문이다.

---

## 11. 작업 순서

한 번에 하나씩. 각 단계가 끝나면 검증하고 보고한 뒤 다음으로 넘어간다.

| # | 작업 | 완료 기준 | 상태 |
|---|---|---|---|
| 1 | 문서 정리 | md 파일을 `docs/`·`prompts/`로 이동. 죽은 참조 경로 제거. `FILE_INDEX.md`를 실존 파일로 정정 | 완료 |
| 2 | 프로젝트 스캐폴딩 | Vite + React + TS 초기화. `npm run dev` 실행. `npm run build` 성공 | 완료 |
| 3 | 타입과 설정 | `types.ts`, `config.ts` 작성 | 완료 |
| 4 | 엔진 | `rules.ts`, `scoring.ts`, `machine.ts`, `alertQueue.ts` + 단위 테스트 | 완료 |
| 5 | 경보 데이터 | `alerts.ts` 15개 + `docs/ALERT_DATASET.md` | 완료 |
| 7 | 디자인 토큰 | `tokens.css`, `global.css`, `docs/DESIGN_TOKENS.md` | 완료 |
| 9 | 저장·복구 | `storage.ts` + 손상 입력 8종 + 경계 5종 통과 | 완료 |
| 6 | 도트 아이콘 | ASCII 그리드 승인 → `pixelArt.ts`, `PixelIcon.tsx`, `favicon.svg` | 완료 |
| 8a | 루프 연결 | 리듀서 + 훅 3개. 중복 입력 차단과 타이머 정리까지 | 완료 |
| 8b | 화면 | Ready → Playing → Paused → Result 컴포넌트 | 완료 |
| 10 | 접근성·안정성 | Mute, Reduce Motion, 포커스 일시정지 | 완료 |
| 11 | QA | `docs/QA_CHECKLIST.md` 전 항목 실행 | 대기 |
| 12 | 배포 | 공개 주소 확인 | 대기 |

### 실제 진행에서 바뀐 것

- **9단계를 8단계보다 먼저 했다.** `storage.ts`는 UI와 무관하고 검사 케이스가 문서에 다 있어서, 화면을 만든 뒤 끼워 넣는 것보다 먼저 만드는 편이 쌌다.
- **8단계를 8a와 8b로 쪼갰다.** 과제의 안정성 요구가 전부 8a에 몰려 있어 한 번에 검증하기 어렵다. 구현 명세는 `docs/GAME_LOOP_SPEC.md`에 있다.
- **6단계는 그리드 승인과 코드 구현을 분리했다.** 아이콘 12개를 코드까지 만든 뒤 형태를 되돌리는 비용이 크기 때문이다.

---

## 12. 완료 체크리스트

과제 요구사항과 1:1로 대응한다. 전부 통과해야 제출한다.

- [ ] 공개 주소 첫 화면에서 규칙·조작·현재 상태가 보인다
- [ ] 키 1회 / 클릭 1회가 정확히 1회만 반영된다
- [ ] 진행 / 성공 / 실패가 명확히 구분된다
- [ ] 다시 시작하면 시간·라이프·점수·콤보·현재 경보가 초기화된다
- [ ] 일시정지 화면에서도 다시 시작이 동작한다
- [ ] 제한시간 내 미입력이 미판정으로 처리되어 라이프가 줄고, Accuracy에는 포함되지 않는다
- [ ] 최고 점수는 다시 접속해도 유지된다
- [ ] Mute와 Reduce Motion이 즉시 반영된다
- [ ] 1366×768에서 잘림·가로 넘침 없음
- [ ] 1920×1080에서 잘림·가로 넘침 없음
- [ ] 실행 중 해상도를 바꿔도 현재 판이 깨지지 않는다
- [ ] 포커스 이탈 시 자동 일시정지, 복귀 시 자동 진행 안 함
- [ ] 다시 시작 20회 반복 후에도 이벤트·루프 중복 없음
- [ ] 10분 연속 실행에서 메모리 증가·속도 저하·오류 없음
- [ ] 콘솔 빨간 오류 0건 (로드 / 플레이 / 재시작 각각)
- [ ] 저장값 손상 입력 8종과 경계 5종에서 모두 기본값 복구
- [ ] `eventIntervalMs` 하나만 바꾼 전·후 각 10회 기록 완료
- [ ] 공개 화면과 제출물에 개인정보·비밀값 0건
- [ ] `npm run build` 성공, `npm run lint` 오류 0건

---

## 13. 하지 말 것

- 회원가입, 로그인, OAuth
- 백엔드 API 호출 (T02 범위 밖)
- LLM API, WebSocket
- 실제 IP 차단, 실제 보안 장비 연동
- 상태관리 라이브러리 (`useReducer`로 충분하다)
- 애니메이션 라이브러리
- CSS 프레임워크
- 외부 CDN 폰트·아이콘·이미지
- png / webp / ttf / woff 등 바이너리 애셋
- `docs/GAME_SPEC.md`의 게임 규칙을 임의로 변경
- 승인 없이 프로덕션 의존성 추가

---

## 14. 작업 보고 형식

각 단계 완료 시 반드시 아래를 정리한다.

1. 변경한 파일
2. 구현한 동작
3. 실행한 검증 명령과 결과
4. 남은 위험 / 미완료
5. 다음 추천 작업
