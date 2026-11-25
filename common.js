/* 복불복 룰렛 - 3개 페이지(index / roulette / history)가 함께 쓰는 공용 코드
   참가자 이름과 뽑기 기록은 여기(Store)를 통해 저장되고, 어느 페이지에서든 같은 데이터를 읽는다. */
const FR = (() => {
  const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4', '#ec4899', '#84cc16'];
  const CHIP_BG = ['#dbeafe', '#dcfce7', '#fef3c7', '#fee2e2', '#f3e8ff', '#cffafe', '#fce7f3', '#ecfccb'];
  const MAX = 30;
  const KEYS = { names: 'fortune-roulette-names', history: 'fortune-roulette-history', sound: 'fortune-roulette-sound' };
  const $ = id => document.getElementById(id);

  /* ---------- 저장소 ----------
     1순위: localStorage (새로고침·브라우저를 껐다 켜도 유지)
     2순위: window.name 백업 — 일부 브라우저는 파일(file://)로 연 페이지끼리 localStorage를 나누지 않는다.
            그런 경우에도 같은 탭 안에서 페이지를 옮길 때 데이터가 이어지도록 한다. */
  const Store = (() => {
    let bag = {};
    try { const w = JSON.parse(window.name); if (w && w.__fr === 1 && w.data) bag = w.data; } catch (e) {}
    const flush = () => { try { window.name = JSON.stringify({ __fr: 1, data: bag }); } catch (e) {} };
    return {
      get(key, fallback) {
        try { const v = localStorage.getItem(key); if (v !== null) return JSON.parse(v); } catch (e) {}
        return key in bag ? bag[key] : fallback;
      },
      set(key, value) {
        bag[key] = value; flush();
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
      },
      remove(key) {
        delete bag[key]; flush();
        try { localStorage.removeItem(key); } catch (e) {}
      }
    };
  })();

  // 이름 비교용: 대소문자·공백 차이를 무시 (예: "Kim" = "kim", "김 민수" = "김민수")
  const normName = s => s.normalize('NFC').replace(/\s+/g, '').toLowerCase();

  function loadNames() {
    const raw = Store.get(KEYS.names, []);
    return Array.isArray(raw) ? raw.filter(n => typeof n === 'string' && n.trim()).slice(0, MAX) : [];
  }
  const saveNames = names => Store.set(KEYS.names, names);

  // 뽑기 기록: [{ name, t(시각) }]
  function loadRecords() {
    const raw = Store.get(KEYS.history, []);
    return Array.isArray(raw) ? raw.filter(r => r && typeof r.name === 'string' && Number.isFinite(r.t)) : [];
  }
  const saveRecords = records => Store.set(KEYS.history, records.slice(-500));

  // 칸 색: 마지막 칸이 첫 칸과 같은 색이 되지 않도록
  function colorOf(i, n) {
    let c = i % COLORS.length;
    if (i === n - 1 && i > 0 && c === 0) c = 3;
    return c;
  }

  /* ---------- 페이지 이동 보조 ---------- */
  let navLocked = false;
  // 뽑는 도중(룰렛 페이지)에는 다른 페이지로 못 나가게 탭·이동 링크를 잠근다
  function lockNav(on) {
    navLocked = on;
    document.querySelectorAll('.tab, [data-lock]').forEach(el => {
      el.classList.toggle('is-disabled', on);
      if (on) el.setAttribute('aria-disabled', 'true'); else el.removeAttribute('aria-disabled');
    });
  }
  // 탭에 보이는 숫자(참가자 수, 뽑은 횟수)
  function renderTabs(nameCount, recordCount) {
    if ($('tabCount')) $('tabCount').textContent = nameCount;
    if ($('tabHist')) $('tabHist').textContent = recordCount;
  }
  // 잠겨 있거나 비활성인 링크는 눌러도 이동하지 않는다
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (a && (navLocked || a.getAttribute('aria-disabled') === 'true')) e.preventDefault();
  });

  return { COLORS, CHIP_BG, MAX, KEYS, $, Store, normName, loadNames, saveNames, loadRecords, saveRecords, colorOf, lockNav, renderTabs };
})();
