/**
 * 생명과학 연구소 퍼즐 공용 러너 — 단계(step) 목록을 받아 차례로 풀게 한다.
 *
 * 단계 종류 (전부 정답이 함수로 판정되는 결정적 구조 — autoplay.ts가 검산할 수 있다)
 *   choice    보기 하나 고르기 (누르는 즉시 판정)
 *   match     왼쪽 항목마다 이름표를 붙이기 (다 붙이면 판정)
 *   order     순서대로 누르기 (다 누르면 판정)
 *   sequence  염기 서열처럼 글자 칸 채우기 (다 채우면 판정)
 *
 * 오답이면 api.fail() → 그 단계만 초기화. 모든 단계를 통과하면 api.solve().
 * 텍스트는 퍼즐 자체의 문항이라 각 퍼즐 폴더의 puzzle.ts가 들고 있다
 * (대사·노트가 아니므로 story.md 대상이 아니다).
 */
import type { PuzzleApi } from "../../engine/puzzle-host/types";
import type { QuizStep } from "./types";
import "./lab-quiz.css";

export type { QuizStep };

export interface QuizConfig {
  /** 'lab' = STAGE 1 밝은 패널, 'dark' = STAGE 3 격리 구역 단말 */
  theme: "lab" | "dark";
  /** 패널 머리말 (장치 이름표) */
  device: string;
  steps: QuizStep[];
  testId: string;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

export function mountQuiz(api: PuzzleApi, cfg: QuizConfig): () => void {
  const root = el("div", `lq lq-${cfg.theme}`);
  root.dataset.testid = cfg.testId;
  api.root.appendChild(root);

  const head = el("div", "lq-head");
  const dev = el("span", "lq-device", cfg.device);
  const prog = el("span", "lq-progress");
  head.append(dev, prog);
  const stage = el("div", "lq-stage");
  root.append(head, stage);

  let idx = 0;
  let busy = false;
  const timers: ReturnType<typeof setTimeout>[] = [];

  const wrong = (box: HTMLElement, reset: () => void) => {
    busy = true;
    api.fail();
    box.classList.add("lq-wrong");
    timers.push(
      setTimeout(() => {
        box.classList.remove("lq-wrong");
        busy = false;
        reset();
      }, 650),
    );
  };
  const right = (box: HTMLElement) => {
    busy = true;
    box.classList.add("lq-right");
    timers.push(
      setTimeout(() => {
        busy = false;
        idx += 1;
        if (idx >= cfg.steps.length) api.solve();
        else render();
      }, 650),
    );
  };

  function render(): void {
    const step = cfg.steps[idx];
    prog.textContent = `${idx + 1} / ${cfg.steps.length}`;
    stage.replaceChildren();
    const box = el("div", "lq-box");
    box.dataset.testid = `lq-step-${idx + 1}`;
    box.appendChild(el("p", "lq-prompt", step.prompt));
    if (step.figure) {
      const fig = el("div", "lq-figure");
      fig.innerHTML = step.figure; // 퍼즐 폴더가 들고 있는 정적 SVG (사용자 입력 아님)
      box.appendChild(fig);
    }
    stage.appendChild(box);

    if (step.kind === "choice") {
      const grid = el("div", "lq-options");
      step.options.forEach((label, i) => {
        const b = el("button", "lq-chip", label);
        b.dataset.testid = `lq-opt-${i}`;
        b.addEventListener("click", () => {
          if (busy) return;
          b.classList.add("picked");
          if (i === step.answer) right(box);
          else wrong(box, () => b.classList.remove("picked"));
        });
        grid.appendChild(b);
      });
      box.appendChild(grid);
    }

    if (step.kind === "match") {
      const picks: (number | null)[] = step.left.map(() => null);
      const rows = el("div", "lq-rows");
      const slots: HTMLElement[] = [];
      step.left.forEach((text, r) => {
        const row = el("div", "lq-row");
        const slot = el("button", "lq-slot", "?");
        slot.dataset.testid = `lq-slot-${r}`;
        slot.addEventListener("click", () => {
          if (busy || picks[r] == null) return;
          picks[r] = null;
          paint();
        });
        slots.push(slot);
        row.append(el("span", "lq-row-text", text), slot);
        rows.appendChild(row);
      });
      const pool = el("div", "lq-options");
      const chips = step.options.map((label, i) => {
        const b = el("button", "lq-chip", label);
        b.dataset.testid = `lq-opt-${i}`;
        b.addEventListener("click", () => {
          if (busy || picks.includes(i)) return;
          const empty = picks.indexOf(null);
          if (empty < 0) return;
          picks[empty] = i;
          paint();
          if (!picks.includes(null)) {
            const ok = picks.every((p, k) => p === step.answer[k]);
            if (ok) right(box);
            else
              wrong(box, () => {
                picks.fill(null);
                paint();
              });
          }
        });
        pool.appendChild(b);
        return b;
      });
      const paint = () => {
        slots.forEach((s, r) => {
          s.textContent = picks[r] == null ? "?" : step.options[picks[r]!];
          s.classList.toggle("filled", picks[r] != null);
          s.classList.toggle("next", picks[r] == null && picks.indexOf(null) === r);
        });
        chips.forEach((c, i) => (c.disabled = picks.includes(i)));
      };
      paint();
      box.append(rows, el("p", "lq-tip", "이름표를 누르면 위에서부터 채워진다 · 붙인 칸을 누르면 뗀다"), pool);
    }

    if (step.kind === "order") {
      const seq: number[] = [];
      const list = el("div", "lq-options lq-order");
      const chips: HTMLButtonElement[] = [];
      step.display.forEach((itemIdx) => {
        const b = el("button", "lq-chip", step.items[itemIdx]);
        b.dataset.testid = `lq-item-${itemIdx}`;
        b.addEventListener("click", () => {
          if (busy) return;
          const at = seq.indexOf(itemIdx);
          if (at >= 0) {
            if (at === seq.length - 1) seq.pop(); // 마지막으로 누른 것만 취소
            paint();
            return;
          }
          seq.push(itemIdx);
          paint();
          if (seq.length === step.items.length) {
            if (seq.every((v, k) => v === k)) right(box);
            else
              wrong(box, () => {
                seq.length = 0;
                paint();
              });
          }
        });
        chips[itemIdx] = b;
        list.appendChild(b);
      });
      const paint = () =>
        chips.forEach((c, i) => {
          const at = seq.indexOf(i);
          c.dataset.order = at >= 0 ? String(at + 1) : "";
          c.classList.toggle("picked", at >= 0);
        });
      box.append(list, el("p", "lq-tip", "먼저 일어나는 것부터 차례로 누른다 · 마지막 것을 다시 누르면 취소"));
    }

    if (step.kind === "sequence") {
      let typed = "";
      const strand = el("div", "lq-strand");
      const cells = step.template.map((t, k) => {
        const col = el("div", "lq-pair");
        const top = el("span", "lq-base lq-base-given", t);
        const bond = el("span", "lq-bond", "┃");
        const bot = el("span", "lq-base lq-base-in", "?");
        bot.dataset.testid = `lq-cell-${k}`;
        col.append(top, bond, bot);
        strand.appendChild(col);
        return bot;
      });
      const keys = el("div", "lq-options lq-keys");
      for (const a of step.alphabet) {
        const b = el("button", `lq-chip lq-key lq-key-${a}`, a);
        b.dataset.testid = `lq-key-${a}`;
        b.addEventListener("click", () => {
          if (busy || typed.length >= step.template.length) return;
          typed += a;
          paint();
          if (typed.length === step.template.length) {
            if (typed === step.answer) right(box);
            else
              wrong(box, () => {
                typed = "";
                paint();
              });
          }
        });
        keys.appendChild(b);
      }
      const back = el("button", "lq-chip lq-key", "⌫");
      back.dataset.testid = "lq-key-back";
      back.addEventListener("click", () => {
        if (busy) return;
        typed = typed.slice(0, -1);
        paint();
      });
      keys.appendChild(back);
      const paint = () =>
        cells.forEach((c, k) => {
          c.textContent = typed[k] ?? "?";
          c.classList.toggle("filled", k < typed.length);
          c.classList.toggle("next", k === typed.length);
        });
      paint();
      box.append(strand, keys);
    }
  }

  render();
  return () => {
    timers.forEach(clearTimeout);
    root.remove();
  };
}
