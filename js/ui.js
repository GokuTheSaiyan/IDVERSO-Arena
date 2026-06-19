// ============================================================
//  UI MANAGER
// ============================================================
let ROSTER = [];
let selectionA = null;
let selectionB = null;
let selectionC = null;
let game = null;
let gameMode = 'standard';

const menuScreen       = document.getElementById('menu-screen');
const battleScreen     = document.getElementById('battle-screen');
const countdownOverlay = document.getElementById('countdown-overlay');
const countdownNum     = document.getElementById('countdown-num');
const winnerOverlay    = document.getElementById('winner-overlay');
const winnerName       = document.getElementById('winner-name');
const winnerStats      = document.getElementById('winner-stats');
const startBtn         = document.getElementById('start-btn');
const rematchBtn       = document.getElementById('rematch-btn');
const charselectBtn    = document.getElementById('charselect-btn');
const canvas           = document.getElementById('canvas');
const battleNameA      = document.getElementById('battle-name-a');
const battleNameB      = document.getElementById('battle-name-b');
const battleNameC      = document.getElementById('battle-name-c');
const battleVs2        = document.getElementById('battle-vs-2');
const panelC           = document.getElementById('panel-c');
const previewVs2       = document.getElementById('preview-vs-2');
const previewC         = document.getElementById('preview-c');
const menuLayout       = document.getElementById('menu-layout');
const modeStandardBtn  = document.getElementById('mode-standard');
const modeTripleBtn    = document.getElementById('mode-triple');
const battleLogEl      = document.getElementById('battle-log');
const scenarioSelect   = document.getElementById('scenario-select');

function clearBattleLog() { battleLogEl.innerHTML = ''; }

function addLogEntry(text) {
  const entry = document.createElement('div');
  entry.className = 'battle-log-entry';
  entry.textContent = text;
  battleLogEl.appendChild(entry);
  battleLogEl.scrollTop = battleLogEl.scrollHeight;
  while (battleLogEl.children.length > 200) battleLogEl.removeChild(battleLogEl.firstChild);
}

function updateBattleUI(g) {
  if (!g) return;
  const hpSec = document.getElementById('hp-section');
  const detSec = document.getElementById('det-section');
  let hpHtml = '';
  let detHtml = '';

  g.fighters.forEach(f => {
    const hpPct = Math.max(0, (f.hp / f.maxHp) * 100);
    hpHtml += '<div class="stat-row"><div class="stat-name">' + f.name + ' HP</div><div class="stat-bar-bg"><div class="stat-bar-fill" style="width:' + hpPct + '%; background:' + f.color + '"></div></div><div class="stat-val">' + Math.round(hpPct) + '%</div></div>';

    if (f.character.abilities && f.character.abilities.determination) {
      const detPct = f.determination;
      let detLabel = 'DETERMINATION';
      if (f.rushCooldownTimer > 0) detLabel = 'DETERMINATION (CD)';
      if (f.rushState && f.rushState.startsWith('charging')) detLabel = 'DETERMINATION (Chg)';
      if (f.rushState && f.rushState.startsWith('rushing')) detLabel = 'DETERMINATION (Rush)';
      if (f.rushStunTimer > 0) detLabel = 'DETERMINATION (Stun)';
      detHtml += '<div class="stat-row"><div class="stat-name" style="color:#ff0000">' + f.name + ' ' + detLabel + '</div><div class="stat-bar-bg"><div class="stat-bar-fill" style="width:' + detPct + '%; background:#ff0000"></div></div><div class="stat-val" style="color:#ff0000">' + Math.round(detPct) + '%</div></div>';
    }

    if (f.character.abilities && f.character.abilities.hate) {
      const hatePct = f.hate;
      let hateLabel = 'Hate Meter';
      if (f.hateUnlocked) hateLabel = 'Hate Meter (Unlocked)';
      detHtml += '<div class="stat-row"><div class="stat-name" style="color:#dddddd">' + f.name + ' ' + hateLabel + '</div><div class="stat-bar-bg" style="border:1px solid #555;"><div class="stat-bar-fill" style="width:' + hatePct + '%; background:#000000; border-right: 1px solid #444;"></div></div><div class="stat-val" style="color:#dddddd">' + Math.round(hatePct) + '%</div></div>';
    }

    if (f.character.abilities && f.character.abilities.void_meter) {
      const voidPct = f.voidMeter;
      const voidColor = '#4b0082';
      const voidTextColor = '#c0a0e0';
      let voidLabel = 'Void Meter';
      if (f.voidExhausted) voidLabel = 'Void Meter (Exhausted)';
      else if (f.voidPortalActive) voidLabel = 'Void Meter (Active)';
      detHtml += '<div class="stat-row"><div class="stat-name" style="color:' + voidTextColor + '">' + f.name + ' ' + voidLabel + '</div><div class="stat-bar-bg" style="border:1px solid #555;"><div class="stat-bar-fill" style="width:' + voidPct + '%; background:' + voidColor + ';"></div></div><div class="stat-val" style="color:' + voidTextColor + '">' + Math.round(voidPct) + '%</div></div>';
    }
  });

  hpSec.innerHTML = hpHtml;
  detSec.innerHTML = detHtml;
  detSec.style.display = detHtml ? 'block' : 'none';
}

function setupMenu(roster) {
  ROSTER = roster;
  renderCharacterList('A'); 
  renderCharacterList('B');
  renderCharacterList('C');
  updatePreview(); updateStartButton();
}

function renderCharacterList(player) {
  const container = document.getElementById('list-' + player.toLowerCase());
  container.innerHTML = '';
  ROSTER.forEach(char => {
    const card = document.createElement('div');
    card.className = 'character-card';
    let selected = false;
    if (player === 'A') selected = selectionA === char.id;
    else if (player === 'B') selected = selectionB === char.id;
    else if (player === 'C') selected = selectionC === char.id;
    if (selected) card.classList.add('selected-' + player.toLowerCase());
    card.innerHTML = '<div class="char-icon" style="background:' + char.color + '"></div><div class="char-info"><div class="char-name">' + char.name + '</div><div class="char-stats">HP: ' + char.hp + ' | DMG: ' + char.damage + ' | SPD: ' + char.speed + '</div></div>';
    card.addEventListener('click', () => { Sound.init(); selectCharacter(player, char.id); });
    container.appendChild(card);
  });
}

function selectCharacter(player, charId) {
  if (player === 'A') selectionA = charId;
  else if (player === 'B') selectionB = charId;
  else if (player === 'C') selectionC = charId;
  renderCharacterList('A'); renderCharacterList('B'); renderCharacterList('C');
  updatePreview(); updateStartButton();
}

function updatePreview() {
  updatePreviewSlot(document.getElementById('preview-a'), selectionA);
  updatePreviewSlot(document.getElementById('preview-b'), selectionB);
  if (gameMode === 'triple') {
    updatePreviewSlot(document.getElementById('preview-c'), selectionC);
  }
}

function updatePreviewSlot(el, charId) {
  if (charId) {
    const char = ROSTER.find(c => c.id === charId);
    el.className = 'preview-fighter filled';
    el.innerHTML = '<div class="preview-color" style="background:' + char.color + '"></div><div class="preview-name">' + char.name + '</div><div class="preview-stats">HP: ' + char.hp + ' | DMG: ' + char.damage + ' | SPD: ' + char.speed + '</div>';
  } else {
    el.className = 'preview-fighter';
    el.innerHTML = '<div class="preview-placeholder">Select Fighter</div>';
  }
}

function updateStartButton() {
  let ready = false;
  let text = 'Select Fighters';
  if (gameMode === 'standard') {
    ready = selectionA && selectionB;
    text = ready ? 'Start Battle' : 'Select Both Fighters';
  } else {
    ready = selectionA && selectionB && selectionC;
    text = ready ? 'Start Triple Threat' : 'Select All 3 Fighters';
  }
  if (ready) { startBtn.classList.add('enabled'); startBtn.disabled = false; startBtn.textContent = text; }
  else { startBtn.classList.remove('enabled'); startBtn.disabled = true; startBtn.textContent = text; }
}

document.querySelectorAll('.btn-random').forEach(btn => {
  btn.addEventListener('click', () => {
    Sound.init();
    const player = btn.dataset.player;
    const randomChar = ROSTER[Math.floor(Math.random() * ROSTER.length)];
    selectCharacter(player, randomChar.id);
  });
});

modeStandardBtn.addEventListener('click', () => {
  gameMode = 'standard';
  modeStandardBtn.classList.add('active');
  modeTripleBtn.classList.remove('active');
  panelC.style.display = 'none';
  previewVs2.style.display = 'none';
  previewC.style.display = 'none';
  battleVs2.style.display = 'none';
  battleNameC.style.display = 'none';
  menuLayout.classList.remove('triple');
  updateStartButton();
});

modeTripleBtn.addEventListener('click', () => {
  gameMode = 'triple';
  modeStandardBtn.classList.remove('active');
  modeTripleBtn.classList.add('active');
  panelC.style.display = 'block';
  previewVs2.style.display = 'block';
  previewC.style.display = 'flex';
  battleVs2.style.display = 'inline';
  battleNameC.style.display = 'inline';
  menuLayout.classList.add('triple');
  updateStartButton();
});

function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  if (name === 'menu') menuScreen.classList.add('active');
  else if (name === 'battle') battleScreen.classList.add('active');
}

function runCountdown(onComplete) {
  countdownOverlay.classList.add('active');
  const sequence = ['3', '2', '1', 'FIGHT!'];
  let i = 0;
  function next() {
    if (i < sequence.length) {
      const text = sequence[i];
      countdownNum.textContent = text;
      if (text === 'FIGHT!') { countdownNum.style.color = '#ffcc00'; countdownNum.style.fontSize = '90px'; Sound.fight(); }
      else { countdownNum.style.color = '#ffffff'; countdownNum.style.fontSize = '120px'; Sound.countdown(); }
      countdownNum.classList.remove('show');
      void countdownNum.offsetWidth;
      countdownNum.classList.add('show');
      i++; setTimeout(next, 800);
    } else { countdownOverlay.classList.remove('active'); onComplete(); }
  }
  next();
}

function startBattle() {
  const charA = ROSTER.find(c => c.id === selectionA);
  const charB = ROSTER.find(c => c.id === selectionB);
  const charC = gameMode === 'triple' ? ROSTER.find(c => c.id === selectionC) : null;
  const scenario = scenarioSelect.value;
  
  battleNameA.textContent = charA.name; battleNameA.style.color = charA.color;
  battleNameB.textContent = charB.name; battleNameB.style.color = charB.color;
  if (charC) { battleNameC.textContent = charC.name; battleNameC.style.color = charC.color; }
  
  showScreen('battle'); clearBattleLog();
  game = new Game(canvas, charA, charB, scenario, gameMode, charC);
  game.onGameOver = handleGameOver;
  game.onLog = (text) => addLogEntry(text);
  game.draw();
  runCountdown(() => { game.start(); });
}

function handleGameOver(winner, stats) {
  if (winner) Sound.victory(winner.character.assetFolder);
  setTimeout(() => {
    winnerOverlay.classList.add('active');
    if (winner) { winnerName.textContent = winner.name; winnerName.style.color = winner.color; }
    else { winnerName.textContent = 'DRAW'; winnerName.style.color = '#ffcc00'; }
    winnerStats.innerHTML = '<div class="winner-stat"><div class="k">Time</div><div class="v">' + stats.time.toFixed(1) + 's</div></div><div class="winner-stat"><div class="k">Hits</div><div class="v">' + stats.collisions + '</div></div>';
  }, 500);
}

function rematch() { winnerOverlay.classList.remove('active'); startBattle(); }
function backToMenu() { winnerOverlay.classList.remove('active'); showScreen('menu'); }

startBtn.addEventListener('click', () => { if (startBtn.disabled === false) { Sound.init(); startBattle(); } });
rematchBtn.addEventListener('click', rematch);
charselectBtn.addEventListener('click', backToMenu);