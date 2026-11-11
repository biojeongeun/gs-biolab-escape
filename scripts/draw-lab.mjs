#!/usr/bin/env node
/**
 * 생명과학 연구소 방 배경 + 장치 스프라이트를 **코드로 그린다** (SVG → PNG, resvg).
 *
 * 왜 코드인가: 무료 이미지 생성기(Pollinations)로 뽑은 방은 워터마크·흐린 3D·배치 무시로
 * 쓸 수 없었다(2026-11-06 실측). 코드로 그리면 벽 스크린·관찰창·격리 철문의 위치가
 * 타일 좌표로 정확히 정해지고, 히트박스(blocks)·상호작용 지점이 그림과 어긋나지 않는다.
 * 나중에 생성 이미지로 교체하려면 같은 파일명으로 assets-src/rooms/ 에 넣고
 * 맵의 background 캘리브레이션만 다시 잡으면 된다.
 *
 * 산출물
 *   assets-src/rooms/room-lab.png         STAGE 1 — 평화로운 도시의 연구소 (밝음)
 *   assets-src/rooms/room-quarantine.png  STAGE 3 — 아포칼립스 도시 격리 구역 (어두움)
 *   assets-src/gen/dev-*.png              조사 가능한 장치 스프라이트 (asset-scale 2)
 *
 * 좌표계: 월드 px (타일 128×64, 타일 (0,0) 중심 = 원점). 그림은 절반 해상도로 래스터해
 * 게임에서 2배(nearest)로 키운다 → 픽셀아트 질감. 방 배경의 offset/scale은 콘솔에 찍힌다.
 *
 * 사용: node scripts/draw-lab.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tokens = JSON.parse(readFileSync(join(root, "design-tokens.json"), "utf8"));
const C = tokens.color;
const TW = tokens.tile.w / 2; // 64
const TH = tokens.tile.h / 2; // 32
const RES = 0.5; // 래스터 해상도 (게임 표시 배율 = 1/RES)

export const N = 12; // 방 한 변 타일 수 (맵 cols/rows와 동기)
/** 방 밖으로 이어 그리는 복도 칸 수 — 21:9 울트라와이드까지 양옆이 비지 않을 만큼 */
const WIDE = 13;
const WH = 380; // 벽 높이 (월드 px) — 캐릭터 250px 대비 1.5배

const iso = (x, y, z = 0) => [(x - y) * TW, (x + y) * TH - z];
const pts = (arr) => arr.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
const poly = (arr, fill, extra = "") => `<polygon points="${pts(arr)}" fill="${fill}" ${extra}/>`;

/** 색 밝기 조절 (#rrggbb, k>1 밝게) */
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
  const r = ch((n >> 16) & 255), g = ch((n >> 8) & 255), b = ch(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/** 아이소 상자 — 바닥 사각형 [x0,x1]×[y0,y1] (타일), 높이 h(px), 바닥 높이 z0 */
function box(x0, y0, x1, y1, h, top, z0 = 0, opts = {}) {
  const left = opts.left ?? shade(top, 0.78); // 남서면 (x=x0..x1, y=y1)
  const right = opts.right ?? shade(top, 0.62); // 남동면 (x=x1, y=y0..y1)
  const z1 = z0 + h;
  const stroke = opts.stroke ? `stroke="${opts.stroke}" stroke-width="${opts.sw ?? 1.5}" stroke-linejoin="round"` : "";
  return [
    poly([iso(x0, y1, z0), iso(x1, y1, z0), iso(x1, y1, z1), iso(x0, y1, z1)], left, stroke),
    poly([iso(x1, y0, z0), iso(x1, y1, z0), iso(x1, y1, z1), iso(x1, y0, z1)], right, stroke),
    poly([iso(x0, y0, z1), iso(x1, y0, z1), iso(x1, y1, z1), iso(x0, y1, z1)], top, stroke),
  ].join("");
}

/** 원기둥 (아이소 타원) — 중심 (x,y) 타일, 반지름 r(타일), 높이 h */
function cylinder(x, y, r, h, body, z0 = 0, opts = {}) {
  const [cx, cyb] = iso(x, y, z0);
  const [, cyt] = iso(x, y, z0 + h);
  const rx = r * TW * 1.41;
  const ry = r * TH * 1.41;
  const topFill = opts.top ?? shade(body, 1.15);
  const op = opts.opacity != null ? `opacity="${opts.opacity}"` : "";
  return `<g ${op}>
    <path d="M${cx - rx},${cyb} L${cx - rx},${cyt} A${rx},${ry} 0 0 1 ${cx + rx},${cyt} L${cx + rx},${cyb} A${rx},${ry} 0 0 1 ${cx - rx},${cyb} Z" fill="${body}"/>
    <ellipse cx="${cx}" cy="${cyt}" rx="${rx}" ry="${ry}" fill="${topFill}"/>
  </g>`;
}

/** 벽면 셰어 변환 — 왼벽(x=-0.5): u가 +y 방향, 오른벽(y=-0.5): u가 +x 방향. u 1타일 = 64 로컬px */
function wallG(side, at, zTop, inner) {
  const [ex, ey] = side === "L" ? iso(-0.5, at, zTop) : iso(at, -0.5, zTop);
  const a = side === "L" ? -1 : 1;
  return `<g transform="matrix(${a},0.5,0,1,${ex.toFixed(1)},${ey.toFixed(1)})">${inner}</g>`;
}

// ───────────────────────────── 방 배경 ─────────────────────────────

/**
 * STAGE 3 구역별 연구소 — 같은 벽·같은 충돌 자리에 구역 특색만 바꿔 그린다.
 *   light   비상등·바닥 물든 빛 색      screen  왼벽 스크린 내용
 *   sign    왼벽 앞 연구팀 간판           props   벽가·막힌 칸 위 소품 (blocks 안쪽에만 둔다)
 */
const ZONES = {
  // 3-1 생명 현상 연구팀 — 신경·항상성·면역: 병실 같은 연구실, 붉은 비상등, 신경세포 모식도와 심전도
  "qz-1": {
    light: () => C["danger"],
    sign: "생명 현상 연구팀",
    screen: (W, H, g) => {
      const s = [];
      // 신경세포: 세포체 + 가지돌기 + 말이집 축삭돌기(랑비에결절) + 축삭돌기 말단
      const cx = 70, cy = H * 0.42;
      s.push(`<circle cx="${cx}" cy="${cy}" r="22" fill="${C["spectrum-violet"]}" fill-opacity="0.5" stroke="${C["screen-bright"]}" stroke-width="2"/>`);
      for (const a of [2.2, 2.8, 3.5, 4.1, 1.6]) s.push(`<path d="M${cx},${cy} l${Math.cos(a) * 40},${Math.sin(a) * 40} l${Math.cos(a + 0.5) * 18},${Math.sin(a + 0.5) * 18}" stroke="${g}" stroke-width="3" fill="none"/>`);
      const ax0 = cx + 22, ax1 = W * 0.72;
      s.push(`<line x1="${ax0}" y1="${cy}" x2="${ax1}" y2="${cy}" stroke="${g}" stroke-width="3"/>`);
      for (let x = ax0 + 12; x < ax1 - 30; x += 46) s.push(`<rect x="${x}" y="${cy - 9}" width="34" height="18" rx="9" fill="${C["hologram"]}" fill-opacity="0.55" stroke="${g}" stroke-width="1.5"/>`);
      for (const dy of [-16, 0, 16]) s.push(`<line x1="${ax1}" y1="${cy}" x2="${ax1 + 18}" y2="${cy + dy}" stroke="${g}" stroke-width="2.5"/><circle cx="${ax1 + 20}" cy="${cy + dy}" r="4" fill="${C["toxic"]}"/>`);
      // 활동전위 펄스
      s.push(`<circle cx="${ax0 + 104}" cy="${cy}" r="7" fill="${C["danger"]}"/><circle cx="${ax0 + 104}" cy="${cy}" r="14" fill="${C["danger"]}" opacity="0.3"/>`);
      // 심전도 — 화면 아래 전체
      let ecg = "";
      for (let x = 8; x < W * 0.72; x += 4) {
        const ph = x % 90;
        const y = H - 34 + (ph > 40 && ph < 46 ? -34 : ph >= 46 && ph < 50 ? 18 : ph > 56 && ph < 66 ? -6 : 0);
        ecg += `${x === 8 ? "M" : "L"}${x},${y} `;
      }
      s.push(`<path d="${ecg}" stroke="${C["danger"]}" stroke-width="2.5" fill="none"/>`);
      return s.join("");
    },
    props: () => {
      const o = [];
      // 왼벽 앞: 이동식 침대 (흰 시트·베개)
      o.push(box(-0.4, 8.4, 0.6, 11.2, 46, shade(C["steel"], 0.7), 0));
      o.push(box(-0.35, 8.45, 0.55, 11.15, 14, shade(C["screen-bright"], 0.55), 46));
      o.push(box(-0.25, 10.4, 0.45, 11.0, 12, shade(C["white"], 0.6), 60));
      // 넘어진 수액 걸이 + 바구니 (상자 자리)
      o.push(box(0.7, 10.1, 1.5, 10.9, 24, shade(C["steel-dark"], 0.9), 0));
      o.push(cylinder(1.1, 10.5, 0.12, 18, shade(C["hologram"], 0.6), 24, { opacity: 0.8 }));
      // 바리케이드: 의약품 상자 더미 (적십자 대신 흰 띠)
      o.push(box(8.3, -0.45, 9.0, 0.35, 110, shade(C["white"], 0.45), 0));
      o.push(box(8.35, -0.4, 8.95, 0.3, 60, shade(C["white"], 0.55), 110));
      o.push(box(8.3, -0.45, 9.0, 0.35, 10, shade(C["danger"], 0.6), 60));
      return o.join("");
    },
  },
  // 3-2 생명 에너지 연구팀 — 세포호흡·효소·광합성: 배관과 발전 설비, 호박색 경고등, 식물 재배대
  "qz-2": {
    light: () => C["warn"],
    sign: "생명 에너지 연구팀",
    screen: (W, H, g) => {
      const s = [];
      // 마이토콘드리아 (왼쪽) — 바깥막 + 주름진 내막(크리스타)
      const mx = W * 0.24, my = H * 0.42;
      s.push(`<ellipse cx="${mx}" cy="${my}" rx="80" ry="40" fill="${C["fire"]}" fill-opacity="0.25" stroke="${C["fire"]}" stroke-width="3"/>`);
      let cr = `M${mx - 66},${my}`;
      for (let k = 0; k < 8; k++) cr += ` q8,${k % 2 ? 30 : -30} 16,0`;
      s.push(`<path d="${cr}" stroke="${C["warn"]}" stroke-width="2.5" fill="none"/>`);
      // 엽록체 (가운데) — 타이라코이드 더미
      const px = W * 0.56, py = H * 0.42;
      s.push(`<ellipse cx="${px}" cy="${py}" rx="70" ry="38" fill="${C["success"]}" fill-opacity="0.2" stroke="${C["toxic"]}" stroke-width="3"/>`);
      for (const dx of [-38, -10, 18, 44]) for (let k = 0; k < 4; k++) s.push(`<rect x="${px + dx - 9}" y="${py - 14 + k * 7}" width="18" height="5" rx="2" fill="${C["toxic"]}" opacity="0.8"/>`);
      // ATP 배터리 칸 (아래) — 거의 비었다
      for (let k = 0; k < 10; k++) s.push(`<rect x="${20 + k * 26}" y="${H - 46}" width="20" height="26" rx="3" fill="${k < 2 ? C["danger"] : C["screen-bright"]}" opacity="${k < 2 ? 0.9 : 0.12}"/>`);
      // 왼벽은 좌우가 뒤집혀 그려지므로 글자만 다시 뒤집는다
      s.push(`<text transform="translate(${20 + 10 * 26 + 8},${H - 26}) scale(-1,1)" text-anchor="end" font-family="Consolas, monospace" font-weight="700" font-size="18" fill="${C["danger"]}">ATP LOW</text>`);
      return s.join("");
    },
    props: () => {
      const o = [];
      // 왼벽 앞: 식물 재배대 (흙판 + 잎)
      o.push(box(-0.4, 8.4, 0.6, 11.2, 64, shade(C["steel"], 0.65), 0));
      o.push(box(-0.35, 8.45, 0.55, 11.15, 8, shade(C["fire"], 0.35), 64));
      for (const fy of [8.8, 9.4, 10.0, 10.6]) {
        const [lx, ly] = iso(0.1, fy, 86);
        o.push(`<ellipse cx="${lx}" cy="${ly}" rx="18" ry="12" fill="${shade(C["success"], 0.6)}"/><ellipse cx="${lx - 6}" cy="${ly - 8}" rx="10" ry="8" fill="${shade(C["toxic"], 0.55)}"/>`);
      }
      // 꺼진 재배등 막대
      o.push(box(-0.4, 8.4, -0.2, 11.2, 6, shade(C["warn"], 0.5), 190));
      // 넘어진 가스통 (상자 자리)
      o.push(cylinder(1.1, 10.5, 0.32, 40, shade(C["warn"], 0.5), 0));
      // 바리케이드: 발전 배터리 캐비닛 (해저드 띠)
      o.push(box(8.3, -0.45, 9.0, 0.35, 190, shade(C["steel-dark"], 1.1), 0));
      o.push(box(8.3, -0.45, 9.0, 0.35, 14, C["warn"], 120));
      // 벽 위 배관 두 줄 (왼벽·오른벽 상단)
      for (const z of [345, 360]) {
        o.push(`<polyline points="${pts([iso(-0.45, 0, z), iso(-0.45, N - 0.6, z)])}" stroke="${shade(C["steel"], 0.6)}" stroke-width="9"/>`);
        o.push(`<polyline points="${pts([iso(0, -0.45, z), iso(N - 0.6, -0.45, z)])}" stroke="${shade(C["steel"], 0.7)}" stroke-width="9"/>`);
      }
      return o.join("");
    },
  },
  // 3-3 유전자 분석 연구팀 — DNA·가계도·생명공학: 서버랙과 시퀀서, 차가운 보랏빛 비상등
  "qz-3": {
    light: () => C["spectrum-violet"],
    sign: "유전자 분석 연구팀",
    screen: (W, H, g) => {
      const s = [];
      // 큰 이중나선 (가로)
      let s1 = "", s2 = "";
      for (let x = 10; x <= W * 0.6; x += 3) {
        const a = Math.sin(x / 18) * 30;
        s1 += `${x === 10 ? "M" : "L"}${x},${H * 0.3 + a} `;
        s2 += `${x === 10 ? "M" : "L"}${x},${H * 0.3 - a} `;
        if (x % 15 === 10) s.push(`<line x1="${x}" y1="${H * 0.3 + a}" x2="${x}" y2="${H * 0.3 - a}" stroke="${[C["success"], C["spectrum-red"], C["warn"], C["spectrum-cyan"]][(x / 15) % 4 | 0]}" stroke-width="3" opacity="0.85"/>`);
      }
      s.push(`<path d="${s1}" stroke="${g}" stroke-width="4" fill="none"/><path d="${s2}" stroke="${C["hologram"]}" stroke-width="4" fill="none"/>`);
      // 전기 영동 레인 (아래 왼쪽)
      for (let l = 0; l < 6; l++) {
        s.push(`<rect x="${16 + l * 34}" y="${H * 0.56}" width="24" height="${H * 0.38}" fill="${C["bg-void"]}" opacity="0.5"/>`);
        for (let b = 0; b < 4; b++) s.push(`<rect x="${18 + l * 34}" y="${H * 0.58 + ((l * 13 + b * 29) % 70)}" width="20" height="4" fill="${C["spectrum-cyan"]}" opacity="0.85"/>`);
      }
      // 염색체 X자 (오른쪽 아래)
      for (const [qx, qy] of [[W * 0.45, H * 0.72], [W * 0.55, H * 0.72]]) s.push(`<g stroke="${C["spectrum-violet"]}" stroke-width="7" stroke-linecap="round"><line x1="${qx - 10}" y1="${qy - 22}" x2="${qx + 10}" y2="${qy + 22}"/><line x1="${qx + 10}" y1="${qy - 22}" x2="${qx - 10}" y2="${qy + 22}"/></g>`);
      return s.join("");
    },
    props: () => {
      const o = [];
      // 왼벽 앞: 시퀀서 + 시험관 랙
      o.push(box(-0.4, 8.4, 0.6, 11.2, 70, shade(C["steel"], 0.6), 0));
      o.push(box(-0.3, 8.6, 0.5, 9.7, 50, shade(C["steel-dark"], 1.2), 70));
      for (const fy of [10.0, 10.25, 10.5, 10.75]) o.push(cylinder(0.1, fy, 0.05, 30, shade(C["spectrum-cyan"], 0.7), 70, { opacity: 0.85 }));
      // 쓰러진 캐비닛 (상자 자리)
      o.push(box(0.7, 10.1, 1.5, 10.9, 30, shade(C["spectrum-violet"], 0.35), 0));
      // 바리케이드 자리: 서버랙 (깜빡이는 LED 줄)
      o.push(box(8.3, -0.45, 9.0, 0.35, 230, shade(C["bg-void"], 1.6), 0));
      for (let k = 0; k < 9; k++) {
        const [lx, ly] = iso(8.6, 0.36, 30 + k * 22);
        o.push(`<rect x="${lx - 14}" y="${ly}" width="28" height="4" fill="${k % 3 ? C["spectrum-cyan"] : C["toxic"]}" opacity="0.85"/>`);
      }
      return o.join("");
    },
  },
};

function room(theme, zone = null) {
  const dark = theme === "quarantine";
  const Z = zone ? ZONES[zone] : null;
  const P = dark
    ? { wallL: C["qz-wall-shade"], wallR: C["qz-wall"], fa: C["qz-floor-a"], fb: C["qz-floor-b"], trim: C["qz-trim"], grout: shade(C["qz-floor-b"], 0.8) }
    : { wallL: C["lab-wall-shade"], wallR: C["lab-wall"], fa: C["lab-floor-a"], fb: C["lab-floor-b"], trim: C["lab-trim"], grout: shade(C["lab-floor-b"], 0.93) };
  const out = [];
  const defs = [];
  // 와이드 화면용 — 바닥과 뒷벽이 방 밖 복도로 L칸까지 이어진다. 플레이 구역(N×N)은 그대로이고
  // 바깥은 어둡게 눌러 '복도'로 보이게 한다. 카메라는 frame(N×N 방)에 맞춘다.
  const L = N + WIDE;

  // 천장·건물 너머 — 그림 전체를 먼저 칠해 둔다 (와이드 화면 위쪽 귀퉁이가 비지 않게)
  {
    const pad = 60;
    const x0 = -L * TW - 0.5 * TW - pad, x1 = L * TW + 0.5 * TW + pad;
    const y0 = -TH - WH - 0.35 * 2 * TH - pad - 40, y1 = (2 * L - 1) * TH + pad;
    const ceil = dark ? shade(C["bg-void"], 0.9) : shade(P.wallL, 0.78);
    out.push(`<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="${ceil}"/>`);
    // 천장 철골 보 — 벽과 나란한 줄 몇 개
    for (let k = 0; k < 6; k++) {
      const z = WH + 60 + k * 70;
      out.push(`<polyline points="${pts([iso(-0.5 - k * 0.6, L - 0.5, z), iso(-0.5 - k * 0.6, -0.5 - k * 0.6, z), iso(L - 0.5, -0.5 - k * 0.6, z)])}" stroke="${shade(dark ? C["steel-dark"] : P.trim, dark ? 0.8 : 0.7)}" stroke-width="10" fill="none" opacity="0.5"/>`);
    }
  }

  // 바닥 타일 (방 밖 복도까지)
  for (let i = 0; i < L; i++)
    for (let j = 0; j < L; j++) {
      const f = (i + j) % 2 ? P.fa : P.fb;
      out.push(poly([iso(i - 0.5, j - 0.5), iso(i + 0.5, j - 0.5), iso(i + 0.5, j + 0.5), iso(i - 0.5, j + 0.5)], f, `stroke="${P.grout}" stroke-width="1.2"`));
    }

  // 벽 두 면 (복도까지 이어짐)
  out.push(poly([iso(-0.5, -0.5), iso(-0.5, L - 0.5), iso(-0.5, L - 0.5, WH), iso(-0.5, -0.5, WH)], P.wallL));
  out.push(poly([iso(-0.5, -0.5), iso(L - 0.5, -0.5), iso(L - 0.5, -0.5, WH), iso(-0.5, -0.5, WH)], P.wallR));
  // 벽 패널 이음매
  for (let k = 1; k < L; k += 1.5) {
    out.push(`<polyline points="${pts([iso(-0.5, k - 0.5, 18), iso(-0.5, k - 0.5, WH - 14)])}" stroke="${shade(P.wallL, 0.88)}" stroke-width="2"/>`);
    out.push(`<polyline points="${pts([iso(k - 0.5, -0.5, 18), iso(k - 0.5, -0.5, WH - 14)])}" stroke="${shade(P.wallR, 0.88)}" stroke-width="2"/>`);
  }
  // 걸레받이 + 상단 몰딩
  out.push(poly([iso(-0.5, -0.5, 0), iso(-0.5, L - 0.5, 0), iso(-0.5, L - 0.5, 18), iso(-0.5, -0.5, 18)], shade(P.trim, 0.8)));
  out.push(poly([iso(-0.5, -0.5, 0), iso(L - 0.5, -0.5, 0), iso(L - 0.5, -0.5, 18), iso(-0.5, -0.5, 18)], P.trim));
  out.push(poly([iso(-0.5, -0.5, WH - 14), iso(-0.5, L - 0.5, WH - 14), iso(-0.5, L - 0.5, WH), iso(-0.5, -0.5, WH)], shade(P.trim, 0.85)));
  out.push(poly([iso(-0.5, -0.5, WH - 14), iso(L - 0.5, -0.5, WH - 14), iso(L - 0.5, -0.5, WH), iso(-0.5, -0.5, WH)], P.trim));
  // 벽 윗면 두께 (잘린 단면)
  const T = 0.35;
  out.push(poly([iso(-0.5, -0.5, WH), iso(L - 0.5, -0.5, WH), iso(L - 0.5, -0.5 - T, WH), iso(-0.5 - T, -0.5 - T, WH), iso(-0.5 - T, L - 0.5, WH), iso(-0.5, L - 0.5, WH)], dark ? C["bg-void"] : shade(P.trim, 0.6)));

  // ── 복도 (방 밖) — 닫힌 문·벽등을 두고, 바닥·벽을 어둡게 눌러 플레이 구역과 구분한다 ──
  {
    const doorC = dark ? shade(C["steel"], 0.55) : shade(C["steel"], 1.05);
    const lampC = dark ? (Z ? Z.light() : C["danger"]) : C["white"];
    for (const at of [N + 2.5, N + 8.5]) {
      // 오른벽(복도 오른쪽)·왼벽(복도 왼쪽)에 같은 간격으로 닫힌 연구실 문
      out.push(poly([iso(at, -0.5, 0), iso(at + 1.6, -0.5, 0), iso(at + 1.6, -0.5, 250), iso(at, -0.5, 250)], doorC, `stroke="${C["steel-dark"]}" stroke-width="4"`));
      out.push(poly([iso(-0.5, at, 0), iso(-0.5, at + 1.6, 0), iso(-0.5, at + 1.6, 250), iso(-0.5, at, 250)], shade(doorC, 0.85), `stroke="${C["steel-dark"]}" stroke-width="4"`));
      for (const [lx, ly] of [[at + 0.8, -0.5], [-0.5, at + 0.8]]) {
        const [cx, cy] = iso(lx, ly, 300);
        out.push(`<rect x="${cx - 16}" y="${cy - 6}" width="32" height="10" rx="3" fill="${lampC}" opacity="${dark ? 0.9 : 0.8}"/>`);
      }
    }
    // 방 밖 바닥·벽 어둡게
    const dim = dark ? 0.5 : 0.22;
    const dimC = C["bg-void"];
    out.push(poly([iso(-0.5, N - 0.5), iso(L - 0.5, N - 0.5), iso(L - 0.5, L - 0.5), iso(-0.5, L - 0.5)], dimC, `opacity="${dim}"`));
    out.push(poly([iso(N - 0.5, -0.5), iso(L - 0.5, -0.5), iso(L - 0.5, N - 0.5), iso(N - 0.5, N - 0.5)], dimC, `opacity="${dim}"`));
    out.push(poly([iso(-0.5, N - 0.5), iso(-0.5, L - 0.5), iso(-0.5, L - 0.5, WH), iso(-0.5, N - 0.5, WH)], dimC, `opacity="${dim}"`));
    out.push(poly([iso(N - 0.5, -0.5), iso(L - 0.5, -0.5), iso(L - 0.5, -0.5, WH), iso(N - 0.5, -0.5, WH)], dimC, `opacity="${dim}"`));
  }

  // ── 왼벽: 발광하는 생물학 모식도 스크린 (y 1.6~7.4, z 120~330) ──
  {
    const y0 = 1.6, y1 = 7.4, zt = 330, zb = 120;
    const W = (y1 - y0) * 64, H = zt - zb;
    defs.push(`<filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6"/></filter>`);
    const glowC = C["screen-glow"];
    const scr = [];
    scr.push(`<rect x="-10" y="-10" width="${W + 20}" height="${H + 20}" rx="6" fill="${glowC}" opacity="${dark ? 0.35 : 0.22}" filter="url(#glow)"/>`);
    scr.push(`<rect x="-6" y="-6" width="${W + 12}" height="${H + 12}" rx="4" fill="${C["steel-dark"]}"/>`);
    scr.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="${dark ? "#06222a" : "#0b3442"}"/>`.replace(/#06222a|#0b3442/, dark ? shade(C["bg-void"], 1.2) : shade(C["line"], 0.55)));
    // 격자
    for (let gx = 0; gx < W; gx += 24) scr.push(`<line x1="${gx}" y1="0" x2="${gx}" y2="${H}" stroke="${glowC}" stroke-opacity="0.08"/>`);
    for (let gy = 0; gy < H; gy += 24) scr.push(`<line x1="0" y1="${gy}" x2="${W}" y2="${gy}" stroke="${glowC}" stroke-opacity="0.08"/>`);
    if (Z) scr.push(Z.screen(W, H, glowC));
    // DNA 이중나선 (왼쪽) — STAGE 1·히든 기본 화면
    else {
    const hx = 60, amp = 34;
    let s1 = "", s2 = "";
    for (let t = 0; t <= H - 24; t += 3) {
      const yy = 12 + t;
      const a = Math.sin(t / 16) * amp, b = -a;
      s1 += `${t === 0 ? "M" : "L"}${hx + a},${yy} `;
      s2 += `${t === 0 ? "M" : "L"}${hx + b},${yy} `;
      if (t % 15 === 0) scr.push(`<line x1="${hx + a}" y1="${yy}" x2="${hx + b}" y2="${yy}" stroke="${t % 30 ? C["success"] : C["spectrum-red"]}" stroke-width="3" opacity="0.85"/>`);
    }
    scr.push(`<path d="${s1}" stroke="${glowC}" stroke-width="4" fill="none"/>`, `<path d="${s2}" stroke="${C["hologram"]}" stroke-width="4" fill="none"/>`);
    // 동물 세포 모식도 (가운데)
    const cx = W * 0.47, cy = H * 0.5;
    scr.push(`<ellipse cx="${cx}" cy="${cy}" rx="78" ry="62" fill="${glowC}" fill-opacity="0.1" stroke="${glowC}" stroke-width="3"/>`);
    scr.push(`<circle cx="${cx - 8}" cy="${cy - 4}" r="22" fill="${C["spectrum-violet"]}" fill-opacity="0.55" stroke="${C["screen-bright"]}" stroke-width="2"/>`);
    scr.push(`<circle cx="${cx - 12}" cy="${cy - 8}" r="7" fill="${C["screen-bright"]}" opacity="0.8"/>`);
    for (const [mx, my, rot] of [[cx + 42, cy - 22, 30], [cx + 30, cy + 34, -20], [cx - 50, cy + 28, 60]])
      scr.push(`<g transform="translate(${mx},${my}) rotate(${rot})"><ellipse rx="17" ry="8" fill="${C["fire"]}" fill-opacity="0.75"/><path d="M-12,0 q4,-6 8,0 t8,0 t8,0" stroke="${C["success"]}" stroke-width="1.5" fill="none"/></g>`);
    for (let k = 0; k < 14; k++) scr.push(`<circle cx="${cx - 60 + ((k * 37) % 120)}" cy="${cy - 40 + ((k * 23) % 80)}" r="2" fill="${C["screen-bright"]}" opacity="0.7"/>`);
    }
    // 오른쪽 데이터 막대 + 파형
    const bx = W * 0.75;
    for (let k = 0; k < 6; k++) {
      const bw = 20 + ((k * 53) % 70);
      scr.push(`<rect x="${bx}" y="${20 + k * 22}" width="${bw}" height="10" fill="${[C["toxic"], C["screen-glow"], C["success"], C["hologram"]][k % 4]}" opacity="0.8"/>`);
    }
    let wave = "";
    for (let t = 0; t < W * 0.22; t += 3) wave += `${t ? "L" : "M"}${bx + t},${H - 40 + Math.sin(t / 5) * 10 * Math.sin(t / 23)} `;
    scr.push(`<path d="${wave}" stroke="${dark ? C["danger"] : C["toxic"]}" stroke-width="2.5" fill="none"/>`);
    // 스캔라인
    for (let gy = 0; gy < H; gy += 4) scr.push(`<rect x="0" y="${gy}" width="${W}" height="1.2" fill="#000" opacity="0.18"/>`.replace("#000", C["bg-void"]));
    out.push(wallG("L", y0, zt, scr.join("")));
  }

  // ── 오른벽: 아포칼립스 도시가 보이는 대형 강화 유리 관찰창 (x 1.4~8.0, z 90~335) ──
  {
    const x0 = 1.4, x1 = 8.0, zt = 335, zb = 90;
    const W = (x1 - x0) * 64, H = zt - zb;
    const w = [];
    defs.push(`<linearGradient id="sky-${theme}" x1="0" y1="0" x2="0" y2="1">${dark
      ? `<stop offset="0" stop-color="${shade(C["sky-night"], 0.8)}"/><stop offset="0.45" stop-color="${shade(C["sky-night"], 1.6)}"/><stop offset="1" stop-color="${shade(C["fire"], 0.7)}"/>`
      : `<stop offset="0" stop-color="${shade(C["sky-day"], 0.95)}"/><stop offset="1" stop-color="${shade(C["sky-day"], 1.15)}"/>`}</linearGradient>`);
    w.push(`<rect x="-12" y="-12" width="${W + 24}" height="${H + 24}" fill="${C["steel-dark"]}"/>`);
    w.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="url(#sky-${theme})"/>`);
    if (!dark) {
      w.push(`<circle cx="${W * 0.8}" cy="${H * 0.22}" r="20" fill="${C["success"]}" opacity="0.9"/>`);
      for (const [cx2, cy2, s] of [[W * 0.2, H * 0.2, 1], [W * 0.55, H * 0.12, 0.7]])
        w.push(`<g opacity="0.85" fill="${C["white"]}"><ellipse cx="${cx2}" cy="${cy2}" rx="${30 * s}" ry="${9 * s}"/><ellipse cx="${cx2 + 18 * s}" cy="${cy2 - 6 * s}" rx="${18 * s}" ry="${9 * s}"/></g>`);
    } else {
      // 불길 글로우 + 연기
      defs.push(`<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="10"/></filter>`);
      for (const fx of [0.18, 0.52, 0.83]) w.push(`<ellipse cx="${W * fx}" cy="${H * 0.92}" rx="60" ry="40" fill="${C["fire"]}" opacity="0.7" filter="url(#soft)"/>`);
      for (const [sx2, sy2] of [[0.15, 0.45], [0.5, 0.35], [0.8, 0.5]]) w.push(`<ellipse cx="${W * sx2}" cy="${H * sy2}" rx="70" ry="26" fill="${C["city-night"]}" opacity="0.55" filter="url(#soft)"/>`);
    }
    // 스카이라인 (두 겹)
    const city = dark ? C["city-night"] : C["city-day"];
    const rng = (k) => ((Math.sin(k * 12.9898) * 43758.5453) % 1 + 1) % 1;
    for (const [layer, base, col] of [[0, 0.55, shade(city, dark ? 1.6 : 1.25)], [1, 0.68, city]]) {
      let x = -4;
      let k = layer * 50;
      while (x < W) {
        const bw = 18 + rng(k++) * 34;
        const bh = H * (0.18 + rng(k++) * (layer ? 0.38 : 0.3));
        const top = H * base + (layer ? H * 0.32 : H * 0.25) - bh;
        w.push(`<rect x="${x}" y="${top}" width="${bw}" height="${H - top}" fill="${col}"/>`);
        // 창문 불빛
        for (let wy = top + 8; wy < H - 6; wy += 11)
          for (let wx = x + 5; wx < x + bw - 5; wx += 9)
            if (rng(wx * 3.1 + wy) > (dark ? 0.9 : 0.62))
              w.push(`<rect x="${wx}" y="${wy}" width="4" height="5" fill="${dark ? C["fire"] : C["success"]}" opacity="${dark ? 0.8 : 0.55}"/>`);
        // 부서진 건물 윤곽 (어두운 쪽)
        if (dark && rng(k) > 0.6) w.push(`<polygon points="${x},${top} ${x + bw * 0.4},${top - 10} ${x + bw * 0.7},${top + 6} ${x + bw},${top - 4} ${x + bw},${top + 1} ${x},${top + 1}" fill="${col}"/>`);
        x += bw + 3;
      }
    }
    // 강화 유리 반사 + 그물 철선
    w.push(`<polygon points="${W * 0.08},0 ${W * 0.2},0 ${W * 0.02},${H} 0,${H} 0,${H * 0.85}" fill="${C["white"]}" opacity="${dark ? 0.04 : 0.18}"/>`);
    w.push(`<polygon points="${W * 0.3},0 ${W * 0.34},0 ${W * 0.16},${H} ${W * 0.12},${H}" fill="${C["white"]}" opacity="${dark ? 0.03 : 0.14}"/>`);
    for (let gx = 0; gx < W; gx += 16) w.push(`<line x1="${gx}" y1="0" x2="${gx}" y2="${H}" stroke="${C["white"]}" stroke-opacity="0.05"/>`);
    // 창틀 멀리언
    for (const fx of [1 / 3, 2 / 3]) w.push(`<rect x="${W * fx - 5}" y="0" width="10" height="${H}" fill="${C["steel-dark"]}"/>`);
    w.push(`<rect x="0" y="${H * 0.5 - 4}" width="${W}" height="8" fill="${C["steel-dark"]}"/>`);
    if (dark) {
      // 유리 균열 (거미줄) — 혐오 요소 없이 '무언가 부딪혔다'만
      const [kx, ky] = [W * 0.58, H * 0.36];
      for (let a = 0; a < 7; a++) {
        const ang = a * 0.9 + 0.3;
        w.push(`<polyline points="${kx},${ky} ${kx + Math.cos(ang) * 30},${ky + Math.sin(ang) * 26} ${kx + Math.cos(ang + 0.2) * 62},${ky + Math.sin(ang + 0.2) * 50}" stroke="${C["screen-bright"]}" stroke-opacity="0.55" stroke-width="1.5" fill="none"/>`);
      }
      w.push(`<circle cx="${kx}" cy="${ky}" r="16" stroke="${C["screen-bright"]}" stroke-opacity="0.4" fill="none"/>`);
    }
    // 창턱
    w.push(`<rect x="-16" y="${H + 8}" width="${W + 32}" height="10" fill="${shade(C["steel"], dark ? 0.7 : 1.1)}"/>`);
    out.push(wallG("R", x0, zt, w.join("")));
  }

  // ── 오른벽 앞쪽: EXIT-LOCKED 격리 철문 (x 9.2~11.0, z 0~270) ──
  {
    const x0 = 9.2, x1 = 11.0, zt = 270;
    const W = (x1 - x0) * 64, H = zt;
    const d = [];
    d.push(`<rect x="-10" y="-8" width="${W + 20}" height="${H + 8}" fill="${shade(C["steel-dark"], 0.8)}"/>`);
    d.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="${dark ? shade(C["steel"], 0.75) : C["steel"]}"/>`);
    d.push(`<rect x="${W / 2 - 1.5}" y="0" width="3" height="${H}" fill="${C["steel-dark"]}"/>`);
    // 해저드 스트라이프 (하단)
    defs.push(`<pattern id="hz" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="16" fill="${C["warn"]}"/><rect x="8" width="8" height="16" fill="${C["keycap"]}"/></pattern>`);
    d.push(`<rect x="0" y="${H - 36}" width="${W}" height="30" fill="url(#hz)"/>`);
    // 리벳·핸들·창
    for (let ry = 14; ry < H - 40; ry += 34) for (const rx of [8, W - 8]) d.push(`<circle cx="${rx}" cy="${ry}" r="2.5" fill="${C["steel-dark"]}"/>`);
    d.push(`<rect x="${W * 0.18}" y="40" width="${W * 0.26}" height="40" rx="3" fill="${C["bg-void"]}" stroke="${C["steel-dark"]}" stroke-width="3"/>`);
    d.push(`<rect x="${W * 0.56}" y="40" width="${W * 0.26}" height="40" rx="3" fill="${C["bg-void"]}" stroke="${C["steel-dark"]}" stroke-width="3"/>`);
    d.push(`<rect x="${W / 2 - 22}" y="${H * 0.55}" width="10" height="34" rx="3" fill="${C["steel-dark"]}"/><rect x="${W / 2 + 12}" y="${H * 0.55}" width="10" height="34" rx="3" fill="${C["steel-dark"]}"/>`);
    // 잠금 패널 (빨간 LED)
    d.push(`<rect x="${W + 14}" y="${H * 0.42}" width="16" height="26" rx="2" fill="${C["keycap"]}"/><circle cx="${W + 22}" cy="${H * 0.42 + 8}" r="4" fill="${C["danger"]}"/>`);
    // 경고등 + 사인
    d.push(`<rect x="${W / 2 - 64}" y="-56" width="128" height="34" rx="4" fill="${C["keycap"]}" stroke="${C["danger"]}" stroke-width="2.5"/>`);
    d.push(`<text x="${W / 2}" y="-33" font-family="Consolas, 'Courier New', monospace" font-weight="700" font-size="17" fill="${C["danger"]}" text-anchor="middle" letter-spacing="1">EXIT-LOCKED</text>`);
    d.push(`<circle cx="${W / 2}" cy="-72" r="9" fill="${C["danger"]}"/><circle cx="${W / 2}" cy="-72" r="22" fill="${C["danger"]}" opacity="0.25" filter="url(#glow)"/>`);
    out.push(wallG("R", x0, zt, d.join("")));
  }

  // ── 왼벽 앞쪽: GS BIOLAB 로고 간판 (y 8.4~11.2, 실험대 위) ──
  {
    const y0 = 8.3, y1 = 11.3, zt = 300;
    const W = (y1 - y0) * 64;
    const s = [];
    // 왼벽은 u축이 화면 왼쪽으로 가므로(a=-1) 글자가 뒤집힌다 — 다시 뒤집어 바로 읽히게
    s.push(`<g transform="translate(${W},0) scale(-1,1)">`);
    s.push(`<rect x="0" y="0" width="${W}" height="64" rx="8" fill="${dark ? shade(C["qz-wall"], 1.25) : C["white"]}" stroke="${dark ? C["qz-trim"] : C["lab-accent"]}" stroke-width="3"/>`);
    // 로고 마크: 잎+세포 (원 안의 잎)
    const lc = dark ? shade(C["lab-accent"], 0.45) : C["lab-accent"];
    s.push(`<circle cx="34" cy="32" r="20" fill="none" stroke="${lc}" stroke-width="4"/><path d="M24,40 Q30,18 46,22 Q42,40 24,40 Z" fill="${lc}"/>`);
    if (Z) {
      // 구역 간판: 부서진 GS BIOLAB 위에 연구팀 이름 (비상등 색으로 희미하게 빛난다)
      s.push(`<text x="62" y="24" font-family="Consolas, 'Courier New', monospace" font-weight="700" font-size="13" fill="${shade(C["text"], 0.4)}" letter-spacing="1">GS BI&#160;LAB</text>`);
      s.push(`<text x="62" y="49" font-family="'Pretendard', 'Malgun Gothic', 'Noto Sans KR', sans-serif" font-weight="800" font-size="20" fill="${C["text"]}">${Z.sign}</text>`);
      s.push(`<rect x="62" y="55" width="${W - 76}" height="3" fill="${Z.light()}"/>`);
    } else
    s.push(`<text x="62" y="41" font-family="Consolas, 'Courier New', monospace" font-weight="700" font-size="23" fill="${dark ? shade(C["text"], 0.45) : C["keycap"]}" letter-spacing="1">${dark ? "GS BI&#160;LAB" : "GS BIOLAB"}</text>`);
    s.push(`</g>`);
    out.push(wallG("L", y0, zt, s.join("")));
  }

  // ── 벽가 가구 (배경에 포함 — blocks로 뒤로 못 가게 한다) ──
  if (!dark) {
    // 왼벽 앞쪽 실험대 + 플라스크 (y 8.4~11)
    out.push(box(-0.4, 8.4, 0.6, 11.2, 70, C["white"], 0, { left: C["lab-wall-shade"], right: shade(C["lab-trim"], 1.1) }));
    out.push(box(-0.4, 8.4, 0.6, 11.2, 6, C["lab-accent"], 70));
    for (const [fy, col] of [[8.9, C["lab-accent"]], [9.5, C["spectrum-cyan"]], [10.2, C["success"]], [10.7, C["spectrum-violet"]]]) {
      out.push(cylinder(0.1, fy, 0.09, 26, shade(col, 0.9), 76, { opacity: 0.85 }));
      out.push(cylinder(0.1, fy, 0.04, 14, C["lab-glass"], 102, { opacity: 0.8 }));
    }
    // 화분
    for (const [px, py] of [[0.4, 0.4], [11.2, 0.6]]) {
      out.push(cylinder(px, py, 0.22, 34, shade(C["lab-trim"], 0.9)));
      out.push(`<ellipse cx="${iso(px, py, 70)[0]}" cy="${iso(px, py, 70)[1]}" rx="34" ry="30" fill="${shade(C["lab-accent"], 0.75)}"/><ellipse cx="${iso(px, py, 84)[0] - 8}" cy="${iso(px, py, 84)[1]}" rx="18" ry="16" fill="${C["lab-accent"]}"/>`);
    }
    // 검체 냉장고 (오른벽, 창 사이)
    out.push(box(8.3, -0.45, 9.0, 0.35, 200, C["white"], 0, { left: C["lab-wall-shade"], right: shade(C["lab-trim"], 1.05) }));
    // 바닥 조명 웅덩이
    defs.push(`<radialGradient id="pool"><stop offset="0" stop-color="${C["white"]}" stop-opacity="0.45"/><stop offset="1" stop-color="${C["white"]}" stop-opacity="0"/></radialGradient>`);
    for (const [lx, ly] of [[3.5, 3.5], [7.5, 6.5], [4, 8.5]]) {
      const [cx, cy] = iso(lx, ly);
      out.push(`<ellipse cx="${cx}" cy="${cy}" rx="230" ry="115" fill="url(#pool)"/>`);
    }
  } else {
    const lightC = Z ? Z.light() : C["danger"];
    // 구역 비상등 빛이 바닥에 물든다
    if (Z) out.push(poly([iso(-0.5, -0.5), iso(N - 0.5, -0.5), iso(N - 0.5, N - 0.5), iso(-0.5, N - 0.5)], lightC, `opacity="0.07"`));
    if (Z) out.push(Z.props());
    else {
    // 무너진 실험대 + 서류 (왼벽 앞)
    out.push(box(-0.4, 8.4, 0.6, 11.2, 70, shade(C["steel"], 0.6), 0));
    out.push(box(0.7, 10.1, 1.5, 10.9, 30, shade(C["steel-dark"], 0.9), 0));
    // 바리케이드 상자 (오른벽 냉장고 자리)
    out.push(box(8.3, -0.45, 9.0, 0.35, 120, shade(C["warn"], 0.45), 0));
    out.push(box(8.35, -0.4, 8.95, 0.3, 70, shade(C["warn"], 0.55), 120));
    }
    // 격리 테이프 줄무늬 바닥 (문 앞)
    for (let k = 0; k < 6; k++) {
      const xs = 9.0 + k * 0.32;
      out.push(poly([iso(xs, 0.6), iso(xs + 0.16, 0.6), iso(xs + 0.16, 1.4), iso(xs, 1.4)], C["warn"], `opacity="0.55"`));
    }
    // 흩어진 서류
    for (const [qx, qy, r] of [[3, 7, 20], [5.5, 9.5, -15], [8, 8, 35], [2, 4, 10], [9.5, 4.5, -30]]) {
      const [cx, cy] = iso(qx, qy);
      out.push(`<g transform="translate(${cx},${cy}) scale(1,0.5) rotate(${r})"><rect x="-14" y="-18" width="28" height="36" fill="${C["screen-bright"]}" opacity="0.35"/></g>`);
    }
    // 비상등 붉은 빛 번짐 (벽 위)
    defs.push(`<radialGradient id="redpool"><stop offset="0" stop-color="${lightC}" stop-opacity="0.4"/><stop offset="1" stop-color="${lightC}" stop-opacity="0"/></radialGradient>`);
    const lamps = Z ? [[10.1, 330, "R"], [9.5, 300, "L"], [4.6, 365, "R"], [1.0, 345, "L"]] : [[10.1, 330, "R"], [9.5, 300, "L"]];
    for (const [lx, lz, side] of lamps) {
      const [cx, cy] = side === "R" ? iso(lx, -0.5, lz) : iso(-0.5, lx, lz);
      out.push(`<ellipse cx="${cx}" cy="${cy}" rx="140" ry="110" fill="url(#redpool)"/>`);
      out.push(`<rect x="${cx - 14}" y="${cy - 7}" width="28" height="12" rx="3" fill="${lightC}"/>`);
    }
    // 바닥 균열
    for (const [qx, qy] of [[6, 4], [4.5, 10]]) {
      const [cx, cy] = iso(qx, qy);
      out.push(`<polyline points="${cx - 40},${cy} ${cx - 12},${cy + 6} ${cx + 4},${cy - 4} ${cx + 30},${cy + 3} ${cx + 52},${cy - 2}" stroke="${C["bg-void"]}" stroke-width="3" fill="none"/>`);
    }
  }

  // ── 플레이 구역 경계 난간 (방 앞 두 모서리) — 유리판 + 손잡이 + 기둥 ──
  {
    const H = 64;
    const glass = dark ? shade(C["steel-dark"], 1.3) : C["lab-glass"];
    for (const [a, b] of [[[-0.5, N - 0.5], [N - 0.5, N - 0.5]], [[N - 0.5, -0.5], [N - 0.5, N - 0.5]]]) {
      out.push(poly([iso(a[0], a[1], 0), iso(b[0], b[1], 0), iso(b[0], b[1], H), iso(a[0], a[1], H)], glass, `opacity="${dark ? 0.35 : 0.3}"`));
      out.push(`<polyline points="${pts([iso(a[0], a[1], H), iso(b[0], b[1], H)])}" stroke="${dark ? C["steel"] : C["lab-trim"]}" stroke-width="5"/>`);
      for (let t = 0; t <= 1.0001; t += 1 / 8) {
        const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
        out.push(`<polyline points="${pts([iso(x, y, 0), iso(x, y, H)])}" stroke="${dark ? C["steel"] : C["lab-trim"]}" stroke-width="4"/>`);
      }
    }
  }

  // 그림 범위 계산 — 그림은 복도(L칸)까지, frame은 플레이 구역(N칸 방)
  const pad = 60;
  const minX = -L * TW - 0.5 * TW - pad;
  const maxX = L * TW + 0.5 * TW + pad;
  const minY = -TH - WH - 0.35 * 2 * TH - pad - 40;
  const maxY = (2 * L - 1) * TH + pad;
  const frame = { x: -N * TW - 0.5 * TW, y: minY + pad, w: (2 * N + 1) * TW, h: (2 * N - 1) * TH + 20 - (minY + pad) };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${maxX - minX}" height="${maxY - minY}" viewBox="${minX} ${minY} ${maxX - minX} ${maxY - minY}"><defs>${defs.join("")}</defs>${out.join("\n")}</svg>`;
  return { svg, minX, minY, w: maxX - minX, h: maxY - minY, frame };
}

// ───────────────────────────── 장치 스프라이트 ─────────────────────────────

/** 장치 하나 — 바닥 발자국 fw×fd 타일을 원점 중심에 놓고 그린다. 밑변 꼭짓점이 그림 맨 아래. */
const TOPS = { "dev-microscope": 200, "dev-sequencer": 200, "dev-ecotank": 200, "dev-mito": 250, "dev-pedigree": 220, "dev-immune": 170 };
function device(name, fw, fd, draw, topH = TOPS[name] ?? 260) {
  const parts = draw({ x0: -fw / 2, x1: fw / 2, y0: -fd / 2, y1: fd / 2 });
  const minX = -(fw / 2 + fd / 2) * TW - 6;
  const maxX = (fw / 2 + fd / 2) * TW + 6;
  const bottom = (fw / 2 + fd / 2) * TH; // 밑 꼭짓점
  const top = -topH;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${maxX - minX}" height="${bottom - top}" viewBox="${minX} ${top} ${maxX - minX} ${bottom - top}"><defs><filter id="g" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter></defs>${parts}</svg>`;
  return { name, svg, sink: (fw + fd) * 16 - 16 };
}

const DEV = [];
// STAGE 1 — 밝은 연구소
DEV.push(device("dev-microscope", 1.6, 1.0, ({ x0, x1, y0, y1 }) => [
  box(x0, y0, x1, y1, 78, C["white"], 0, { left: C["lab-wall-shade"], right: shade(C["lab-trim"], 1.1) }),
  box(x0, y0, x1, y1, 7, C["lab-accent"], 78),
  // 현미경: 받침 + 기둥 + 경통 + 접안
  box(-0.25, -0.2, 0.15, 0.2, 10, C["steel-dark"], 85),
  box(-0.22, 0.05, -0.08, 0.18, 70, C["steel"], 95),
  cylinder(-0.02, 0.0, 0.08, 46, C["steel"], 128),
  cylinder(-0.02, 0.0, 0.05, 22, C["steel-dark"], 168),
  box(-0.12, -0.12, 0.12, 0.12, 6, C["lab-glass"], 112),
  // 슬라이드 상자 + 시약병
  box(0.3, -0.35, 0.65, -0.05, 14, C["spectrum-cyan"], 85),
  cylinder(0.55, 0.25, 0.07, 28, C["lab-accent"], 85, { opacity: 0.85 }),
].join("")));

DEV.push(device("dev-sequencer", 1.0, 1.0, ({ x0, x1, y0, y1 }) => [
  box(x0, y0, x1, y1, 170, C["white"], 0, { left: C["lab-wall-shade"], right: shade(C["lab-trim"], 1.05) }),
  // 앞면(남서) 화면 — 염기 색 막대
  `<g transform="matrix(1,0.5,0,1,${iso(x0, y1, 150)[0] + 8},${iso(x0, y1, 150)[1] + 4})">
     <rect x="0" y="0" width="48" height="74" fill="${shade(C["line"], 0.5)}"/>
     ${[C["toxic"], C["hologram"], C["success"], C["spectrum-red"], C["toxic"], C["success"], C["hologram"], C["spectrum-red"]].map((c, k) => `<rect x="${4 + (k % 4) * 11}" y="${6 + Math.floor(k / 4) * 34}" width="8" height="${12 + ((k * 7) % 16)}" fill="${c}"/>`).join("")}
   </g>`,
  `<g transform="matrix(1,-0.5,0,1,${iso(x1, y1, 150)[0] + 6},${iso(x1, y1, 150)[1] - 6})"><rect x="0" y="0" width="40" height="10" fill="${C["lab-accent"]}"/><rect x="0" y="20" width="40" height="6" fill="${C["steel"]}"/></g>`,
  box(x0 + 0.1, y0 + 0.1, x1 - 0.1, y1 - 0.1, 8, C["lab-accent"], 170),
].join("")));

// 생태 수조 (아쿠아리움) — 통합과학2 생태계 퍼즐. 앞면(남서면)에 물풀·물고기를 그린다
DEV.push(device("dev-ecotank", 1.3, 0.9, ({ x0, x1, y0, y1 }) => {
  const zb = 52, zt = 150, W = (x1 - x0) * 64, H = zt - zb;
  const [fx, fy] = iso(x0, y1, zt); // 앞면 좌상단
  const front = [
    // 물풀
    ...[0.12, 0.3, 0.72, 0.88].map((u, k) => `<path d="M${W * u},${H} q${k % 2 ? 6 : -6},-${H * 0.25} 0,-${H * 0.45} t0,-${H * 0.3}" stroke="${shade(C["lab-accent"], 0.75)}" stroke-width="4" fill="none" stroke-linecap="round"/>`),
    // 물고기 (꼬리 달린 타원)
    ...[[0.45, 0.35, C["fire"]], [0.62, 0.6, C["success"]], [0.25, 0.55, C["spectrum-cyan"]]].map(([u, v, c]) =>
      `<g transform="translate(${W * u},${H * v})"><ellipse rx="9" ry="5" fill="${c}"/><polygon points="8,0 15,-5 15,5" fill="${c}"/><circle cx="-4" cy="-1" r="1.3" fill="${C["keycap"]}"/></g>`),
    // 기포
    ...[[0.55, 0.25], [0.57, 0.12], [0.8, 0.3]].map(([u, v]) => `<circle cx="${W * u}" cy="${H * v}" r="2.5" fill="none" stroke="${C["white"]}" stroke-opacity="0.8"/>`),
    // 모래 바닥
    `<rect x="0" y="${H - 10}" width="${W}" height="10" fill="${C["success"]}" opacity="0.55"/>`,
  ].join("");
  return [
    box(x0, y0, x1, y1, zb, C["white"], 0, { left: C["lab-wall-shade"], right: shade(C["lab-trim"], 1.05) }),
    box(x0 + 0.03, y0 + 0.03, x1 - 0.03, y1 - 0.03, H - 12, shade(C["sky-day"], 1.05), zb, { left: shade(C["spectrum-cyan"], 1.15), right: shade(C["spectrum-cyan"], 0.95) }),
    `<g transform="matrix(1,0.5,0,1,${fx.toFixed(1)},${fy.toFixed(1)})" opacity="0.95">${front}</g>`,
    // 유리 테두리
    `<polygon points="${pts([iso(x0, y1, zb), iso(x1, y1, zb), iso(x1, y1, zt), iso(x0, y1, zt)])}" fill="${C["white"]}" fill-opacity="0.12" stroke="${C["lab-trim"]}" stroke-width="2"/>`,
    `<polygon points="${pts([iso(x1, y0, zb), iso(x1, y1, zb), iso(x1, y1, zt), iso(x1, y0, zt)])}" fill="${C["white"]}" fill-opacity="0.18" stroke="${C["lab-trim"]}" stroke-width="2"/>`,
    box(x0, y0, x1, y1, 8, C["lab-accent"], zt),
  ].join("");
}));

// STAGE 3 — 격리 구역 (어둡고 발광)
DEV.push(device("dev-mito", 1.2, 1.2, ({ x0, x1, y0, y1 }) => [
  box(x0, y0, x1, y1, 50, shade(C["steel"], 0.55), 0),
  `<ellipse cx="0" cy="${iso(0, 0, 130)[1]}" rx="70" ry="70" fill="${C["fire"]}" opacity="0.35" filter="url(#g)"/>`,
  cylinder(0, 0, 0.42, 150, shade(C["lab-glass"], 0.55), 50, { opacity: 0.6 }),
  `<g transform="translate(0,${iso(0, 0, 120)[1]}) rotate(-25)"><ellipse rx="38" ry="18" fill="${C["fire"]}" opacity="0.9"/><path d="M-30,0 q6,-12 12,0 t12,0 t12,0 t12,0" stroke="${C["success"]}" stroke-width="3" fill="none"/></g>`,
  cylinder(0, 0, 0.45, 14, shade(C["steel-dark"], 0.9), 200),
  box(x1 - 0.25, y0 + 0.1, x1, y0 + 0.5, 90, shade(C["steel-dark"], 0.8), 0),
  `<circle cx="${iso(x1 - 0.1, y0 + 0.3, 70)[0]}" cy="${iso(x1 - 0.1, y0 + 0.3, 70)[1]}" r="4" fill="${C["toxic"]}"/>`,
].join("")));

DEV.push(device("dev-pedigree", 1.4, 0.9, ({ x0, x1, y0, y1 }) => [
  box(x0, y0, x1, y1, 80, shade(C["steel"], 0.5), 0),
  box(x0 + 0.1, y0 + 0.05, x1 - 0.1, y0 + 0.25, 120, shade(C["steel-dark"], 0.8), 80),
  // 가계도 화면 (앞면이 아닌 위로 세운 모니터 — 남서 방향)
  `<g transform="matrix(1,0.5,0,1,${iso(x0 + 0.15, y0 + 0.25, 195)[0]},${iso(x0 + 0.15, y0 + 0.25, 195)[1]})">
     <rect x="0" y="0" width="${(x1 - x0 - 0.3) * 64}" height="104" fill="${shade(C["bg-void"], 1.3)}"/>
     <rect x="0" y="0" width="${(x1 - x0 - 0.3) * 64}" height="104" fill="${C["toxic"]}" opacity="0.06"/>
     <rect x="10" y="12" width="14" height="14" fill="none" stroke="${C["toxic"]}" stroke-width="2"/><circle cx="52" cy="19" r="7" fill="none" stroke="${C["toxic"]}" stroke-width="2"/>
     <line x1="24" y1="19" x2="45" y2="19" stroke="${C["toxic"]}" stroke-width="2"/><line x1="34" y1="19" x2="34" y2="44" stroke="${C["toxic"]}" stroke-width="2"/>
     <line x1="16" y1="44" x2="56" y2="44" stroke="${C["toxic"]}" stroke-width="2"/>
     <rect x="9" y="50" width="14" height="14" fill="${C["toxic"]}"/><circle cx="56" cy="57" r="7" fill="none" stroke="${C["toxic"]}" stroke-width="2"/>
     <text x="8" y="94" font-family="Consolas, monospace" font-size="11" fill="${C["toxic"]}">X-LINK?</text>
   </g>`,
  `<circle cx="${iso(x1, y1, 60)[0] - 14}" cy="${iso(x1, y1, 60)[1]}" r="4" fill="${C["danger"]}"/>`,
].join("")));

DEV.push(device("dev-immune", 1.0, 1.0, ({ x0, x1, y0, y1 }) => [
  box(x0, y0, x1, y1, 96, shade(C["steel"], 0.55), 0),
  cylinder(0, 0, 0.34, 30, shade(C["steel-dark"], 1.1), 96),
  cylinder(0, 0, 0.26, 6, shade(C["bg-void"], 1.4), 126),
  ...[0, 1, 2, 3, 4, 5].map((k) => {
    const a = (k / 6) * Math.PI * 2;
    return cylinder(Math.cos(a) * 0.16, Math.sin(a) * 0.16, 0.035, 10, k % 2 ? C["toxic"] : C["screen-glow"], 128, { opacity: 0.9 });
  }),
  `<g transform="matrix(1,0.5,0,1,${iso(x0, y1, 84)[0] + 10},${iso(x0, y1, 84)[1] + 2})"><rect width="44" height="26" fill="${shade(C["bg-void"], 1.3)}"/><polyline points="3,18 10,18 14,6 18,22 22,12 30,12 34,16 41,16" stroke="${C["toxic"]}" stroke-width="2" fill="none"/></g>`,
  `<ellipse cx="0" cy="${iso(0, 0, 130)[1]}" rx="40" ry="18" fill="${C["toxic"]}" opacity="0.25" filter="url(#g)"/>`,
].join("")));

// ───────────────────────────── 출력 ─────────────────────────────

function render(svg, scale) {
  const r = new Resvg(svg, {
    fitTo: { mode: "zoom", value: scale },
    font: { loadSystemFonts: true, defaultFontFamily: "Consolas" },
    shapeRendering: 1,
  });
  return r.render().asPng();
}

mkdirSync(join(root, "assets-src", "rooms"), { recursive: true });
mkdirSync(join(root, "assets-src", "gen"), { recursive: true });

// room-quarantine = 히든 스테이지(뉴스 아카이브), room-qz-1~3 = STAGE 3 구역별 연구소
for (const [name, theme, zone] of [["lab", "lab", null], ["quarantine", "quarantine", null], ["qz-1", "quarantine", "qz-1"], ["qz-2", "quarantine", "qz-2"], ["qz-3", "quarantine", "qz-3"]]) {
  const r = room(theme, zone);
  writeFileSync(join(root, "assets-src", "rooms", `room-${name}.png`), render(r.svg, RES));
  const f = r.frame;
  console.log(`room-${name}: background { scale: ${1 / RES}, offsetX: ${Math.round(r.minX)}, offsetY: ${Math.round(r.minY)}, frame: { x: ${Math.round(f.x)}, y: ${Math.round(f.y)}, w: ${Math.round(f.w)}, h: ${Math.round(f.h)} } }`);
}

const scales = JSON.parse(readFileSync(join(root, "assets-src", "asset-scale.json"), "utf8"));
for (const d of DEV) {
  writeFileSync(join(root, "assets-src", "gen", `${d.name}.png`), render(d.svg, RES));
  scales[d.name] = 1 / RES;
  console.log(`${d.name}: sink ${d.sink}`);
}
writeFileSync(join(root, "assets-src", "asset-scale.json"), JSON.stringify(scales, null, 2) + "\n");
