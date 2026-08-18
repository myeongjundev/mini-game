# ALERT DATASET — SOC SHIFT:30

`src/game/data/alerts.ts`의 원본 명세다.
경보를 추가하거나 정답을 바꾸면 **이 문서를 먼저 고치고** 코드를 따라 바꾼다.

## 설계 원칙

1. `facts`는 **정확히 4개**로 고정한다. 개수가 변하면 카드 높이가 흔들려 30초 게임에서 시선을 잃는다.
2. 각 경보는 **4개의 사실만으로 판단 가능**해야 한다. 외부 지식이 필요하면 실패한 설계다.
3. 정답의 근거는 사실 중 **최소 2개의 조합**에서 나와야 한다. 한 줄만 보고 맞히면 퀴즈가 된다.
4. 티어별 5개씩, 총 15개. ALLOW 7개 / BLOCK 8개로 한쪽에 쏠리지 않게 한다.
5. `explanation`은 오답일 때 결과 화면에 표시한다. **왜 틀렸는지** 한 문장으로 쓴다.

## 전체 목록

| id | tier | category | severity | 정답 |
|---|---|---|---|---|
| `https-normal` | 1 | traffic | LOW | ALLOW |
| `dns-normal` | 1 | dns | LOW | ALLOW |
| `ssh-brute` | 1 | login | HIGH | BLOCK |
| `port-scan` | 1 | scan | HIGH | BLOCK |
| `file-share` | 1 | traffic | LOW | ALLOW |
| `known-user-new-device` | 2 | login | MEDIUM | ALLOW |
| `typo-login` | 2 | login | MEDIUM | ALLOW |
| `traffic-spike` | 2 | traffic | MEDIUM | ALLOW |
| `dns-tunnel` | 2 | dns | HIGH | BLOCK |
| `slow-scan` | 2 | scan | HIGH | BLOCK |
| `admin-breach` | 3 | critical | CRITICAL | BLOCK |
| `priv-esc` | 3 | critical | CRITICAL | BLOCK |
| `contractor-proddb` | 3 | critical | CRITICAL | BLOCK |
| `exfil` | 3 | traffic | CRITICAL | BLOCK |
| `backup-job` | 3 | traffic | HIGH | **ALLOW** |

---

## Tier 1 — 명확한 이벤트 (0–10초)

플레이어가 규칙을 배우는 구간이다. 판단이 갈리면 안 된다.

### `https-normal`
- title: `OUTBOUND HTTPS`
- category: `traffic` / severity: `LOW` / **ALLOW**
- facts:
  - `PORT` → `443`
  - `REQUESTS` → `8 / sec`
  - `DEVICE` → `Registered`
  - `DESTINATION` → `Known SaaS`
- explanation: 등록된 기기가 알려진 서비스로 보내는 정상 암호화 트래픽이다.

### `dns-normal`
- title: `DNS QUERY`
- category: `dns` / severity: `LOW` / **ALLOW**
- facts:
  - `PORT` → `53`
  - `QUERY RATE` → `Normal`
  - `RESOLVER` → `Internal`
  - `DOMAIN` → `Corporate`
- explanation: 내부 리졸버를 통한 정상적인 이름 질의다.

### `ssh-brute`
- title: `SSH LOGIN FAILURE`
- category: `login` / severity: `HIGH` / **BLOCK**
- facts:
  - `PORT` → `22`
  - `FAILED LOGIN` → `87`
  - `SOURCE` → `Unknown`
  - `WINDOW` → `40 sec`
- explanation: 40초에 87회 실패는 사람이 아니라 자동화된 무차별 대입이다.

### `port-scan`
- title: `SEQUENTIAL PORT PROBE`
- category: `scan` / severity: `HIGH` / **BLOCK**
- facts:
  - `TARGET PORTS` → `21, 22, 23, 80, 443`
  - `BURST` → `High`
  - `SOURCE` → `External`
  - `DURATION` → `6 sec`
- explanation: 짧은 시간에 주요 서비스 포트를 훑는 전형적인 정찰 행위다.

### `file-share`
- title: `INTERNAL FILE ACCESS`
- category: `traffic` / severity: `LOW` / **ALLOW**
- facts:
  - `RESOURCE` → `File Server`
  - `TIME` → `14:22`
  - `DEVICE` → `Registered`
  - `USER` → `Sales Team`
- explanation: 근무 시간에 등록 기기로 접근한 정상 업무 트래픽이다.

---

## Tier 2 — 애매한 이벤트 (10–20초)

**오탐을 유발하는 구간이다.** 위협처럼 보이지만 정상인 카드가 3개 들어간다.
여기서 과차단하는 플레이어는 앰버 막대가 길어진다.

### `known-user-new-device`
- title: `NEW DEVICE LOGIN`
- category: `login` / severity: `MEDIUM` / **ALLOW**
- facts:
  - `USER` → `employee_07`
  - `DEVICE` → `Unregistered`
  - `MFA` → `Pass`
  - `LOCATION` → `Office`
- explanation: MFA를 통과했고 사내 위치다. 기기 미등록만으로 차단하면 정상 업무를 막는다.

### `typo-login`
- title: `REPEATED LOGIN FAILURE`
- category: `login` / severity: `MEDIUM` / **ALLOW**
- facts:
  - `FAILED ATTEMPTS` → `8`
  - `RESULT` → `Success`
  - `DEVICE` → `Registered`
  - `TIME` → `09:14`
- explanation: 등록 기기에서 출근 시간에 8회 실패 후 성공은 오타에 가깝다. 실패 횟수만 보면 안 된다.

### `traffic-spike`
- title: `REQUEST VOLUME SPIKE`
- category: `traffic` / severity: `MEDIUM` / **ALLOW**
- facts:
  - `REQUESTS` → `3x baseline`
  - `PATTERN` → `Normal`
  - `SOURCE` → `Customer Range`
  - `EVENT` → `Promotion`
- explanation: 예정된 행사로 인한 부하다. 베이스라인 초과 자체가 공격은 아니다.

### `dns-tunnel`
- title: `ANOMALOUS DNS PATTERN`
- category: `dns` / severity: `HIGH` / **BLOCK**
- facts:
  - `SUBDOMAINS` → `Random, 1,240`
  - `RESPONSE SIZE` → `Oversized`
  - `RATE` → `90 / sec`
  - `DOMAIN` → `Newly Registered`
- explanation: 무작위 서브도메인과 과대 응답은 DNS를 데이터 통로로 쓰는 터널링 신호다.

### `slow-scan`
- title: `LOW AND SLOW PROBE`
- category: `scan` / severity: `HIGH` / **BLOCK**
- facts:
  - `PORTS` → `1 per attempt`
  - `INTERVAL` → `30 min`
  - `SOURCE` → `Single External IP`
  - `COVERAGE` → `47 ports`
- explanation: 임계값을 피하려 느리게 훑는 스캔이다. 순간 속도가 낮다고 정상은 아니다.

---

## Tier 3 — Incident 구간 (20–30초)

고위험 이벤트 비중이 높아진다. 마지막 `backup-job`이 이 구간의 핵심이다.

### `admin-breach`
- title: `ADMIN ACCOUNT UNDER ATTACK`
- category: `critical` / severity: `CRITICAL` / **BLOCK**
- facts:
  - `USER` → `admin`
  - `DEVICE` → `Unknown`
  - `FAILED LOGIN` → `132`
  - `TIME` → `03:17`
- explanation: 최고 권한 계정에 대한 심야 대량 로그인 시도다. 즉시 차단 대상이다.

### `priv-esc`
- title: `PRIVILEGE ESCALATION`
- category: `critical` / severity: `CRITICAL` / **BLOCK**
- facts:
  - `USER` → `intern_03`
  - `ACTION` → `Add to Domain Admins`
  - `APPROVAL` → `None`
  - `TIME` → `03:41`
- explanation: 승인 없는 관리자 그룹 추가는 최소권한 원칙을 정면으로 위반한다.

### `contractor-proddb`
- title: `UNAUTHORIZED RESOURCE ACCESS`
- category: `critical` / severity: `CRITICAL` / **BLOCK**
- facts:
  - `ROLE` → `Contractor`
  - `RESOURCE` → `Production DB`
  - `HISTORY` → `First Access`
  - `MFA` → `Pass`
- explanation: 인증에 성공해도 역할에 없는 자원 접근은 허용하지 않는다. Zero Trust의 핵심이다.

### `exfil`
- title: `LARGE OUTBOUND TRANSFER`
- category: `traffic` / severity: `CRITICAL` / **BLOCK**
- facts:
  - `VOLUME` → `4.2 GB`
  - `TIME` → `02:40`
  - `DESTINATION` → `Unknown Host`
  - `SOURCE` → `Workstation`
- explanation: 개인 워크스테이션에서 미상 호스트로 나가는 심야 대량 전송은 데이터 반출이다.

### `backup-job` — 함정 카드
- title: `SCHEDULED NIGHT TRANSFER`
- category: `traffic` / severity: `HIGH` / **ALLOW**
- facts:
  - `VOLUME` → `6.1 GB`
  - `TIME` → `02:00`
  - `DESTINATION` → `Registered Backup Server`
  - `JOB` → `Nightly Backup`
- explanation: 심야 대용량이라도 등록된 백업 서버로 가는 정기 작업이다. 이걸 막으면 백업이 죽는다.

**이 카드는 반드시 넣는다.** `exfil`과 표면적으로 닮았지만 목적지와 작업 등록 여부가 다르다.
플레이어가 "크면 막는다"는 단순 규칙으로 굳는 것을 막고, 게임의 두 실패 축이 실제로 작동하게 만든다.

---

## 의도된 대조쌍

같은 사실이 맥락에 따라 다른 답을 내도록 짝지어 두었다. 이 대조가 이 게임이 퀴즈가 아닌 이유다.

| 쌍 | 같은 것 | 다른 것 | 답 |
|---|---|---|---|
| `exfil` ↔ `backup-job` | 심야 / 대용량 전송 | 목적지가 미상인가 등록된 백업 서버인가 | BLOCK ↔ ALLOW |
| `ssh-brute` ↔ `typo-login` | 반복 로그인 실패 | 기기 등록 여부와 최종 성공 여부 | BLOCK ↔ ALLOW |
| `known-user-new-device` ↔ `contractor-proddb` | MFA 통과 | 요청한 자원이 역할 범위 안인가 | ALLOW ↔ BLOCK |
| `port-scan` ↔ `slow-scan` | 포트 정찰 | 순간 속도가 높은가 낮은가 (둘 다 위협) | BLOCK ↔ BLOCK |
| `dns-normal` ↔ `dns-tunnel` | DNS 질의 | 서브도메인 패턴과 응답 크기 | ALLOW ↔ BLOCK |

`known-user-new-device`와 `contractor-proddb`의 대조가 특히 중요하다.
**MFA 통과가 만능 통행증이 아니라는 것** — Zero Trust 수업 내용이 게임 규칙으로 그대로 들어간 지점이다.

---

## 출제 규칙

`src/game/engine/alertQueue.ts`

- 0–10초는 tier 1, 10–20초는 tier 2, 20–30초는 tier 3에서 뽑는다.
- 티어 안에서는 셔플한다. 매 판 순서가 같으면 암기 게임이 된다.
- 한 티어를 모두 소진하면 같은 티어 안에서 다시 셔플해 재사용한다.
- **직전에 나온 경보는 연속으로 내지 않는다.**
- 시드 고정 옵션을 둔다. 난이도 실험 10회에서 출제 순서가 변수로 끼어들지 않게 하기 위함이다.
