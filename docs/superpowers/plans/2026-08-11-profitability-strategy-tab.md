# July "수익성 개선 전략" Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 4th subtab "수익성 개선 전략" to the July panel in `index.html`, showing (1) a data-driven insight on which contract type to grow, (2) one hardcoded background sentence quoting an external channel-sales sheet, and (3) an interactive what-if calculator for expected profit gain from adding N dealers of a chosen contract type.

**Architecture:** `index.html` is a single static file with no build step (Vercel static deploy). All work reuses the existing `CONTRACT_TYPE_GROUPS_JUL` array (already computed by `groupByContractType(CONTRACT_TYPE_JUL)` at `index.html:1320` — has `{type, count, installs, sum, avg, share}` per contract type). The subtab mechanism (`.subtabs`/`.subtab-btn`/`.subpanel`, wired generically at `index.html:1793-1804`) requires no changes — it already handles any number of tabs by `data-sub` matching. Chart lazy-init (`buildVisibleCharts()` at `index.html:1769`) and full rebuild on theme toggle (`rebuildCharts()` at `index.html:1776`) also work unmodified as long as the new chart's `BUILDERS` entry reads current form values at call time rather than capturing stale values.

**Tech Stack:** Vanilla HTML/CSS/JS, Chart.js 4.4.1 + chartjs-plugin-datalabels (CDN), no npm/build tooling. This is the first form input (`<select>`/`<input type="number">`) in the project — no existing CSS to reuse for it, so this plan adds one small new CSS block.

## Global Constraints

- All monetary values are 원 (KRW), VAT excluded, matching existing convention.
- No hardcoded aggregates: every number in the new tab except the one background sentence must be computed at render time from `CONTRACT_TYPE_GROUPS_JUL`, never a separate literal that could drift.
- Follow existing naming convention: new IDs/functions get a `Jul` suffix or a `strategy`/`scenario` prefix consistent with what's below — don't invent alternate names for the same concept across tasks.
- The background sentence about channel-sales decline is a deliberate, permanent exception to "no hardcoded aggregates": it quotes an external Google Sheet (`https://docs.google.com/spreadsheets/d/1eaL8EU0DkwaacEfjr86hIx20UVawgbwDVx2n307Vd1E/edit?gid=220365718#gid=220365718`) that is not part of this project's data pipeline. Per the approved spec, only cite the 협력대리점 channel's completed months (1–7월: 연초 100% 안팎 → 7월 83%) — do NOT cite the August figure (partial month, only 11/31 days elapsed as of the sheet's data) or the 딜러사 channel (too volatile month-to-month to support a clean "declining" claim).
- No new PNL data consts (`*_JUL` arrays) are added by this plan — `scripts/verify-july-data.cjs` needs no changes and must still pass unmodified after every task.
- This plan touches July only. Do not modify the June panel.

---

## File Structure

Single file modified throughout: `C:\Users\Wj.Jeon-Gram\ai\PNL\index.html` (currently ~1818 lines).

No other files change. `docs/superpowers/specs/2026-08-11-profitability-strategy-tab-design.md` (already committed) is the source of truth for the section contents below.

---

## Task 1: Subtab navigation + static shell + background section

**Files:**
- Modify: `index.html:742` (subtab button list) — insert new button after the existing 3
- Modify: `index.html:1041-1042` (end of July panel) — insert new subpanel between the promo subpanel's closing `</div>` and the July month-panel's closing `</div>`

**Interfaces:**
- Consumes: nothing new (the generic subtab click handler at `index.html:1793-1804` already handles any `data-sub` value found under a `.subtabs[data-scope]`/`.subpanel` pair — no JS changes needed for the tab to become clickable and switchable)
- Produces: `<div id="strategyInsightJul">` (empty placeholder — filled by Task 2), and the fully-populated static 배경 section. Also produces the empty containers Task 3 will fill: none yet — Task 3 adds its own markup wholesale.

- [ ] **Step 1: Add the 4th subtab button**

In `index.html`, find (there is only one occurrence of this exact 3-button block, at the July panel — the June panel has the same 3 buttons but without `<span class="snum">4</span>수익성 개선 전략` after, so match on the surrounding `data-scope="jul"` context):

```html
    <div class="subtabs" data-scope="jul">
      <button class="subtab-btn active" data-sub="summary"><span class="snum">1</span>7월 대리점 수익성 요약</button>
      <button class="subtab-btn" data-sub="detail"><span class="snum">2</span>7월 대리점 상세</button>
      <button class="subtab-btn" data-sub="promo"><span class="snum">3</span>상생 프로모션 충족률</button>
    </div>
```

Replace with:

```html
    <div class="subtabs" data-scope="jul">
      <button class="subtab-btn active" data-sub="summary"><span class="snum">1</span>7월 대리점 수익성 요약</button>
      <button class="subtab-btn" data-sub="detail"><span class="snum">2</span>7월 대리점 상세</button>
      <button class="subtab-btn" data-sub="promo"><span class="snum">3</span>상생 프로모션 충족률</button>
      <button class="subtab-btn" data-sub="strategy"><span class="snum">4</span>수익성 개선 전략</button>
    </div>
```

- [ ] **Step 2: Add the new subpanel with the static background section**

Find the end of the July panel (the promo subpanel's closing `</div>` immediately followed by the July month-panel's closing `</div>`, immediately followed by the `<!-- ====== AUGUST–DECEMBER` comment):

```html
        </div>
      </section>
    </div>
  </div>

  <!-- ====== AUGUST–DECEMBER (skeletons, generated from PENDING_MONTHS) ====== -->
```

Replace with (this inserts the new subpanel between the two closing `</div>`s — the first `</div>` still closes the promo subpanel, the new `<div data-sub="strategy">...</div>` is a sibling, and the final `</div>` still closes `id="panel-jul"`):

```html
        </div>
      </section>
    </div>

    <!-- ---- Sub 4: 수익성 개선 전략 ---- -->
    <div class="subpanel" data-sub="strategy">
      <div class="callout" id="strategyInsightJul"></div>

      <section class="block">
        <div class="block-head">
          <h3 class="block-title">배경: 채널 실적 둔화</h3>
          <span class="block-desc">채널세일즈 대시보드 기준 · 참고용</span>
        </div>
        <div class="callout">회사 전체 협력대리점 채널의 월별 목표 대비 설치 달성률도 연초 100% 안팎에서 7월 83%로 낮아진 상태입니다. 신규 대리점 확보 여력이 줄어드는 만큼, 확보한다면 수익성 높은 유형에 집중하는 편이 효율적입니다.</div>
        <a class="sheet-link" href="https://docs.google.com/spreadsheets/d/1eaL8EU0DkwaacEfjr86hIx20UVawgbwDVx2n307Vd1E/edit?gid=220365718#gid=220365718" target="_blank" rel="noopener">📄 채널세일즈 대시보드 보기 (Google Sheets) ↗</a>
      </section>
    </div>
  </div>

  <!-- ====== AUGUST–DECEMBER (skeletons, generated from PENDING_MONTHS) ====== -->
```

- [ ] **Step 3: Verify in the browser**

Start a static file server from the project root:
```bash
npx --yes http-server -p 8080 -c-1
```

Using the claude-in-chrome tools (load with `ToolSearch` if not already loaded: `select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__read_console_messages`):
1. Navigate to `http://localhost:8080/index.html`
2. Read console messages — expect none
3. Click "7월" in the sidebar, then click the new "4 수익성 개선 전략" subtab
4. Confirm the panel shows: an empty callout box at the top (expected — Task 2 fills it), the "배경: 채널 실적 둔화" section with the sentence and the working link (don't click it, just confirm `href` via `read_page`)
5. Click back through subtabs 1/2/3 and confirm they still render exactly as before (no regression)
6. Confirm no console errors throughout

- [ ] **Step 4: Run the data verification script (unaffected by this task, confirms no accidental edit to a `*_JUL` const)**

Run: `node scripts/verify-july-data.cjs`
Expected: `All checks passed`

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "Add 수익성 개선 전략 subtab shell to July panel

Adds the 4th subtab button and panel with the static background
section (channel-sales decline context + link). The insight callout
placeholder and scenario calculator are filled in by the next two
tasks — the subtab mechanism itself needs no JS changes since it
already handles an arbitrary number of tabs generically."
```

---

## Task 2: Data-driven insight callout

**Files:**
- Modify: `index.html` — insert a new render IIFE in the script section

**Interfaces:**
- Consumes: `CONTRACT_TYPE_GROUPS_JUL` (existing, `{type, count, installs, sum, avg, share}` per group — defined at `index.html:1320`), `won()` (existing helper)
- Produces: fills `#strategyInsightJul` (added in Task 1). No other task depends on this function's internals.

- [ ] **Step 1: Add the render function**

In `index.html`'s script section, find the existing `renderContractTypeDealerGroupsJul` IIFE and the blank line right before `(function renderPromoJul(){`:

```javascript
      </details>`;
  }).join('');
})();

(function renderPromoJul(){
```

Replace with (inserting the new IIFE between the two):

```javascript
      </details>`;
  }).join('');
})();

(function renderStrategyInsightJul(){
  const ranked = [...CONTRACT_TYPE_GROUPS_JUL].sort((a, b) => b.avg - a.avg);
  const top = ranked[0];
  const runnerUp = ranked.slice(1).find(g => g.avg > 0);
  const el = document.getElementById('strategyInsightJul');
  if (runnerUp) {
    const multiple = (top.avg / runnerUp.avg).toFixed(1);
    el.innerHTML = `<b>${top.type}</b>이 대리점당 평균 <b>${won(top.avg)}</b>로, 다음으로 높은 <b>${runnerUp.type}</b>(${won(runnerUp.avg)}) 대비 <b>${multiple}배</b> 높습니다. `
      + `다만 이 유형은 현재 <b>${top.count}곳</b>뿐이라 표본이 작다는 점은 감안해야 합니다.`;
  } else {
    el.innerHTML = `<b>${top.type}</b>이 대리점당 평균 <b>${won(top.avg)}</b>로 가장 높습니다. `
      + `다만 이 유형은 현재 <b>${top.count}곳</b>뿐이라 표본이 작다는 점은 감안해야 합니다.`;
  }
})();

(function renderPromoJul(){
```

Note the `runnerUp` guard: it picks the next-highest group with a **positive** average, skipping over any group with a zero or negative average. Comparing against a near-zero or negative average would produce a meaningless or wildly inflated "배" (multiple) figure — the same class of bug fixed earlier in this project for the 계약 유형별 수익성 표의 비중(%) column (see the `shareStable` guard in `renderContractTypeJul`). If no other group has a positive average, the `else` branch drops the comparison sentence entirely rather than showing a broken one.

- [ ] **Step 2: Verify the computation by hand**

Run this to print the current `CONTRACT_TYPE_GROUPS_JUL` averages sorted, so you can confirm the rendered sentence matches:

```bash
node -e "
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf-8');
const ct = new Function('return ' + html.match(/const CONTRACT_TYPE_JUL = (\[[\s\S]*?\]);/)[1])();
const map = new Map();
ct.forEach(d => {
  if (!map.has(d.type)) map.set(d.type, { type: d.type, count: 0, sum: 0 });
  const g = map.get(d.type);
  g.count++;
  g.sum += d.net;
});
const groups = [...map.values()].map(g => ({ ...g, avg: g.sum / g.count })).sort((a, b) => b.avg - a.avg);
groups.forEach(g => console.log(g.type, 'count=' + g.count, 'avg=' + Math.round(g.avg)));
"
```

Confirm the top-ranked type and its `avg` match what Step 3's browser check shows in the callout.

- [ ] **Step 3: Verify in the browser**

With the local server still running:
1. Reload, click "7월" → "4 수익성 개선 전략"
2. Confirm the top callout now shows real text (not empty) — the top-ranked contract type by 대리점당 평균, its 원 value, the runner-up comparison with a "배" figure, and the sample-size caveat with the correct dealer count
3. Confirm no console errors, no `undefined`/`NaN` in the rendered text
4. Toggle dark/light mode, confirm the callout text is unaffected (it's plain text, not chart-dependent) and still renders correctly

- [ ] **Step 4: Run the data verification script**

Run: `node scripts/verify-july-data.cjs`
Expected: `All checks passed`

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "Add data-driven insight callout to 수익성 개선 전략 tab

Ranks contract types by 대리점당 평균 순매출 and states the top type's
lead over the runner-up, guarding against comparing to a near-zero or
negative average (same fix pattern as the 비중% shareStable guard)."
```

---

## Task 3: Interactive scenario calculator

**Files:**
- Modify: `index.html` — add CSS for the new form controls, add the calculator section markup inside the `strategy` subpanel, add `renderScenarioCalculatorJul()` and a shared `calcScenario()` helper, add `BUILDERS.chartScenarioJul`

**Interfaces:**
- Consumes: `CONTRACT_TYPE_GROUPS_JUL`, `won()`, `groupedBar()` (existing, `index.html:1534`, signature `groupedBar(el, labels, datasets)` where `datasets` is `[{label, data, backgroundColor, borderRadius}]`), `P()` (existing, `index.html:1160`, returns `{cat: [5 colors], pos, neg, ord: [4 colors]}`), `charts` (existing global chart-instance registry, `index.html:1768`)
- Produces: `calcScenario()` — module-level function, returns `{g, count, increase, after}` where `g` is the selected group from `CONTRACT_TYPE_GROUPS_JUL`, `count` is the clamped integer dealer count, `increase` is `g.avg * count`, `after` is `g.sum + increase`. `BUILDERS.chartScenarioJul` consumes `calcScenario()` at build/rebuild time — no other task depends on these names.

- [ ] **Step 1: Add CSS for the calculator form**

In `index.html`, find:

```css
  .type-group .table-wrap{border:none;border-radius:0;}
```

Replace with:

```css
  .type-group .table-wrap{border:none;border-radius:0;}

  .calc-form{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:16px;}
  .calc-form label{display:flex;flex-direction:column;gap:6px;font-size:12px;color:var(--text-dim);font-weight:600;}
  .calc-form select,.calc-form input[type=number]{
    background:var(--surface);border:1px solid var(--border);border-radius:8px;
    padding:9px 12px;color:var(--text);font-size:13px;font-family:inherit;min-width:200px;
  }
  .calc-form select:focus,.calc-form input[type=number]:focus{outline:none;border-color:var(--accent);}
```

- [ ] **Step 2: Add the calculator section markup**

In `index.html`, find the end of the 배경 section added in Task 1 (the `sheet-link` line immediately followed by the closing `</section>` and `</div>` of the strategy subpanel):

```html
        <a class="sheet-link" href="https://docs.google.com/spreadsheets/d/1eaL8EU0DkwaacEfjr86hIx20UVawgbwDVx2n307Vd1E/edit?gid=220365718#gid=220365718" target="_blank" rel="noopener">📄 채널세일즈 대시보드 보기 (Google Sheets) ↗</a>
      </section>
    </div>
  </div>

  <!-- ====== AUGUST–DECEMBER (skeletons, generated from PENDING_MONTHS) ====== -->
```

Replace with:

```html
        <a class="sheet-link" href="https://docs.google.com/spreadsheets/d/1eaL8EU0DkwaacEfjr86hIx20UVawgbwDVx2n307Vd1E/edit?gid=220365718#gid=220365718" target="_blank" rel="noopener">📄 채널세일즈 대시보드 보기 (Google Sheets) ↗</a>
      </section>

      <section class="block">
        <div class="block-head">
          <h3 class="block-title">계약 유형 확대 시나리오 계산기</h3>
          <span class="block-desc">유형 선택 + 늘릴 대리점 수 입력 → 예상 순매출 증가</span>
        </div>
        <div class="calc-form">
          <label>계약 유형
            <select id="scenarioType"></select>
          </label>
          <label>늘릴 대리점 수
            <input type="number" id="scenarioCount" min="0" step="1" value="1">
          </label>
        </div>
        <div class="card-grid" id="scenarioStats"></div>
        <div class="chart-card" style="margin-top:14px">
          <h4>시나리오 적용 전/후 순매출 비교</h4>
          <div class="sub">선택한 계약 유형의 순매출 합계 기준 · 원</div>
          <div class="chart-box"><canvas id="chartScenarioJul"></canvas></div>
        </div>
        <div class="note">* 대리점당 평균은 실측 데이터 기반이지만, 표본이 적은 유형((우수)위탁운영 2곳, (우수)협력 3곳, 일반위탁 4곳)의 신규 대리점 성과는 이 평균과 다를 수 있습니다.</div>
      </section>
    </div>
  </div>

  <!-- ====== AUGUST–DECEMBER (skeletons, generated from PENDING_MONTHS) ====== -->
```

- [ ] **Step 3: Add `calcScenario()` and `renderScenarioCalculatorJul()`**

In `index.html`'s script section, find the `renderStrategyInsightJul` IIFE added in Task 2 and the blank line before `(function renderPromoJul(){`:

```javascript
  }
})();

(function renderPromoJul(){
```

Replace with:

```javascript
  }
})();

function calcScenario(){
  const type = document.getElementById('scenarioType').value;
  const rawCount = Math.floor(Number(document.getElementById('scenarioCount').value));
  const count = Number.isFinite(rawCount) ? Math.max(0, rawCount) : 0;
  const g = CONTRACT_TYPE_GROUPS_JUL.find(x => x.type === type) || CONTRACT_TYPE_GROUPS_JUL[0];
  const increase = g.avg * count;
  const after = g.sum + increase;
  return { g, count, increase, after };
}

(function renderScenarioCalculatorJul(){
  const select = document.getElementById('scenarioType');
  select.innerHTML = CONTRACT_TYPE_GROUPS_JUL.map(g => `<option value="${g.type}">${g.type}</option>`).join('');

  function fmtSigned(v){
    return (v >= 0 ? '' : '−') + won(Math.abs(v));
  }

  function update(){
    const { g, count, increase, after } = calcScenario();
    document.getElementById('scenarioStats').innerHTML = `
      <div class="stat-card">
        <div class="stat-label">현재 대리점 수</div>
        <div class="stat-value">${g.count}곳</div>
        <div class="stat-foot">설치수 ${g.installs}건</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">현재 순매출 합계</div>
        <div class="stat-value ${g.sum >= 0 ? 'pos' : 'neg'}">${fmtSigned(g.sum)}</div>
        <div class="stat-foot">대리점당 평균 ${fmtSigned(g.avg)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">${count}곳 추가 시 예상 증가액</div>
        <div class="stat-value ${increase >= 0 ? 'pos' : 'neg'}">${fmtSigned(increase)}</div>
        <div class="stat-foot">대리점당 평균 × ${count}곳</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">시나리오 적용 후 순매출</div>
        <div class="stat-value ${after >= 0 ? 'pos' : 'neg'}">${fmtSigned(after)}</div>
        <div class="stat-foot">현재 ${fmtSigned(g.sum)} + 증가분</div>
      </div>`;

    if (charts.chartScenarioJul) {
      charts.chartScenarioJul.data.labels = [g.type];
      charts.chartScenarioJul.data.datasets[0].data = [g.sum];
      charts.chartScenarioJul.data.datasets[1].data = [after];
      charts.chartScenarioJul.update();
    }
  }

  select.addEventListener('change', update);
  document.getElementById('scenarioCount').addEventListener('input', update);
  update();
})();

(function renderPromoJul(){
```

`update()` writes directly into `charts.chartScenarioJul` (the shared registry populated by `buildVisibleCharts()`) rather than calling a chart constructor itself — this keeps a single source of truth for the Chart.js instance and avoids creating a second chart bound to the same canvas. If the 전략 tab has never been made visible yet, `charts.chartScenarioJul` is `undefined` and the `if` guard skips the update; this is safe because the input elements only exist inside the `strategy` subpanel, so the user cannot trigger `update()` before that subpanel — and therefore its canvas and the chart built from it — have become visible at least once.

- [ ] **Step 4: Add the `BUILDERS.chartScenarioJul` entry**

In `index.html`, find the `chartContractTypeJul` entry in the `BUILDERS` object:

```javascript
  chartContractTypeJul: el => groupedBar(
    el,
    CONTRACT_TYPE_GROUPS_JUL.map(g => g.type),
    [
      { label:'순매출 합계', data: CONTRACT_TYPE_GROUPS_JUL.map(g => g.sum), backgroundColor: P().cat[0], borderRadius:4 },
      { label:'대리점당 평균', data: CONTRACT_TYPE_GROUPS_JUL.map(g => g.avg), backgroundColor: P().cat[1], borderRadius:4 }
    ]
  ),
```

Replace with (adding the new entry right after, before the blank line and `chartTopNet:`):

```javascript
  chartContractTypeJul: el => groupedBar(
    el,
    CONTRACT_TYPE_GROUPS_JUL.map(g => g.type),
    [
      { label:'순매출 합계', data: CONTRACT_TYPE_GROUPS_JUL.map(g => g.sum), backgroundColor: P().cat[0], borderRadius:4 },
      { label:'대리점당 평균', data: CONTRACT_TYPE_GROUPS_JUL.map(g => g.avg), backgroundColor: P().cat[1], borderRadius:4 }
    ]
  ),

  chartScenarioJul: el => {
    const { g, after } = calcScenario();
    return groupedBar(
      el,
      [g.type],
      [
        { label:'현재', data:[g.sum], backgroundColor: P().cat[0], borderRadius:4 },
        { label:'시나리오 적용 후', data:[after], backgroundColor: P().cat[1], borderRadius:4 }
      ]
    );
  },
```

This makes `BUILDERS.chartScenarioJul` read the *current* select/input values via `calcScenario()` at build time, so `rebuildCharts()` (called on every theme toggle, which destroys and rebuilds every chart from `BUILDERS`) reconstructs the chart with whatever scenario the user currently has selected, instead of resetting it to the default.

- [ ] **Step 5: Run the data verification script (unaffected — confirms no accidental edit to a `*_JUL` const)**

Run: `node scripts/verify-july-data.cjs`
Expected: `All checks passed`

- [ ] **Step 6: Verify in the browser**

With the local server running:
1. Reload, click "7월" → "4 수익성 개선 전략"
2. Confirm the `<select>` has exactly 4 options matching the 4 contract types (cross-check against the 계약 유형별 집계 table in subtab 2)
3. Confirm the 4 stat cards render immediately on tab open with the default selection (first option, count=1) and non-`NaN`/non-`undefined` values
4. Confirm the comparison chart renders with 2 bars ("현재" and "시나리오 적용 후") for the default selection
5. Change the `<select>` to each of the other 3 contract types in turn — confirm the stat cards and chart update immediately (no page reload) and the numbers match `avg × count` computed by hand for that type
6. Type these values into the 대리점 수 input and confirm no crash / no `NaN` displayed for each:
   - `0` → 예상 증가액 shows `+0` (or equivalent zero display), 적용 후 순매출 equals 현재 순매출 exactly
   - `5`
   - a decimal like `2.7` → should floor to `2` (per `Math.floor`)
   - a negative number like `-3` → should clamp to `0` (per the `Math.max(0, ...)` guard)
   - empty string (delete all digits) → should not throw; `Number('')` is `0`, so this should behave like `0`
7. Select the type with a negative 대리점당 평균 (일반위탁대리점, if still negative in current data) and confirm the "예상 증가액" stat card renders in the `neg` (warning) color, not `pos`
8. Toggle dark → light → dark, confirm the chart re-renders at each step reflecting whatever selection/count was active, no console errors
9. Click back to "6월" and confirm June is completely unaffected
10. Read the full page text (`get_page_text` or equivalent) for the 전략 tab and confirm no stray `undefined`/`NaN`

- [ ] **Step 7: Commit**

```bash
git add index.html
git commit -m "Add interactive scenario calculator to 수익성 개선 전략 tab

Select a contract type and a dealer count to add; the expected 순매출
increase (대리점당 평균 × count) and a before/after comparison chart
update live via input/change listeners, with no page reload. The
BUILDERS.chartScenarioJul entry reads current form state at build
time so theme-toggle rebuilds preserve whatever scenario is active
instead of resetting it."
```

---

## Task 4: Final polish and full regression pass

**Files:**
- Modify: `index.html` (small copy fixes only, if any are found during regression)

**Interfaces:** None — this task only verifies and tidies.

- [ ] **Step 1: Run the verification script one final time**

Run: `node scripts/verify-july-data.cjs`
Expected: `All checks passed`

- [ ] **Step 2: Full click-through regression in the browser**

With the local server running:
1. Load the page fresh, confirm 6월 loads by default with no console errors
2. Click 7월, click through all 4 subtabs in order, confirm every chart renders and every table/callout has content (nothing empty except by design)
3. On the 4th subtab, exercise the calculator once more (pick a type, set count to 3), then switch to subtab 1 and back to subtab 4 — confirm the calculator's select/input retain the values the browser's own form-state persistence would give them (this is native browser behavior for unremoved DOM elements, not custom code — just confirm nothing resets unexpectedly, since the subpanel is hidden via a CSS class, not removed from the DOM)
4. Toggle dark → light → dark, re-checking all 4 subtabs' charts re-render at each step with no console errors
5. Resize the browser window to at least 2 widths (e.g. 1440px, 1920px) and confirm the `.calc-form` inputs don't overflow their container or wrap awkwardly
6. Take one dark-mode screenshot of the "수익성 개선 전략" tab to visually confirm the layout reads clearly

- [ ] **Step 3: Fix anything found in Step 2, re-run Steps 1–2 until clean**

- [ ] **Step 4: Update the spec's status line**

In `docs/superpowers/specs/2026-08-11-profitability-strategy-tab-design.md`, change:
```
Status: Approved (brainstorm), pending implementation
```
to:
```
Status: Implemented
```

- [ ] **Step 5: Commit**

```bash
git add index.html docs/superpowers/specs/2026-08-11-profitability-strategy-tab-design.md
git commit -m "Polish 수익성 개선 전략 tab and mark spec as implemented"
```

- [ ] **Step 6: Report deployment status to the user without pushing/deploying**

Per repo convention (seen in every prior session on this project), pushing to `origin` and running `vercel --prod` are user-facing actions requiring explicit confirmation each time — do not bundle them into this plan. Stop here and tell the user the commits are ready locally; ask whether to push + deploy now.

---

## Self-Review Notes

- **Spec coverage:** All three sections from the spec (핵심 콜아웃, 배경 위기감, 시나리오 계산기) are covered — Task 1 (배경 section, static), Task 2 (콜아웃), Task 3 (계산기). The spec's non-goals (dealer-visit-campaign effectiveness, month-over-month forecasting, retroactive June support) are respected — no task builds any of them.
- **Near-zero-denominator guard:** Task 2's `runnerUp` selection explicitly skips non-positive averages, mirroring the `shareStable` guard already in `renderContractTypeJul` for the same underlying risk (a small/negative denominator producing a misleading ratio). This was called out in the spec's "핵심 콜아웃" section and is not skipped here.
- **Type consistency:** `calcScenario()` (defined once, Task 3 Step 3) is the single source of truth used by both `renderScenarioCalculatorJul`'s `update()` and `BUILDERS.chartScenarioJul` — no duplicate calculation logic exists that could drift out of sync.
- **No placeholders:** every code block above is complete and copy-pasteable; no "similar to Task N" shortcuts were used for markup or JS since subagents executing tasks out of order must not have to hunt for a previous task's exact content.
- **Conservative background quote:** Task 1's hardcoded sentence uses only the 협력대리점 1~7월 range per the spec's explicit instruction to exclude the partial August figure and the volatile 딜러사 series — verified against the spec's "섹션 구성 → 2)" wording before finalizing this plan.
