/* 2페이지: 룰렛 — 뽑기 애니메이션, 이름 티커, 배경색, 소리, 폭죽 */
(() => {
  const { $, COLORS, KEYS, Store, normName, colorOf, loadNames, loadRecords, saveRecords, lockNav, renderTabs } = FR;

  const spinBtn = $('spinBtn'), hint = $('hint');
  const overlay = $('overlay'), winnerEl = $('winnerName');
  const canvas = $('wheel'), ctx = canvas.getContext('2d');
  const tickerEl = $('ticker'), pointerEl = document.querySelector('.pointer');

  const names = loadNames();           // 이 페이지에서는 참가자를 바꾸지 않는다 (1페이지에서 수정)
  let records = loadRecords();
  let rotation = 0;
  let spinning = false;

  const nameColor = i => COLORS[colorOf(i, names.length)];

  // 뽑기 버튼 색: 룰렛 판 색과 겹치지 않는 진한 색 중 랜덤 (같은 색이 연속으로 나오지 않게)
  const BTN_COLORS = [
    ['#0f766e', '#115e59', 'rgba(15,118,110,.3)'],   // 짙은 청록
    ['#86198f', '#701a75', 'rgba(134,25,143,.3)'],   // 자주
    ['#1e293b', '#0f172a', 'rgba(30,41,59,.3)'],     // 네이비 차콜
    ['#9a3412', '#7c2d12', 'rgba(154,52,18,.3)']     // 벽돌 갈색
  ];
  let btnIdx = -1;
  function shuffleBtnColor() {
    let i;
    do { i = Math.floor(Math.random() * BTN_COLORS.length); } while (i === btnIdx);
    btnIdx = i;
    const [c, d, s] = BTN_COLORS[i];
    const st = spinBtn.style;
    st.setProperty('--btn', c); st.setProperty('--btn-dark', d); st.setProperty('--btn-shadow', s);
  }
  shuffleBtnColor();

  function updateControls() {
    spinBtn.disabled = names.length < 2 || spinning;
    lockNav(spinning);                               // 뽑는 중에는 다른 페이지로 못 나간다
    renderTabs(names.length, records.length);
    if (spinning) hint.textContent = '두근두근... 과연 누구일까요? 🥁';
    else if (names.length < 2) hint.textContent = '참가자를 2명 이상 추가해 주세요 (아래 "참가자 수정하기")';
    else hint.textContent = '준비 완료! 뽑기 버튼을 눌러 보세요';
  }

  // 결과를 기록에 저장 (기록 페이지에서 표로 보인다)
  function addRecord(name) {
    records.push({ name, t: Date.now() });
    if (records.length > 500) records = records.slice(-500);
    saveRecords(records);
  }

  /* ---------- 룰렛 그리기 ---------- */
  function fitText(text, maxW) {
    if (ctx.measureText(text).width <= maxW) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
    return t + '…';
  }

  function drawWheel() {
    const W = canvas.width, R = W / 2 - 14, cx = W / 2, cy = W / 2;
    ctx.clearRect(0, 0, W, W);

    // 바깥 테두리
    ctx.beginPath(); ctx.arc(cx, cy, R + 12, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = '#e5ebf7'; ctx.stroke();

    const n = names.length;
    if (n === 0) {
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = '#eef3ff'; ctx.fill();
      ctx.fillStyle = '#9aa7c4';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '400 54px "Jalnan Gothic", "Malgun Gothic", sans-serif';
      ctx.fillText('이름을 추가해 주세요', cx, cy - 8);
      ctx.font = '70px sans-serif';
      ctx.fillText('🎡', cx, cy - 100);
    } else {
      const per = Math.PI * 2 / n;
      for (let i = 0; i < n; i++) {
        const a0 = rotation + i * per, a1 = a0 + per;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a0, a1); ctx.closePath();
        ctx.fillStyle = nameColor(i); ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(a0 + per / 2);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        const fs = Math.max(26, Math.min(56, 400 / Math.max(n, 6) + 18));
        ctx.font = `400 ${fs}px "Jalnan Gothic", "Malgun Gothic", sans-serif`;
        ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 4;
        ctx.fillText(fitText(names[i], R * 0.62), R - 36, 2);
        ctx.restore();
      }
    }

    // 중앙 버튼 모양
    ctx.beginPath(); ctx.arc(cx, cy, 44, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = '#e5ebf7'; ctx.stroke();
    ctx.font = '40px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000'; ctx.fillText('⭐', cx, cy + 3);
  }

  /* ---------- 뽑기 ---------- */
  const TWO_PI = Math.PI * 2;
  const mod = (a, m) => ((a % m) + m) % m;
  const easeOut = t => 1 - Math.pow(1 - t, 4);

  function spin() {
    if (spinning || names.length < 2) return;
    spinning = true; updateControls();
    startSpinFx();
    startMusic();                    // 두근두근 시작 (뽑기 버튼 클릭 직후라 브라우저가 소리를 허용)

    const n = names.length, per = TWO_PI / n;
    // 난수는 crypto 사용
    const buf = new Uint32Array(2); crypto.getRandomValues(buf);
    const winner = buf[0] % n;
    const jitter = (buf[1] / 0xffffffff - 0.5) * per * 0.7;

    // 포인터는 위쪽(-90°). winner 칸의 중심이 포인터에 오도록 회전량 계산
    const pointerAngle = -Math.PI / 2;
    const targetRot = pointerAngle - (winner * per + per / 2) + jitter;
    const delta = mod(targetRot - rotation, TWO_PI) + TWO_PI * (5 + (buf[0] % 3));
    const start = rotation, duration = 6200, t0 = performance.now();

    function frame(now) {
      const t = Math.min(1, (now - t0) / duration);
      const prev = rotation;
      rotation = start + delta * easeOut(t);   // 빠르게 시작해서 점점 느려지며 멈춤
      drawWheel();
      if (t < 1) { spinFxFrame(rotation - prev); updateMusic(t); }
      if (t < 1) requestAnimationFrame(frame);
      else finish(winner);
    }
    requestAnimationFrame(frame);
  }

  function finish(idx) {
    addRecord(names[idx]);           // 결과를 기록에 저장
    stopMusic(); playWin();          // 박동 멈춤 → "쿵!" + 팡파르
    stopSpinFx(idx);                 // 티커·포인터·배경 마무리
    hint.textContent = '당첨!! 🎉';
    celebrate();                     // 화면 전체 폭죽
    setTimeout(() => showResult(idx), 1100); // 폭죽이 터지는 걸 잠깐 보여 준 뒤 결과 창
  }

  function showResult(idx) {
    spinning = false;
    updateControls();
    winnerEl.textContent = names[idx];
    overlay.classList.add('show');
    $('closeBtn').focus();
    shuffleBtnColor(); // 다음 판엔 다른 색 버튼으로
  }

  function closeResult() {
    overlay.classList.remove('show');
    stopFx();
  }

  /* ---------- 회전 연출: 이름 티커 · 포인터 · 배경색 ---------- */
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let fxHue = Math.random() * 360, fxPtr = 0, fxLastIdx = -1;

  function setTicker(name, color) {
    tickerEl.textContent = name;
    tickerEl.style.background = color;
    // 긴 이름은 글자 크기를 줄여 한 줄에 맞춘다
    tickerEl.style.fontSize = (name.length > 8 ? 26 : name.length > 5 ? 32 : 38) + 'px';
  }
  function resetTicker() {
    tickerEl.textContent = '누가 뽑힐까요? 🤔';
    tickerEl.className = 'ticker';
    tickerEl.style.background = '';
    tickerEl.style.fontSize = '';
  }
  function nameUnderPointer() {
    const per = TWO_PI / names.length;
    return Math.min(names.length - 1, Math.floor(mod(-Math.PI / 2 - rotation, TWO_PI) / per));
  }
  function startSpinFx() {
    fxLastIdx = -1; fxPtr = 0;
    tickerEl.className = 'ticker spinning';
    document.body.classList.add('spinning');
  }
  // speed: 이번 프레임에 룰렛이 돈 각도(rad). 빠를수록 이름·배경색이 빨리 바뀐다
  function spinFxFrame(speed) {
    const idx = nameUnderPointer();
    if (idx !== fxLastIdx) {
      fxLastIdx = idx;
      setTicker(names[idx], nameColor(idx));
      fxPtr = -24;                                   // 포인터가 칸 경계에 '탁' 걸리는 느낌
      playTick();                                    // 틱!
    }
    fxPtr *= 0.8;
    pointerEl.style.transform = `translateX(-50%) rotate(${fxPtr.toFixed(1)}deg)`;
    if (!reduceMotion) {
      fxHue = (fxHue + Math.min(6, 0.5 + speed * 10)) % 360;   // 한 프레임에 최대 6°: 번쩍임 없이 부드럽게
      document.body.style.backgroundColor = `hsl(${fxHue.toFixed(0)} 95% 88%)`;
    }
  }
  function stopSpinFx(idx) {
    document.body.classList.remove('spinning');
    document.body.style.backgroundColor = '';       // 흰 배경으로 천천히 복귀
    pointerEl.style.transform = '';
    setTicker(names[idx], nameColor(idx));
    tickerEl.className = 'ticker final';
  }

  /* ---------- 사운드: 두근두근 심장 박동 + 긴장감 있는 저음 + 틱 ----------
     음원 파일 없이 브라우저(WebAudio)에서 직접 만든다. 박동은 점점 빨라지고, 멈추면 "쿵!" + 팡파르. */
  const soundBtn = $('soundBtn');
  let soundOn = Store.get(KEYS.sound, 'on') !== 'off';
  let actx = null, master = null, beatTimer = 0, nextBeat = 0, drone = null, spinT = 0;

  function ensureAudio() {
    if (!soundOn) return false;
    try {
      if (!actx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        actx = new AC();
        master = actx.createGain(); master.gain.value = 0.9;
        const comp = actx.createDynamicsCompressor();     // 갑자기 커지지 않게
        master.connect(comp); comp.connect(actx.destination);
      }
      if (actx.state === 'suspended') actx.resume();
      return true;
    } catch (e) { return false; }
  }

  // 심장 소리 한 번 "쿵": 낮은 사인파 + 작은 스피커에서도 들리도록 배음(삼각파)을 얹는다
  function thump(time, freq, vol) {
    const o = actx.createOscillator(), o2 = actx.createOscillator();
    const g = actx.createGain(), g2 = actx.createGain();
    o.type = 'sine'; o2.type = 'triangle';
    o.frequency.setValueAtTime(freq * 1.8, time); o.frequency.exponentialRampToValueAtTime(freq * .5, time + .14);
    o2.frequency.setValueAtTime(freq * 3.6, time); o2.frequency.exponentialRampToValueAtTime(freq, time + .1);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(vol, time + .012);
    g.gain.exponentialRampToValueAtTime(0.0001, time + .24);
    g2.gain.value = .35;
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(master);
    o.start(time); o2.start(time); o.stop(time + .27); o2.stop(time + .27);
  }

  function tone(time, freq, dur, vol) {
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = 'triangle'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(vol, time + .015);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    o.connect(g); g.connect(master);
    o.start(time); o.stop(time + dur + .05);
  }

  // 박동 예약: 진행도가 올라갈수록 빨라진다(약 76 → 170 BPM). "두근-두근" = 큰 소리 + 작은 소리
  function scheduleBeats() {
    if (!actx) return;
    while (nextBeat < actx.currentTime + .12) {
      const bpm = 76 + 96 * Math.pow(spinT, 1.4), period = 60 / bpm;
      thump(nextBeat, 82, .95);
      thump(nextBeat + Math.min(.17, period * .38), 68, .65);
      nextBeat += period;
    }
  }

  function startMusic() {
    if (!ensureAudio()) return;
    stopMusic();
    spinT = 0;
    const now = actx.currentTime;
    nextBeat = now + .05;
    // 깔리는 저음: 톱니파 두 개를 살짝 어긋나게 + 낮은 필터. 진행될수록 음이 오르고 필터가 열린다
    const a = actx.createOscillator(), b = actx.createOscillator();
    const f = actx.createBiquadFilter(), g = actx.createGain();
    a.type = b.type = 'sawtooth'; a.frequency.value = 110; b.frequency.value = 110 * 1.007;
    f.type = 'lowpass'; f.frequency.value = 280;
    g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(.06, now + 1.2);
    a.connect(f); b.connect(f); f.connect(g); g.connect(master);
    a.start(now); b.start(now);
    drone = { a, b, f, g };
    beatTimer = setInterval(scheduleBeats, 40);
    scheduleBeats();
  }

  function updateMusic(t) {                       // t: 0 → 1 (회전 진행도)
    spinT = t;
    if (!drone || !actx) return;
    const now = actx.currentTime;
    drone.a.frequency.setTargetAtTime(110 + 70 * t, now, .1);
    drone.b.frequency.setTargetAtTime((110 + 70 * t) * 1.007, now, .1);
    drone.f.frequency.setTargetAtTime(280 + 1400 * t, now, .1);
    drone.g.gain.setTargetAtTime(.06 + .04 * t, now, .1);
  }

  function stopMusic() {
    clearInterval(beatTimer); beatTimer = 0;
    if (drone && actx) {
      const d = drone, now = actx.currentTime;
      d.g.gain.cancelScheduledValues(now);
      d.g.gain.setTargetAtTime(0.0001, now, .08);
      d.a.stop(now + .5); d.b.stop(now + .5);
    }
    drone = null;
  }

  // 멈추는 순간: 마지막 "쿵!" 한 번 + 반짝이는 팡파르
  function playWin() {
    if (!ensureAudio()) return;
    const t = actx.currentTime + .02;
    thump(t, 60, 1);
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(t + .14 + i * .09, f, .5, .2));
    [523.25, 659.25, 783.99, 1046.5].forEach(f => tone(t + .62, f, 1.3, .12));
  }

  // 틱! — 포인터가 칸 경계를 지날 때마다 나는 짧은 딸깍 소리 (룰렛이 느려지면 하나하나 또렷하게 들린다)
  let lastTickAt = 0;
  function playTick() {
    if (!soundOn || !actx || actx.state !== 'running') return;
    const now = actx.currentTime;
    if (now - lastTickAt < .045) return;           // 너무 빠를 땐 솎아서 '드르륵' 소리가 되게
    lastTickAt = now;
    const f = 2000 + Math.random() * 400;          // 매번 아주 살짝 다른 높이
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(f, now);
    o.frequency.exponentialRampToValueAtTime(f * .45, now + .03);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(.22, now + .003);
    g.gain.exponentialRampToValueAtTime(0.0001, now + .05);
    o.connect(g); g.connect(master);
    o.start(now); o.stop(now + .06);
  }

  function renderSound() {
    soundBtn.textContent = soundOn ? '🔊 소리 켜짐' : '🔇 소리 꺼짐';
    soundBtn.setAttribute('aria-pressed', String(soundOn));
  }
  soundBtn.addEventListener('click', () => {
    soundOn = !soundOn;
    Store.set(KEYS.sound, soundOn ? 'on' : 'off');
    if (!soundOn) stopMusic();
    else if (spinning) startMusic();
    renderSound();
  });
  renderSound();

  /* ---------- 폭죽: 불꽃 로켓 + 색종이, 화면 전체 ---------- */
  const cv = $('confetti'), cc = cv.getContext('2d');
  const FX_COLORS = COLORS.concat(['#facc15', '#ffffff']);
  let rockets = [], sparks = [], pieces = [], fxTimers = [], fxPending = 0, fxRaf = 0, fxFrame = 0;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pickColor = () => FX_COLORS[Math.floor(Math.random() * FX_COLORS.length)];

  function sizeFx() { cv.width = innerWidth; cv.height = innerHeight; }

  function launchRocket() {
    fxPending--;
    const W = cv.width, H = cv.height, frames = 46;
    const x0 = W / 2 + rnd(-.15, .15) * W, tx = rnd(.1, .9) * W, ty = rnd(.1, .5) * H;
    rockets.push({ x: x0, y: H, vx: (tx - x0) / frames, vy: (ty - H) / frames, t: 0, frames, color: pickColor() });
  }

  function explode(x, y, color) {
    const n = Math.round(rnd(70, 110)), ring = Math.random() < .5, big = rnd(5.5, 8.5), second = pickColor();
    for (let i = 0; i < n; i++) {
      const a = Math.PI * 2 * i / n + rnd(-.03, .03), sp = ring ? big : rnd(1.5, big);
      sparks.push({ x, y, px: x, py: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
                    life: 0, max: rnd(55, 85), color: i % 3 === 0 ? second : color, size: rnd(2, 3.6) });
    }
    for (let i = 0; i < 10; i++) addPiece(x, y, rnd(-6, 6), rnd(-6, 2), 140);
  }

  function addPiece(x, y, vx, vy, max) {
    pieces.push({ x, y, vx, vy, s: rnd(6, 13), r: rnd(0, 6), vr: rnd(-.3, .3), c: pickColor(), life: 0, max });
  }

  function fxTick() {
    fxFrame++;
    const W = cv.width, H = cv.height;
    cc.clearRect(0, 0, W, H);

    // 위에서 내리는 색종이 비 (처음 약 3초)
    if (fxFrame < 190 && fxFrame % 2 === 0) addPiece(rnd(0, W), -10, rnd(-1, 1), rnd(2, 4.5), 330);

    // 색종이
    for (const p of pieces) {
      p.vy += .22; p.vx *= .99; p.vy *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life++;
      cc.save(); cc.translate(p.x, p.y); cc.rotate(p.r);
      cc.globalAlpha = Math.min(1, (p.max - p.life) / 40);
      cc.fillStyle = p.c; cc.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      cc.restore();
    }
    pieces = pieces.filter(p => p.life < p.max && p.y < H + 30);

    // 로켓: 올라가며 꼬리를 남기고, 목표 높이에서 폭발
    for (const r of rockets) {
      r.x += r.vx; r.y += r.vy; r.t++;
      sparks.push({ x: r.x, y: r.y, px: r.x, py: r.y, vx: rnd(-.4, .4), vy: rnd(.3, 1.2), life: 0, max: rnd(12, 20), color: '#fde68a', size: 2.2 });
      cc.globalAlpha = 1; cc.fillStyle = '#fff';
      cc.beginPath(); cc.arc(r.x, r.y, 3, 0, TWO_PI); cc.fill();
      if (r.t >= r.frames) { r.done = true; explode(r.x, r.y, r.color); }
    }
    rockets = rockets.filter(r => !r.done);

    // 불꽃 입자 (겹치면 더 밝게)
    cc.globalCompositeOperation = 'lighter'; cc.lineCap = 'round';
    for (const s of sparks) {
      s.px = s.x; s.py = s.y;
      s.vx *= .965; s.vy = s.vy * .965 + .07; s.x += s.vx; s.y += s.vy; s.life++;
      cc.globalAlpha = Math.max(0, 1 - s.life / s.max);
      cc.strokeStyle = s.color; cc.lineWidth = s.size;
      cc.beginPath(); cc.moveTo(s.px, s.py); cc.lineTo(s.x, s.y); cc.stroke();
    }
    cc.globalCompositeOperation = 'source-over'; cc.globalAlpha = 1;
    sparks = sparks.filter(s => s.life < s.max);

    if (rockets.length || sparks.length || pieces.length || fxPending > 0) fxRaf = requestAnimationFrame(fxTick);
    else { fxRaf = 0; cc.clearRect(0, 0, W, H); }
  }

  function celebrate() {
    stopFx(); sizeFx();
    if (reduceMotion) return;
    fxFrame = 0;
    // 양쪽에서 쏘아 올리는 색종이 대포
    for (let i = 0; i < 150; i++) {
      const side = i % 2 ? 1 : -1;
      addPiece(cv.width / 2 + side * cv.width * .12, cv.height * .6, rnd(-9, 9) + side * 4, -rnd(8, 22), 200);
    }
    // 불꽃 로켓 16발을 시간차로 발사
    fxPending = 16;
    for (let i = 0; i < 16; i++) fxTimers.push(setTimeout(launchRocket, 100 + i * 260 + rnd(0, 120)));
    fxRaf = requestAnimationFrame(fxTick);
  }

  function stopFx() {
    cancelAnimationFrame(fxRaf); fxRaf = 0;
    fxTimers.forEach(clearTimeout); fxTimers = []; fxPending = 0;
    rockets = []; sparks = []; pieces = [];
    cc.clearRect(0, 0, cv.width, cv.height);
  }

  /* ---------- 이벤트 ---------- */
  spinBtn.addEventListener('click', spin);
  $('closeBtn').addEventListener('click', closeResult);
  $('againBtn').addEventListener('click', () => { closeResult(); spin(); });
  overlay.addEventListener('click', e => { if (e.target === overlay) closeResult(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && overlay.classList.contains('show')) closeResult(); });
  addEventListener('resize', () => { if (fxRaf) sizeFx(); });

  // 폰트가 늦게 로드돼도 룰렛 글자가 바뀌도록
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawWheel);

  drawWheel();
  resetTicker();
  updateControls();
})();
