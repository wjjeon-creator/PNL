# July Dashboard Fill + Contract-Type Profitability Insight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the July skeleton panel in `index.html` with real July data (요약/대리점 상세/상생 프로모션 충족률), and add a new "계약 유형별 수익성" section inside the 대리점 상세 tab.

**Architecture:** `index.html` is a single static file with no build step (Vercel static deploy). Each month is either a hand-authored static `<div class="month-panel">` (currently only `panel-jun`) or a JS-generated skeleton from `PENDING_MONTHS` (currently `jul`–`dec`). This plan promotes July from generated-skeleton to hand-authored static markup, following the exact pattern already used for June: literal HTML for structure, literal `const` arrays for table/chart data, one IIFE per table to render `<tbody>` from its array, one entry per chart in the `BUILDERS` map keyed by canvas id. `buildVisibleCharts()` already lazy-inits any canvas in `BUILDERS` the first time it becomes visible — no changes needed to navigation/theme/chart-lifecycle code.

**Tech Stack:** Vanilla HTML/CSS/JS, Chart.js 4.4.1 + chartjs-plugin-datalabels (CDN), no npm/build tooling. Verification uses a small Node script (Node is available in this environment; no other runtime assumed).

## Global Constraints

- All monetary values are 원 (KRW), VAT excluded, matching existing June convention.
- No hardcoded aggregates: every sum/percentage/bucket-count shown on screen must be computed at render time from a `const` array, never typed as a separate literal that could drift from the array (this is the exact bug class fixed in commit `b477d9f`'s predecessor — a hardcoded distribution `[19,9,4,12]` that didn't match the underlying 44-row `PROMO` array).
- Follow existing naming/ID suffix convention: everything new for July uses a `Jul` suffix (`TOP_NET_JUL`, `chartTopNetJul`, `tblTopNetJul`, etc.) to avoid colliding with June's un-suffixed names (`TOP_NET`, `chartTopNet`, `tblTopNet`).
- No new CSS classes. Every existing block in this plan reuses classes already defined in `index.html`'s `<style>` block (`chart-grid`, `chart-card`, `table-wrap`, `callout`, `insight-grid`, `insight-card`, `kpi-flow`, `stat-card`, `card-grid`, `funnel-strip`, `chip-group`, `pill`).
- Reward-tier data (계약유형×설치구간 보상 정책) is displayed as a reference table only. Do not compute or re-derive per-dealer rewards from it — the source spreadsheet's own `최대 보상금 정책` column (already in `PROMO_JUL`) is the authoritative per-dealer figure. This constraint exists because the tiered logic combines a flat base payment (30,000원/건, paid regardless of condition) with condition-gated per-bracket bonuses, and re-implementing that logic risks introducing a new calculation bug.
- The July promotion sheet's install/condition counts cover **5/18~6/30**, not calendar July. Do not label this section "7월 실적" anywhere — use "상생 프로모션 충족률" as the section already does for June, with no month qualifier on the counts themselves.
- One narrow, deliberate exception to the "no hardcoded aggregates" rule: the "미충족 16,050,000원" KPI in Task 4 cannot be derived from `PROMO_JUL`, because that figure is "what the remaining 107 cases would earn under the tier policy if achieved" — computing it requires the same tiered reward engine this plan explicitly declines to re-implement (previous bullet). It is carried over as a literal, sourced directly from the source spreadsheet's own precomputed cell (`상생 프로모션 충족률(%)` sheet, row 48). The "확보 34,510,000원" KPI next to it, by contrast, **is** derivable (`PROMO_JUL.reduce((a,d)=>a+d.m,0)`) and Task 1's verification script checks it — only the unachieved-side figure is a literal.

---

## File Structure

Single file modified throughout: `C:\Users\Wj.Jeon-Gram\ai\PNL\index.html` (currently 1185 lines).

One new file created: `C:\Users\Wj.Jeon-Gram\ai\PNL\scripts\verify-july-data.cjs` — a standalone Node script (no dependencies) that extracts the `*_JUL` array literals from `index.html` via regex and cross-checks their derived totals against the known-correct figures from the source spreadsheet (`'26년 7월 대리점 수익성 분석.xlsx`, sheets `요약` / `7월 대리점별 상세 분석` / `상생 프로모션 충족률(%)`). This is the closest equivalent to a test suite this project has; run it after every task that touches a `*_JUL` array.

No other files change. `docs/superpowers/specs/2026-08-11-july-fill-and-contract-type-insight-design.md` (already committed) is the source of truth for every number used below — it was itself generated from, and cross-checked against, the raw xlsx.

---

## Task 1: Data layer — July `const` arrays + verification script

**Files:**
- Modify: `index.html` (insert new consts after line 899, right after the existing June `STAGES` const and before the `/* --------------------------- static tables --------------------------- */` comment at line 901)
- Create: `scripts/verify-july-data.cjs`

**Interfaces:**
- Produces: `TOP_NET_JUL`, `NEG_NET_JUL`, `SCATTER_JUL`, `CONTRACT_TYPE_JUL`, `PROMO_JUL`, `STAGES_JUL`, `REWARD_TIERS_JUL` — consumed by Tasks 2–4's render functions and `BUILDERS` entries.

- [ ] **Step 1: Write the verification script (will fail — consts don't exist yet)**

Create `scripts/verify-july-data.cjs`:

```javascript
#!/usr/bin/env node
/**
 * Recomputes July dashboard aggregates from the literal `*_JUL` arrays
 * embedded in index.html and checks them against the known-correct totals
 * from '26년 7월 대리점 수익성 분석.xlsx (요약 / 7월 대리점별 상세 분석 /
 * 상생 프로모션 충족률(%) sheets). Run after any edit that touches a
 * *_JUL const.
 */
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf-8');

function extractConst(name) {
  const re = new RegExp(`const ${name}\\s*=\\s*(\\[[\\s\\S]*?\\]);`);
  const m = re.exec(html);
  if (!m) throw new Error(`const ${name} not found in index.html`);
  return new Function(`return ${m[1]};`)();
}

const EXPECTED = {
  dealerCount: 119,
  activeCount: 40,
  contractTypeNetSum: 42798706,
  topNetFirst: { n: '엠제이통신', net: 18403942 },
  negNetFirst: { n: '코스모스컴퍼니', net: -3730424 },
  promo: { count: 44, i: 600, t: 569, p: 509, a: 493, m: 34510000 },
  distribution: { '80%+': 29, '50~80%': 8, '30~50%': 3, '<30%': 4 },
};

let failed = false;
function check(label, actual, expected) {
  const ok = actual === expected;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
  if (!ok) failed = true;
}

const CONTRACT_TYPE_JUL = extractConst('CONTRACT_TYPE_JUL');
check('CONTRACT_TYPE_JUL dealer count', CONTRACT_TYPE_JUL.length, EXPECTED.dealerCount);
check(
  'CONTRACT_TYPE_JUL net sum',
  Math.round(CONTRACT_TYPE_JUL.reduce((a, d) => a + d.net, 0)),
  EXPECTED.contractTypeNetSum
);

const SCATTER_JUL = extractConst('SCATTER_JUL');
check('SCATTER_JUL active dealer count', SCATTER_JUL.length, EXPECTED.activeCount);

const TOP_NET_JUL = extractConst('TOP_NET_JUL');
check('TOP_NET_JUL length', TOP_NET_JUL.length, 10);
check('TOP_NET_JUL[0].n', TOP_NET_JUL[0].n, EXPECTED.topNetFirst.n);
check('TOP_NET_JUL[0].net', TOP_NET_JUL[0].net, EXPECTED.topNetFirst.net);

const NEG_NET_JUL = extractConst('NEG_NET_JUL');
check('NEG_NET_JUL length', NEG_NET_JUL.length, 10);
check('NEG_NET_JUL[0].n', NEG_NET_JUL[0].n, EXPECTED.negNetFirst.n);
check('NEG_NET_JUL[0].net', NEG_NET_JUL[0].net, EXPECTED.negNetFirst.net);

const PROMO_JUL = extractConst('PROMO_JUL');
check('PROMO_JUL dealer count', PROMO_JUL.length, EXPECTED.promo.count);
check('PROMO_JUL sum(i)', PROMO_JUL.reduce((a, d) => a + d.i, 0), EXPECTED.promo.i);
check('PROMO_JUL sum(t)', PROMO_JUL.reduce((a, d) => a + d.t, 0), EXPECTED.promo.t);
check('PROMO_JUL sum(p)', PROMO_JUL.reduce((a, d) => a + d.p, 0), EXPECTED.promo.p);
check('PROMO_JUL sum(a)', PROMO_JUL.reduce((a, d) => a + d.a, 0), EXPECTED.promo.a);
check('PROMO_JUL sum(m)', PROMO_JUL.reduce((a, d) => a + d.m, 0), EXPECTED.promo.m);

const dist = { '80%+': 0, '50~80%': 0, '30~50%': 0, '<30%': 0 };
PROMO_JUL.forEach((d) => {
  if (d.r >= 80) dist['80%+']++;
  else if (d.r >= 50) dist['50~80%']++;
  else if (d.r >= 30) dist['30~50%']++;
  else dist['<30%']++;
});
Object.keys(EXPECTED.distribution).forEach((k) =>
  check(`PROMO_JUL distribution ${k}`, dist[k], EXPECTED.distribution[k])
);

const STAGES_JUL = extractConst('STAGES_JUL');
check('STAGES_JUL nums', STAGES_JUL.map((s) => s.num).join(','), '600,569,509,493');

if (failed) {
  console.error('\nVerification FAILED');
  process.exit(1);
} else {
  console.log('\nAll checks passed');
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node scripts/verify-july-data.cjs`
Expected: throws `Error: const CONTRACT_TYPE_JUL not found in index.html` (non-zero exit).

- [ ] **Step 3: Add the July data consts to `index.html`**

Insert immediately after line 899 (the closing `];` of the June `STAGES` const) and before the `/* --------------------------- static tables --------------------------- */` comment:

```javascript
/* ================================================================
   JULY DATA — sourced from '26년 7월 대리점 수익성 분석.xlsx
   (sheets: 요약 / 7월 대리점별 상세 분석 / 상생 프로모션 충족률(%))
   All aggregates below are computed at render time from these
   per-dealer arrays — never hardcode a sum/percentage separately.
================================================================ */
const TOP_NET_JUL = [{n:"엠제이통신",p:39,net:18403942},{n:"우리편",p:56,net:14411087},{n:"현은시스템",p:33,net:3466105},{n:"그린정보통신",p:22,net:2907805},{n:"비에이치소프트",p:68,net:2187242},{n:"페이닷",p:5,net:1490049},{n:"가나정보통신",p:5,net:1442099},{n:"미르네프로",p:14,net:1399990},{n:"에스정보",p:5,net:946831},{n:"푸딘코",p:2,net:930020}];

const NEG_NET_JUL = [{n:"코스모스컴퍼니",p:2,net:-3730424},{n:"페이플레이 안양센터",p:1,net:-1179163},{n:"화인정보통신",p:3,net:-881750},{n:"지앤비시스템",p:4,net:-729198},{n:"샘랩",p:10,net:-518494},{n:"케이알정보통신",p:1,net:-335670},{n:"씨앤씨일신",p:1,net:-271300},{n:"전라정보통신",p:1,net:-231700},{n:"소프트커머스",p:0,net:-209011},{n:"베라 영남총판",p:1,net:-146250}];

/* 활성(실적>0) 40개사 전체 — 산점도용 */
const SCATTER_JUL = [{n:"비에이치소프트",p:68,net:2187242},{n:"미르네프로",p:14,net:1399990},{n:"우리편",p:56,net:14411087},{n:"엠제이통신",p:39,net:18403942},{n:"제이투시스템",p:1,net:119178},{n:"현은시스템",p:33,net:3466105},{n:"샘랩",p:10,net:-518494},{n:"케이씨정보통신",p:1,net:697213},{n:"전라정보통신",p:1,net:-231700},{n:"코스모스컴퍼니",p:2,net:-3730424},{n:"스피드",p:1,net:136075},{n:"화인정보통신",p:3,net:-881750},{n:"베라 영남총판",p:1,net:-146250},{n:"케이알정보통신",p:1,net:-335670},{n:"그린정보통신",p:22,net:2907805},{n:"페이플레이 안양센터",p:1,net:-1179163},{n:"더편한정보통신",p:3,net:-11632},{n:"이레페이",p:1,net:114912},{n:"페이닷",p:5,net:1490049},{n:"현페이먼트",p:1,net:374548},{n:"뱅크랜드",p:2,net:-19937},{n:"어시스트핏",p:1,net:-6727},{n:"원정보통신",p:1,net:-40403},{n:"신우정보통신",p:3,net:431979},{n:"트윈스정보통신",p:2,net:207692},{n:"제이엔디아이정보통신",p:1,net:2097},{n:"미르컴퍼니",p:2,net:-134000},{n:"푸딘코",p:2,net:930020},{n:"우성포스",p:3,net:379886},{n:"이지정보기술",p:2,net:680768},{n:"씨앤씨일신",p:1,net:-271300},{n:"가나정보통신",p:5,net:1442099},{n:"디에스이엔씨",p:1,net:-78439},{n:"오토뱅킹서비스",p:1,net:-27755},{n:"스타정보",p:2,net:152781},{n:"동양포스",p:2,net:51331},{n:"지앤비시스템",p:4,net:-729198},{n:"스타포스",p:1,net:185000},{n:"에스정보",p:5,net:946831},{n:"토브제이",p:1,net:149480}];

/* 계약 119개사 전체 (활성/휴면 포함) — 계약 유형별 집계는 런타임 계산 */
const CONTRACT_TYPE_JUL = [{n:"비에이치소프트",type:"(우수)협력대리점",net:2187242},{n:"미르네프로",type:"(우수)협력대리점",net:1399990},{n:"우리편",type:"(우수)위탁운영대리점",net:14411087},{n:"엠제이통신",type:"(우수)위탁운영대리점",net:18403942},{n:"제이투시스템",type:"(우수)협력대리점",net:119178},{n:"현은시스템",type:"일반협력대리점",net:3466105},{n:"샘랩",type:"일반위탁대리점",net:-518494},{n:"케이씨정보통신",type:"일반협력대리점",net:697213},{n:"전라정보통신",type:"일반협력대리점",net:-231700},{n:"미니플레이스",type:"일반협력대리점",net:4680},{n:"코스모스컴퍼니",type:"일반협력대리점",net:-3730424},{n:"스피드",type:"일반협력대리점",net:136075},{n:"화인정보통신",type:"일반협력대리점",net:-881750},{n:"베라 영남총판",type:"일반협력대리점",net:-146250},{n:"케이알정보통신",type:"일반협력대리점",net:-335670},{n:"그린정보통신",type:"일반협력대리점",net:2907805},{n:"페이플레이 안양센터",type:"일반협력대리점",net:-1179163},{n:"더편한정보통신",type:"일반협력대리점",net:-11632},{n:"이레페이",type:"일반협력대리점",net:114912},{n:"페이닷",type:"일반협력대리점",net:1490049},{n:"현페이먼트",type:"일반협력대리점",net:374548},{n:"뱅크랜드",type:"일반협력대리점",net:-19937},{n:"어시스트핏",type:"일반협력대리점",net:-6727},{n:"원정보통신",type:"일반협력대리점",net:-40403},{n:"나나정보통신",type:"일반협력대리점",net:-36944},{n:"신우정보통신",type:"일반협력대리점",net:431979},{n:"인터링크솔루션",type:"일반협력대리점",net:4221},{n:"트윈스정보통신",type:"일반협력대리점",net:207692},{n:"나이스포스",type:"일반협력대리점",net:-112925},{n:"한울정보",type:"일반협력대리점",net:21176},{n:"상생정보통신",type:"일반협력대리점",net:2896},{n:"연합정보통신",type:"일반협력대리점",net:-96045},{n:"제일정보통신",type:"일반협력대리점",net:52875},{n:"제이엔디아이정보통신",type:"일반협력대리점",net:2097},{n:"미르컴퍼니",type:"일반협력대리점",net:-134000},{n:"푸딘코",type:"일반위탁대리점",net:930020},{n:"포스트렌드",type:"일반협력대리점",net:-126815},{n:"우성포스",type:"일반협력대리점",net:379886},{n:"이지정보기술",type:"일반협력대리점",net:680768},{n:"씨앤씨일신",type:"일반협력대리점",net:-271300},{n:"럭키뱅크",type:"일반협력대리점",net:845},{n:"와이즈웹정보통신",type:"일반협력대리점",net:-63999},{n:"가나정보통신",type:"일반협력대리점",net:1442099},{n:"동진카드시스템",type:"일반협력대리점",net:-7796},{n:"디에스이엔씨",type:"일반협력대리점",net:-78439},{n:"미래통신",type:"일반협력대리점",net:-53028},{n:"오토뱅킹서비스",type:"일반협력대리점",net:-27755},{n:"더블유에스솔루션",type:"일반협력대리점",net:705},{n:"IMT정보통신",type:"일반협력대리점",net:10635},{n:"동아정보통신",type:"일반협력대리점",net:-25140},{n:"스타정보",type:"일반협력대리점",net:152781},{n:"아트컨티뉴페이",type:"일반협력대리점",net:0},{n:"한국카드포스",type:"일반협력대리점",net:0},{n:"에이치지엠 원더라이팅",type:"일반협력대리점",net:-1432},{n:"제이브로테크",type:"일반협력대리점",net:0},{n:"태은페이먼츠",type:"일반협력대리점",net:0},{n:"동양포스",type:"일반협력대리점",net:51331},{n:"에이치페이",type:"일반협력대리점",net:0},{n:"명인정보통신",type:"일반협력대리점",net:50985},{n:"탑정보통신",type:"일반협력대리점",net:56435},{n:"경인포스시스템",type:"일반협력대리점",net:-23511},{n:"토탈정보통신",type:"일반협력대리점",net:0},{n:"공룡통신(청평점)",type:"일반협력대리점",net:0},{n:"아이씨카드넷",type:"일반협력대리점",net:-4252},{n:"지앤비시스템",type:"일반위탁대리점",net:-729198},{n:"티온컴퍼니",type:"일반위탁대리점",net:54000},{n:"소프트커머스",type:"일반협력대리점",net:-209011},{n:"현대테크원",type:"일반협력대리점",net:0},{n:"더플러스",type:"일반협력대리점",net:0},{n:"제이에스컴퍼니",type:"일반협력대리점",net:371},{n:"알크POS",type:"일반협력대리점",net:0},{n:"부일정보",type:"일반협력대리점",net:0},{n:"TOP정보통신",type:"일반협력대리점",net:0},{n:"이지정보",type:"일반협력대리점",net:0},{n:"케이정보통신",type:"일반협력대리점",net:0},{n:"대영정보통신",type:"일반협력대리점",net:0},{n:"한국스마트정보",type:"일반협력대리점",net:0},{n:"대호통신포스",type:"일반협력대리점",net:0},{n:"이글통신",type:"일반협력대리점",net:0},{n:"디에이치시너지",type:"일반협력대리점",net:337431},{n:"미르주식회사",type:"일반협력대리점",net:33005},{n:"하나카드넷",type:"일반협력대리점",net:300},{n:"디온아이티",type:"일반협력대리점",net:0},{n:"케이투정보통신",type:"일반협력대리점",net:0},{n:"가람정보시스템",type:"일반협력대리점",net:0},{n:"비즈코리아",type:"일반협력대리점",net:0},{n:"알파시스템",type:"일반협력대리점",net:0},{n:"정인시스템",type:"일반협력대리점",net:20080},{n:"성우정보통신",type:"일반협력대리점",net:1865},{n:"은성피엔피(애드포인트)",type:"일반협력대리점",net:-10397},{n:"하나정보테크",type:"일반협력대리점",net:0},{n:"길정보통신",type:"일반협력대리점",net:0},{n:"다온정보통신",type:"일반협력대리점",net:0},{n:"주연정보통신",type:"일반협력대리점",net:0},{n:"태양정보통신",type:"일반협력대리점",net:0},{n:"로켓포스",type:"일반협력대리점",net:-6282},{n:"하나비즈케어",type:"일반협력대리점",net:0},{n:"울진정보통신",type:"일반협력대리점",net:420},{n:"IC정보통신",type:"일반협력대리점",net:0},{n:"스타포스",type:"일반협력대리점",net:185000},{n:"대원포스",type:"일반협력대리점",net:60},{n:"엠씨포스",type:"일반협력대리점",net:0},{n:"비젼포스",type:"일반협력대리점",net:0},{n:"아이포스",type:"일반협력대리점",net:0},{n:"OK정보통신",type:"일반협력대리점",net:0},{n:"스카이정보통신",type:"일반협력대리점",net:0},{n:"보나네트웍스",type:"일반협력대리점",net:85},{n:"한사랑식판선생님",type:"일반협력대리점",net:-4765},{n:"뉴텍이엔에스",type:"일반협력대리점",net:0},{n:"나눔정보통신",type:"일반협력대리점",net:0},{n:"우림정보",type:"일반협력대리점",net:0},{n:"에스정보",type:"일반협력대리점",net:946831},{n:"더존포스",type:"일반협력대리점",net:0},{n:"토브제이",type:"일반협력대리점",net:149480},{n:"하나포스",type:"일반협력대리점",net:0},{n:"제이에이치넷",type:"일반협력대리점",net:0},{n:"디에스케이컴퍼니",type:"일반협력대리점",net:0},{n:"지엠씨",type:"일반협력대리점",net:0},{n:"에스앤피단말기연합",type:"일반협력대리점",net:2710}];

/* i=설치수, t=토스페이 청약, p=통합결제 5건↑, a=조건 달성, r=충족률(%), m=최대 보상금 정책 (원자료 실측, 재계산 금지) */
const PROMO_JUL = [{n:"경인포스시스템",i:1,t:1,p:0,a:0,r:0,m:0},{n:"그린정보통신",i:16,t:4,p:16,a:4,r:25,m:280000},{n:"나나정보통신",i:1,t:1,p:1,a:1,r:100,m:70000},{n:"나이스포스",i:2,t:1,p:1,a:1,r:50,m:70000},{n:"동아정보통신",i:2,t:0,p:2,a:0,r:0,m:0},{n:"디에스이엔씨",i:8,t:8,p:7,a:7,r:87.5,m:490000},{n:"미래통신",i:2,t:2,p:2,a:2,r:100,m:140000},{n:"미르네프로",i:31,t:31,p:29,a:29,r:93.6,m:2030000},{n:"미르컴퍼니",i:1,t:1,p:1,a:1,r:100,m:70000},{n:"뱅크랜드",i:2,t:2,p:1,a:1,r:50,m:70000},{n:"베라 영남총판",i:1,t:1,p:1,a:1,r:100,m:70000},{n:"비에이치소프트",i:97,t:94,p:69,a:68,r:70.1,m:4760000},{n:"샘랩",i:7,t:6,p:3,a:3,r:42.9,m:210000},{n:"스타정보",i:6,t:6,p:6,a:6,r:100,m:420000},{n:"스피드",i:6,t:6,p:3,a:3,r:50,m:210000},{n:"신우정보통신",i:5,t:4,p:4,a:4,r:80,m:280000},{n:"씨앤씨일신",i:1,t:1,p:1,a:1,r:100,m:70000},{n:"어시스트핏",i:6,t:5,p:2,a:2,r:33.3,m:140000},{n:"에스정보",i:7,t:6,p:6,a:6,r:85.7,m:420000},{n:"엠제이통신",i:66,t:65,p:55,a:55,r:83.3,m:3850000},{n:"연합정보통신",i:3,t:3,p:3,a:3,r:100,m:210000},{n:"오토뱅킹서비스",i:1,t:1,p:1,a:1,r:100,m:70000},{n:"와이즈웹정보통신",i:1,t:1,p:1,a:1,r:100,m:70000},{n:"우리편",i:142,t:141,p:129,a:129,r:91.5,m:9030000},{n:"우성포스",i:4,t:3,p:3,a:3,r:75,m:210000},{n:"원정보통신",i:7,t:7,p:5,a:5,r:71.4,m:350000},{n:"이레페이",i:2,t:2,p:2,a:2,r:100,m:140000},{n:"전라정보통신",i:1,t:1,p:1,a:1,r:100,m:70000},{n:"제이엔디아이정보통신",i:1,t:1,p:1,a:1,r:100,m:70000},{n:"제이투시스템",i:1,t:1,p:0,a:0,r:0,m:0},{n:"소프트커머스",i:3,t:2,p:1,a:1,r:33.3,m:70000},{n:"지앤비시스템",i:15,t:14,p:8,a:8,r:53.3,m:560000},{n:"케이씨정보통신",i:20,t:19,p:19,a:19,r:100,m:1330000},{n:"케이알정보통신",i:11,t:11,p:11,a:11,r:100,m:770000},{n:"코스모스컴퍼니",i:42,t:42,p:39,a:39,r:92.9,m:2730000},{n:"토브제이",i:3,t:3,p:3,a:3,r:100,m:210000},{n:"트윈스정보통신",i:1,t:1,p:1,a:1,r:100,m:70000},{n:"페이닷",i:5,t:5,p:5,a:5,r:100,m:350000},{n:"페이플레이 안양센터",i:1,t:1,p:1,a:1,r:100,m:70000},{n:"포스트렌드",i:2,t:1,p:1,a:1,r:50,m:70000},{n:"푸딘코",i:2,t:2,p:2,a:2,r:100,m:140000},{n:"현은시스템",i:47,t:46,p:46,a:46,r:97.9,m:3220000},{n:"현페이먼트",i:4,t:4,p:4,a:4,r:100,m:280000},{n:"화인정보통신",i:13,t:12,p:12,a:11,r:84.6,m:770000}];

const STAGES_JUL = [
  {name:'설치수',             label:['설치수'],                num:600},
  {name:'토스페이 청약 완료',   label:['토스페이','청약 완료'],    num:569},
  {name:'통합결제창 5건 이상',  label:['통합결제창','5건 이상'],   num:509},
  {name:'조건 달성',           label:['조건 달성'],             num:493}
];

/* 참고용 보상 정책 표 — 재계산에 쓰지 않음 (전역 제약 참조) */
const REWARD_TIERS_JUL = [
  {type:'(우수)위탁운영대리점', target:'우리편', rows:[['101~150','30,000'],['151~200','50,000'],['201~','70,000']]},
  {type:'(우수)위탁운영대리점', target:'엠제이통신(아정당)', rows:[['51~100','20,000'],['101~150','30,000'],['151~','40,000']]},
  {type:'(우수)협력대리점', target:'미르네프로', rows:[['101~150','50,000'],['151~200','70,000'],['201~','100,000']]},
  {type:'(우수)협력대리점', target:'제이투시스템', rows:[['51~100','50,000'],['101~150','70,000'],['151~','100,000']]},
  {type:'(우수)협력대리점', target:'비에이치소프트', rows:[['51~100','20,000'],['101~150','30,000'],['151~','40,000']]},
  {type:'일반위탁대리점', target:'샘랩·지앤비·푸딘코 등', rows:[['5~10','30,000'],['11~20','50,000'],['21대 이상','70,000']]},
  {type:'일반협력대리점', target:'일반협력대리점 전체', rows:[['5~15','50,000'],['16~30','70,000'],['30~','100,000']]}
];
```

- [ ] **Step 4: Run the verification script again to confirm it passes**

Run: `node scripts/verify-july-data.cjs`
Expected: every line prints `PASS`, final line `All checks passed`, exit code 0.

- [ ] **Step 5: Commit**

```bash
git add index.html scripts/verify-july-data.cjs
git commit -m "Add July data arrays with verification script

Pins the per-dealer July figures (top/bottom net revenue, active-dealer
scatter, contract-type breakdown, promotion fulfillment) as literal
consts, plus a Node script that cross-checks their derived totals
against the source spreadsheet."
```

---

## Task 2: July panel shell + 수익성 요약 subtab

**Files:**
- Modify: `index.html` lines 364–370 (sidebar `monthNav`), line 374 (sidebar footer note), line 718–725 (`PENDING_MONTHS`), and insert a new static panel after line 708 (end of `panel-jun`)

**Interfaces:**
- Consumes: nothing from Task 1 (this task only touches page chrome + the 요약 subtab, which uses literal HTML numbers, matching June's existing pattern — no array needed for this subtab).
- Produces: `<div id="panel-jul">` container with three `<div class="subpanel" data-sub="...">` children — `summary` (fully built in this task), `detail` and `promo` (empty stub `<div class="subpanel" data-sub="detail"></div>` / `data-sub="promo"` for Tasks 3–4 to fill in). Also produces `BUILDERS.chartRevenueJul` and `BUILDERS.chartCostJul`.

- [ ] **Step 1: Remove July from the sidebar note and `PENDING_MONTHS`**

In `index.html` line 374, change:
```html
    <div class="sidebar-note">7~12월은 데이터 전달 시 6월과 동일한 구조로 채워집니다.</div>
```
to:
```html
    <div class="sidebar-note">8~12월은 데이터 전달 시 6월과 동일한 구조로 채워집니다.</div>
```

At line 710, change the comment:
```html
  <!-- ====== JULY–DECEMBER (skeletons, generated from PENDING_MONTHS) ====== -->
```
to:
```html
  <!-- ====== AUGUST–DECEMBER (skeletons, generated from PENDING_MONTHS) ====== -->
```

At line 718–725, remove the `jul` entry from `PENDING_MONTHS` so it reads:
```javascript
const PENDING_MONTHS = [
  { key:'aug', num:8,  badge:'데이터 대기' },
  { key:'sep', num:9,  badge:'데이터 대기' },
  { key:'oct', num:10, badge:'데이터 대기' },
  { key:'nov', num:11, badge:'데이터 대기' },
  { key:'dec', num:12, badge:'데이터 대기' },
];
```

- [ ] **Step 2: Add July to the static sidebar nav**

In `index.html`, replace lines 364–370:
```html
  <ul class="month-nav" id="monthNav">
    <li class="month-item">
      <button class="month-btn active" data-month="jun">
        <span>6월</span><span class="badge">완료</span>
      </button>
    </li>
  </ul>
```
with:
```html
  <ul class="month-nav" id="monthNav">
    <li class="month-item">
      <button class="month-btn active" data-month="jun">
        <span>6월</span><span class="badge">완료</span>
      </button>
    </li>
    <li class="month-item">
      <button class="month-btn" data-month="jul">
        <span>7월</span><span class="badge">완료</span>
      </button>
    </li>
  </ul>
```

- [ ] **Step 3: Insert the static July panel shell with the 요약 subtab, right after `panel-jun`'s closing `</div>` (line 708) and before the `<!-- ====== AUGUST–DECEMBER` comment**

```html
  <div id="panel-jul" class="month-panel" style="display:none;">
    <div class="page-eyebrow">2026 · 07 MONTHLY</div>
    <h1 class="page-title">7월 대리점 수익성 대시보드</h1>
    <div class="page-sub">7월 대리점별 상세 · 상생 프로모션 충족률</div>
    <div class="meta-row">
      <span>단위 <b>원 (VAT 제외)</b></span>
      <span>집계 대리점 <b>119개사</b> · 활성 <b>40개사</b></span>
      <span>인건비 제외</span>
    </div>

    <div class="subtabs" data-scope="jul">
      <button class="subtab-btn active" data-sub="summary"><span class="snum">1</span>7월 대리점 수익성 요약</button>
      <button class="subtab-btn" data-sub="detail"><span class="snum">2</span>7월 대리점 상세</button>
      <button class="subtab-btn" data-sub="promo"><span class="snum">3</span>상생 프로모션 충족률</button>
    </div>

    <!-- ---- Sub 1: 수익성 요약 ---- -->
    <div class="subpanel active" data-sub="summary">
      <div class="callout">
        <ul>
          <li>7월 실적은 <b>306건</b>으로 6월(411건) 대비 <b>25.5% 감소</b>했지만, 순이익은 <b>73.2M</b>(6월 37.0M 대비 +97.8%), ROI는 <b>91.46%</b>(6월 27.03%에서 +64.4%p)로 크게 개선됐습니다.</li>
          <li>개선 원인은 비용 구조입니다. <b>무상임대(프론트) 비용이 33.0M로 6월(106.9M) 대비 크게 줄어든 반면</b>, 상생 프로모션(34.5M)·밴피(8.8M) 등 수익 항목은 유지되며 총비용이 총수익보다 훨씬 큰 폭으로 감소했습니다.</li>
        </ul>
      </div>

      <section class="block">
        <div class="block-head">
          <h3 class="block-title">7월 수익성 요약</h3>
          <span class="block-desc">요약 시트 · 전사 집계</span>
        </div>
        <div class="card-grid">
          <div class="stat-card">
            <div class="stat-label">7월 실적 (승인)</div>
            <div class="stat-value">306건</div>
            <div class="stat-foot">6월 411건 · <span class="neg">−25.5%</span></div>
          </div>
          <div class="stat-card">
            <div class="stat-label">순이익</div>
            <div class="stat-value pos">73,216,902</div>
            <div class="stat-foot">6월 37,010,728 · <span class="pos">+97.8%</span></div>
          </div>
          <div class="stat-card">
            <div class="stat-label">ROI</div>
            <div class="stat-value pos">91.46%</div>
            <div class="stat-foot">6월 27.03% · <span class="pos">+64.4%p</span></div>
          </div>
          <div class="stat-card">
            <div class="stat-label">건당 순이익</div>
            <div class="stat-value">23.9만원</div>
            <div class="stat-foot">73.22M ÷ 306건 = 239,271원</div>
          </div>
        </div>
      </section>

      <section class="block">
        <div class="block-head">
          <h3 class="block-title">7월 수익성 분석 (전체 내역)</h3>
          <span class="block-desc">총비용 · 총수익 항목별 · 요약 시트 기반</span>
        </div>
        <div class="table-wrap">
          <table>
            <tbody>
              <tr class="total"><td>실적</td><td class="num">306 건</td></tr>
              <tr class="total hl"><td>순이익</td><td class="num pos">73,216,902</td></tr>
              <tr class="total"><td>ROI</td><td class="num">91.46%</td></tr>

              <tr class="total"><td>총 비용</td><td class="num neg">80,051,639</td></tr>
              <tr class="subtle"><td>&nbsp;&nbsp;프로모션</td><td class="num">15,070,000</td></tr>
              <tr class="leaf"><td>프로모션 보상금</td><td class="num">13,850,000</td></tr>
              <tr class="leaf"><td>마케팅 지원금</td><td class="num">1,220,000</td></tr>
              <tr class="subtle"><td>&nbsp;&nbsp;장비 원가</td><td class="num">62,477,639</td></tr>
              <tr class="leaf"><td>무상임대 (프론트만)</td><td class="num">33,020,000</td></tr>
              <tr class="leaf"><td>CMS 장비 (감가)</td><td class="num">29,457,639</td></tr>
              <tr class="subtle"><td>&nbsp;&nbsp;물류비</td><td class="num">2,504,000</td></tr>

              <tr class="total"><td>총 수익</td><td class="num pos">153,268,541</td></tr>
              <tr class="subtle"><td>&nbsp;&nbsp;토스수수료</td><td class="num">59,782,540</td></tr>
              <tr class="leaf"><td>설치수수료</td><td class="num">47,350,000</td></tr>
              <tr class="leaf"><td>청약수수료</td><td class="num">4,110,000</td></tr>
              <tr class="leaf"><td>유지수수료</td><td class="num">8,322,540</td></tr>
              <tr class="subtle"><td>&nbsp;&nbsp;토스프로모션</td><td class="num">59,470,000</td></tr>
              <tr class="leaf"><td>(토플) 프론트 설치 12만원</td><td class="num">24,960,000</td></tr>
              <tr class="leaf"><td>상생 프로모션</td><td class="num">34,510,000</td></tr>
              <tr class="subtle"><td>&nbsp;&nbsp;밴피</td><td class="num">8,767,341</td></tr>
              <tr class="subtle"><td>&nbsp;&nbsp;CMS (구CMS + NEW CMS)</td><td class="num">23,283,660</td></tr>
              <tr class="subtle"><td>&nbsp;&nbsp;장비판매대금 (중고)</td><td class="num">1,965,000</td></tr>
            </tbody>
          </table>
        </div>
        <div class="note">
          <b>실적</b> 306건은 7월 승인건수 합계 · <b>순이익</b> 73,216,902원 = 총수익 153,268,541 − 총비용 80,051,639 · <b>ROI</b> 91.46% = 순이익 ÷ 총비용<br>
          * 인건비 확인 불가로 제외 · <b>밴피·상생 프로모션은 원자료 실측값</b>(6월과 달리 추정치 아님)
        </div>
      </section>

      <section class="block">
        <div class="block-head">
          <h3 class="block-title">수익·비용 구성</h3>
          <span class="block-desc">항목별 비중</span>
        </div>
        <div class="chart-grid">
          <div class="chart-card">
            <h4>총수익 구성</h4>
            <div class="sub">153.27M · 토스수수료가 39%</div>
            <div class="chart-box"><canvas id="chartRevenueJul"></canvas></div>
          </div>
          <div class="chart-card">
            <h4>총비용 구성</h4>
            <div class="sub">80.05M · 장비 원가(무상임대+CMS감가)가 78%</div>
            <div class="chart-box"><canvas id="chartCostJul"></canvas></div>
          </div>
        </div>
        <div class="note">* 비중은 각 조각에 직접 표기했습니다. 정확한 금액은 위 <b>수익성 분석 표</b>를 참고하세요.</div>
      </section>
    </div>

    <!-- ---- Sub 2: 대리점 상세 (Task 3에서 채움) ---- -->
    <div class="subpanel" data-sub="detail"></div>

    <!-- ---- Sub 3: 상생 프로모션 충족률 (Task 4에서 채움) ---- -->
    <div class="subpanel" data-sub="promo"></div>
  </div>
```

- [ ] **Step 4: Add the two July donut charts to `BUILDERS`**

In `index.html`, inside the `BUILDERS` object (starts line 1030), add these two entries right after `chartCostJun` (after line 1042, before `chartTopNet`):

```javascript
  chartRevenueJul: el => donut(
    el,
    ['토스수수료','토스프로모션','CMS','밴피','장비판매대금'],
    [59782540, 59470000, 23283660, 8767341, 1965000],
    P().cat
  ),
  chartCostJul: el => donut(
    el,
    ['무상임대 (프론트)','CMS 감가','물류비','프로모션'],
    [33020000, 29457639, 2504000, 15070000],
    P().cat.slice(0, 4)
  ),
```

- [ ] **Step 5: Verify in the browser**

Start a static file server from the project root (any of these work — use whichever succeeds first):
```bash
npx --yes http-server -p 8080 -c-1
```

Then, using the claude-in-chrome tools:
1. Load `ToolSearch` with `select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__read_console_messages`
2. Open a new tab, navigate to `http://localhost:8080/index.html`
3. Read console messages — expect none
4. Click the "7월" sidebar button
5. Confirm the page title changes to "7월 대리점 수익성 대시보드", the 4 KPI cards show 306건/73,216,902/91.46%/23.9만원 with the MoM sub-text, and both donut charts render (no blank canvases)
6. Toggle dark/light mode and re-check both donuts re-render without console errors
7. Click back to "6월" and confirm June is unaffected (same numbers as before this task)

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "Add July panel shell and 수익성 요약 subtab

Promotes July from the JS-generated skeleton to hand-authored static
markup (matching June's pattern), with the summary subtab fully
populated including month-over-month KPI deltas. Detail and promo
subtabs are empty stubs, filled in by the next two tasks."
```

---

## Task 3: 대리점 상세 subtab + 계약 유형별 수익성 section

**Files:**
- Modify: `index.html` — replace the empty `<div class="subpanel" data-sub="detail"></div>` stub added in Task 2, and add render/chart code to the script section

**Interfaces:**
- Consumes: `TOP_NET_JUL`, `NEG_NET_JUL`, `SCATTER_JUL`, `CONTRACT_TYPE_JUL` (from Task 1); `won()`, `P()`, `hBar()`, `donut()`, `inkDim()`, `gridLine()`, `surface()`, `ink()` (existing helpers).
- Produces: `groupByContractType()` helper, `CONTRACT_TYPE_GROUPS_JUL` derived array, `groupedBar()` chart helper, `BUILDERS.chartTopNetJul`/`chartNegNetJul`/`chartScatterJul`/`chartContractTypeJul` — all consumed only by the browser at render time, no other task depends on their names.

- [ ] **Step 1: Replace the empty detail stub with full markup**

Replace:
```html
    <!-- ---- Sub 2: 대리점 상세 (Task 3에서 채움) ---- -->
    <div class="subpanel" data-sub="detail"></div>
```
with:
```html
    <!-- ---- Sub 2: 대리점 상세 ---- -->
    <div class="subpanel" data-sub="detail">
      <div class="callout">7월에 <b>설치 실적이 있는 40개 대리점</b>을 수익성(순매출)과 설치 건수 기준으로 분석했습니다. <b>순매출</b> = 대리점이 벌어들인 수익에서 장비원가 등 원가를 뺀 실제 손익.</div>

      <section class="block">
        <div class="block-head">
          <h3 class="block-title">핵심 인사이트</h3>
          <span class="block-desc">7월 상세 데이터에서 직접 계산</span>
        </div>
        <div class="insight-grid">
          <div class="insight-card">
            <h4>계약 대리점 3곳 중 1곳만 실제 활동</h4>
            <p>계약된 <b>119개사 중 7월에 설치 실적이 있는 곳은 40개사(34%)</b>뿐. 6월(118개사 중 39개사, 33%)과 거의 같은 비율입니다.</p>
          </div>
          <div class="insight-card">
            <h4>수익이 소수 대리점에 쏠려 있음</h4>
            <p>활동 40개사 순매출의 <b>85%를 상위 3개사</b>가 차지(엠제이통신·우리편·현은시스템). 6월보다 더 좁은 상위 3곳 집중 구조입니다.</p>
          </div>
          <div class="insight-card">
            <h4>계약 유형이 실적 순위보다 수익성을 잘 설명</h4>
            <p>설치 건수 1위는 <b>우리편(56건)</b>이 아니라 <b>비에이치소프트(68건)</b>지만, 순매출은 우리편이 6.6배 많습니다. 아래 <b>계약 유형별 수익성</b>에서 그 이유를 다룹니다.</p>
          </div>
          <div class="insight-card">
            <h4>활동 대리점 10곳 중 4곳이 적자</h4>
            <p>실적 있는 40개사 중 <b>16개사(40%)가 적자</b>. 전체 대리점(119개사) 기준으로는 31개사가 적자입니다.</p>
          </div>
        </div>
      </section>

      <section class="block">
        <div class="block-head">
          <h3 class="block-title">수익성 상위 대리점</h3>
          <span class="block-desc">순매출 상위 10개사</span>
        </div>
        <div class="chart-grid">
          <div class="chart-card">
            <h4>순매출 상위 대리점</h4>
            <div class="sub">순매출 기준 · 원</div>
            <div class="chart-box tall"><canvas id="chartTopNetJul"></canvas></div>
          </div>
          <div class="chart-card">
            <h4>실적 대비 순매출 효율</h4>
            <div class="sub">건수 · 순매출 · 건당</div>
            <div class="table-wrap">
              <table id="tblTopNetJul">
                <thead><tr><th>대리점</th><th class="num">실적</th><th class="num">순매출</th><th class="num">건당</th></tr></thead>
                <tbody></tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section class="block">
        <div class="block-head">
          <h3 class="block-title">수익성 하위 대리점 (적자)</h3>
          <span class="block-desc">순매출 마이너스 · 하위 10개사</span>
        </div>
        <div class="callout warn"><b>전체 119개사 중 31개사가 순매출 마이너스</b>입니다. 아래는 손실 규모가 가장 큰 10곳입니다.</div>
        <div class="chart-grid">
          <div class="chart-card">
            <h4>순매출 적자 대리점</h4>
            <div class="sub">순매출 마이너스 · 원</div>
            <div class="chart-box tall"><canvas id="chartNegNetJul"></canvas></div>
          </div>
          <div class="chart-card">
            <h4>적자 대리점 상세</h4>
            <div class="sub">실적 · 순매출</div>
            <div class="table-wrap">
              <table id="tblNegNetJul">
                <thead><tr><th>대리점</th><th class="num">실적</th><th class="num">순매출</th></tr></thead>
                <tbody></tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section class="block">
        <div class="block-head">
          <h3 class="block-title">실적 대비 순매출 분포</h3>
          <span class="block-desc">활성 40개사 · 실적(X) · 순매출(Y)</span>
        </div>
        <div class="chart-card">
          <div class="chart-box tall"><canvas id="chartScatterJul"></canvas></div>
        </div>
        <div class="note">* 가로축은 설치 건수, 세로축은 순매출. <b>0선 아래는 적자</b>입니다.</div>
      </section>

      <section class="block">
        <div class="block-head">
          <h3 class="block-title">계약 유형별 수익성</h3>
          <span class="block-desc">4개 유형 · 순매출 기준 · 119개사 전체</span>
        </div>
        <div class="callout" id="contractTypeInsight"></div>
        <div class="chart-grid">
          <div class="chart-card">
            <h4>유형별 순매출 비교</h4>
            <div class="sub">순매출 합계 vs 대리점당 평균 · 원</div>
            <div class="chart-box tall"><canvas id="chartContractTypeJul"></canvas></div>
          </div>
          <div class="chart-card">
            <h4>계약 유형별 집계</h4>
            <div class="sub">대리점 수 · 순매출 · 비중</div>
            <div class="table-wrap">
              <table id="tblContractTypeJul">
                <thead><tr><th>계약 유형</th><th class="num">대리점 수</th><th class="num">순매출 합계</th><th class="num">대리점당 평균</th><th class="num">비중</th></tr></thead>
                <tbody></tbody>
              </table>
            </div>
          </div>
        </div>
        <div class="note">* 별도 탭 없이 이 섹션 하나로 계약 유형별 차이를 보여줍니다. 뷰 전환 버튼이나 대리점명 나열은 넣지 않았습니다 — 2026-07-29에 삭제된 "계약 유형별 상세" 탭이 구조만 있고 결론이 약하다는 지적을 받았기 때문입니다.</div>
      </section>
    </div>
```

- [ ] **Step 2: Add the render logic for the top/bottom/scatter tables**

In `index.html`'s script section, right after the existing `(function renderNegNet(){ ... })();` IIFE (ends at line 921) and before `(function renderPromo(){` (line 923), insert:

```javascript
(function renderTopNetJul(){
  document.querySelector('#tblTopNetJul tbody').innerHTML = TOP_NET_JUL.map((d, i) => `
    <tr class="${i < 3 ? 'r' + (i + 1) : ''}">
      <td><span class="rank">${i + 1}</span>${d.n}</td>
      <td class="num">${d.p}</td>
      <td class="num pos">${won(d.net)}</td>
      <td class="num">${Math.round(d.net / d.p).toLocaleString()}</td>
    </tr>`).join('');
})();

(function renderNegNetJul(){
  document.querySelector('#tblNegNetJul tbody').innerHTML = NEG_NET_JUL.map(d => `
    <tr>
      <td>${d.n}</td>
      <td class="num">${d.p}</td>
      <td class="num neg">−${won(Math.abs(d.net))}</td>
    </tr>`).join('');
})();

/* ---- 계약 유형별 수익성 — 그룹 집계는 런타임 계산, 하드코딩 금지 ---- */
function groupByContractType(list) {
  const map = new Map();
  list.forEach(d => {
    if (!map.has(d.type)) map.set(d.type, { type: d.type, count: 0, sum: 0 });
    const g = map.get(d.type);
    g.count++;
    g.sum += d.net;
  });
  const total = list.reduce((a, d) => a + d.net, 0);
  return [...map.values()]
    .map(g => ({ ...g, avg: g.sum / g.count, share: (g.sum / total) * 100 }))
    .sort((a, b) => b.sum - a.sum);
}
const CONTRACT_TYPE_GROUPS_JUL = groupByContractType(CONTRACT_TYPE_JUL);

(function renderContractTypeJul(){
  document.querySelector('#tblContractTypeJul tbody').innerHTML = CONTRACT_TYPE_GROUPS_JUL.map(g => `
    <tr>
      <td>${g.type}</td>
      <td class="num">${g.count}</td>
      <td class="num ${g.sum >= 0 ? 'pos' : 'neg'}">${g.sum >= 0 ? '' : '−'}${won(Math.abs(g.sum))}</td>
      <td class="num ${g.avg >= 0 ? 'pos' : 'neg'}">${g.avg >= 0 ? '' : '−'}${won(Math.abs(g.avg))}</td>
      <td class="num">${g.share.toFixed(1)}%</td>
    </tr>`).join('');

  const wtOp = CONTRACT_TYPE_GROUPS_JUL.find(g => g.type === '(우수)위탁운영대리점');
  const general = CONTRACT_TYPE_GROUPS_JUL.find(g => g.type === '일반협력대리점');
  const genOp = CONTRACT_TYPE_GROUPS_JUL.find(g => g.type === '일반위탁대리점');
  document.getElementById('contractTypeInsight').innerHTML =
    `<b>${wtOp.type}</b> ${wtOp.count}곳이 전체 순매출의 <b>${wtOp.share.toFixed(0)}%</b>를 차지합니다. `
    + `반면 ${general.count}곳인 <b>${general.type}</b>은 합쳐도 ${general.share.toFixed(0)}%뿐이고, `
    + `<b>${genOp.type}</b> ${genOp.count}곳은 오히려 순손실(−${won(Math.abs(genOp.sum))})입니다.`;
})();
```

- [ ] **Step 3: Add the `groupedBar` chart helper and the four new `BUILDERS` entries**

Right after the existing `hBar()` function definition (ends at line 1028) and before `const BUILDERS = {` (line 1030), add:

```javascript
function groupedBar(el, labels, datasets){
  return new Chart(el, {
    type:'bar',
    data:{ labels, datasets },
    options:{
      maintainAspectRatio:false,
      plugins:{
        legend:{ position:'top', labels:{ color:inkDim(), boxWidth:10, font:{size:11} } },
        tooltip:{ callbacks:{ label: c => ' ' + c.dataset.label + ' ' + won(c.raw) + '원' } },
        datalabels:{ display:false }
      },
      scales:{
        x:{ grid:{ display:false }, border:{ display:false }, ticks:{ color:inkDim(), font:{size:10.5} } },
        y:{ grid:{ color:gridLine() }, border:{ display:false }, ticks:{ color:inkDim(), font:{size:11}, callback: v => won(v) } }
      }
    }
  });
}
```

Inside the `BUILDERS` object, right after `chartCostJul` (added in Task 2) and before `chartTopNet`, add:

```javascript
  chartTopNetJul: el => hBar(el, TOP_NET_JUL.map(d => d.n), TOP_NET_JUL.map(d => d.net), P().pos, false),
  chartNegNetJul: el => hBar(el, NEG_NET_JUL.map(d => d.n), NEG_NET_JUL.map(d => d.net), P().neg, true),

  chartScatterJul: el => new Chart(el, {
    type:'scatter',
    data:{ datasets:[
      { label:'흑자',
        data: SCATTER_JUL.filter(d => d.net >= 0).map(d => ({x:d.p, y:d.net, n:d.n})),
        backgroundColor:P().pos, pointRadius:6, pointHoverRadius:8,
        pointBorderColor:surface(), pointBorderWidth:2 },
      { label:'적자',
        data: SCATTER_JUL.filter(d => d.net < 0).map(d => ({x:d.p, y:d.net, n:d.n})),
        backgroundColor:P().neg, pointStyle:'triangle', pointRadius:7, pointHoverRadius:9,
        pointBorderColor:surface(), pointBorderWidth:2 }
    ]},
    options:{
      maintainAspectRatio:false,
      plugins:{
        legend:{ position:'top', labels:{ color:inkDim(), boxWidth:10, usePointStyle:true, font:{size:11} } },
        tooltip:{ callbacks:{ label: c => ' ' + c.raw.n + ' · 실적 ' + c.raw.x + '건 · 순매출 ' + won(c.raw.y) + '원' } }
      },
      scales:{
        x:{ title:{ display:true, text:'7월 실적 (건)', color:inkDim(), font:{size:11} },
            grid:{ color:gridLine() }, border:{ display:false },
            ticks:{ color:inkDim(), font:{size:11} } },
        y:{ title:{ display:true, text:'순매출 (원)', color:inkDim(), font:{size:11} },
            grid:{ color: c => c.tick.value === 0 ? inkDim() : gridLine() }, border:{ display:false },
            ticks:{ color:inkDim(), font:{size:11}, callback: v => won(v) } }
      }
    }
  }),

  chartContractTypeJul: el => groupedBar(
    el,
    CONTRACT_TYPE_GROUPS_JUL.map(g => g.type),
    [
      { label:'순매출 합계', data: CONTRACT_TYPE_GROUPS_JUL.map(g => g.sum), backgroundColor: P().cat[0], borderRadius:4 },
      { label:'대리점당 평균', data: CONTRACT_TYPE_GROUPS_JUL.map(g => g.avg), backgroundColor: P().cat[1], borderRadius:4 }
    ]
  ),
```

- [ ] **Step 4: Run the data verification script (unaffected by this task, but confirms no accidental edit to the `*_JUL` consts)**

Run: `node scripts/verify-july-data.cjs`
Expected: `All checks passed`.

- [ ] **Step 5: Verify in the browser**

With the same local server running from Task 2:
1. Reload, click "7월" → "7월 대리점 상세" subtab
2. Confirm 4 insight cards render with the text above
3. Confirm 순매출 상위 10 chart + table show 엠제이통신 first (18,403,942)
4. Confirm 적자 하위 10 chart + table show 코스모스컴퍼니 first (−3,730,424)
5. Confirm the scatter plot renders 40 points, no console errors
6. Confirm the new "계약 유형별 수익성" section: table has exactly 4 rows summing to 119 대리점 수, the callout sentence renders with real percentages (not `undefined` or `NaN`), and the grouped bar chart shows 4 category groups with 2 bars each
7. Toggle theme, confirm charts re-render cleanly
8. Click "6월" and confirm June's 대리점 상세 tab is byte-for-byte unaffected

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "Fill July 대리점 상세 subtab, add 계약 유형별 수익성 section

Reuses June's top/bottom-net and scatter patterns for July's real
data, and adds a new contract-type profitability breakdown computed
at render time from the per-dealer type field already present in the
source spreadsheet (no separate hardcoded aggregate)."
```

---

## Task 4: 상생 프로모션 충족률 subtab + 보상 티어 정책 표

**Files:**
- Modify: `index.html` — replace the empty `<div class="subpanel" data-sub="promo"></div>` stub added in Task 2, and add render/chart code

**Interfaces:**
- Consumes: `PROMO_JUL`, `STAGES_JUL`, `REWARD_TIERS_JUL` (from Task 1); `won()`, `P()`, `ink()`, `inkDim()`, `gridLine()` (existing helpers).
- Produces: `BUILDERS.chartStageFunnelJul`/`chartFunnelDistJul`. No other task depends on these names.

- [ ] **Step 1: Replace the empty promo stub with full markup**

Replace:
```html
    <!-- ---- Sub 3: 상생 프로모션 충족률 (Task 4에서 채움) ---- -->
    <div class="subpanel" data-sub="promo"></div>
```
with:
```html
    <!-- ---- Sub 3: 상생 프로모션 충족률 ---- -->
    <div class="subpanel" data-sub="promo">
      <div class="callout">상생 프로모션 <b>조건 달성 퍼널</b>과 대리점별 충족 현황, 구간별 분포입니다. 조건은 <b>토스페이 청약 + 통합결제창 5건 이상</b>입니다. 집계 기간은 <b>5/18~6/30</b>(누적)로, 위 대리점 상세의 7월 실적과는 별개 기간입니다.</div>

      <section class="block">
        <div class="block-head">
          <h3 class="block-title">조건 달성 퍼널</h3>
          <span class="block-desc">설치 → 청약 → 결제 → 조건 달성</span>
        </div>
        <div class="funnel-strip" id="funnelStripJul"></div>

        <div class="chart-card" style="margin-bottom:14px">
          <h4>단계별 잔존 건수</h4>
          <div class="sub">막대 길이 = 해당 단계까지 남은 건수 · 설치 600건 기준</div>
          <div class="chart-box" style="height:230px"><canvas id="chartStageFunnelJul"></canvas></div>
        </div>

        <div class="kpi-flow">
          <div class="kpi-box"><div class="v pos">34,510,000원</div><div class="l">확보 (조건 달성) · 493건 · 달성률 82.2%</div></div>
          <div class="kpi-box"><div class="v warn">16,050,000원</div><div class="l">미충족 (관리 필요) · 107건 · 미달 17.8%</div></div>
        </div>
        <div class="progress"><div class="done" style="width:82.2%"></div><div class="todo" style="width:17.8%"></div></div>
        <div class="callout">청약(569) → 결제(509) 구간에서 <b>60건이 이탈</b>해 가장 큰 감소 구간입니다. 6월(65.7%)보다 충족률이 <b>16.5%p 개선</b>됐습니다.</div>
      </section>

      <section class="block">
        <div class="block-head">
          <h3 class="block-title">대리점별 충족 현황</h3>
          <span class="block-desc">44개사 · 충족률 내림차순</span>
        </div>
        <div class="table-wrap scroll">
          <table id="tblPromoJul">
            <thead><tr>
              <th>대리점</th>
              <th class="num">설치수</th><th class="num">토스페이 청약</th><th class="num">통합결제 5건↑</th>
              <th class="num">조건 달성</th><th class="num">충족률</th><th class="num">최대 보상금</th>
            </tr></thead>
            <tbody></tbody>
          </table>
        </div>
        <div class="note">* <b>최대 보상금</b>은 원자료의 계산값을 그대로 표시했습니다 (추정 아님).</div>
      </section>

      <section class="block">
        <div class="block-head">
          <h3 class="block-title">충족률 구간 분포</h3>
          <span class="block-desc">44개사 · 구간별 대리점 수</span>
        </div>
        <div class="chart-grid">
          <div class="chart-card">
            <h4>충족률 구간별 대리점 수</h4>
            <div class="sub">막대 = 대리점 수 (전체 44개사)</div>
            <div class="chart-box tall"><canvas id="chartFunnelDistJul"></canvas></div>
          </div>
          <div class="chart-card">
            <h4>구간 명단</h4>
            <div class="sub">양극화 구조 확인</div>
            <div class="chip-group">
              <div class="ct" id="ctHiJul">100% 완전 달성</div>
              <div class="chips" id="chipsHiJul"></div>
            </div>
            <div class="chip-group">
              <div class="ct" id="ctLoJul">50% 이하 저조</div>
              <div class="chips" id="chipsLoJul"></div>
            </div>
          </div>
        </div>
      </section>

      <section class="block">
        <div class="block-head">
          <h3 class="block-title">보상 티어 정책</h3>
          <span class="block-desc">계약 유형 × 설치 구간별 추가 지급액 · 참고용</span>
        </div>
        <div class="table-wrap">
          <table id="tblRewardTiersJul">
            <thead><tr><th>구분</th><th>대리점 정보</th><th>설치 구간</th><th class="num">추가 금액 (건당)</th></tr></thead>
            <tbody></tbody>
          </table>
        </div>
        <div class="note">* 이 표는 참고용입니다. 기본 지급(건당 30,000원, 조건 미달성 시에도 지급)에 조건 달성 시 설치 구간별 추가 지급이 더해지는 구조라, 위 <b>대리점별 충족 현황</b>의 "최대 보상금"은 이 표로 재계산하지 않고 원자료 값을 그대로 사용합니다.</div>
      </section>
    </div>
```

- [ ] **Step 2: Add render logic**

Right after the `renderContractTypeJul` IIFE added in Task 3, and before `(function renderFunnelStrip(){` (June's, line 943), insert:

```javascript
(function renderPromoJul(){
  const cls = r => r >= 100 ? 'full' : r >= 50 ? 'mid' : r > 0 ? 'low' : 'zero';
  const sum = k => PROMO_JUL.reduce((a, d) => a + d[k], 0);
  const rows = PROMO_JUL.map(d => `
    <tr>
      <td>${d.n}</td>
      <td class="num">${d.i}</td><td class="num">${d.t}</td><td class="num">${d.p}</td><td class="num">${d.a}</td>
      <td class="num"><span class="pill ${cls(d.r)}">${d.r.toFixed(1)}%</span></td>
      <td class="num">${d.m > 0 ? d.m.toLocaleString() : '—'}</td>
    </tr>`).join('');
  const tot = `
    <tr class="total">
      <td>총합계 (${PROMO_JUL.length}개사)</td>
      <td class="num">${sum('i')}</td><td class="num">${sum('t')}</td><td class="num">${sum('p')}</td><td class="num">${sum('a')}</td>
      <td class="num"><span class="pill mid">${(sum('a') / sum('i') * 100).toFixed(1)}%</span></td>
      <td class="num">${sum('m').toLocaleString()}</td>
    </tr>`;
  document.querySelector('#tblPromoJul tbody').innerHTML = rows + tot;
})();

(function renderFunnelStripJul(){
  const base = STAGES_JUL[0].num;
  let html = '';
  STAGES_JUL.forEach((s, i) => {
    if (i > 0) html += `<div class="funnel-drop">−${(STAGES_JUL[i - 1].num - s.num).toLocaleString()}건 →</div>`;
    const last = i === STAGES_JUL.length - 1;
    html += `<div class="funnel-pill">
      <div class="n"${last ? ' style="color:var(--accent)"' : ''}>${s.num.toLocaleString()}건</div>
      <div class="l">${s.name}</div>
      <div class="p">설치 대비 ${(s.num / base * 100).toFixed(1)}%</div>
    </div>`;
  });
  document.getElementById('funnelStripJul').innerHTML = html;
})();

/* 구간 명단·분포는 PROMO_JUL 원자료에서 직접 집계 */
const FULL_LIST_JUL = PROMO_JUL.filter(d => d.r >= 100).map(d => d.n);
const LOW_LIST_JUL  = PROMO_JUL.filter(d => d.r <= 50).map(d => d.n);
const DIST_JUL = [
  {label:'80% 이상', n: PROMO_JUL.filter(d => d.r >= 80).length},
  {label:'50~80%',  n: PROMO_JUL.filter(d => d.r >= 50 && d.r < 80).length},
  {label:'30~50%',  n: PROMO_JUL.filter(d => d.r >= 30 && d.r < 50).length},
  {label:'30% 미만', n: PROMO_JUL.filter(d => d.r < 30).length}
];
document.getElementById('ctHiJul').textContent = `100% 완전 달성 (${FULL_LIST_JUL.length}개사)`;
document.getElementById('ctLoJul').textContent = `50% 이하 저조 (${LOW_LIST_JUL.length}개사)`;
document.getElementById('chipsHiJul').innerHTML = FULL_LIST_JUL.map(n => `<span class="chip hi">${n}</span>`).join('');
document.getElementById('chipsLoJul').innerHTML = LOW_LIST_JUL.map(n => `<span class="chip lo">${n}</span>`).join('');

(function renderRewardTiersJul(){
  const rows = REWARD_TIERS_JUL.flatMap(tier =>
    tier.rows.map(([range, amount]) => `
      <tr>
        <td>${tier.type}</td>
        <td>${tier.target}</td>
        <td>${range}</td>
        <td class="num">${amount}</td>
      </tr>`)
  ).join('');
  const baseRow = `
    <tr class="total">
      <td>기본 지급 (전체)</td><td>건당</td><td>—</td><td class="num">30,000 (조건 미달성 시에도 지급)</td>
    </tr>`;
  document.querySelector('#tblRewardTiersJul tbody').innerHTML = rows + baseRow;
})();
```

- [ ] **Step 3: Add the two new `BUILDERS` entries**

Inside `BUILDERS`, right after `chartContractTypeJul` (added in Task 3) and before the closing `}` of `BUILDERS` (line 1134), add:

```javascript
  chartStageFunnelJul: el => new Chart(el, {
    type:'bar',
    data:{
      labels: STAGES_JUL.map(s => s.label),
      datasets:[{
        label:'잔존 건수',
        data: STAGES_JUL.map(s => s.num),
        backgroundColor: [...P().ord].reverse(),
        borderRadius:4,
        barPercentage:.7
      }]
    },
    options:{
      maintainAspectRatio:false,
      layout:{ padding:{ top:26 } },
      plugins:{
        legend:{ display:false },
        tooltip:{ callbacks:{
          label: c => ' ' + c.raw.toLocaleString() + '건 · 설치 대비 ' + (c.raw / STAGES_JUL[0].num * 100).toFixed(1) + '%',
          afterLabel: c => c.dataIndex === 0 ? '' : '이전 단계 대비 −' + (STAGES_JUL[c.dataIndex - 1].num - c.raw).toLocaleString() + '건'
        } },
        datalabels:{
          display:true, anchor:'end', align:'top', offset:4,
          color: ink(), font:{ weight:700, size:11 },
          formatter: (v, c) => v.toLocaleString() + '건 (' + (v / STAGES_JUL[0].num * 100).toFixed(1) + '%)'
        }
      },
      scales:{
        x:{ grid:{ display:false }, border:{ display:false }, ticks:{ color:inkDim(), font:{size:11.5} } },
        y:{ grid:{ color:gridLine() }, border:{ display:false }, ticks:{ color:inkDim(), font:{size:11} } }
      }
    }
  }),

  chartFunnelDistJul: el => new Chart(el, {
    type:'bar',
    data:{
      labels: DIST_JUL.map(d => d.label),
      datasets:[{ label:'대리점 수', data: DIST_JUL.map(d => d.n), backgroundColor:P().ord, borderRadius:4, barPercentage:.7 }]
    },
    options:{
      indexAxis:'y',
      maintainAspectRatio:false,
      layout:{ padding:{ right:46 } },
      plugins:{
        legend:{ display:false },
        tooltip:{ callbacks:{ label: c => ' ' + c.raw + '개사 / ' + PROMO_JUL.length + '개사' } },
        datalabels:{ display:true, anchor:'end', align:'end', offset:4, color:ink(), font:{weight:700, size:11}, formatter: v => v + '개사' }
      },
      scales:{
        x:{ grid:{ color:gridLine() }, border:{ display:false }, ticks:{ color:inkDim(), font:{size:11}, precision:0 } },
        y:{ grid:{ display:false }, border:{ display:false }, ticks:{ color:inkDim(), font:{size:12} } }
      }
    }
  })
```

(Note: this is the last entry in `BUILDERS`, so it must NOT have a trailing comma before the object's closing `}`.)

- [ ] **Step 4: Run the data verification script**

Run: `node scripts/verify-july-data.cjs`
Expected: `All checks passed`.

- [ ] **Step 5: Verify in the browser**

With the local server still running:
1. Reload, click "7월" → "상생 프로모션 충족률" subtab
2. Confirm the funnel strip shows 600 → 569 → 509 → 493 with the correct drop-off callouts, and the stage-funnel bar chart renders 4 bars
3. Confirm the KPI flow shows 34,510,000원/493건 and 16,050,000원/107건, with the progress bar split 82.2%/17.8%
4. Confirm the dealer table has 44 rows + 1 total row, sorted as authored, with 우리편 showing 9,030,000 in the last column
5. Confirm the distribution chart shows 29/8/3/4 across the four buckets, and the chip lists under "100% 완전 달성" / "50% 이하 저조" are non-empty
6. Confirm the reward-tier table renders all 7 policy rows (with repeated tier rows per company) plus the base-payment row
7. Toggle theme, click through 6월/7월 and all three subtabs once more, confirm zero console errors throughout
8. Read the full page text and spot-check that no number here reads as a stray "undefined" or "NaN"

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "Fill July 상생 프로모션 충족률 subtab, add reward-tier reference table

Funnel/KPI/distribution mirror June's pattern using the real July
fulfillment data. The new reward-tier table is display-only per the
spec's explicit decision not to re-derive per-dealer payouts from the
tiered policy (the source's own computed max-reward column is used
instead)."
```

---

## Task 5: Final polish and full regression pass

**Files:**
- Modify: `index.html` (small copy fixes only, if any are found during regression)

**Interfaces:** None — this task only verifies and tidies.

- [ ] **Step 1: Run the verification script one final time**

Run: `node scripts/verify-july-data.cjs`
Expected: `All checks passed`.

- [ ] **Step 2: Full click-through regression in the browser**

With the local server running:
1. Load the page fresh, confirm 6월 loads by default with no console errors
2. Click 7월, click through all 3 subtabs, confirm every chart renders and every table has rows
3. Toggle dark → light → dark, re-checking charts re-render at each step with no console errors
4. Resize the browser window to at least 3 widths (e.g. 1200px, 1440px, 1920px) and confirm no horizontal scrollbar appears and the reward-tier table (the widest new table) doesn't overflow its container awkwardly — if it does, wrap it in `<div class="table-wrap scroll">` instead of `<div class="table-wrap">` (this is the one open layout risk in this plan, since the reward-tier table is new and untested at narrow widths)
5. Take one dark-mode and one light-mode screenshot of the 7월 "대리점 상세" tab (to visually confirm the new 계약 유형별 수익성 section reads clearly) and one of the "상생 프로모션 충족률" tab (to confirm the reward-tier table)

- [ ] **Step 3: Fix anything found in Step 2, re-run Steps 1–2 until clean**

- [ ] **Step 4: Update the spec's status line**

In `docs/superpowers/specs/2026-08-11-july-fill-and-contract-type-insight-design.md`, change:
```
Status: Approved (brainstorm), pending implementation
```
to:
```
Status: Implemented
```

- [ ] **Step 5: Commit**

```bash
git add index.html docs/superpowers/specs/2026-08-11-july-fill-and-contract-type-insight-design.md
git commit -m "Polish July dashboard and mark spec as implemented"
```

- [ ] **Step 6: Report deployment status to the user without pushing/deploying**

This plan does not push to `origin` or run `vercel --prod` — per repo convention (seen in prior sessions), those are user-facing actions requiring explicit confirmation each time, not something to bundle into an implementation plan. Stop here and tell the user the commits are ready locally; ask whether to push + deploy now.

---

## Self-Review Notes

- **Spec coverage:** All three subtab sections (요약, 대리점 상세 + 계약유형별, 프로모션 + 보상티어) are covered by Tasks 2–4. MoM KPI badges (Task 2), top10/bottom10/scatter (Task 3), funnel/KPI/table/distribution (Task 4), reward-tier table (Task 4) are all present. The spec's explicit non-goals (upload feature, tier re-computation) are respected — no task builds either.
- **Known deviation from spec, called out explicitly:** the spec said "44개사" for the promo table after the mid-planning correction (originally miscounted as 45 due to a parsing bug in a merged cell, fixed and re-committed to the spec before this plan was written) — Task 1's verification script encodes 44 as the expected count, and Task 4's markup text says 44개사, so this plan is consistent with the corrected spec, not the original.
- **Type consistency:** `PROMO_JUL`'s field names (`i,t,p,a,r,m`) match June's `PROMO` shape exactly, so `renderPromoJul` is a straight copy of `renderPromo` with the array name swapped — verified by re-reading both side by side above. `CONTRACT_TYPE_JUL`'s `{n, type, net}` shape is consumed consistently by `groupByContractType`, `renderContractTypeJul`, and `chartContractTypeJul`.
- **No placeholders:** every code block above is complete and copy-pasteable; no "similar to Task N" shortcuts were used for data literals (each array is written out in full) because subagents executing tasks out of order must not have to hunt for a previous task's array contents.
