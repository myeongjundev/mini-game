# SKT ALEPH 과제 2 — 미니게임 아이디어 정리

## 1. 과제 개요

### 과제 제목
**내가 설계한 미니게임**

### 기본 설명
브라우저에서 실행되는 짧은 게임을 제작한다.  
피하기, 리듬, 타이핑, 클리커 등 장르는 자유이며, 8비트는 여러 표현 방식 중 하나로 선택할 수 있다.

### 핵심 완료 기준
- 공개 주소에서 게임 규칙, 조작 방법, 현재 상태가 보인다.
- 조작 1회에 화면 상태가 바뀐다.
- 성공 / 실패 / 진행 중 상태가 명확하게 구분된다.
- 다시 시작하면 현재 판이 초기화된다.
- 음소거 또는 움직임 줄이기 기능이 실제 화면에서 동작한다.
- 두 기준 해상도에서 조작 영역이 잘리지 않고 가로 넘침이 없다.
- 연속 입력, 포커스 이탈/복귀, 일시정지/재개, 10분 실행 검사에 통과한다.
- 콘솔 빨간 오류가 0건이어야 한다.
- 난이도 값을 하나만 변경하여 변경 전/후 각 10회 플레이 데이터를 남긴다.
- 현재 판 상태는 초기화되지만, 최고 점수처럼 보존 대상으로 정한 기록은 유지된다.
- 저장값이 비어 있거나 손상되어도 기본값으로 실행되어야 한다.
- 공개 화면과 제출물에 개인정보 및 비밀값이 없어야 한다.

### 제출물
1. **검증 안내서 1개**
   - 어디로 가나요
   - 무엇을 하나요
   - 무엇이 보이면 통과인가요
   - 안 될 때 어떻게 하나요

2. **AI 3줄**
   - AI에게 맡긴 일
   - 내가 판단한 일
   - AI 말을 안 들은 일

---

# 2. 이번 과제를 바라보는 방향

이번 SKT ALEPH 과정은 단순히 과제를 제출하는 과정이 아니라,  
약 3개월 동안 여러 문제를 해결하며 성장하는 하나의 여정으로 바라본다.

비유하면 다음과 같다.

- **헤라클레스의 12과업**
  - 각 과제마다 서로 다른 능력을 증명하는 시험
- **오뒷세우스의 트로이 → 이타카 귀환**
  - 하나의 긴 여정 속에서 시행착오, 판단, 전략, 인내를 통해 목적지에 도달하는 과정

따라서 각 과제에서 단순히 “무엇을 만들었는가”만 보여주는 것이 아니라,

> **이 과업을 끝내고 나는 어떤 능력을 증명했는가?**

를 남기는 방향으로 설계한다.

이번 미니게임 과제에서는 특히 다음을 보여주는 것이 목표다.

- 요구사항을 정확히 읽고 구현하는 능력
- 복잡한 내용을 짧고 직관적인 경험으로 바꾸는 능력
- 게임 규칙을 직접 설계하는 능력
- 테스트와 플레이 데이터를 바탕으로 난이도를 조정하는 능력
- AI가 제안한 내용을 그대로 쓰지 않고 직접 판단하는 능력
- 이후 ALEPH 과제와 연결할 수 있는 확장성

---

# 3. ALEPH 3개월 과정과의 연결

현재 과정은 단순 네트워크 수업이 아니라 다음과 같은 흐름으로 이어진다.

## P1 — 네트워크 / Zero Trust
- 패킷
- OSI
- 라우팅
- VLAN
- DNS
- DHCP
- 방화벽
- Zero Trust
- PDP / PEP

## P1 — AI / 자동화
- Python
- API
- Webhook
- LLM
- Agent
- n8n

## P2 — 접근통제
- RBAC
- 최소권한
- 다권한 탐지
- 권한 회수

## P2 — 이상탐지
- 로그
- 베이스라인
- 임계값
- 오탐 / 미탐
- Wazuh

## P2 — SOAR
- 플레이북
- n8n
- 실제 차단
- 승인 게이트

## P3 — Red / Blue 캡스톤
- 공격
- 탐지
- 방어
- 대응
- 룬북
- 측정
- 통합

전체 과정을 한 줄로 정리하면:

> **네트워크를 이해하고 → 이상을 탐지하고 → 판단하고 → 대응하고 → 자동화하고 → 결과를 측정하는 과정**

이번 T02 미니게임도 이 큰 흐름의 씨앗이 되도록 설계한다.

---

# 4. 초기 아이디어 탐색

## 4.1 NET DEFENDER
초기 아이디어는 네트워크 보안 시뮬레이션이었다.

### 컨셉
- 회사 네트워크를 공격자로부터 방어
- VLAN, DNS, DHCP, 방화벽, 라우팅 등을 이용
- 공격이 들어오면 로그를 보고 대응

### 장점
- 수업 내용과 강하게 연결됨
- 보안 / 네트워크 정체성이 분명함
- 향후 확장성이 높음

### 단점
- 미니게임 과제치고 너무 복잡함
- 30초 안에 규칙을 이해하기 어려울 수 있음
- 시뮬레이터에 가까워질 위험이 있음

### 결론
컨셉은 좋지만 T02 과제에는 과도하게 복잡하므로 단순화가 필요.

---

## 4.2 FIREWALL RUSH
NET DEFENDER를 간단한 아케이드 게임으로 줄인 아이디어.

### 기본 규칙
- 화면 아래의 방화벽을 좌우로 이동
- 악성 패킷은 방화벽으로 막는다.
- 정상 패킷은 피한다.
- 악성 패킷을 놓치거나 정상 패킷을 잘못 막으면 HP 감소
- 30초 버티면 성공

### 조작
- `A / D`
- 또는 `← / →`

### 장점
- 즉시 이해 가능
- 확실히 게임처럼 보임
- 개발 난이도가 낮음
- 효과음, 화면 흔들림, Reduce Motion 적용이 쉬움

### 단점
- 네트워크 개념 자체를 깊게 보여주기는 어려움
- 잘못 만들면 일반 피하기 게임에 보안 스킨만 씌운 것처럼 보일 수 있음

---

# 5. 다른 학생들과의 차별화 고려

이미 같은 반에서 다음과 같은 형태의 게임을 만든 사례가 있었다.

- 30초 제한
- 목숨 3개
- 네트워크 관련 문제를 빠르게 풀이
- 틀리면 목숨 감소

따라서 다음 방향은 피하는 것이 좋다.

> **“문제를 읽고 정답을 선택하는 네트워크 퀴즈 게임”**

같은 주제를 사용하더라도 게임 메커니즘 자체를 다르게 가져가야 한다.

핵심 방향:

> **다른 학생이 ‘네트워크 문제를 푼다면’, 나는 ‘네트워크가 움직이거나 보안 판단이 일어나는 게임’을 만든다.**

---

# 6. 주요 후보 아이디어

---

## 후보 1 — SOC SHIFT:30

### 한 줄 설명
**30초 동안 SOC 보안관제 분석가가 되어 들어오는 보안 이벤트를 ALLOW 또는 BLOCK으로 판단하는 게임**

### 핵심 플레이
보안 이벤트가 하나씩 등장한다.

예시:

```text
UNKNOWN LOGIN

User: employee_07
Device: Unknown
Failed Attempts: 14

[A] ALLOW
[D] BLOCK
```

플레이어가 판단하면 즉시 결과가 표시된다.

정답:

```text
THREAT BLOCKED
+100
COMBO x3
```

오판:

```text
FALSE POSITIVE
```

또는:

```text
MISSED THREAT
```

### 기본 게임 루프

```text
이벤트 등장
    ↓
정보 확인
    ↓
ALLOW / BLOCK
    ↓
즉시 결과
    ↓
점수 / 라이프 / 콤보 변화
    ↓
다음 이벤트
```

### 30초 난이도 구조

#### 0~10초
명확한 이벤트
- 정상 HTTPS
- 정상 DNS
- Port Scan
- SSH Brute Force

#### 10~20초
조금 더 애매한 이벤트
- 알려진 사용자 + Unknown Device
- 로그인 실패 횟수 증가
- 평소보다 높은 요청량

#### 20~30초
Incident 구간
- Critical Alert
- 빠른 이벤트 등장
- 고위험 계정 로그인
- 대량 로그인 실패

### 라이프
기본 3개

```text
SECURITY ♥ ♥ ♥
TIME 18.7s
SCORE 1200
COMBO x4
```

오판하면 라이프 감소.

### 두 종류의 실수

#### False Positive
정상 트래픽을 공격으로 판단하여 차단

#### Missed Threat
공격을 정상으로 판단하여 허용

이 두 가지를 구분하는 것이 핵심.

### 콤보
정확한 판단을 연속으로 하면 점수 배율 상승.

### Critical Incident
가끔 중요한 사건이 등장.

예:

```text
CRITICAL INCIDENT

ADMIN
FAILED LOGIN: 132
DEVICE: Unknown
```

정확히 막으면 큰 보너스.

### 결과 화면

```text
SHIFT REPORT

STATUS
NETWORK SECURED

SCORE               2,140

ALERTS REVIEWED        21
THREATS BLOCKED        12
NORMAL ALLOWED          6

FALSE POSITIVES         2
MISSED THREATS          1

ACCURACY              86%
MAX COMBO               7

GRADE                   A

[ RETRY SHIFT ]
```

### 디자인 방향
- 미래형 SOC 관제센터
- Dark Navy
- Cyan
- Warning Red
- 로그 패널
- 상태 게이지
- Security Report

### 장점
- 전체 ALEPH 커리큘럼을 가장 잘 관통함
- 네트워크 → 접근통제 → 이상탐지 → SOAR → Red/Blue로 확장 가능
- 단순 퀴즈보다 실무 흐름에 가까움
- 결과 화면에서 오탐/미탐을 측정할 수 있음

### 면접관 관점 평가
**9.5 / 10**

---

## 후보 2 — ZERO TRUST GATE

### 한 줄 설명
**기업 네트워크 출입 심사관이 되어 사용자와 기기의 접근 요청을 허용하거나 거부하는 게임**

### 화면 예시

```text
ACCESS REQUEST

USER
Developer

DEVICE
Registered

MFA
PASS

LOCATION
Office

RESOURCE
Git Server

[ DENY ]      [ ALLOW ]
```

뒤로 갈수록:

```text
ROLE
Intern

DEVICE
Unknown

MFA
PASS

RESOURCE
Production DB
```

처럼 애매한 상황이 등장한다.

### 핵심 개념
> 로그인에 성공했다고 무조건 신뢰하지 않는다.

Zero Trust 개념을 직접 게임 규칙으로 표현.

### 실패 유형
- 공격자를 허용 → `PRIVILEGE BREACH`
- 정상 사용자를 차단 → `FALSE DENIAL`

### 디자인
**Papers, Please + Cyber Security**

- 디지털 출입국 심사대
- 사용자 카드
- 기기 정보
- MFA
- 위치
- 역할
- 접근 자원

### 이후 확장
- RBAC
- 최소권한
- 접근권한 회수
- Zero Trust
- PDP / PEP

### 장점
- 다른 학생 결과물과 화면부터 확실히 다름
- 현재 Zero Trust 수업과 직접 연결
- 디자인적으로 강한 개성을 만들 수 있음

### 면접관 관점 평가
**9.3 / 10**

---

## 후보 3 — UPTIME:30

### 한 줄 설명
**공격을 막으면서 동시에 서비스 가용성도 유지해야 하는 30초 운영 게임**

### 핵심 상태

```text
SECURITY
██████████ 92%

AVAILABILITY
██████████ 88%
```

공격을 허용하면:

```text
SECURITY -15
```

정상 사용자를 과하게 차단하면:

```text
AVAILABILITY -10
```

### 핵심 메시지

> **보안의 목적은 모든 것을 막는 것이 아니라 안전하게 서비스를 운영하는 것이다.**

### 승리 조건
30초 종료 시 Security와 Availability가 모두 일정 수준 이상이어야 성공.

### 실패 예시

#### 보안은 높지만 서비스 사망
```text
SECURITY      94%
AVAILABILITY   0%

SERVICE DOWN
MISSION FAILED
```

#### 서비스는 살아 있지만 침해 발생
```text
SECURITY       0%
AVAILABILITY  97%

NETWORK BREACHED
MISSION FAILED
```

### 디자인
통신사 NOC(Network Operations Center) 스타일.

### 장점
- “보안 vs 가용성”의 Trade-off를 보여줌
- 엔지니어링 판단을 설명하기 좋음
- 기업 면접에서 이야기할 거리가 많음

### 면접관 관점 평가
**9.2 / 10**

---

## 후보 4 — INCIDENT: RED vs BLUE

### 한 줄 설명
**Red Team이 던지는 공격을 Blue Team 입장에서 제한된 대응 수단으로 막는 30초 보안 공방전 게임**

### 화면 구조

```text
RED TEAM                 BLUE TEAM

██████████               ██████████

        INCIDENT #04

        BRUTE FORCE

   [ BLOCK IP ]
   [ RESET MFA ]
   [ IGNORE ]

            17 SEC
```

### 공격 예시
- Port Scan
- Brute Force
- Privilege Escalation

### 대응 예시
- Block IP
- Disable Account
- Reset MFA
- Patch
- Ignore

### 특징
각 대응에 Cooldown 존재.

### 디자인
**VS Fighting Game 스타일**

- Red Team vs Blue Team
- 양쪽 체력바
- 공격/방어 애니메이션
- Incident 카드

### 장점
- 매우 게임답게 보임
- P3 Red/Blue 캡스톤과 직접 연결
- 발표 시 시각적 임팩트가 큼

### 면접관 관점 평가
**9.1 / 10**

---

## 후보 5 — PACKET RUNNER

### 한 줄 설명
**플레이어가 패킷이 되어 목적지까지 올바른 네트워크 경로를 선택하는 러너 게임**

### 예시

```text
SOURCE
192.168.10.3

DESTINATION
192.168.30.20
```

패킷이 자동 이동.

```text
                  VLAN10
                     ↑

PACKET → SWITCH → ROUTER
                     │
              ←      ●      →
                     │
                     ↓
                  VLAN30
```

플레이어가 방향 선택.

정답:

```text
ROUTE SUCCESS
+100
COMBO x3
```

오답:

```text
PACKET DROPPED
```

### 장애물
- Switch
- Router
- VLAN
- Firewall
- NAT

### 디자인
**TRON + Network Topology**

- 빛나는 패킷
- 네온 라우팅 경로
- 노드 기반 맵

### 장점
- 5개 중 가장 게임다운 느낌
- 네트워크 흐름을 시각화 가능
- 단순 문제풀이와 차별화됨

### 단점
- 이후 AI/자동화/관제 과제와의 연결은 SOC SHIFT보다 약함

### 면접관 관점 평가
**9.0 / 10**

---

# 7. 후보 비교

| 순위 | 아이디어 | 핵심 강점 | 전체 과정 연결성 | 디자인 임팩트 |
|---|---|---|---:|---:|
| 1 | **SOC SHIFT:30** | 관제 판단 / 오탐·미탐 / 확장성 | ★★★★★ | ★★★★☆ |
| 2 | **ZERO TRUST GATE** | 독창적인 Zero Trust 게임화 | ★★★★★ | ★★★★★ |
| 3 | **UPTIME:30** | 보안과 서비스 가용성의 Trade-off | ★★★★☆ | ★★★★☆ |
| 4 | **INCIDENT: RED vs BLUE** | Red/Blue 공방전 | ★★★★☆ | ★★★★★ |
| 5 | **PACKET RUNNER** | 가장 게임다운 네트워크 표현 | ★★★☆☆ | ★★★★★ |

---

# 8. 주제 선정 결론

## 최종 추천
# **SOC SHIFT:30**

### 선정 이유

1. 현재 배우는 네트워크 / 보안 내용과 직접 연결된다.
2. 일반적인 네트워크 퀴즈 게임과 구조가 다르다.
3. 30초 안에 이해되는 단순한 조작 구조를 만들 수 있다.
4. False Positive / Missed Threat처럼 이후 수업의 개념을 자연스럽게 넣을 수 있다.
5. 향후 ALEPH의 접근통제, 이상탐지, SOAR, Red/Blue까지 확장 가능하다.
6. 결과 화면을 SOC Report 형태로 만들어 포트폴리오 완성도를 높일 수 있다.
7. T02에서 끝나지 않고 이후 과제의 세계관 및 시스템으로 재활용할 수 있다.

---

# 9. SOC SHIFT:30 최종 게임 규칙

### 한 문장 설명

> **30초 동안 SOC 분석가가 되어 들어오는 보안 이벤트를 확인하고 ALLOW 또는 BLOCK을 판단해 네트워크를 지키는 게임**

### 조작
- `A` 또는 `←` : ALLOW
- `D` 또는 `→` : BLOCK
- 마우스 버튼도 제공
- `P` 또는 `ESC` : Pause

### 시작 상태

```text
TIME       30.0
SECURITY   ♥ ♥ ♥
SCORE      0
COMBO      x0
```

### 성공
30초 동안 라이프가 남아 있으면:

```text
SHIFT COMPLETE
NETWORK SECURED
```

### 실패
라이프 3개를 모두 잃으면:

```text
SOC FAILURE
NETWORK BREACHED
```

### 정답 처리
- 정상 트래픽 + ALLOW → 성공
- 공격 트래픽 + BLOCK → 성공

### 오답 처리
- 정상 트래픽 + BLOCK → False Positive
- 공격 트래픽 + ALLOW → Missed Threat

### 게임 상태
- Score
- Time
- Security
- Combo
- Alert Type

### Restart
새 게임 시작 시:
- 시간 30초
- 라이프 3
- 점수 0
- 콤보 0
- 현재 이벤트 초기화

최고 점수만 localStorage로 유지.

---

# 10. 난이도 데이터 실험

과제 요구사항에 맞춰 난이도 상수 하나만 변경한다.

예:

```text
Version A
eventInterval = 1400ms
```

10회 플레이.

변경 후:

```text
Version B
eventInterval = 1100ms
```

10회 플레이.

### 측정 항목
- Score
- 생존 시간
- Accuracy
- False Positive
- Missed Threat
- Max Combo

### 비교 예시

| 항목 | Version A | Version B |
|---|---:|---:|
| 평균 점수 | 1,520 | 1,730 |
| 평균 Accuracy | 89% | 76% |
| 평균 False Positive | 1.1 | 2.4 |
| 평균 Missed Threat | 0.8 | 1.9 |
| 성공률 | 90% | 60% |

이 결과를 근거로 최종값을 선택한다.

---

# 11. 접근성 및 안정성

### Sound
- 정답 효과음
- 오답 경고음
- Critical Incident 경고음
- Mute 버튼 제공

### Reduce Motion
오답 시 화면 흔들림 등 큰 움직임을 제거.

### Pause
- `P`
- `ESC`
- 브라우저 포커스 이탈 시 자동 Pause

### 해상도
- 1366 기준
- 1920 기준
- 가로 Scroll 없음
- 주요 버튼이 화면 밖으로 나가지 않음

### 저장 복구
localStorage 최고점수가 다음 상태에서도 오류 없이 복구되어야 한다.

- 값 없음
- 빈 문자열
- 문자 데이터
- 잘못된 JSON
- 필수 값 누락

문제가 있으면 기본값으로 실행.

---

# 12. 디자인 아이디어

## SOC SHIFT:30 디자인 컨셉

### 스타일
**Future SOC / Telecom NOC / Cyber Security**

### 컬러
- Dark Navy
- Black
- Cyan
- Green
- Warning Red

### 주요 UI

```text
┌─────────────────────────────────────┐
│ SOC SHIFT:30        🔊  ⚡  ⏸       │
│                                     │
│ TIME 18.7       SCORE 1,240         │
│ SECURITY ♥ ♥ ♡   COMBO x4           │
│                                     │
│          SECURITY ALERT             │
│                                     │
│ USER: admin                         │
│ DEVICE: Unknown                     │
│ FAILED LOGIN: 91                    │
│ LOCATION: New                       │
│                                     │
│     [ ALLOW ]      [ BLOCK ]        │
│                                     │
│ SOC NODE // ALEPH                   │
└─────────────────────────────────────┘
```

### 결과 화면
실제 관제 리포트처럼 표현.

```text
SHIFT REPORT

NETWORK SECURED

Alerts Reviewed        21
Threats Blocked        12
Normal Allowed          6
False Positives         2
Missed Threats          1

Accuracy               86%
Max Combo                7

GRADE                    A

[ RETRY SHIFT ]
```

---

# 13. AI 활용 3줄 작성 방향

실제 개발 후 최종 수정한다.

### AI에게 맡긴 일
> 게임 UI 초안, 이벤트 데이터 구조, 코드 구현 과정에서 반복 작업을 AI에게 도움받았다.

### 내가 판단한 일
> 30초 미니게임에 맞도록 관제 시뮬레이션을 ALLOW / BLOCK 두 가지 핵심 조작으로 단순화하고, 오탐과 미탐을 별도 실패 원인으로 설계했다.

### AI 말을 안 들은 일
> AI가 제안한 복잡한 실시간 네트워크 시뮬레이션과 다수의 기능을 넣지 않고, 과제 요구사항과 사용자 이해도를 우선하여 기능을 줄였다.

---

# 14. 향후 전체 ALEPH 과업과 연결 아이디어

SOC SHIFT:30을 T02에서 끝나는 게임이 아니라 이후 과제의 출발점으로 활용할 수 있다.

```text
T02
SOC SHIFT:30
│
├─ 기록 과제
│  └ Incident Journal
│
├─ 검색 과제
│  └ 과거 Incident Search
│
├─ AI 캐릭터
│  └ AI Security Analyst
│
├─ 자동 실행
│  └ Daily Security Incident
│
├─ 복구 과제
│  └ SOC System Recovery
│
└─ Final
   └ ALEPH SOC System
```

### 확장 예시

#### AI Security Analyst
T02에서는 작은 분석 UI로 등장.

```text
AI ANALYSIS

Threat Probability 76%

Recommendation
BLOCK
```

이후 AI 캐릭터 과제에서 실제 성격과 대화 능력을 가진 분석가로 발전.

#### Incident Journal
SOC SHIFT 플레이 결과 저장.

```text
2026-08-18

SHIFT #14
Accuracy: 82%
False Positive: 2
Missed Threat: 1
```

#### 기록 검색
예:

> “내가 가장 많이 오탐한 이벤트 유형은?”

과거 데이터에서 답을 찾아주는 시스템으로 확장.

#### 자동 실행
매일 새로운 Daily Incident 생성.

#### Red / Blue
최종 과정에서 실제 Red Team / Blue Team 구조와 연결.

---

# 15. 이번 과제에서 보여주고 싶은 인상

목표는 “반에서 가장 복잡한 게임”이 아니다.

> **30초 플레이 후에도 이름과 컨셉이 기억나는 게임**

그리고 기업이 결과물을 보았을 때 다음과 같은 인상을 남기는 것이 목표다.

> “수업 내용을 단순히 외운 학생이 아니라, 배운 개념을 다른 형태의 경험으로 재설계할 수 있는 사람.”

> “AI를 이용해 빠르게 만들지만 어떤 기능을 남기고 버릴지는 직접 판단하는 사람.”

> “기획 → 구현 → 테스트 → 측정 → 개선 과정을 끝까지 수행하는 사람.”

> “개별 과제를 독립적으로 끝내지 않고 다음 과업과 연결해서 생각하는 사람.”

---

# 16. 현재 최종 방향

## 프로젝트명
# **SOC SHIFT:30**

### 부제 후보
- **30 Seconds on the Front Line**
- **Defend. Decide. Survive.**
- **Your 30-Second SOC Shift**
- **Detect. Decide. Defend.**

### 프로젝트 정의

> **30초 동안 SOC 분석가가 되어 들어오는 보안 이벤트를 판단하고, 정상 요청은 허용하고 위협은 차단하여 네트워크를 지키는 보안 관제 미니게임**

이번 T02에서는 작은 게임으로 완성하되,  
향후 ALEPH 과제를 통해 하나의 더 큰 **ALEPH SOC 세계관 / 시스템**으로 발전시키는 방향을 유지한다.
