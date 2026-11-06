(() => {
  const screens = [...document.querySelectorAll('.screen')];
  const home = document.getElementById('home');
  const setup = document.getElementById('setup');
  const test = document.getElementById('test');
  const result = document.getElementById('result');
  const ratioInput = document.getElementById('mix-range');
  const brightnessInput = document.getElementById('brightness-range');
  const referenceField = document.getElementById('reference-field');
  const mixtureField = document.getElementById('mixture-field');
  const exitModal = document.getElementById('exit-modal');
  const checks = [...document.querySelectorAll('.setup-check')];
  const trialsTotal = 6;
  let trial = 0;
  let observations = [];
  let rememberedRatio = 50;
  let rememberedBrightness = 100;
  let trialStartRatio = 50;
  let hasAdjustedRatio = false;
  let holdTimer = null;
  let activePointerButton = null;

  function showScreen(screen) {
    screens.forEach(item => {
      const active = item === screen;
      item.hidden = !active;
      item.classList.toggle('active', active);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function colorAt(ratio, brightness) {
    // Put the reference on the exact same sRGB mixing path as the adjustable field.
    const t = ratio / 100;
    const gain = (brightness / 100) * 1.8;
    const red = Math.min(255, 255 * t * gain);
    const green = Math.min(255, 255 * (1 - t) * gain);
    return `rgb(${Math.round(red)}, ${Math.round(green)}, 0)`;
  }
  function paintFields() {
    referenceField.style.backgroundColor = 'rgb(230, 230, 0)';
    mixtureField.style.backgroundColor = colorAt(Number(ratioInput.value), Number(brightnessInput.value));
  }
  function updateProgress() {
    const percent = Math.round((trial / trialsTotal) * 100);
    document.getElementById('trial-label').textContent = `ПОПЫТКА ${trial + 1} ИЗ ${trialsTotal}`;
    document.getElementById('progress-fill').style.width = `${percent}%`;
    document.getElementById('phase-step').textContent = `ПОПЫТКА ${trial + 1} ИЗ ${trialsTotal} · ЛУЧШИЙ ВЫБОР`;
    document.getElementById('phase-copy').textContent = trial === 0
      ? 'Стартовая смесь немного отличается от образца. Подгоните нижнее поле к верхнему; если точного совпадения не получается, сохраните самый близкий вариант.'
      : 'Смесь начинается рядом с прошлым выбором, но немного отличается от образца. Подстройте её на глаз и сохраните лучший вариант.';
    const button = document.getElementById('next-button');
    button.disabled = !hasAdjustedRatio;
    button.innerHTML = !hasAdjustedRatio
      ? 'Сначала подстройте цвет <span aria-hidden="true">→</span>'
      : (trial === trialsTotal - 1 ? 'Показать результат <span aria-hidden="true">✓</span>' : 'Запомнить этот выбор <span aria-hidden="true">→</span>');
  }
  function startTrial() {
    const minimum = Number(ratioInput.min);
    const maximum = Number(ratioInput.max);
    const offset = trial === 0 ? 5 + Math.floor(Math.random() * 4) : 3 + Math.floor(Math.random() * 4);
    const direction = Math.random() < 0.5 ? -1 : 1;
    let start = rememberedRatio + direction * offset;
    if (start < minimum || start > maximum) start = rememberedRatio - direction * offset;
    trialStartRatio = Math.max(minimum, Math.min(maximum, start));
    ratioInput.value = trialStartRatio;
    brightnessInput.value = rememberedBrightness;
    hasAdjustedRatio = false;
    updateProgress();
    paintFields();
  }
  function beginTest() {
    const firstUnchecked = checks.find(check => !check.checked);
    if (firstUnchecked) {
      document.getElementById('checklist-status').textContent = `Пожалуйста, подтвердите все условия (${checks.filter(check => check.checked).length} из ${checks.length}).`;
      firstUnchecked.focus();
      return;
    }
    trial = 0;
    observations = [];
    rememberedRatio = 50;
    rememberedBrightness = 100;
    startTrial();
    showScreen(test);
  }
  function median(numbers) {
    const ordered = [...numbers].sort((a, b) => a - b);
    const middle = Math.floor(ordered.length / 2);
    return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
  }
  function finishTest() {
    const values = observations.map(row => row.ratio);
    const central = median(values);
    const low = Math.min(...values);
    const high = Math.max(...values);
    const spread = high - low;
    const centralRounded = Math.round(central);
    const lowRounded = Math.round(low);
    const highRounded = Math.round(high);
    const spreadRounded = Math.round(spread);

    document.getElementById('range-summary').textContent = `Медиана: ${centralRounded}% красного`;
    document.getElementById('lower-result').textContent = `${centralRounded}%`;
    document.getElementById('upper-result').textContent = `${lowRounded}–${highRounded}%`;
    document.getElementById('width-result').textContent = `${spreadRounded} п.п.`;
    document.getElementById('range-badge').textContent = `${observations.length} попыток`;
    document.getElementById('scale-selection').style.left = `${((low - 30) / 40) * 100}%`;
    document.getElementById('scale-selection').style.width = `${Math.max((spread / 40) * 100, 2)}%`;
    document.getElementById('result-description').textContent = `В этой экранной пробе наиболее частый центр ваших выборов — около ${centralRounded}% красного. В шести попытках вы выбирали значения от ${lowRounded}% до ${highRounded}%.`;
    document.getElementById('repeat-detail').textContent = `Разброс между крайними ответами — ${spreadRounded} процентных пунктов. Это показывает только, насколько похожими были ваши настройки в повторах; это не клинический диапазон совпадений.`;
    showScreen(result);
  }
  function noteRatioAdjustment() {
    if (Number(ratioInput.value) !== trialStartRatio) {
      hasAdjustedRatio = true;
      document.getElementById('next-button').disabled = false;
      document.getElementById('next-button').innerHTML = trial === trialsTotal - 1
        ? 'Показать результат <span aria-hidden="true">✓</span>'
        : 'Запомнить этот выбор <span aria-hidden="true">→</span>';
    }
  }
  function adjustRatio(delta) {
    const min = Number(ratioInput.min);
    const max = Number(ratioInput.max);
    ratioInput.value = Math.max(min, Math.min(max, Number(ratioInput.value) + delta));
    noteRatioAdjustment();
    paintFields();
  }
  function setBrightness(direction) {
    brightnessInput.value = Math.max(65, Math.min(135, Number(brightnessInput.value) + (direction === '+' ? 1 : -1)));
    paintFields();
  }
  function holdStep(button, delta) {
    clearInterval(holdTimer);
    activePointerButton = button;
    const started = Date.now();
    let nextTick = started + 280;
    adjustRatio(delta);
    holdTimer = setInterval(() => {
      if (activePointerButton !== button || !button.isConnected) return stopHold();
      const duration = Date.now() - started;
      if (Date.now() < nextTick) return;
      const interval = duration > 2400 ? 24 : duration > 1100 ? 55 : duration > 450 ? 115 : 280;
      const step = duration > 2000 ? 4 : duration > 900 ? 2 : 1;
      adjustRatio(delta * step);
      nextTick = Date.now() + interval;
    }, 20);
  }
  function stopHold() {
    clearInterval(holdTimer);
    holdTimer = null;
    activePointerButton = null;
  }
  function saveMatch() {
    observations.push({ ratio: Number(ratioInput.value), brightness: Number(brightnessInput.value) });
    if (trial === trialsTotal - 1) {
      finishTest();
      return;
    }
    rememberedRatio = median(observations.map(row => row.ratio));
    rememberedBrightness = median(observations.map(row => row.brightness));
    trial += 1;
    startTrial();
  }

  function updateReadiness() {
    const checkedCount = checks.filter(item => item.checked).length;
    document.getElementById('checklist-status').textContent = `Отмечено: ${checkedCount} из ${checks.length}`;
    document.getElementById('ready-button').innerHTML = checkedCount === checks.length
      ? 'Начать 6 проб <span aria-hidden="true">→</span>'
      : 'Продолжить <span aria-hidden="true">→</span>';
  }
  const checklist = document.getElementById('setup-checklist');
  checklist.addEventListener('change', event => {
    if (event.target.matches('.setup-check')) updateReadiness();
  });
  checklist.addEventListener('click', event => {
    if (event.target.closest('label')) window.setTimeout(updateReadiness, 0);
  });
  updateReadiness();
  document.getElementById('begin-button').addEventListener('click', () => showScreen(setup));
  document.getElementById('ready-button').addEventListener('click', beginTest);
  document.querySelectorAll('[data-back="home"]').forEach(button => button.addEventListener('click', () => showScreen(home)));
  ratioInput.addEventListener('input', () => { noteRatioAdjustment(); paintFields(); });
  brightnessInput.addEventListener('input', paintFields);
  document.querySelectorAll('[data-adjust]').forEach(button => {
    const delta = Number(button.dataset.adjust);
    button.addEventListener('pointerdown', event => {
      event.preventDefault();
      button.setPointerCapture?.(event.pointerId);
      holdStep(button, delta);
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => button.addEventListener(type, stopHold));
    button.addEventListener('contextmenu', event => event.preventDefault());
  });
  document.querySelectorAll('[data-brightness]').forEach(button => button.addEventListener('click', () => setBrightness(button.dataset.brightness)));
  document.getElementById('next-button').addEventListener('click', saveMatch);
  document.getElementById('exit-test').addEventListener('click', () => { exitModal.hidden = false; });
  function closeModal() { exitModal.hidden = true; }
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('continue-button').addEventListener('click', closeModal);
  document.getElementById('confirm-exit').addEventListener('click', () => { closeModal(); showScreen(home); });
  exitModal.addEventListener('click', event => { if (event.target === exitModal) closeModal(); });
  document.getElementById('restart-button').addEventListener('click', beginTest);
  document.getElementById('home-button').addEventListener('click', () => showScreen(home));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !exitModal.hidden) closeModal(); });
  paintFields();
})();
