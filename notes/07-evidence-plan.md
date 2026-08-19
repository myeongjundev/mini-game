# 증거 수집 계획

`notes/06-submission-plan.md`의 최종 증거 PDF를 만들기 위해 **무엇을 언제 어떤 이름으로 남길지** 정합니다.
원본은 전부 `evidence/`에 두고, `evidence/`는 `.gitignore`로 제외되어 있어 저장소에 올라가지 않습니다.

## 파일 이름 규칙

```text
E<번호>-<내용>-<조건>.<확장자>
```

예: `E06-overflow-1366.png`, `E11-storage-broken-json.png`

- 번호는 아래 표의 순서를 따릅니다. 나중에 PDF 목차와 1:1로 맞습니다.
- 조건이 없으면 생략합니다. `E01-rules.png`
- 같은 항목의 전·후는 `-before` / `-after`를 붙입니다.

## 캡처 전 준비

1. 브라우저를 **시크릿 창**으로 엽니다. 확장 프로그램 배너가 화면에 섞이지 않습니다.
2. 북마크바를 숨깁니다. 개인 정보가 찍힐 수 있습니다.
3. 개발자 도구는 필요한 항목에서만 엽니다.
4. 창 제목과 주소창이 함께 보이게 찍습니다. 공개 주소가 증거가 됩니다.

## 요구사항 → 증거 매핑

| # | 과제 요구사항 | 증거 파일 | 캡처 시점 |
|---|---|---|---|
| 01 | 규칙·조작·현재 상태가 보인다 | `E01-rules.png` | 배포 후 첫 화면 |
| 02 | 조작 1회 → 상태 변화 1회 | `E02-input-before.png` / `E02-input-after.png` | 판정 직전·직후 |
| 03 | 성공 상태 | `E03-success.png` | 30초 생존 |
| 04 | 실패 상태 | `E04-failure.png` | 라이프 소진 |
| 05 | 다시 시작하면 현재 판 초기화 | `E05-restart-before.png` / `E05-restart-after.png` | 결과 화면과 재시작 직후 |
| 06 | 1366×768 잘림·넘침 없음 | `E06-res-1366.png`, `E06-overflow-1366.png` | 구현 완료 후 |
| 07 | 1920×1080 잘림·넘침 없음 | `E07-res-1920.png`, `E07-overflow-1920.png` | 구현 완료 후 |
| 08 | 음소거 즉시 반영 | `E08-mute-before.png` / `E08-mute-after.png` | 토글 직전·직후 |
| 09 | 움직임 줄이기 즉시 반영 | `E09-motion-before.png` / `E09-motion-after.png` | 토글 직전·직후 |
| 10 | 포커스 이탈 자동 일시정지 | `E10-focus-pause.png` | 탭 전환 후 복귀 |
| 11 | 저장값 손상 복구 | `E11-storage-<케이스>.png` 13장 | 손상값 심고 새로고침 |
| 12 | 콘솔 빨간 오류 0건 | `E12-console-load.png`, `E12-console-play.png`, `E12-console-restart.png` | 각 시점 |
| 13 | 외부 도메인 요청 0건 | `E13-network.png` | 로드 직후 네트워크 탭 |
| 14 | 10분 연속 실행 | `E14-memory-start.png` / `E14-memory-10min.png` | 힙 스냅샷 2장 |
| 15 | 난이도 전 10회 | `records/playtest-before.csv` + `E15-result-<n>.png` | 실험 전 |
| 16 | 난이도 후 10회 | `records/playtest-after.csv` + `E16-result-<n>.png` | 실험 후 |
| 17 | 개인정보·비밀값 0건 | `E17-secret-scan.txt` | 배포 직전 |
| 18 | 빌드·검사 통과 | `E18-build.png`, `E18-test.png`, `E18-lint.png` | 배포 직전 |

## 항목별 캡처 방법

### 06·07 가로 넘침
콘솔에서 아래를 실행하고 **결과값이 함께 보이게** 찍습니다. `0`이면 통과입니다.

```js
document.documentElement.scrollWidth - document.documentElement.clientWidth
```

창 크기는 개발자 도구의 반응형 모드가 아니라 **실제 창 크기**로 맞춥니다. 반응형 모드는 스크롤바 폭이 달라 결과가 바뀔 수 있습니다.

### 11 저장값 손상 복구
`aleph-t02-soc-shift30/docs/STORAGE_AND_RECOVERY.md` 5절의 손상 입력 8종과 경계 5종, 총 13가지입니다.
각 케이스마다 값을 심고 새로고침한 뒤, **게임이 기본값으로 실행되는 화면과 콘솔이 함께** 보이게 찍습니다.

```js
localStorage.setItem('socshift30:v1', '<검사값>')
```

복구했다는 사실이 콘솔 오류로 찍히면 안 되므로 콘솔을 반드시 함께 담습니다.

### 15·16 난이도 실험
한 판이 끝날 때마다 결과 화면을 찍고 그 자리에서 CSV에 옮겨 적습니다.
나중에 몰아서 적으면 값이 섞입니다.

기록할 값은 결과 화면에 전부 표시됩니다. 컬럼 순서는 CSV 헤더와 같습니다.

```text
run, setting_value, success, score, survival_seconds, alerts_reviewed,
accuracy, false_positive, missed_threat, timeout, max_combo, failure_reason, notes
```

`setting_value`에는 `eventIntervalMs` 값(기준 2000, 비교값은 미정)을 적습니다.
**원하는 결과가 나올 때까지 판을 골라내지 않습니다.** 20판 전부 기록합니다.

### 17 개인정보·비밀값 점검
배포된 번들 전체를 문자열로 훑습니다. 결과를 텍스트로 저장합니다.

```bash
grep -rniE "password|secret|token|api[_-]?key|@gmail|@naver|010-[0-9]{4}" site/
```

경보 데이터의 사용자명(`employee_07`, `intern_03`, `admin`)은 가상 값이므로 문제없습니다.
실명, 실제 이메일, 사번이 나오면 안 됩니다.

## 캡처하지 않는 것

- 개인 계정이 로그인된 브라우저 화면
- 북마크바, 다른 탭 제목
- 로컬 파일 경로가 보이는 터미널 (`C:\Users\<이름>\...`)
- `.env`나 토큰이 담긴 어떤 화면

터미널 캡처가 필요한 18번은 경로가 보이지 않도록 **명령과 결과 부분만** 잘라서 찍습니다.

## 진행 상태

| 단계 | 조건 | 상태 |
|---|---|---|
| 1차 (구현 완료 후) | 06, 07, 11, 12, 13, 14 | 대기 |
| 2차 (난이도 실험) | 15, 16 | 대기 |
| 3차 (배포 후) | 01~05, 08, 09, 10, 17, 18 | 대기 |

1차는 로컬 개발 서버에서 진행해도 됩니다. 다만 **01~05는 반드시 공개 주소에서** 다시 찍습니다. 과제 완료 기준이 "공개 주소에서 보인다"이기 때문입니다.
