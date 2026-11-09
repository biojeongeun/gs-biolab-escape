import type { QuizStep } from "../_shared/types";

/**
 * STAGE 1 · DNA 분석기 — 통합과학1 '세포 내 정보의 흐름'
 * (DNA의 유전정보 → 전사 → RNA → 라이보솜에서 단백질 합성, 코돈). 보안코드 2번 자리 = 2
 * 용어는 2022 개정 [비상교육] 통합과학1 교과서 표기를 따른다 — 교과서는 '번역'이라는 말을
 * 쓰지 않고 "라이보솜에서 코돈에 따라 아미노산이 결합하여 단백질이 합성된다"고 적는다.
 * 염기 이름: 아데닌·구아닌·사이토신·타이민·유라실.
 */
export const DIGIT = "2";

export const STEPS: QuizStep[] = [
  {
    kind: "order",
    prompt: "유전정보는 어떤 순서로 흘러갈까요? 처음부터 차례로 눌러 주세요.",
    items: ["DNA의 유전정보", "전사 → RNA", "라이보솜에서 단백질 합성"],
    display: [2, 0, 1],
  },
  {
    kind: "sequence",
    prompt:
      "DNA 가닥을 전사해 RNA를 만들어 주세요. 짝은 아데닌(A)–유라실(U), 타이민(T)–아데닌(A), 구아닌(G)–사이토신(C), 사이토신(C)–구아닌(G)이에요. (RNA에는 타이민 대신 유라실이 있어요)",
    template: ["T", "A", "C", "G", "G", "C"],
    alphabet: ["A", "U", "G", "C"],
    answer: "AUGCCG",
  },
  {
    kind: "choice",
    prompt: "RNA에서 연속된 3개의 염기가 아미노산 하나를 지정하는 유전부호를 코돈이라고 해요. 방금 만든 AUGCCG는 아미노산 몇 개를 지정할까요?",
    options: ["1개", "2개", "3개", "6개"],
    answer: 1,
  },
];
