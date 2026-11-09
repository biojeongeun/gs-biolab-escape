/**
 * 슬롯형 보안코드 입력줄 — 화면 최상단 중앙에 고정되는 미니멀 HUD.
 *
 *   보안코드 [ _ ] [ _ ] [ _ ]
 *
 * 평소에는 반투명하게 떠 있고, 슬롯 아래 점(•)이 "그 자리 숫자를 찾았다"를 표시한다
 * (숫자 자체는 장치 위 배지에 뜬다 — 입력줄이 답을 대신 채워 주지 않는다).
 * 출구 문(MapObject.codeLock)에서 E를 누르면 활성화되어 숫자 키 입력을 받는다.
 * 키패드 모달·버튼을 쓰지 않는 것이 이 모듈의 존재 이유다.
 */
import { Sfx } from "../audio/sfx";

export class CodeBar {
  readonly el: HTMLElement;
  private slots: HTMLElement[] = [];
  private active = false;

  constructor(host: HTMLElement, private n: number, label = "보안코드") {
    this.el = document.createElement("div");
    this.el.className = "codebar";
    this.el.dataset.testid = "codebar";
    const lab = document.createElement("span");
    lab.className = "codebar-label";
    lab.textContent = label;
    this.el.appendChild(lab);
    for (let i = 0; i < n; i++) {
      const s = document.createElement("span");
      s.className = "codebar-slot";
      s.dataset.testid = `codebar-slot-${i + 1}`;
      s.textContent = "_";
      this.slots.push(s);
      this.el.appendChild(s);
    }
    host.appendChild(this.el);
  }

  /** i번째(0-based) 자리의 숫자를 찾았는지 표시 */
  setFound(i: number, found: boolean): void {
    this.slots[i]?.classList.toggle("found", found);
  }

  isActive(): boolean {
    return this.active;
  }

  /** 문이 이미 열렸을 때 — 정답을 채운 채 초록으로 고정 */
  showSolved(code: string): void {
    this.slots.forEach((s, i) => (s.textContent = code[i] ?? "_"));
    this.el.classList.add("solved");
  }

  /**
   * 입력 모드 — 숫자 키로 채우고, 다 채우면 판정한다.
   * Backspace 지우기, Esc 취소. 정답이면 true, 오답·취소면 false.
   * onWrong은 오답마다 호출된다(3막: 좀비가 다가온다).
   */
  activate(code: string, onWrong?: () => void): Promise<boolean> {
    if (this.active) return Promise.resolve(false);
    this.active = true;
    this.el.classList.add("active");
    let typed = "";
    const paint = () =>
      this.slots.forEach((s, i) => {
        s.textContent = typed[i] ?? "_";
        s.classList.toggle("cursor", i === typed.length);
      });
    paint();

    return new Promise((resolve) => {
      const finish = (ok: boolean) => {
        window.removeEventListener("keydown", onKey, true);
        this.active = false;
        this.el.classList.remove("active");
        this.slots.forEach((s) => s.classList.remove("cursor"));
        if (!ok) this.slots.forEach((s) => (s.textContent = "_"));
        resolve(ok);
      };
      const onKey = (e: KeyboardEvent) => {
        // 입력 중에는 이동·상호작용 키가 게임으로 새지 않게 먼저 잡는다
        e.stopPropagation();
        e.preventDefault();
        if (e.repeat) return;
        if (e.key === "Escape") return finish(false);
        if (e.key === "Backspace") {
          typed = typed.slice(0, -1);
          paint();
          return;
        }
        if (!/^[0-9]$/.test(e.key) || typed.length >= this.n) return;
        typed += e.key;
        Sfx.select();
        paint();
        if (typed.length < this.n) return;
        if (typed === code) {
          this.el.classList.add("ok");
          Sfx.success();
          setTimeout(() => {
            this.el.classList.remove("ok");
            this.showSolved(code);
            finish(true);
          }, 700);
        } else {
          this.el.classList.add("wrong");
          Sfx.error();
          onWrong?.();
          setTimeout(() => {
            this.el.classList.remove("wrong");
            typed = "";
            paint();
          }, 650);
        }
      };
      window.addEventListener("keydown", onKey, true);
    });
  }
}
