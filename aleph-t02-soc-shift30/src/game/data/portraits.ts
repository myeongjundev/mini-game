/**
 * 캐릭터 초상 연결표. 파일 규격과 제작 경위는
 * `prompts/05_CHARACTER_PORTRAITS_HANDOFF.md`에 있다.
 *
 * 초상은 **정보의 출처와 사건 당사자를 빠르게 구분하는 장식**이다. 판정
 * 근거는 언제나 경보의 사실 행과 메모 본문이고, 초상이 사라져도 판단에
 * 필요한 것이 남아야 한다.
 *
 * 경보 데이터(`alerts.ts`)에 필드로 넣지 않고 여기 표로 둔다. 정답이 걸린
 * 데이터는 손대는 것 자체가 위험하고, id로 찾는 표가 더 작은 변경이다.
 */

/** 배포 base를 지켜야 한다. `/`로 시작하는 문자열을 쓰면 하위 경로에서 깨진다. */
export function portraitUrl(file: string): string {
  return `${import.meta.env.BASE_URL}${file}`
}

/**
 * 메모를 보낸 부서의 얼굴. `memos.ts`의 `from`과 짝이 맞아야 한다.
 * 보안팀은 메모가 둘이지만 보내는 사람은 하나다.
 */
export const PORTRAIT_BY_DEPARTMENT: Readonly<Record<string, string>> = {
  마케팅팀: 'marketing-manager-portrait-128.png',
  IT팀: 'it-support-portrait-128.png',
  보안팀: 'security-specialist-portrait-128.png',
  인프라팀: 'infra-engineer-portrait-128.png',
  인사팀: 'hr-manager-portrait-128.png',
}

/**
 * 경보에 얼굴이 붙는 사건 당사자.
 *
 * **정답이 한쪽으로 쏠리면 안 된다.** 인계서가 고른 둘(`priv-esc`,
 * `contractor-proddb`)은 모두 BLOCK이라 그대로 두면 "얼굴이 있으면 차단"이
 * 2/2로 맞는 규칙이 된다. 읽지 않고 이기는 길이 하나 더 생기는 것으로,
 * `docs/ALERT_DATASET.md`에 적어둔 심각도 누출과 같은 종류다.
 *
 * 그래서 ALLOW 쪽 둘을 함께 넣어 2:2로 맞춘다. 둘 다 사람이 벌인 일이라
 * 당사자 얼굴이 어색하지 않은 경보다. 균형은 `portraits.test.ts`가 지킨다.
 */
export const PORTRAIT_BY_ALERT: Readonly<Record<string, string>> = {
  // 승인 없이 관리자 그룹에 들어간 인턴
  'priv-esc': 'intern-03-portrait-128.png',
  // 역할에 없는 운영 DB를 연 외부 협력업체 담당자
  'contractor-proddb': 'external-contractor-portrait-128.png',
  // 심야 정기 백업을 돌린 인프라 엔지니어
  'backup-job': 'infra-engineer-portrait-128.png',
  // 행사로 트래픽을 끌어올린 마케팅 담당자
  'traffic-spike': 'marketing-manager-portrait-128.png',
}
