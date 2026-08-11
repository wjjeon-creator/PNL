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
  // 2026-08-11 2차 수정: 대리점별 상세 분석 시트에 물류비·상생 프로모션 배분이 누락돼 있던 것을
  // 반영. 이제 119개사 순매출 합계(26,676,902)가 요약 시트 순이익과 정확히 일치한다.
  contractTypeNetSum: 26676902,
  topNetFirst: { n: '엠제이통신', net: 11469942 },
  negNetFirst: { n: '그린정보통신', net: -2540195 },
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
