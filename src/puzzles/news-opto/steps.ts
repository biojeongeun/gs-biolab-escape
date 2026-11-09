import type { QuizStep } from "../_shared/types";

/**
 * STAGE 3 (qz-hidden) · 뉴스 아카이브 ① — 2026 노벨 생리의학상
 * 용어·사실 출처: nobelprize.org 2026 press release · STAT · Nature (2026-10)
 * 보안코드 1번 자리 = 3
 */
export const DIGIT = "3";

export const STEPS: QuizStep[] = [
  {
    "kind": "choice",
    "prompt": "[속보 아카이브] 2026년 노벨 생리의학상은 빛으로 살아 있는 뇌의 신경세포를 켜고 끄는 기술을 연 세 연구자에게 돌아갔다. 이 기술은?",
    "options": [
      "유전자 가위",
      "광유전학",
      "PCR",
      "백신"
    ],
    "answer": 1
  },
  {
    "kind": "choice",
    "prompt": "이 기술의 출발점인 '빛으로 여닫히는 이온 통로'는 빛을 향해 헤엄치는 어떤 생물에서 발견되었나?",
    "options": [
      "대장균",
      "효모",
      "녹조류(클라미도모나스)",
      "초파리"
    ],
    "answer": 2
  },
  {
    "kind": "choice",
    "prompt": "빛을 받아 이 통로가 열리면 양이온이 신경세포 안으로 들어온다. 이때 신경세포에서 일어나는 변화는?",
    "options": [
      "탈분극 → 활동전위 발생",
      "재분극만 일어남",
      "아무 변화 없음"
    ],
    "answer": 0
  }
];
