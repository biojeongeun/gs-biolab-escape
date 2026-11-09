import type { QuizStep } from "../_shared/types";

/**
 * STAGE 3 (qz-hidden) · 뉴스 아카이브 ③ — 세계 첫 맞춤형 유전자 편집 치료
 * 용어·사실 출처: NEJM (Musunuru et al., 2025) 보도 — CHOP·Penn
 * 보안코드 3번 자리 = 1
 */
export const DIGIT = "1";

export const STEPS: QuizStep[] = [
  {
    "kind": "choice",
    "prompt": "[속보 아카이브] 2025년, 희귀 유전 질환(CPS1 결핍증)을 앓는 아기를 위해 그 아기의 돌연변이에 딱 맞춰 설계한 치료가 처음 성공했다. 쓰인 기술은?",
    "options": [
      "염기 편집 (유전자 가위 계열)",
      "항생제",
      "장기 이식",
      "수혈"
    ],
    "answer": 0
  },
  {
    "kind": "choice",
    "prompt": "치료 물질을 지질 나노입자에 담아 보낸 기관은? (CPS1은 요소를 만드는 과정에 쓰이는 효소다)",
    "options": [
      "이자",
      "간",
      "콩팥",
      "뇌"
    ],
    "answer": 1
  },
  {
    "kind": "choice",
    "prompt": "이 치료는 환자 몇 명을 위해 설계된 '맞춤형' 치료였나?",
    "options": [
      "1명",
      "10명",
      "100명",
      "모든 환자"
    ],
    "answer": 0
  }
];
