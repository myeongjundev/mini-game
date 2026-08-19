import type { Memo } from '../types'

/**
 * 근무 중 올라오는 사내 공지. 규칙은 `docs/GAME_SPEC.md` 13절이다.
 *
 * 각 메모는 뒤에 나올 경보 하나의 판단 근거를 준다. 큐가 티어별 봉지라
 * 그 티어의 경보는 해당 구간에 반드시 나오므로, 메모를 연결된 경보의
 * 티어가 시작되기 전에 띄우면 짝이 자동으로 맞는다.
 *
 * **정답이 ALLOW인 것 3개, BLOCK인 것 3개를 유지한다.** 한쪽으로 기울면
 * "메모를 봤으면 통과"라는 새 정답표가 생긴다. 심각도를 카드에서 제거한
 * 것과 같은 이유다. `memos.test.ts`가 이 균형을 검사한다.
 */
export const MEMOS = [
  {
    id: 'promo-night',
    from: '마케팅팀',
    time: '03:02',
    body: '심야 판촉 진행 중. 고객 트래픽이 평소의 3배까지 오를 수 있습니다.',
    alertId: 'traffic-spike',
  },
  {
    id: 'laptop-swap',
    from: 'IT팀',
    time: '02:58',
    body: 'employee_07 노트북 교체 완료. 신규 기기 첫 로그인이 곧 잡힙니다.',
    alertId: 'known-user-new-device',
  },
  {
    id: 'no-new-domain',
    from: '보안팀',
    time: '03:05',
    body: '이번 주 신규 도메인 등록 요청은 없었습니다.',
    alertId: 'dns-tunnel',
  },
  {
    id: 'nightly-backup',
    from: '인프라팀',
    time: '02:47',
    body: '02:00 야간 정기 백업 진행 중. 백업 서버로 대용량 전송이 잡힙니다.',
    alertId: 'backup-job',
  },
  {
    id: 'contractor-scope',
    from: '보안팀',
    time: '03:10',
    body: '계약직 계정 권한에 운영 DB는 포함되지 않습니다.',
    alertId: 'contractor-proddb',
  },
  {
    id: 'intern-onboarding',
    from: '인사팀',
    time: '03:12',
    body: 'intern_03은 온보딩 기간. 권한 변경 요청은 접수된 적 없습니다.',
    alertId: 'priv-esc',
  },
] satisfies readonly Memo[]
