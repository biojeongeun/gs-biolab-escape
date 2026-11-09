import type { QuizStep } from "../_shared/types";

/**
 * STAGE 3 (qz-2) · 광합성 패널 — 엽록체 회로
 * 용어·사실 출처: [세포와 물질대사(이준규)] 광계 Ⅰ·광계 Ⅱ·물의 광분해·타이라코이드 막·스트로마·명반응·탄소 고정 반응·NADPH
 * 보안코드 3번 자리 = 2
 */
export const DIGIT = "2";

export const STEPS: QuizStep[] = [
  {
    "kind": "order",
    "prompt": "산소 발생 패널을 다시 돌리려면 광합성 과정을 순서대로 연결해야 한다.",
    "items": [
      "광계가 빛에너지 흡수",
      "물의 광분해 → 산소 발생",
      "ATP·NADPH 생성 (타이라코이드 막)",
      "탄소 고정 반응 (스트로마)"
    ],
    "display": [
      3,
      1,
      0,
      2
    ]
  },
  {
    "kind": "choice",
    "prompt": "명반응에서 산소가 발생하는 원인은?",
    "options": [
      "이산화 탄소의 분해",
      "물의 광분해",
      "포도당의 분해",
      "피루브산의 산화"
    ],
    "answer": 1
  },
  {
    "kind": "choice",
    "prompt": "타이라코이드 막에서 빛에너지를 흡수하는 광계는 몇 종류인가?",
    "options": [
      "1종류",
      "2종류",
      "3종류",
      "4종류"
    ],
    "answer": 1
  }
];
