import type { QuizStep } from "../_shared/types";

/**
 * STAGE 3 · 격리 유전 분석기 — 생물의 유전 '상염색체 유전과 성염색체 유전'(가계도 조사, 반성유전).
 * 보안코드 2번 자리 = 8 (확률 1/8)
 * 용어는 [생물의 유전(이준규)] 교과서를 따른다: 가계도 · 유전형질 · 발현 · 대립유전자 · 보인자 ·
 * X염색체(붙여 씀) · 상염색체 우성/열성 유전 · 성염색체 우성/열성 유전 · 반성유전.
 */
export const DIGIT = "8";

/** 가계도 — 정적 SVG. 색은 currentColor(패널 글자색)만 쓴다 */
const PEDIGREE = `<svg viewBox="0 0 340 214" width="340" height="214" fill="none" stroke="currentColor" stroke-width="2.5" font-family="'Pretendard','Noto Sans KR',sans-serif" font-size="12.5">
  <rect x="70" y="20" width="30" height="30"/>
  <circle cx="235" cy="35" r="15"/>
  <line x1="100" y1="35" x2="220" y2="35"/>
  <line x1="160" y1="35" x2="160" y2="80"/>
  <line x1="95" y1="80" x2="225" y2="80"/>
  <line x1="95" y1="80" x2="95" y2="110"/>
  <line x1="225" y1="80" x2="225" y2="110"/>
  <rect x="80" y="110" width="30" height="30" fill="currentColor"/>
  <circle cx="225" cy="125" r="15"/>
  <g stroke="none" fill="currentColor">
    <text x="58" y="15">Ⅰ-1</text><text x="223" y="15">Ⅰ-2</text>
    <text x="70" y="165">Ⅱ-1</text><text x="212" y="165">Ⅱ-2</text>
    <text x="4" y="188">□ 정상 남자  ○ 정상 여자  ■ 유전형질이 발현된 남자</text>
    <text x="4" y="207">Ⅰ-1은 유전자 검사 결과 이 형질의 대립유전자를 갖지 않는다</text>
  </g>
</svg>`;

export const STEPS: QuizStep[] = [
  {
    kind: "choice",
    prompt: "격리 구역 생존자 가족의 가계도다. 이 유전형질의 유전 방식은?",
    figure: PEDIGREE,
    options: ["상염색체 우성 유전", "상염색체 열성 유전", "성염색체(X염색체) 우성 유전", "성염색체(X염색체) 열성 유전"],
    answer: 3,
  },
  {
    kind: "choice",
    prompt: "Ⅱ-2가 이 형질이 없는 남자와 결혼해 아이를 낳는다. 이 아이에게서 이 형질이 발현될 확률은?",
    figure: PEDIGREE,
    options: ["1/2", "1/4", "1/8", "1/16"],
    answer: 2,
  },
];
