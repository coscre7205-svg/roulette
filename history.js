/* 3페이지: 기록 — 누가 몇 번 걸렸는지 표로 보여 준다 */
(() => {
  const { $, COLORS, normName, loadNames, loadRecords, saveRecords, Store, KEYS, renderTabs } = FR;
  const histBody = $('histBody'), histSummary = $('histSummary'), histClear = $('histClear');
  const recentEl = $('recent'), recentLabel = $('recentLabel');

  const names = loadNames();
  let records = loadRecords();

  // "방금" 표시: 가장 최근 결과가 2분 안에 나온 경우에만 그 사람 줄을 강조한다
  function recentWinnerKey() {
    const last = records[records.length - 1];
    return last && Date.now() - last.t < 2 * 60 * 1000 ? normName(last.name) : '';
  }

  function renderHistory() {
    // 이름별 집계: 지금 참가자는 0번이어도 표에 넣고, 예전에 뽑힌 사람도 남긴다
    const map = new Map();
    names.forEach(n => map.set(normName(n), { key: normName(n), name: n, count: 0, current: true }));
    records.forEach(r => {
      const k = normName(r.name);
      const e = map.get(k) || { key: k, name: r.name, count: 0, current: false };
      e.count++;
      map.set(k, e);
    });
    const rows = [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ko'));
    const max = Math.max(1, ...rows.map(r => r.count));
    const total = records.length;
    const lastKey = recentWinnerKey();

    histSummary.innerHTML = '';
    if (total) {
      histSummary.append('총 ');
      const b = document.createElement('b'); b.textContent = total;
      histSummary.append(b, '번 뽑았어요');
    } else histSummary.textContent = '아직 기록이 없어요';
    histClear.disabled = !total;

    histBody.innerHTML = '';
    if (!rows.length) {
      const tr = histBody.insertRow(), td = tr.insertCell();
      td.colSpan = 4; td.style.background = 'none'; td.className = 'hist-empty';
      td.innerHTML = '<span class="big">📝</span>참가자를 추가하고 뽑기를 해 보세요!';
    }
    let rank = 0, prev = -1;
    rows.forEach((r, i) => {
      if (r.count !== prev) { rank = i + 1; prev = r.count; }   // 같은 횟수는 같은 순위
      const tr = histBody.insertRow();
      const isLatest = lastKey && r.key === lastKey;
      if (isLatest) tr.className = 'latest';
      tr.insertCell().textContent = r.count ? rank : '-';

      const nameTd = tr.insertCell();
      nameTd.append(r.name);
      if (!r.current) { const s = document.createElement('span'); s.className = 'badge'; s.textContent = '참가 안 함'; nameTd.append(s); }
      if (isLatest) { const s = document.createElement('span'); s.className = 'badge new'; s.textContent = '방금'; nameTd.append(s); }

      const cntTd = tr.insertCell(); cntTd.className = 'cnt'; cntTd.textContent = r.count + '번';

      const barTd = tr.insertCell();
      const bar = document.createElement('div'), fill = document.createElement('i');
      bar.className = 'bar';
      // 막대가 0에서 차오르도록 한 프레임 뒤에 폭을 준다
      fill.style.width = '0%';
      requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.width = (r.count / max * 100) + '%'; }));
      fill.style.background = COLORS[i % COLORS.length];
      bar.append(fill); barTd.append(bar);
      bar.title = `${total ? Math.round(r.count / total * 100) : 0}%`;
    });

    // 최근 결과 10개 (최신순)
    recentEl.innerHTML = '';
    recentLabel.hidden = !total;
    records.slice(-10).reverse().forEach(r => {
      const li = document.createElement('li');
      const d = new Date(r.t);
      li.append(r.name);
      const sm = document.createElement('small');
      sm.textContent = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      li.append(sm);
      recentEl.append(li);
    });

    renderTabs(names.length, records.length);
  }

  histClear.addEventListener('click', () => {
    if (!records.length) return;
    if (confirm('뽑기 기록을 모두 지울까요? 되돌릴 수 없어요.')) {
      records = [];
      Store.remove(KEYS.history);
      renderHistory();
    }
  });

  renderHistory();
})();
