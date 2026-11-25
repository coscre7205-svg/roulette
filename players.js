/* 1페이지: 참가자 — 이름 추가·삭제, 중복 방지 */
(() => {
  const { $, MAX, CHIP_BG, normName, colorOf, loadNames, saveNames, loadRecords, renderTabs } = FR;
  const form = $('addForm'), input = $('nameInput'), msg = $('msg');
  const listEl = $('names'), countEl = $('count'), clearBtn = $('clearBtn');
  const nextBtn = $('nextBtn'), nextHint = $('nextHint');

  let names = loadNames();
  const recordCount = loadRecords().length;

  const say = t => { msg.textContent = t; };

  function renderList() {
    listEl.innerHTML = '';
    if (!names.length) {
      const li = document.createElement('li');
      li.className = 'empty';
      li.style.background = 'none'; li.style.animation = 'none'; li.style.padding = '0';
      li.innerHTML = '<span class="big">🐣</span>아직 아무도 없어요';
      listEl.appendChild(li);
    }
    names.forEach((n, i) => {
      const li = document.createElement('li');
      li.style.background = CHIP_BG[colorOf(i, names.length)];
      li.style.color = '#1f2a44';
      const s = document.createElement('span');
      s.textContent = n;
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = '×';
      b.setAttribute('aria-label', n + ' 삭제');
      b.addEventListener('click', () => { names.splice(i, 1); update(); });
      li.append(s, b);
      listEl.appendChild(li);
    });
    countEl.textContent = names.length;
  }

  function updateControls() {
    clearBtn.disabled = !names.length;
    // "룰렛으로 가기": 2명 이상일 때만 누를 수 있다
    const ok = names.length >= 2;
    nextBtn.classList.toggle('is-disabled', !ok);
    if (ok) { nextBtn.removeAttribute('aria-disabled'); nextBtn.tabIndex = 0; }
    else { nextBtn.setAttribute('aria-disabled', 'true'); nextBtn.tabIndex = -1; }
    nextHint.textContent = ok ? '준비됐어요! 룰렛으로 가 볼까요?' : '2명 이상 추가하면 룰렛으로 갈 수 있어요';
    renderTabs(names.length, recordCount);
  }

  function update() { saveNames(names); renderList(); updateControls(); }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const v = input.value.trim().replace(/\s+/g, ' ');
    if (!v) { say('이름을 입력해 주세요 🙂'); input.focus(); return; }
    // 중복 검사: 대소문자·공백 차이도 같은 이름으로 본다
    const dupIdx = names.findIndex(n => normName(n) === normName(v));
    if (dupIdx !== -1) {
      say(`"${names[dupIdx]}" 이름은 이미 추가되어 있어요`);
      const li = listEl.children[dupIdx];
      if (li) { li.classList.add('dup'); setTimeout(() => li.classList.remove('dup'), 1200); }
      input.select();
      return;
    }
    if (names.length >= MAX) { say(`최대 ${MAX}명까지 추가할 수 있어요`); return; }
    names.push(v);
    input.value = ''; say('');
    update(); input.focus();
  });
  input.addEventListener('input', () => say(''));

  clearBtn.addEventListener('click', () => {
    if (!names.length) return;
    if (confirm('참가자를 모두 지울까요?')) { names = []; update(); }
  });

  renderList();
  updateControls();
})();
