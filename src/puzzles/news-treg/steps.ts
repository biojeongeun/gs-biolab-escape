import type { QuizStep } from "../_shared/types";

/**
 * STAGE 3 (qz-hidden) · 뉴스 아카이브 ② — 2025 노벨 생리의학상
 * 용어·사실 출처: nobelprize.org 2025 press release
 * 보안코드 2번 자리 = 2
 */
export const DIGIT = "2";

export const STEPS: QuizStep[] = [
  {
    "kind": "choice",
    "prompt": "[속보 아카이브] 2025년 노벨 생리의학상은 면역계가 자기 몸을 공격하지 못하게 억제하는 세포를 밝힌 연구에 돌아갔다. 이 세포는?",
    "options": [
      "형질세포",
      "세포독성 T림프구",
      "조절 T세포",
      "대식세포"
    ],
    "answer": 2
  },
  {
    "kind": "choice",
    "prompt": "수상자들이 그 세포의 발달을 좌우한다고 밝힌 핵심 유전자는?",
    "options": [
      "Foxp3",
      "BRCA1",
      "p53",
      "CFTR"
    ],
    "answer": 0
  },
  {
    "kind": "choice",
    "prompt": "백신으로 만들어지는 항체(IgG) 한 분자에는 항원 결합 부위가 몇 개 있는가?",
    "options": [
      "1개",
      "2개",
      "3개",
      "4개"
    ],
    "answer": 1
  }
];
