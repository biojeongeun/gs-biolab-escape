import type { QuizStep } from "../_shared/types";

/**
 * STAGE 3 (qz-3) · 유전정보 해독기 — 복제와 번역
 * 용어·사실 출처: [생물의 유전(이준규)] 반보존적 복제·보존적 복제·분산적 복제·번역·개시·신장·종결·코돈
 * 보안코드 1번 자리 = 4
 */
export const DIGIT = "4";

export const STEPS: QuizStep[] = [
  {
    "kind": "choice",
    "prompt": "DNA가 복제될 때 원래 두 가닥이 각각 주형이 되어, 새 DNA마다 원래 가닥 하나와 새 가닥 하나를 갖는 방식은?",
    "options": [
      "보존적 복제",
      "반보존적 복제",
      "분산적 복제"
    ],
    "answer": 1
  },
  {
    "kind": "order",
    "prompt": "라이보솜 라인의 번역(단백질합성) 단계를 순서대로 연결하라.",
    "items": [
      "개시",
      "신장",
      "종결"
    ],
    "display": [
      1,
      2,
      0
    ]
  },
  {
    "kind": "choice",
    "prompt": "해독기에 걸린 mRNA의 염기 12개가 모두 코돈으로 번역된다면, 폴리펩타이드에는 아미노산이 몇 개 연결되는가?",
    "options": [
      "3개",
      "4개",
      "12개",
      "36개"
    ],
    "answer": 1
  }
];
