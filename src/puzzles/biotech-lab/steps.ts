import type { QuizStep } from "../_shared/types";

/**
 * STAGE 3 (qz-3) · 생명공학 실험대 — 치료제 후보 증폭
 * 용어·사실 출처: [생물의 유전(이준규)] DNA 중합효소연쇄반응(PCR)·제한효소·DNA 연결효소·크리스퍼 유전자 가위
 * 보안코드 3번 자리 = 2
 */
export const DIGIT = "2";

export const STEPS: QuizStep[] = [
  {
    "kind": "match",
    "prompt": "실험대 시약병의 라벨이 떨어졌다. 하는 일에 맞는 이름을 붙여라.",
    "left": [
      "특정 DNA를 짧은 시간에 대량으로 증폭한다",
      "특정 염기서열을 인식해 DNA를 자른다",
      "잘린 DNA 조각을 이어 붙인다"
    ],
    "options": [
      "DNA 연결효소",
      "제한효소",
      "DNA 중합효소연쇄반응(PCR)"
    ],
    "answer": [
      2,
      1,
      0
    ]
  },
  {
    "kind": "choice",
    "prompt": "치료제 후보 유전자 1분자로 PCR을 3회 반복하면, DNA는 이론상 몇 분자가 될까?",
    "options": [
      "3분자",
      "6분자",
      "8분자",
      "9분자"
    ],
    "answer": 2
  },
  {
    "kind": "choice",
    "prompt": "크리스퍼 유전자 가위는 원하는 위치의 DNA 이중나선을 자른다. 한 번 자를 때 끊기는 DNA 가닥은 몇 가닥인가?",
    "options": [
      "1가닥",
      "2가닥",
      "3가닥",
      "4가닥"
    ],
    "answer": 1
  }
];
