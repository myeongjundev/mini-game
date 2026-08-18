# Architecture — Static React Frontend

Spring Boot를 포함한 백엔드는 **T02 범위 밖**이며 이 프로젝트에서 구현하지 않는다.

## 1. Project Structure

```text
aleph-t02-soc-shift30/
├─ docs/                    프로젝트 명세와 검증 문서
├─ prompts/                 작업 시작 프롬프트
├─ public/                  정적 공개 파일
├─ src/
│  ├─ components/           화면 컴포넌트
│  ├─ game/
│  │  ├─ data/              경보와 도트 아이콘 데이터
│  │  ├─ engine/            React와 분리된 순수 게임 규칙
│  │  ├─ hooks/             게임 루프와 브라우저 입력
│  │  ├─ config.ts          난이도 상수의 단일 소스
│  │  └─ types.ts           공용 게임 타입
│  ├─ services/             localStorage 접근과 복구
│  ├─ styles/               디자인 토큰과 전역 스타일
│  └─ utils/                표시 형식 유틸리티
├─ index.html
├─ package.json
└─ vite.config.ts
```

빌드 결과는 프로젝트 루트 밖의 `../site/`에 생성하며 직접 편집하지 않는다.

## 2. Frontend Responsibility

정적 프론트엔드가 다음을 모두 담당한다.

- 게임 상태 전이와 타이머
- 키보드·마우스 입력과 중복 방지
- 경보 출제와 즉시 판정
- 점수·라이프·콤보·결과 통계
- Mute와 Reduce Motion
- 최고 점수와 접근성 설정의 localStorage 저장
- 포커스 이탈 일시정지와 정리 코드

## 3. Dependency Direction

`UI → game hooks → pure game engine`

- UI는 렌더링과 사용자 입력 전달을 담당한다.
- hooks는 브라우저 생명주기와 게임 엔진을 연결한다.
- engine은 React를 import하지 않고 입력 상태에서 새 상태를 계산한다.
- services는 브라우저 저장소 경계를 캡슐화한다.

## 4. Game Engine

`resolveAlert`, `applyVerdict`, `tick`과 출제 큐는 독립적으로 테스트할 수 있어야 한다.
난이도에 영향을 주는 값은 `src/game/config.ts`에서만 관리한다.

## 5. Persistence

현재 판 상태는 저장하지 않는다. 최고 점수, Mute, Reduce Motion만 localStorage에 저장하며 손상된 값은 필드 단위로 복구한다.

## 6. Deployment

- `vite build`가 정적 파일을 `../site/`에 생성한다.
- Vite base는 GitHub Pages 경로인 `/mini-game/`을 사용한다.
- 배포 결과에는 정적 HTML, CSS, JavaScript와 공개 애셋만 포함한다.
- 배포 산출물은 별도 런타임 설정 없이 브라우저에서 실행되어야 한다.
