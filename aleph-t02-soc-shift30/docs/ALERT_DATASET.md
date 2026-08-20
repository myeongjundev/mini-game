# ALERT DATASET — SOC SHIFT:30

`src/game/data/alerts.ts`의 원본 명세다.
경보를 추가하거나 정답을 바꾸면 **이 문서를 먼저 고치고** 코드를 따라 바꾼다.

## 설계 원칙

1. `facts`는 **정확히 4개**로 고정한다. 개수가 변하면 카드 높이가 흔들려 30초 게임에서 시선을 잃는다.
2. 각 경보는 **4개의 사실만으로 판단 가능**해야 한다. 외부 지식이 필요하면 실패한 설계다.
3. 정답의 근거는 사실 중 **최소 2개의 조합**에서 나와야 한다. 한 줄만 보고 맞히면 퀴즈가 된다.
4. 티어별 5개씩, 총 15개. ALLOW 7개 / BLOCK 8개로 한쪽에 쏠리지 않게 한다.
5. `explanation`은 오답일 때 결과 화면에 표시한다. **왜 틀렸는지** 한 문장으로 쓴다.

---

## 신호 표시

각 사실에 `signal`을 붙인다. 도메인 지식이 없어도 무엇을 살펴야 하는지 알 수 있게 하기 위함이다.

```ts
type Signal = 'normal' | 'suspicious'
facts: { label: string; value: string; signal: Signal }[]
```

### 표시 규칙

- **`suspicious`만 표시한다.** 값 앞에 작은 도트 마커를 붙이고 값을 `--amber`로 칠한다.
- **`normal`은 아무 표시도 하지 않는다.** 기본 `--text` 색 그대로 둔다.
- 색만으로 구분되면 안 되므로 마커 아이콘과 스크린리더용 텍스트(`수상한 항목`)를 함께 넣는다.

`normal`에 표시를 붙이지 않는 이유는 신호를 **최대한 약하게** 유지하기 위해서다.
양쪽을 다 칠하면 화면이 정답표처럼 읽힌다. "이 항목은 한 번 봐야 한다" 정도의 힌트면 충분하다.

### 신호는 정답이 아니다

수상한 항목 수를 세는 것만으로는 맞힐 수 없도록 설계했다.

| 경보 | 수상 : 정상 | 정답 |
|---|---:|---|
| `slow-scan` | 2 : 2 | **BLOCK** |
| `contractor-proddb` | 2 : 2 | **BLOCK** |
| `backup-job` | 2 : 2 | **ALLOW** |
| `known-user-new-device` | 1 : 3 | ALLOW |
| `priv-esc` | 3 : 1 | BLOCK |

2:2 동률인 세 장의 정답이 서로 다르다. 개수가 아니라 **어떤 항목이 수상한가**를 봐야 한다.
`backup-job`은 `DESTINATION`이 등록 서버라는 한 줄이 결정적이고, `contractor-proddb`는 `MFA Pass`라는 정상 신호가 있어도 역할 밖 자원이라 막아야 한다.

### 티어별 신호 구성

초반에는 한쪽으로 쏠리고, 뒤로 갈수록 섞인다.

| 티어 | 신호 구성 | 의도 |
|---|---|---|
| 1 | 0:4, 0:4, 3:1, 4:0, 0:4 | 쏠림이 명확해 규칙을 배운다 |
| 2 | 1:3, 1:3, 1:3, 3:1, 2:2 | 수상한 항목이 있어도 정상인 경우를 배운다 |
| 3 | 4:0, 3:1, 2:2, 4:0, 2:2 | 명백한 위협과 함정이 뒤섞인다 |

---

## 전체 목록

| id | tier | category | severity | 수상:정상 | 정답 |
|---|---|---|---|---:|---|
| `https-normal` | 1 | traffic | LOW | 0:4 | ALLOW |
| `dns-normal` | 1 | dns | LOW | 0:4 | ALLOW |
| `ssh-brute` | 1 | login | HIGH | 3:1 | BLOCK |
| `port-scan` | 1 | scan | HIGH | 4:0 | BLOCK |
| `file-share` | 1 | traffic | LOW | 0:4 | ALLOW |
| `known-user-new-device` | 2 | login | MEDIUM | 1:3 | ALLOW |
| `typo-login` | 2 | login | MEDIUM | 1:3 | ALLOW |
| `traffic-spike` | 2 | traffic | MEDIUM | 1:3 | ALLOW |
| `dns-tunnel` | 2 | dns | HIGH | 3:1 | BLOCK |
| `slow-scan` | 2 | scan | HIGH | 2:2 | BLOCK |
| `admin-breach` | 3 | critical | CRITICAL | 4:0 | BLOCK |
| `priv-esc` | 3 | critical | CRITICAL | 3:1 | BLOCK |
| `contractor-proddb` | 3 | critical | CRITICAL | 2:2 | BLOCK |
| `exfil` | 3 | traffic | CRITICAL | 4:0 | BLOCK |
| `backup-job` | 3 | traffic | HIGH | 2:2 | **ALLOW** |

아래 표기에서 `!`는 `suspicious`, 표기 없음은 `normal`이다.

---

## 심각도는 판정 전에 노출하지 않는다

위 표를 세로로 읽으면 문제가 보인다.

| 심각도 | ALLOW | BLOCK |
|---|---:|---:|
| LOW | 3 | 0 |
| MEDIUM | 3 | 0 |
| HIGH | 1 | 4 |
| CRITICAL | 0 | 4 |

**LOW·MEDIUM이면 ALLOW, HIGH·CRITICAL이면 BLOCK — 15장 중 14장, 93%가 맞는다.**
`backup-job` 하나만 예외다. 심각도를 카드에 보여주면 사실 네 줄을 읽을 이유가 사라진다.

그래서 경보 카드에는 `TIER`만 표시하고 심각도는 숨긴다.
심각도는 판정이 끝난 뒤 **SHIFT LOG에서만** 드러난다. 정보를 버리지 않으면서 누출만 막는다.

같은 이유로 크리티컬 경고음도 `severity`가 아니라 `tier === 3`에 건다.
tier는 카드에 이미 표시되므로 소리로 새로 노출되는 정보가 없다.

심각도는 여전히 점수에 쓰인다. CRITICAL 정답은 +300이고, 그 근거는 결과 화면에서 확인된다.

---

## 티어에도 같은 누수가 있다 (2026-08-20 발견, 미해결)

심각도를 감춘 것과 **같은 검사를 티어에 해보지 않았다.** 해보니 나왔다.

| 티어 | ALLOW | BLOCK | 한쪽으로 찍었을 때 |
|---|---:|---:|---:|
| 1 (0–10초) | 3 | 2 | 60% |
| 2 (10–20초) | 3 | 2 | 60% |
| **3 (20–30초)** | **1** | **4** | **80%** |

전체는 ALLOW 7 / BLOCK 8로 거의 반반이다. **누수가 티어 3에 몰려 있다.**

**티어는 카드에 대놓고 표시된다.** 심각도는 감출 수 있었지만 티어는 난이도
구간을 알리는 장치라 감출 수 없다. 게다가 크리티컬 경고음도 `tier === 3`에
걸려 있다. 그 소리가 "이제부터 막으면 80% 맞는다"는 신호로 쓰일 수 있다.

경고음을 심각도에서 티어로 옮길 때 "tier는 카드에 이미 표시되므로 소리로
새로 노출되는 정보가 없다"고 적었다. 맞는 말이지만 **티어 자체가 정답과
상관이 있다는 것을 그때 재보지 않았다.**

### 얼마나 심각한가

`eventIntervalMs`가 3000이면 티어 3 구간 10초에서 3.3장만 뽑힌다. 한 판
10장 중 3장 남짓이라 전체 정확도로는 그리 크지 않다.

그리고 티어 3을 통째로 막으면 **`backup-job`을 반드시 틀린다.** 그 카드는
가이드 3쪽이 `exfil`과 짝지어 가르치는 이 게임의 대표 교재다. 찍기로
얻는 80%가 가장 중요한 한 장을 버리고 얻는 값이라는 뜻이다.

그래도 **심각도 93%, 표시 개수 93%와 같은 계열의 실수다.** 규칙을 모르는
사람이 화면의 한 가지만 보고 반을 크게 넘겨 맞히면 그것은 정답표다.

### 왜 아직 안 고쳤나

**난이도 실험 20판이 이 데이터셋을 고정한 채로 도는 설계다.**
경보를 바꾸면 실험 전후 기록을 비교할 수 없다.

`GAME_SPEC` 14.4의 전화 설계도 이 분포 위에 서 있다. 상사의 지시를
"통과시켜" 하나로 고정하지 못하고 "막아"를 함께 둔 이유가 이것이다.
티어 3이 BLOCK 4 / ALLOW 1이라 지시의 80%가 거짓이 되기 때문이다.

### 고칠 때 볼 것

- 티어 3을 ALLOW 2 / BLOCK 3으로 만들면 다수결이 60%로 내려간다.
  티어 1·2와 같은 수준이다
- 새 ALLOW 카드를 만들기보다 **티어 2의 ALLOW 하나를 티어 3으로 올리는**
  편이 낫다. 전체 15장과 ALLOW 7 / BLOCK 8 균형이 그대로 유지된다
- 올릴 후보는 "무서워 보이는데 정상"인 카드여야 한다. 티어 3에서 쉬운
  ALLOW를 주면 난이도 곡선이 무너진다
- 바꾸면 13.4의 메모 짝짓기와 14.4의 전화 표도 함께 다시 봐야 한다

---

## 초상은 같은 실수를 되풀이하지 않았다 (2026-08-20)

캐릭터 초상 인계서(`prompts/05`)는 사건 당사자 얼굴을 `priv-esc`와
`contractor-proddb` **둘에만** 붙이라고 했다. 둘 다 정답이 BLOCK이다.

그대로 넣었으면 **"얼굴이 있으면 차단"이 2/2로 맞는 규칙**이 된다.
심각도 93%, 표시 개수 93%, 티어 80%와 같은 계열이다. 다른 점은 이번엔
코드에 들어가기 전에 잡았다는 것뿐이다.

그래서 ALLOW 정답 둘에도 얼굴을 붙여 2:2로 맞췄다.

| 경보 | 정답 | 얼굴 |
|---|---|---|
| `priv-esc` | BLOCK | 인턴 |
| `contractor-proddb` | BLOCK | 외부 협력업체 담당자 |
| `backup-job` | ALLOW | 인프라 엔지니어 |
| `traffic-spike` | ALLOW | 마케팅 담당자 |

넷 다 **사람이 벌인 일**이라 당사자 얼굴이 어색하지 않다. 얼굴이 없는
나머지 11장도 ALLOW 5 / BLOCK 6이라 반대편도 쏠리지 않는다.

`src/game/data/portraits.test.ts`가 양쪽 균형을 모두 검사한다. 인계서대로
BLOCK 둘만 넣으면 이 검사가 실패한다.

**표시를 하나 더할 때마다 정답과의 상관을 재는 것이 규칙이다.** 티어 때는
재지 않아 놓쳤다.

---

## 결정적 항목

각 경보에 `decisiveFact`를 둔다. 판단을 가른 사실 하나의 `label`이다.

```ts
decisiveFact: string   // facts 중 하나의 label과 반드시 일치한다
```

판정 직후 플래시와 SHIFT LOG에 `결정적 항목 · DESTINATION` 형태로 표시한다.
`explanation`이 이유를 문장으로 말한다면, `decisiveFact`는 **네 줄 중 어디를 봤어야 했는지**를 가리킨다.

`backup-job`과 `exfil`은 둘 다 `DESTINATION`이 결정적이다.
같은 항목을 보고 다른 답을 내야 한다는 것이 이 게임의 핵심이므로 의도된 중복이다.

---

## Tier 1 — 명확한 이벤트 (0–10초)

플레이어가 규칙을 배우는 구간이다. 판단이 갈리면 안 된다.

### `https-normal`
- title: `OUTBOUND HTTPS` / `traffic` / `LOW` / **ALLOW**
- facts:
  - `PORT` → `443`
  - `REQUESTS` → `8 / sec`
  - `DEVICE` → `Registered`
  - `DESTINATION` → `Known SaaS`
- decisiveFact: `DEVICE`
- explanation: 등록된 기기가 알려진 서비스로 보내는 정상 암호화 트래픽이다.

### `dns-normal`
- title: `DNS QUERY` / `dns` / `LOW` / **ALLOW**
- facts:
  - `PORT` → `53`
  - `QUERY RATE` → `Normal`
  - `RESOLVER` → `Internal`
  - `DOMAIN` → `Corporate`
- decisiveFact: `RESOLVER`
- explanation: 내부 리졸버를 통한 정상적인 이름 질의다.

### `ssh-brute`
- title: `SSH LOGIN FAILURE` / `login` / `HIGH` / **BLOCK**
- facts:
  - `PORT` → `22`
  - `!` `FAILED LOGIN` → `87`
  - `!` `SOURCE` → `Unknown`
  - `!` `WINDOW` → `40 sec`
- decisiveFact: `FAILED LOGIN`
- explanation: 40초에 87회 실패는 사람이 아니라 자동화된 무차별 대입이다.

### `port-scan`
- title: `SEQUENTIAL PORT PROBE` / `scan` / `HIGH` / **BLOCK**
- facts:
  - `!` `TARGET PORTS` → `21, 22, 23, 80, 443`
  - `!` `BURST` → `High`
  - `!` `SOURCE` → `External`
  - `!` `DURATION` → `6 sec`
- decisiveFact: `TARGET PORTS`
- explanation: 짧은 시간에 주요 서비스 포트를 훑는 전형적인 정찰 행위다.

### `file-share`
- title: `INTERNAL FILE ACCESS` / `traffic` / `LOW` / **ALLOW**
- facts:
  - `RESOURCE` → `File Server`
  - `TIME` → `14:22`
  - `DEVICE` → `Registered`
  - `USER` → `Sales Team`
- decisiveFact: `DEVICE`
- explanation: 근무 시간에 등록 기기로 접근한 정상 업무 트래픽이다.

---

## Tier 2 — 애매한 이벤트 (10–20초)

**오탐을 유발하는 구간이다.** 수상한 항목이 하나 있어도 정상인 경우를 배운다.
여기서 과차단하는 플레이어는 결과 화면의 앰버 막대가 길어진다.

### `known-user-new-device`
- title: `NEW DEVICE LOGIN` / `login` / `MEDIUM` / **ALLOW**
- facts:
  - `USER` → `employee_07`
  - `!` `DEVICE` → `Unregistered`
  - `MFA` → `Pass`
  - `LOCATION` → `Office`
- decisiveFact: `MFA`
- explanation: MFA를 통과했고 사내 위치다. 기기 미등록만으로 차단하면 정상 업무를 막는다.

### `typo-login`
- title: `REPEATED LOGIN FAILURE` / `login` / `MEDIUM` / **ALLOW**
- facts:
  - `!` `FAILED ATTEMPTS` → `8`
  - `RESULT` → `Success`
  - `DEVICE` → `Registered`
  - `TIME` → `09:14`
- decisiveFact: `RESULT`
- explanation: 등록 기기에서 출근 시간에 8회 실패 후 성공은 오타에 가깝다. 실패 횟수만 보면 안 된다.

### `traffic-spike`
- title: `REQUEST VOLUME SPIKE` / `traffic` / `MEDIUM` / **ALLOW**
- facts:
  - `!` `REQUESTS` → `3x baseline`
  - `PATTERN` → `Normal`
  - `SOURCE` → `Customer Range`
  - `EVENT` → `Promotion`
- decisiveFact: `EVENT`
- explanation: 예정된 행사로 인한 부하다. 베이스라인 초과 자체가 공격은 아니다.

### `dns-tunnel`
- title: `ANOMALOUS DNS PATTERN` / `dns` / `HIGH` / **BLOCK**
- facts:
  - `!` `SUBDOMAINS` → `Random, 1,240`
  - `!` `RESPONSE SIZE` → `Oversized`
  - `RESOLVER` → `Internal`
  - `!` `DOMAIN` → `Newly Registered`
- decisiveFact: `SUBDOMAINS`
- explanation: 내부 리졸버를 거쳐도 무작위 서브도메인과 과대 응답은 DNS를 데이터 통로로 쓰는 터널링이다.

> `RESOLVER: Internal`은 `dns-normal`에서는 정상 근거였다. 같은 값이 다른 맥락에서 안심 재료가 되지 않는다는 것을 보여주는 자리다.

### `slow-scan`
- title: `LOW AND SLOW PROBE` / `scan` / `HIGH` / **BLOCK**
- facts:
  - `PORTS` → `1 per attempt`
  - `INTERVAL` → `30 min`
  - `!` `SOURCE` → `Single External IP`
  - `!` `COVERAGE` → `47 ports`
- decisiveFact: `COVERAGE`
- explanation: 한 번에 하나씩 느리게 접근해도 단일 외부 IP가 47개 포트를 훑었다면 임계값을 피한 스캔이다.

> 2:2 동률이다. 개별 행위는 정상처럼 보이지만 **누적 범위**가 결정적이다.

---

## Tier 3 — Incident 구간 (20–30초)

고위험 이벤트와 함정이 뒤섞인다. 마지막 `backup-job`이 이 구간의 핵심이다.

### `admin-breach`
- title: `ADMIN ACCOUNT UNDER ATTACK` / `critical` / `CRITICAL` / **BLOCK**
- facts:
  - `!` `USER` → `admin`
  - `!` `DEVICE` → `Unknown`
  - `!` `FAILED LOGIN` → `132`
  - `!` `TIME` → `03:17`
- decisiveFact: `FAILED LOGIN`
- explanation: 최고 권한 계정에 대한 심야 대량 로그인 시도다. 즉시 차단 대상이다.

### `priv-esc`
- title: `PRIVILEGE ESCALATION` / `critical` / `CRITICAL` / **BLOCK**
- facts:
  - `USER` → `intern_03`
  - `!` `ACTION` → `Add to Domain Admins`
  - `!` `APPROVAL` → `None`
  - `!` `TIME` → `03:41`
- decisiveFact: `ACTION`
- explanation: 승인 없는 관리자 그룹 추가는 최소권한 원칙을 정면으로 위반한다.

### `contractor-proddb`
- title: `UNAUTHORIZED RESOURCE ACCESS` / `critical` / `CRITICAL` / **BLOCK**
- facts:
  - `ROLE` → `Contractor`
  - `!` `RESOURCE` → `Production DB`
  - `!` `HISTORY` → `First Access`
  - `MFA` → `Pass`
- decisiveFact: `RESOURCE`
- explanation: 인증에 성공해도 역할에 없는 자원 접근은 허용하지 않는다. Zero Trust의 핵심이다.

> 2:2 동률이고 `MFA: Pass`라는 정상 신호까지 있다. **인증 성공이 통행증이 아니라는 것**을 배우는 자리다.

### `exfil`
- title: `LARGE OUTBOUND TRANSFER` / `traffic` / `CRITICAL` / **BLOCK**
- facts:
  - `!` `VOLUME` → `4.2 GB`
  - `!` `TIME` → `02:40`
  - `!` `DESTINATION` → `Unknown Host`
  - `!` `SOURCE` → `Workstation`
- decisiveFact: `DESTINATION`
- explanation: 개인 워크스테이션에서 미상 호스트로 나가는 심야 대량 전송은 데이터 반출이다.

### `backup-job` — 함정 카드
- title: `SCHEDULED NIGHT TRANSFER` / `traffic` / `HIGH` / **ALLOW**
- facts:
  - `!` `VOLUME` → `6.1 GB`
  - `!` `TIME` → `02:00`
  - `DESTINATION` → `Registered Backup Server`
  - `JOB` → `Nightly Backup`
- decisiveFact: `DESTINATION`
- explanation: 심야 대용량이라도 등록된 백업 서버로 가는 정기 작업이다. 이걸 막으면 백업이 죽는다.

**이 카드는 반드시 넣는다.** `exfil`과 수상한 항목 2개가 겹치지만 목적지와 작업 등록 여부가 다르다.
플레이어가 "수상한 게 있으면 막는다"는 단순 규칙으로 굳는 것을 막고, 게임의 두 실패 축이 실제로 작동하게 만든다.

---

## 의도된 대조쌍

같은 사실이 맥락에 따라 다른 답을 내도록 짝지어 두었다. 이 대조가 이 게임이 퀴즈가 아닌 이유다.

| 쌍 | 같은 것 | 다른 것 | 답 |
|---|---|---|---|
| `exfil` ↔ `backup-job` | 심야 / 대용량 전송이 수상 표시 | 목적지가 미상인가 등록된 백업 서버인가 | BLOCK ↔ ALLOW |
| `ssh-brute` ↔ `typo-login` | 반복 로그인 실패가 수상 표시 | 기기 등록 여부와 최종 성공 여부 | BLOCK ↔ ALLOW |
| `known-user-new-device` ↔ `contractor-proddb` | `MFA: Pass`가 정상 표시 | 요청한 자원이 역할 범위 안인가 | ALLOW ↔ BLOCK |
| `dns-normal` ↔ `dns-tunnel` | `RESOLVER: Internal`이 정상 표시 | 서브도메인 패턴과 응답 크기 | ALLOW ↔ BLOCK |
| `port-scan` ↔ `slow-scan` | 포트 정찰 | 순간 속도가 높은가 낮은가 (둘 다 위협) | BLOCK ↔ BLOCK |

`known-user-new-device`와 `contractor-proddb`의 대조가 특히 중요하다.
**MFA 통과가 만능 통행증이 아니라는 것** — Zero Trust 수업 내용이 게임 규칙으로 그대로 들어간 지점이다.

`dns-normal`과 `dns-tunnel`은 **같은 값에 같은 정상 표시가 붙어도** 다른 답이 나오는 자리다.
신호를 그대로 믿으면 안 된다는 것을 화면으로 보여준다.

---

## 출제 규칙

`src/game/engine/alertQueue.ts`

- 0–10초는 tier 1, 10–20초는 tier 2, 20–30초는 tier 3에서 뽑는다.
- 티어 안에서는 셔플한다. 매 판 순서가 같으면 암기 게임이 된다.
- 기본 시드는 세션마다 달라진다. 고정 시드는 난이도 실험용 옵션이다.
- 한 티어를 모두 소진하면 같은 티어 안에서 다시 셔플해 재사용한다.
- **직전에 나온 경보는 연속으로 내지 않는다.**
- 티어별 최소 2개가 없으면 큐 생성 시점에 예외를 던진다.
