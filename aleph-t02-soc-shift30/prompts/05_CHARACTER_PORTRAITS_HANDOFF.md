# 캐릭터 초상 8종 — Claude 구현 인계서

마지막 갱신: 2026-08-20

이 문서는 SOC SHIFT:30용 캐릭터 초상 8종의 최종 파일과 역할, 권장 연결 위치,
검증 조건을 Claude에게 전달한다. **이미지 제작과 파일 검수는 완료됐지만 새로
추가한 초상 대부분은 React 화면에 아직 연결되지 않았다.**

초상은 정보의 출처와 사건 당사자를 빠르게 구분하기 위한 시각 자산이다. 게임의
정답, 점수, 타이머, 메모 등장 순서에는 영향을 주지 않는다. 구현 중
`docs/GAME_SPEC.md`의 규칙을 바꾸지 않는다.

---

## 1. 최종 자산

모든 게임용 파일은 `public/` 아래의 128×128 PNG다.

| 역할 | 최종 파일 | 용량 | 현재/권장 사용처 |
|---|---|---:|---|
| SOC 야간 팀장 | `public/team-lead-portrait-128.png` | 3,341B | `PhoneOverlay` 연결 상태에 이미 사용 |
| 인프라 엔지니어 | `public/infra-engineer-portrait-128.png` | 3,369B | 인프라팀 `nightly-backup` 메모 발신자 |
| 보안 전문가 | `public/security-specialist-portrait-128.png` | 3,388B | 보안팀 메모 2종의 발신자 |
| IT 지원 담당자 | `public/it-support-portrait-128.png` | 3,957B | IT팀 `laptop-swap` 메모 발신자 |
| HR 운영 담당자 | `public/hr-manager-portrait-128.png` | 3,507B | 인사팀 `intern-onboarding` 메모 발신자 |
| 마케팅 담당자 | `public/marketing-manager-portrait-128.png` | 3,349B | 마케팅팀 `promo-night` 메모 발신자 |
| 인턴 `intern_03` | `public/intern-03-portrait-128.png` | 4,203B | `priv-esc` 경보의 사건 당사자 |
| 외부 협력업체 담당자 | `public/external-contractor-portrait-128.png` | 4,349B | `contractor-proddb` 경보의 사건 당사자 |

### 미리보기

| 팀장 | 인프라 | 보안 | IT |
|---|---|---|---|
| ![팀장](../public/team-lead-portrait-128.png) | ![인프라](../public/infra-engineer-portrait-128.png) | ![보안](../public/security-specialist-portrait-128.png) | ![IT](../public/it-support-portrait-128.png) |

| HR | 마케팅 | 인턴 | 외부 협력업체 |
|---|---|---|---|
| ![HR](../public/hr-manager-portrait-128.png) | ![마케팅](../public/marketing-manager-portrait-128.png) | ![인턴](../public/intern-03-portrait-128.png) | ![외부 협력업체](../public/external-contractor-portrait-128.png) |

고해상도 투명 원본과 생성기가 체크무늬를 배경으로 구운 반려본은
`prompts/art-source/`에 있다. 게임에서는 원본이나 `*-rejected-checkerboard.png`를
읽지 말고 반드시 `public/*-portrait-128.png`만 사용한다.

---

## 2. 공통 이미지 규격

최종 8장을 픽셀 단위로 검사한 결과는 다음과 같다.

- 크기: 정확히 `128×128px`
- 포맷: PNG
- 알파: `0` 또는 `255`만 사용
- 불투명 픽셀의 색: 아래 6색만 사용
- 이미지 안에 글자, 숫자, 로고, 실명, 사번 없음
- 외부 네트워크 자산이나 새 패키지 의존성 없음

```text
#0A0C10  bg
#12161D  panel
#232B36  line
#F0A93B  amber
#E2564D  red
#6FCF6B  green
```

표시 CSS에는 다음 규칙을 유지한다.

```css
image-rendering: pixelated;
```

공개 자산 경로는 배포 `base`를 보존하도록 문자열 `/...` 대신 아래 패턴을 쓴다.

```tsx
src={`${import.meta.env.BASE_URL}marketing-manager-portrait-128.png`}
```

초상 자체에 이름이나 직책을 합성하지 않는다. 이름, 발신 부서, 메모 내용,
접근성 설명은 React/HTML 텍스트가 담당한다.

---

## 3. 메모 발신자 연결표

현재 데이터의 source of truth는 `src/game/data/memos.ts`다. 발신 부서와 초상은
다음처럼 연결한다.

| `memo.from` | 메모 id | 초상 |
|---|---|---|
| `마케팅팀` | `promo-night` | `marketing-manager-portrait-128.png` |
| `IT팀` | `laptop-swap` | `it-support-portrait-128.png` |
| `보안팀` | `no-new-domain`, `contractor-scope` | `security-specialist-portrait-128.png` |
| `인프라팀` | `nightly-backup` | `infra-engineer-portrait-128.png` |
| `인사팀` | `intern-onboarding` | `hr-manager-portrait-128.png` |

### 권장 구현 범위

먼저 `MemoToast`의 발신자 영역에 작은 초상을 추가한다. 메모 로그는 폭이 좁고
한 판에 네 항목이 쌓이므로 1차 구현에서는 기존 텍스트 밀도를 유지한다.

- 문자열을 컴포넌트 안에서 긴 조건문으로 비교하기보다 메모 id 또는 부서에 대한
  작은 정적 매핑을 데이터 계층 가까이에 둔다.
- 초상은 장식만이 아니다. 발신자를 보조하므로 `alt=""`로 숨기더라도
  `memo.from` 텍스트를 반드시 그대로 남긴다.
- 초상 로딩 실패 때문에 메모 본문이나 닫기 버튼 위치가 사라지면 안 된다.
- 기존 메모 공정성 규칙을 유지한다: 메모 중 판정 입력 차단, 경보 제한시간 정지,
  30초 근무 시계 진행.
- 메모의 ALLOW/BLOCK 3:3 균형과 연결 경보 id를 바꾸지 않는다.

`MemoLog`에도 초상을 넣고 싶다면 데스크톱과 390px에서 높이 증가를 먼저
측정한다. 로그는 정보 회수 도구이므로 초상 때문에 본문이 덜 보이면 넣지 않는다.

---

## 4. 경보 당사자 초상 연결

아래 두 장은 메모 발신자 초상이 아니다.

| 경보 id | 경보 사용자 | 초상 |
|---|---|---|
| `priv-esc` | `intern_03` | `intern-03-portrait-128.png` |
| `contractor-proddb` | 계약직/외부 협력업체 계정 | `external-contractor-portrait-128.png` |

이 둘은 `AlertCard`의 선택적 사건 당사자 초상으로 쓰는 것이 자연스럽다. 모든
경보에 빈 초상 자리를 만들지 말고 위 두 경보에서만 표시한다. 다만 초상은
판정 근거가 아니므로 다음을 지킨다.

- `USER`, `RESOURCE`, `ROLE`, `MFA` 등 현재 사실 행을 줄이거나 가리지 않는다.
- 초상만 보고 정답을 추측하게 만드는 빨강/녹색 상태 표시는 추가하지 않는다.
- 경보의 `correctAction`, 사실 데이터, 설명, 순서와 타이머는 변경하지 않는다.
- 좁은 화면에서는 초상을 축소하거나 숨겨도 되지만 사실 행은 항상 남긴다.
- 인턴·협력업체라는 외형 자체를 위험 신호로 표현하지 않는다. 정답 근거는 기존
  권한 및 자원 범위 텍스트다.

타입을 확장한다면 선택적 필드로 만들고 기존 경보 전부를 수정하지 않는다.
예시는 방향만 보여준다.

```ts
type Alert = {
  // 기존 필드 유지
  portraitAsset?: string
}
```

필드명과 위치는 현재 아키텍처를 읽은 뒤 가장 작은 변경으로 결정한다.

---

## 5. 팀장 전화 초상의 현재 상태

`src/components/PhoneOverlay.tsx`는 연결 상태에서 이미 다음 파일을 사용한다.

```text
public/team-lead-portrait-128.png
```

컴포넌트와 단위 검사는 존재하지만 전화 기능은 게임 루프에 아직 연결되지 않았다.
전화 규칙은 `prompts/03_PHONE_PASSWORD_DISTRACTIONS_HANDOFF.md`와
`docs/GAME_SPEC.md`의 범위 결정을 따른다.

**이번 초상 연결 작업을 이유로 전화 상태 머신이나 타이머 규칙을 임의로
구현하지 않는다.** 팀장 초상 경로와 연결 상태 렌더링이 깨지지 않는지만 확인한다.

---

## 6. 건드릴 가능성이 큰 파일

현재 구조를 다시 읽고 작은 변경으로 제한한다.

- `src/game/data/memos.ts` — 메모 발신자 초상 매핑 또는 선택 필드
- `src/game/data/alerts.ts` — 두 경보의 선택적 사건 당사자 초상
- `src/game/types.ts` — 필요한 경우에만 선택적 자산 필드
- `src/components/MemoToast.tsx` — 발신자 초상 표시
- `src/components/AlertCard.tsx` — 선택적 사건 당사자 초상 표시
- `src/components/PhoneOverlay.tsx` — 기존 팀장 초상 회귀 확인만
- `src/styles/global.css` — 픽셀 렌더링, 크기, 반응형 배치
- 관련 컴포넌트·데이터 테스트
- `docs/QA_CHECKLIST.md` — 실제로 구현한 범위의 검사 항목

현재 작업트리에는 사용자의 다른 미커밋 변경과 새 자산이 있다. reset, checkout,
대량 치환으로 기존 변경을 지우지 않는다.

---

## 7. 완료 조건

### 자동 검사

- 메모 6종이 위 표의 올바른 발신자 초상으로 매핑된다.
- `priv-esc`와 `contractor-proddb`만 올바른 당사자 초상을 가진다.
- 초상 경로는 `import.meta.env.BASE_URL`을 거친다.
- 이미지가 있어도 발신 부서, 메모 본문, 경보 사실 행은 실제 텍스트로 남는다.
- 팀장 통화 연결 화면의 기존 초상이 유지된다.
- `npm test`, `npm run lint`, `npm run build`가 통과한다.

### 브라우저 확인

- 1366×768, 1920×1080, 390×844에서 가로·세로 overflow가 새로 생기지 않는다.
- 메모 초상이 본문, 시각, `SPACE 로 닫기` 버튼을 가리지 않는다.
- 선택적 경보 초상이 사실 행과 제한시간 막대를 가리지 않는다.
- 128px 원본을 CSS로 흐리게 보간하지 않고 도트가 선명하다.
- 이미지 로딩 실패 시에도 게임 판단에 필요한 텍스트가 남는다.
- 흑백/색각 시뮬레이션에서도 역할명과 사실 텍스트로 구분 가능하다.
- 콘솔 오류와 외부 네트워크 요청이 없다.

---

## 8. 이미지 제작 기록

- 생성 방식: Codex 내장 ImageGen
- 생성 의도: 각 인물을 별도 생성하고 이전 완성 인물은 화풍·구도 참고로만 사용
- 공통 프롬프트: 1980~90년대 수작업 도트 초상, 머리와 어깨 중앙 구도,
  제한된 CRT 글리치, 지정 6색, 실제 투명 배경, 글자·로고 없음
- 인물별 핵심 프롬프트:
  - 팀장: 냉정한 야간 SOC 리더, 헤드셋과 타이
  - 인프라: 단발, 사각 안경, 헤드셋과 카디건
  - 보안: 짧은 머리, 둥근 안경, 유선 이어피스
  - IT: 헝클어진 웨이브 머리, 서비스 조끼와 목걸이형 장비
  - HR: 묶은 머리, 낮게 쓴 타원형 안경, 단정한 재킷
  - 마케팅: 비대칭 숏컷, 자신감 있는 표정, 세련된 재킷
  - 인턴: 어린 얼굴, 잔뜩 긴장한 표정, 큰 카디건
  - 협력업체: 뒤로 넘긴 머리, 수염, 낡은 현장 재킷
- 후처리: 생성기의 밝은 체크무늬 배경 제거, 128×128 축소, 지정 6색 최근접
  양자화, 알파 0/255 이진화
- 결과: 8장 모두 크기·팔레트·알파 검사 통과

---

## 9. Claude에게 바로 전달할 프롬프트

```text
mini-game/aleph-t02-soc-shift30/prompts/05_CHARACTER_PORTRAITS_HANDOFF.md를 먼저 읽고,
현재 코드와 미커밋 변경을 확인한 뒤 캐릭터 초상을 화면에 연결해줘.

1차 범위는 다음과 같다.
1. MemoToast에 메모 발신 부서별 초상을 표시한다.
2. AlertCard에서 priv-esc에는 intern-03, contractor-proddb에는
   external-contractor 초상을 선택적으로 표시한다.
3. PhoneOverlay의 기존 team-lead 초상 연결은 유지하고 회귀 검사만 한다.

이미지는 모두 public/*-portrait-128.png를 사용하고 import.meta.env.BASE_URL을
거쳐라. image-rendering: pixelated를 유지해라. 이미지 때문에 기존 텍스트,
사실 행, 제한시간 막대, 닫기 버튼이 가려지면 안 된다.

게임 정답, 점수, 타이머, 메모 큐, 전화 상태 머신은 바꾸지 마라. 인턴이나
협력업체 외형을 위험 신호로 만들지 말고 정답 근거는 기존 사실 텍스트로 유지해라.

관련 데이터·컴포넌트 테스트를 추가하고 npm test, npm run lint,
npm run build를 실행해라. 1366×768, 1920×1080, 390×844에서 overflow와
텍스트 가림을 브라우저로 확인하고, 변경 파일·검증 결과·남은 위험을 보고해라.
```
