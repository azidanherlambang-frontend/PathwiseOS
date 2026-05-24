// ═══════════════════════════════════════
// STATE
// ═══════════════════════════════════════
const STATE = {
  decisions: JSON.parse(localStorage.getItem('pw_decisions') || '[]'),
  settings: JSON.parse(localStorage.getItem('pw_settings') || '{}'),
  currentDecision: null,
  currentCategory: null,
  weights: { money: 5, time: 5, growth: 7, risk: 4, energy: 5, freedom: 6 }
};

function save() {
  localStorage.setItem('pw_decisions', JSON.stringify(STATE.decisions));
  localStorage.setItem('pw_settings', JSON.stringify(STATE.settings));
}

// Sample data seed
if (!STATE.decisions.length) {
  STATE.decisions = [{
    id: 'demo1',
    title: 'Should I take the Series A offer?',
    category: 'Business',
    deadline: '2025-08-01',
    goal: 'Scale the product while maintaining equity',
    notes: 'Team is small, burn rate is ok. Investors want board seat.',
    weights: { money: 6, time: 5, growth: 9, risk: 4, energy: 6, freedom: 7 },
    scenarios: [
      { id: 's1', name: 'Take the A', income: 8, learning: 9, stress: 7, time: 8, probability: 0.7, cost: 0, freedom: 4 },
      { id: 's2', name: 'Bootstrap 12mo', income: 4, learning: 7, stress: 5, time: 6, probability: 0.55, cost: 0, freedom: 9 }
    ],
    reviews: [],
    created: Date.now() - 86400000 * 3
  }];
  save();
}

// ═══════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════
function nav(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const el = document.getElementById('page-' + page);
  if (el) { el.classList.add('active'); }
  const links = { dashboard: 'Dashboard', create: 'New Decision', simulate: 'Simulate', settings: 'Settings' };
  document.querySelectorAll('.nav-link').forEach(l => {
    if (l.textContent === links[page]) l.classList.add('active');
  });
  if (page === 'dashboard') renderDashboard();
  if (page === 'detail') renderDetail();
  if (page === 'simulate') renderSimulate();
  window.scrollTo(0, 0);
}

// ═══════════════════════════════════════
// FAQ
// ═══════════════════════════════════════
function toggleFaq(el) {
  el.closest('.faq-item').classList.toggle('open');
}

// ═══════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════
function renderDashboard() {
  const d = new Date();
  document.getElementById('dash-date').textContent = d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const dec = STATE.decisions[0];
  renderCurrentDecision(dec);
  renderFocusMeter(dec);
  renderHealth(dec);
  renderSnapshot(dec);
  renderScenarioCanvas(dec);
  renderAIInsight(dec);
  renderRegret(dec);
  renderMomentum();
}

function renderCurrentDecision(dec) {
  const el = document.getElementById('current-decision-content');
  if (!dec) {
    el.innerHTML = `<div class="empty-state" style="padding:24px"><div class="empty-icon">🎯</div><div class="empty-title">No decisions yet</div><div class="empty-desc">Start your first decision to see it here.</div><button class="btn-primary" onclick="nav('create')">Start Decision</button></div>`;
    return;
  }
  const score = computeScore(dec);
  const days = dec.deadline ? Math.ceil((new Date(dec.deadline) - Date.now()) / (1000 * 60 * 60 * 24)) : null;
  el.innerHTML = `
    <div class="tag" style="margin-bottom:10px">${dec.category}</div>
    <div style="font-size:18px;font-weight:600;letter-spacing:-0.02em;margin-bottom:8px;line-height:1.3;cursor:pointer" onclick="openDecision('${dec.id}')">${dec.title}</div>
    ${days !== null ? `<div style="font-size:12px;color:var(--sub);margin-bottom:16px">${days > 0 ? days + ' days remaining' : 'Deadline passed'}</div>` : ''}
    <div class="pbar-wrap">
      <div class="pbar-label"><span>Simulation progress</span><span>${score}%</span></div>
      <div class="pbar"><div class="pbar-fill" style="width:${score}%"></div></div>
    </div>
    <div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn-primary" onclick="openDecision('${dec.id}')" style="padding:8px 16px;font-size:13px">Open Decision</button>
      <button class="btn-ghost" onclick="nav('simulate')" style="padding:8px 16px;font-size:13px">Simulate</button>
    </div>`;
}

function renderFocusMeter(dec) {
  const el = document.getElementById('focus-meter');
  if (!dec) { el.innerHTML = `<div style="color:var(--sub2);font-size:12px;margin-top:8px">No active decision</div>`; return; }
  const w = dec.weights || {};
  const items = [['Money', w.money || 5, 'var(--green)'], ['Learning', w.growth || 7, 'var(--purple)'], ['Energy', w.energy || 5, 'var(--amber)'], ['Risk', w.risk || 4, 'var(--red)']];
  el.innerHTML = items.map(([l, v, c]) => `<div class="meter-row"><div class="meter-label">${l}</div><div class="meter-bar"><div class="meter-fill" style="width:${v * 10}%;background:${c}"></div></div><div style="font-size:11px;color:var(--sub);width:16px;text-align:right">${v}</div></div>`).join('');
}

function renderHealth(dec) {
  const el = document.getElementById('health-content');
  if (!dec) { el.innerHTML = `<div style="color:var(--sub2);font-size:12px;margin-top:8px">—</div>`; return; }
  const sc = dec.scenarios || [];
  const conf = sc.length >= 2 ? Math.min(95, 60 + sc.length * 10) : sc.length === 1 ? 55 : 20;
  el.innerHTML = `
    <div class="ring"><svg viewBox="0 0 72 72" width="72" height="72"><circle cx="36" cy="36" r="28" fill="none" stroke="var(--bg4)" stroke-width="6"/><circle cx="36" cy="36" r="28" fill="none" stroke="var(--purple)" stroke-width="6" stroke-dasharray="${conf * 1.76} 176" stroke-linecap="round"/></svg><div class="ring-num">${conf}%</div></div>
    <div style="margin-top:8px"><div style="font-size:12px;color:var(--sub)">Confidence</div></div>
    <div style="margin-top:8px;font-size:11px;color:${sc.length < 2 ? 'var(--amber)' : 'var(--green)'}">${sc.length < 2 ? '⚠ Add more scenarios' : '✓ Good coverage'}</div>`;
}

function renderSnapshot(dec) {
  const el = document.getElementById('snapshot-content');
  if (!dec || !dec.scenarios.length) { el.innerHTML = `<div style="color:var(--sub2);font-size:12px;margin-top:8px">Add scenarios to see projections</div>`; return; }
  const best = getBestScenario(dec);
  const inc = best ? best.income : 5;
  const snaps = [['6 months', Math.round(inc * 4 + Math.random() * 10)], ['1 year', Math.round(inc * 9 + Math.random() * 15)], ['3 years', Math.round(inc * 28 + Math.random() * 20)]];
  el.innerHTML = `<div style="display:flex;gap:16px;margin-top:4px">${snaps.map(([l, v]) => `<div style="flex:1"><div style="font-size:11px;color:var(--sub2);margin-bottom:4px">${l}</div><div style="font-size:20px;font-weight:600;font-family:var(--mono);color:var(--purple)">${v}</div><div style="font-size:10px;color:var(--sub)">composite pts</div></div>`).join('<div style="width:1px;background:var(--border)"></div>')}</div>
  <div style="font-size:11px;color:var(--sub2);margin-top:10px">Based on best scenario: ${best ? best.name : '—'}</div>`;
}

function renderScenarioCanvas(dec) {
  const el = document.getElementById('scenario-canvas');
  if (!dec || !dec.scenarios.length) { el.innerHTML = `<div style="color:var(--sub2);font-size:12px;grid-column:span 2;padding:12px 0">No scenarios yet. <span style="color:var(--purple);cursor:pointer" onclick="openDecision('${dec ? dec.id : ''}')">Add a path →</span></div>`; return; }
  el.innerHTML = dec.scenarios.slice(0, 2).map(s => {
    const score = computeScenarioScore(s, dec.weights);
    return `<div class="sc-card" onclick="openDecision('${dec.id}')" style="cursor:pointer"><div class="sc-name">${s.name}</div><div style="display:flex;align-items:baseline;gap:8px"><div class="sc-score">${score}</div><div style="font-size:11px;color:var(--sub)">/ 100</div></div><div class="sc-bars">${[['Income', s.income], ['Learning', s.learning], ['Freedom', s.freedom]].map(([l, v]) => `<div class="meter-row" style="margin-bottom:6px"><div class="meter-label" style="width:52px">${l}</div><div class="meter-bar"><div class="meter-fill" style="width:${v * 10}%;background:var(--purple)"></div></div></div>`).join('')}</div></div>`;
  }).join('');
}

function renderAIInsight(dec) {
  const el = document.getElementById('ai-insight');
  const insights = dec ? [
    'Consider the opportunity cost of optionality.',
    'Your risk weight is low — this may underestimate downside scenarios.',
    'Growth bias detected. Ensure financial floor is modeled.',
    'Two scenarios may not capture the full option space.'
  ] : ['No active decision'];
  el.innerHTML = `<div style="margin-top:4px"><div style="font-size:13px;line-height:1.6;color:var(--sub)"><span class="insight-dot"></span>${insights[Math.floor(Math.random() * insights.length)]}</div><div style="margin-top:12px;font-size:11px;color:var(--sub2)">Local heuristic • Set API key for AI analysis</div></div>`;
}

function renderRegret(dec) {
  const el = document.getElementById('regret-content');
  if (!dec) { el.innerHTML = `<div style="color:var(--sub2);font-size:12px;margin-top:8px">—</div>`; return; }
  const sc = dec.scenarios || [];
  const diff = sc.length >= 2 ? Math.abs(computeScenarioScore(sc[0], dec.weights) - computeScenarioScore(sc[1], dec.weights)) : 0;
  const level = diff > 20 ? 'High' : diff > 8 ? 'Medium' : 'Low';
  const col = level === 'High' ? 'var(--red)' : level === 'Medium' ? 'var(--amber)' : 'var(--green)';
  el.innerHTML = `<div style="margin-top:8px"><div style="font-size:28px;font-weight:600;color:${col}">${level}</div><div style="font-size:12px;color:var(--sub);margin-top:4px">Potential regret if wrong</div><div style="margin-top:10px;font-size:11px;color:var(--sub2)">${diff > 0 ? 'Score gap: ' + diff + ' pts' : 'Equal scenarios — low regret risk'}</div></div>`;
}

function renderMomentum() {
  const el = document.getElementById('momentum-content');
  const streak = 3;
  const dots = Array.from({ length: 7 }, (_, i) => `<div class="dot ${i < streak ? 'dot-on' : 'dot-off'}"></div>`).join('');
  el.innerHTML = `<div style="margin-top:4px"><div style="font-size:28px;font-weight:600;font-family:var(--mono);color:var(--purple)">${streak}<span style="font-size:14px;color:var(--sub);font-family:var(--font)"> days</span></div><div style="font-size:12px;color:var(--sub)">Review streak</div><div class="streak-dots" style="margin-top:12px">${dots}</div></div>`;
}

// ═══════════════════════════════════════
// SCORING ENGINE
// ═══════════════════════════════════════
function computeScenarioScore(s, w) {
  if (!s || !w) return 0;
  const wTotal = (w.money || 5) + (w.growth || 7) + (w.energy || 5) + (w.risk || 4) + (w.time || 5) + (w.freedom || 6);
  const wNorm = {
    money: (w.money || 5) / wTotal,
    growth: (w.growth || 7) / wTotal,
    energy: (w.energy || 5) / wTotal,
    risk: (w.risk || 4) / wTotal,
    time: (w.time || 5) / wTotal,
    freedom: (w.freedom || 6) / wTotal
  };
  const raw = (s.income || 5) * wNorm.money * 10
    + (s.learning || 5) * wNorm.growth * 10
    + (10 - (s.stress || 5)) * wNorm.energy * 10
    + (s.time || 5) * wNorm.time * 10
    + (s.freedom || 5) * wNorm.freedom * 10
    + (s.probability || 0.5) * 10 * (1 - wNorm.risk);
  return Math.round(Math.min(100, Math.max(0, raw * 10)));
}

function computeScore(dec) {
  if (!dec || !dec.scenarios.length) return dec ? 30 : 0;
  const scores = dec.scenarios.map(s => computeScenarioScore(s, dec.weights));
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function getBestScenario(dec) {
  if (!dec || !dec.scenarios.length) return null;
  return dec.scenarios.reduce((best, s) =>
    computeScenarioScore(s, dec.weights) > computeScenarioScore(best, dec.weights) ? s : best,
    dec.scenarios[0]
  );
}

// ═══════════════════════════════════════
// CREATE DECISION
// ═══════════════════════════════════════
function selectCat(el) {
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  STATE.currentCategory = el.dataset.cat;
}

function updateWeight(key, val) {
  STATE.weights[key] = parseInt(val);
  document.getElementById('w-' + key + '-val').textContent = val;
}

function saveDecision() {
  const title = document.getElementById('dec-title').value.trim();
  if (!title) { showToast('Please enter a decision title'); return; }
  const dec = {
    id: 'd' + Date.now(),
    title,
    category: STATE.currentCategory || 'Career',
    deadline: document.getElementById('dec-deadline').value,
    goal: document.getElementById('dec-goal').value,
    notes: document.getElementById('dec-notes').value,
    weights: { ...STATE.weights },
    scenarios: [],
    reviews: [],
    created: Date.now()
  };
  STATE.decisions.unshift(dec);
  STATE.currentDecision = dec;
  save();
  showToast('Decision saved ✓');
  openDecision(dec.id);
}

// ═══════════════════════════════════════
// DECISION DETAIL
// ═══════════════════════════════════════
function openDecision(id) {
  const dec = STATE.decisions.find(d => d.id === id);
  if (!dec) return;
  STATE.currentDecision = dec;
  nav('detail');
}

function renderDetail() {
  const dec = STATE.currentDecision || STATE.decisions[0];
  if (!dec) {
    document.getElementById('page-detail').innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">No decision selected</div><button class="btn-primary" onclick="nav('create')">Create Decision</button></div>`;
    return;
  }
  STATE.currentDecision = dec;
  document.getElementById('detail-cat').textContent = dec.category;
  document.getElementById('detail-title').textContent = dec.title;
  document.getElementById('detail-meta').textContent = `Created ${new Date(dec.created).toLocaleDateString()}${dec.deadline ? ' · Due ' + new Date(dec.deadline).toLocaleDateString() : ''}`;
  const score = computeScore(dec);
  document.getElementById('ov-score').textContent = score;
  document.getElementById('ov-conf').textContent = (dec.scenarios.length >= 2 ? Math.min(95, 60 + dec.scenarios.length * 10) : 20) + '%';
  document.getElementById('ov-scenarios').textContent = dec.scenarios.length;
  document.getElementById('ov-goal').textContent = dec.goal || '—';
  document.getElementById('ov-notes').textContent = dec.notes || 'No notes added.';
  renderScenarioPaths(dec);
  renderAnalysisTab(dec);
  renderReviewTab(dec);
}

function switchTab(name, el) {
  document.querySelectorAll('.detail-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.detail-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  el.classList.add('active');
}

function renderScenarioPaths(dec) {
  const c = document.getElementById('paths-container');
  if (!dec.scenarios.length) {
    c.innerHTML = `<div class="stat-card"><div class="empty-icon" style="font-size:28px;margin-bottom:12px;opacity:0.4">🔀</div><div class="empty-title">No scenarios yet</div><div class="empty-desc" style="font-size:13px;color:var(--sub)">Add at least two paths to compare and score.</div></div>`;
    return;
  }
  c.innerHTML = dec.scenarios.map((s, i) => {
    const score = computeScenarioScore(s, dec.weights);
    const isBest = score === Math.max(...dec.scenarios.map(x => computeScenarioScore(x, dec.weights)));
    return `<div class="path-card" style="${isBest ? 'border-color:rgba(139,92,246,0.3)' : ''}">
      <div class="path-header">
        <div style="display:flex;align-items:center;gap:10px">
          ${isBest ? '<div class="tag">Best path</div>' : ''}
          <input class="path-title-input" value="${s.name}" onchange="updateScenarioName(${i},this.value)"/>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <div class="path-score">${score}</div>
          <button onclick="removeScenario(${i})" style="color:var(--sub2);font-size:18px;padding:4px">×</button>
        </div>
      </div>
      <div class="path-metrics">
        ${[['income', 'Income', s.income], ['learning', 'Learning', s.learning], ['stress', 'Stress', s.stress], ['time', 'Time', s.time], ['probability', 'Probability', Math.round(s.probability * 10)], ['freedom', 'Freedom', s.freedom]].map(([key, label, val]) => `
          <div class="metric-item">
            <label>${label}</label>
            <div class="metric-val" style="color:${key === 'stress' ? 'var(--amber)' : 'var(--text)'}">${key === 'probability' ? val + '0%' : val + '/10'}</div>
            <input type="range" min="${key === 'probability' ? 1 : 0}" max="${key === 'probability' ? 10 : 10}" value="${val}" step="1" oninput="updateScenarioMetric(${i},'${key}',this.value,this.nextElementSibling)" style="margin-top:4px"/>
          </div>`).join('')}
      </div>
    </div>`;
  }).join('');
}

function addScenario() {
  const dec = STATE.currentDecision;
  if (!dec) return;
  dec.scenarios.push({ id: 's' + Date.now(), name: 'Path ' + (dec.scenarios.length + 1), income: 5, learning: 5, stress: 5, time: 5, probability: 0.5, cost: 0, freedom: 5 });
  save();
  renderDetail();
  switchTab('scenarios', document.querySelector('.detail-tab:nth-child(2)'));
}

function removeScenario(i) {
  const dec = STATE.currentDecision;
  dec.scenarios.splice(i, 1);
  save();
  renderDetail();
  switchTab('scenarios', document.querySelector('.detail-tab:nth-child(2)'));
}

function updateScenarioName(i, val) {
  STATE.currentDecision.scenarios[i].name = val;
  save();
}

function updateScenarioMetric(i, key, val, _el) {
  const v = key === 'probability' ? parseFloat(val) / 10 : parseInt(val);
  STATE.currentDecision.scenarios[i][key] = v;
  save();
  setTimeout(() => { renderScenarioPaths(STATE.currentDecision); renderDetail(); }, 100);
}

function renderAnalysisTab(dec) {
  const el = document.getElementById('analysis-content');
  if (!dec.scenarios.length) { el.innerHTML = `<div class="stat-card"><div class="empty-desc">Add scenarios first to see analysis.</div></div>`; return; }
  const scores = dec.scenarios.map(s => ({ name: s.name, score: computeScenarioScore(s, dec.weights) }));
  const best = scores.reduce((a, b) => a.score > b.score ? a : b);
  const worst = scores.reduce((a, b) => a.score < b.score ? a : b);
  const gap = best.score - worst.score;
  el.innerHTML = `
    <div class="three-col" style="margin-bottom:16px">
      <div class="stat-card"><div class="stat-num" style="color:var(--green)">${best.name}</div><div class="stat-label">Highest-scoring path</div></div>
      <div class="stat-card"><div class="stat-num" style="font-size:24px;color:var(--purple)">${gap} pts</div><div class="stat-label">Score gap (regret risk)</div></div>
      <div class="stat-card"><div class="stat-num" style="font-size:24px;color:var(--amber)">${Math.max(...dec.scenarios.map(s => Math.round(s.stress * 10)))}%</div><div class="stat-label">Max stress exposure</div></div>
    </div>
    <div class="stat-card" style="margin-bottom:16px">
      <div style="font-size:13px;font-weight:600;margin-bottom:12px">Scenario comparison</div>
      ${dec.scenarios.map(s => { const sc = computeScenarioScore(s, dec.weights); return `<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px"><span>${s.name}</span><span style="font-weight:600;color:var(--purple)">${sc}/100</span></div><div class="pbar"><div class="pbar-fill" style="width:${sc}%"></div></div></div>`; }).join('')}
    </div>
    <div class="stat-card">
      <div style="font-size:13px;font-weight:600;margin-bottom:12px">Heuristic insights</div>
      <div style="font-size:13px;color:var(--sub);line-height:1.8">
        ${gap > 25 ? '<div>⚠ High regret risk detected (' + gap + ' pt gap). Be very confident before committing.</div>' : ''}
        ${dec.scenarios.some(s => s.stress > 7) ? '<div>⚠ At least one scenario has high stress (>7). Check if energy weight reflects this.</div>' : ''}
        ${dec.scenarios.length < 3 ? '<div>💡 Consider adding a third scenario — a "do nothing" or hybrid path.</div>' : ''}
        <div>✓ Scoring is deterministic and based on your personal weights. No AI assumptions made.</div>
      </div>
    </div>`;
}

function renderReviewTab(dec) {
  const el = document.getElementById('review-content');
  if (!dec.reviews.length) { el.innerHTML = `<div style="font-size:13px;color:var(--sub2)">No reviews yet. Add a review to track how this decision aged.</div>`; return; }
  el.innerHTML = dec.reviews.map(r => `<div style="border-top:1px solid var(--border);padding:12px 0"><div style="font-size:11px;color:var(--sub2);margin-bottom:4px">${new Date(r.date).toLocaleDateString()}</div><div style="font-size:13px;color:var(--sub)">${r.note}</div></div>`).join('');
}

function addReview() {
  const note = prompt('How is this decision aging? What held true, what surprised you?');
  if (!note) return;
  STATE.currentDecision.reviews.push({ date: Date.now(), note });
  save();
  renderDetail();
  switchTab('review', document.querySelector('.detail-tab:nth-child(4)'));
}

function exportDecision() {
  const dec = STATE.currentDecision;
  if (!dec) return;
  const blob = new Blob([JSON.stringify(dec, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = dec.title.replace(/\s+/g, '-') + '.json';
  a.click();
  showToast('Decision exported ✓');
}

// ═══════════════════════════════════════
// SIMULATE
// ═══════════════════════════════════════
function renderSimulate() {
  const el = document.getElementById('sim-content');
  const dec = STATE.currentDecision || STATE.decisions[0];
  if (!dec || !dec.scenarios.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">📊</div><div class="empty-title">No scenarios to simulate</div><div class="empty-desc">Create a decision and add scenarios first.</div><button class="btn-primary" onclick="nav('create')">Create Decision</button></div>`;
    return;
  }
  const scores = dec.scenarios.map(s => computeScenarioScore(s, dec.weights));
  const metrics = ['Income', 'Learning', 'Stress', 'Time', 'Freedom'];
  const colors = ['#8B5CF6', '#D946EF', '#22C55E', '#F59E0B', '#3B82F6'];
  const radarData = metrics.map(m => {
    const key = m.toLowerCase() === 'income' ? 'income' : m.toLowerCase() === 'learning' ? 'learning' : m.toLowerCase() === 'stress' ? 'stress' : m.toLowerCase() === 'time' ? 'time' : 'freedom';
    const obj = { metric: m };
    dec.scenarios.forEach((s, i) => { obj['s' + i] = (s[key] || 5) * 10; });
    return obj;
  });
  const timelineData = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8'].map((q, i) => {
    const obj = { q };
    dec.scenarios.forEach((s, j) => { const base = scores[j]; obj['s' + j] = Math.round(base * (0.5 + (i * 0.07)) + (Math.random() - 0.5) * 5); });
    return obj;
  });
  el.innerHTML = `
    <div class="two-col" style="margin-bottom:16px">
      <div class="radar-wrap">
        <div class="chart-title">Scenario Radar</div>
        <div id="radar-chart" style="height:240px;width:100%"></div>
      </div>
      <div class="radar-wrap">
        <div class="chart-title">Composite Score Projection</div>
        <div id="line-chart" style="height:240px;width:100%"></div>
      </div>
    </div>
    <div class="radar-wrap" style="margin-bottom:16px">
      <div class="chart-title">Score Breakdown</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-top:12px">
        ${dec.scenarios.map((s, i) => { const sc = scores[i]; return `<div class="stat-card"><div style="font-size:12px;color:${colors[i]};margin-bottom:4px;font-weight:600">${s.name}</div><div class="stat-num" style="font-size:28px;color:${colors[i]}">${sc}</div><div class="stat-label">/ 100 composite</div><div style="margin-top:10px;font-size:11px;color:var(--sub)">Prob: ${Math.round(s.probability * 100)}% · Stress: ${s.stress}/10</div></div>`; }).join('')}
      </div>
    </div>
    <div class="radar-wrap">
      <div class="chart-title">Uncertainty Bands</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-top:12px">
        ${dec.scenarios.map((s, i) => { const sc = scores[i]; const lo = Math.max(0, sc - Math.round((1 - s.probability) * 20)); const hi = Math.min(100, sc + Math.round(s.probability * 12)); return `<div style="background:var(--bg4);border:1px solid var(--border);border-radius:var(--r3);padding:14px"><div style="font-size:12px;font-weight:600;color:${colors[i]};margin-bottom:8px">${s.name}</div><div style="display:flex;align-items:center;gap:8px;font-size:12px"><span style="color:var(--sub)">Low</span><div style="flex:1;height:6px;background:var(--bg3);border-radius:3px;overflow:hidden;position:relative"><div style="position:absolute;left:${lo}%;width:${hi - lo}%;height:100%;background:${colors[i]};opacity:0.6;border-radius:3px"></div></div><span style="color:var(--sub)">High</span></div><div style="display:flex;justify-content:space-between;margin-top:4px;font-size:11px;color:var(--sub2)"><span>${lo}</span><span style="font-weight:600;color:${colors[i]}">${sc}</span><span>${hi}</span></div></div>`; }).join('')}
      </div>
    </div>`;
  setTimeout(() => drawCharts(radarData, timelineData, dec, colors), 50);
}

function drawCharts(radarData, timelineData, dec, colors) {
  drawRadar(radarData, dec, colors);
  drawLine(timelineData, dec, colors);
}

function drawRadar(radarData, dec, colors) {
  const canvas = document.createElement('canvas');
  canvas.width = 300; canvas.height = 220;
  canvas.style.cssText = 'width:100%;height:100%;max-width:300px;display:block;margin:0 auto';
  document.getElementById('radar-chart').appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const cx = 150, cy = 110, r = 80;
  const metrics = radarData.map(d => d.metric);
  const n = metrics.length;
  ctx.clearRect(0, 0, 300, 220);
  // Grid rings
  for (let ring = 1; ring <= 4; ring++) {
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      ctx.lineTo(cx + Math.cos(a) * r * (ring / 4), cy + Math.sin(a) * r * (ring / 4));
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }
  // Axes + labels
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 0.5; ctx.stroke();
    const lx = cx + Math.cos(a) * (r + 18), ly = cy + Math.sin(a) * (r + 18);
    ctx.fillStyle = 'rgba(161,161,170,0.8)'; ctx.font = '10px Inter';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(metrics[i], lx, ly);
  }
  // Scenarios
  dec.scenarios.forEach((s, si) => {
    const vals = radarData.map(d => (d['s' + si] || 50) / 100);
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const idx = i % n;
      const a = (idx / n) * Math.PI * 2 - Math.PI / 2;
      const rv = vals[idx] * r;
      i === 0 ? ctx.moveTo(cx + Math.cos(a) * rv, cy + Math.sin(a) * rv) : ctx.lineTo(cx + Math.cos(a) * rv, cy + Math.sin(a) * rv);
    }
    ctx.closePath();
    ctx.fillStyle = colors[si] + '22'; ctx.fill();
    ctx.strokeStyle = colors[si]; ctx.lineWidth = 1.5; ctx.stroke();
  });
}

function drawLine(timelineData, dec, colors) {
  const canvas = document.createElement('canvas');
  canvas.width = 400; canvas.height = 220;
  canvas.style.cssText = 'width:100%;height:100%';
  document.getElementById('line-chart').appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const pad = { t: 20, r: 20, b: 30, l: 40 };
  const w = 400 - pad.l - pad.r, h = 220 - pad.t - pad.b;
  const n = timelineData.length;
  ctx.clearRect(0, 0, 400, 220);
  // Grid + Y-axis labels
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + h * (1 - i / 4);
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + w, y);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 0.5; ctx.stroke();
    ctx.fillStyle = 'rgba(161,161,170,0.6)'; ctx.font = '9px Inter';
    ctx.textAlign = 'right'; ctx.fillText(Math.round(i * 25), pad.l - 6, y + 3);
  }
  // X-axis labels
  timelineData.forEach((d, i) => {
    ctx.fillStyle = 'rgba(161,161,170,0.5)'; ctx.font = '9px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(d.q, pad.l + w * (i / (n - 1)), pad.t + h + 16);
  });
  // Lines + dots
  dec.scenarios.forEach((s, si) => {
    ctx.beginPath();
    timelineData.forEach((d, i) => {
      const x = pad.l + w * (i / (n - 1)), y = pad.t + h * (1 - d['s' + si] / 100);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = colors[si]; ctx.lineWidth = 2; ctx.stroke();
    timelineData.forEach((d, i) => {
      const x = pad.l + w * (i / (n - 1)), y = pad.t + h * (1 - d['s' + si] / 100);
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = colors[si]; ctx.fill();
    });
  });
  // Legend
  dec.scenarios.forEach((s, i) => {
    ctx.fillStyle = colors[i]; ctx.fillRect(pad.l + (i * 120), 4, 10, 2);
    ctx.fillStyle = 'rgba(161,161,170,0.8)'; ctx.font = '9px Inter';
    ctx.textAlign = 'left'; ctx.fillText(s.name, pad.l + (i * 120) + 14, 7);
  });
}

// ═══════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════
function saveApiKey() {
  const key = document.getElementById('api-key-input').value;
  if (!key) { showToast('Please enter an API key'); return; }
  STATE.settings.apiKey = key;
  save();
  showToast('API key saved locally ✓');
}

function exportAll() {
  const blob = new Blob([JSON.stringify(STATE.decisions, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'pathwise-export.json';
  a.click();
  showToast('All data exported ✓');
}

function clearData() {
  if (!confirm('Delete ALL decisions permanently? This cannot be undone.')) return;
  STATE.decisions = [];
  save();
  showToast('Data cleared');
  nav('landing');
}

// ═══════════════════════════════════════
// TOAST
// ═══════════════════════════════════════
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ═══════════════════════════════════════
// INIT
// ═══════════════════════════════════════
document.getElementById('dash-date') && (document.getElementById('dash-date').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
