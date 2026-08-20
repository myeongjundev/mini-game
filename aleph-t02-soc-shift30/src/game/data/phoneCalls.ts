import type { Action } from '../types'

/**
 * 상사의 전화 대사. 규칙은 `docs/GAME_SPEC.md` 14절.
 *
 * 지시는 "통과시켜"(ALLOW)와 "막아"(BLOCK) 둘뿐이다. 지목한 경보의 정답과
 * 같으면 참, 다르면 거짓이다. 어느 쪽을 고를지는 시드 난수가 1:1로 정하므로
 * 여기에는 **두 지시의 대사가 모두** 있어야 한다.
 *
 * 거짓 대사도 그럴듯해야 한다. 다만 그 카드에는 반드시 반증이 있다(14.4).
 * 반증은 각 경보의 `decisiveFact`이고, 대사는 그것을 건드리지 않는다.
 * 상사는 권한을 말할 뿐 사실을 바꾸지 못한다.
 */
export const PHONE_CALLER = '관제 팀장'

export const PHONE_MESSAGES: Readonly<
  Record<string, Readonly<Record<Action, string>>>
> = {
  // 반증: FAILED LOGIN
  'admin-breach': {
    ALLOW: '관리자 계정 그거 내가 스크립트 돌리는 중이야. 통과시켜.',
    BLOCK: '관리자 계정 건은 막아. 확인된 작업 없어.',
  },
  // 반증: ACTION
  'priv-esc': {
    ALLOW: '권한 올라간 건 내가 승인했어. 통과시켜.',
    BLOCK: '권한 변경 건은 막아. 올라온 요청이 없어.',
  },
  // 반증: RESOURCE
  'contractor-proddb': {
    ALLOW: '협력업체 접근 건, 급해서 내가 열어줬어. 통과시켜.',
    BLOCK: '협력업체 접근 건은 막아. 그쪽 범위가 아니야.',
  },
  // 반증: DESTINATION
  exfil: {
    ALLOW: '대용량 전송 건은 예정된 이관이야. 통과시켜.',
    BLOCK: '대용량 전송 건은 막아. 나가는 주소가 안 맞아.',
  },
  // 반증: DESTINATION
  'backup-job': {
    ALLOW: '심야 전송 건은 정기 백업이야. 통과시켜.',
    BLOCK: '심야 전송 건은 일단 막아. 지금 확인이 안 돼.',
  },
}
