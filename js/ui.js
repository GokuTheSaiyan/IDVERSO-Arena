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

const debugPanel = document.getElementById('debug-panel');
let debugLoggedIn = false;
let debugInterval = null;

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
    if (f.character.abilities && f.character.abilities.determination && f.maxProtection > 0) {
      const protPct = Math.max(0, (f.protection / f.maxProtection) * 100);
      hpHtml += '<div class="stat-row"><div class="stat-name" style="color: #ff0000;">' + f.name + ' Prot</div><div class="stat-bar-bg"><div class="stat-bar-fill" style="width:' + protPct + '%; background: #ff0000;"></div></div><div class="stat-val" style="color: #ff0000;">' + Math.round(protPct) + '%</div></div>';
    }
    
    const hpPct = Math.max(0, (f.hp / f.maxHp) * 100);
    let hpName = f.name + ' HP';
    if (f.lastStandActive) hpName = f.name + ' [LS] HP';
    hpHtml += '<div class="stat-row"><div class="stat-name">' + hpName + '</div><div class="stat-bar-bg"><div class="stat-bar-fill" style="width:' + hpPct + '%; background:' + f.color + '"></div></div><div class="stat-val">' + Math.round(hpPct) + '%</div></div>';

    if (f.character.abilities && f.character.abilities.dodge) {
      const dodgePct = f.dodgeMeter;
      const dodgeColor = '#00ffff';
      detHtml += '<div class="stat-row"><div class="stat-name" style="color:' + dodgeColor + '">' + f.name + ' Dodge</div><div class="stat-bar-bg"><div class="stat-bar-fill" style="width:' + dodgePct + '%; background:' + dodgeColor + ';"></div></div><div class="stat-val" style="color:' + dodgeColor + '">' + Math.round(dodgePct) + '%</div></div>';
    }

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
      if (f.lastStandActive) hateLabel = 'Hate Meter (Locked)';
      detHtml += '<div class="stat-row"><div class="stat-name" style="color:#dddddd">' + f.name + ' ' + hateLabel + '</div><div class="stat-bar-bg" style="border:1px solid #555;"><div class="stat-bar-fill" style="width:' + hatePct + '%; background:#000000; border-right: 1px solid #444;"></div></div><div class="stat-val" style="color:#dddddd">' + Math.round(hatePct) + '%</div></div>';
    }

    if (f.character.abilities && f.character.abilities.void_meter) {
      const voidPct = f.voidMeter;
      const voidColor = '#4b0082';
      const voidTextColor = '#c0a0e0';
      let voidLabel = 'Void Meter';
      if (f.voidBeamDisabled) voidLabel = 'Void Meter (Regen)';
      else if (f.voidBeamState === 'charging') voidLabel = 'Void Meter (Charging)';
      else if (f.voidPortalActive) voidLabel = 'Void Meter (Active)';
      else if (f.voidExhausted) voidLabel = 'Void Meter (Exhausted)';
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
  if (gameMode === 'triple') { updatePreviewSlot(document.getElementById('preview-c'), selectionC); }
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
  if (gameMode === 'standard') { ready = selectionA && selectionB; text = ready ? 'Start Battle' : 'Select Both Fighters'; }
  else { ready = selectionA && selectionB && selectionC; text = ready ? 'Start Triple Threat' : 'Select All 3 Fighters'; }
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
  if (name === 'menu') { menuScreen.classList.add('active'); hideDebugMenu(); }
  else if (name === 'battle') { battleScreen.classList.add('active'); initDebugMenu(); }
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
      else { countdownNum.style.color = '#ffffff'; countdownNum.style.fontSize = '140px'; Sound.countdown(); }
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

function rematch() { Sound.stopAll(); winnerOverlay.classList.remove('active'); startBattle(); }
function backToMenu() { Sound.stopAll(); winnerOverlay.classList.remove('active'); showScreen('menu'); }

startBtn.addEventListener('click', () => { if (startBtn.disabled === false) { Sound.init(); startBattle(); } });
rematchBtn.addEventListener('click', rematch);
charselectBtn.addEventListener('click', backToMenu);

// ===== DEBUG MENU =====
function initDebugMenu() {
  debugPanel.classList.add('active');
  if (!debugLoggedIn) { renderDebugLogin(); } else { renderDebugControls(); }
}

function hideDebugMenu() {
  debugPanel.classList.remove('active');
  if (debugInterval) clearInterval(debugInterval);
}

function renderDebugLogin() {
  debugPanel.innerHTML = `
    <div class="debug-login">
      <h3>Developer Access</h3>
      <input type="text" id="debug-user" placeholder="Username" autocomplete="off">
      <input type="password" id="debug-pass" placeholder="Password" autocomplete="off">
      <button id="debug-login-btn">Login</button>
      <div id="debug-error" style="color: #ff4444; text-align: center; font-size: 12px; min-height: 15px;"></div>
    </div>
  `;
  document.getElementById('debug-login-btn').addEventListener('click', () => {
    const user = document.getElementById('debug-user').value;
    const pass = document.getElementById('debug-pass').value;
    if (user === 'Itami' && pass === 'ODIUM') { debugLoggedIn = true; renderDebugControls(); }
    else { document.getElementById('debug-error').textContent = 'Access Denied'; }
  });
}

function renderDebugControls() {
  debugPanel.innerHTML = `
    <div class="debug-header">DEBUG MODE ACTIVE</div>
    <div class="debug-content" id="debug-content"></div>
  `;
  const content = document.getElementById('debug-content');
  
  let healthHtml = '<div class="debug-section"><h4>Fighter HP</h4>';
  game.fighters.forEach((f, i) => {
    healthHtml += `<div class="debug-row">${f.name}</div>`;
    healthHtml += '<div class="debug-btn-row">';
    [100, 50, 25, 10, 1, 0].forEach(pct => { healthHtml += `<button class="debug-btn" data-action="hp" data-fighter="${i}" data-val="${pct}">${pct}%</button>`; });
    healthHtml += '</div>';
  });
  healthHtml += '</div>';
  content.innerHTML += healthHtml;

  let meterHtml = '<div class="debug-section"><h4>Meters</h4>';
  const itami = game.fighters.find(f => f.character.abilities.hate);
  if (itami) {
    meterHtml += `<div class="debug-row">Itami Hate</div><div class="debug-btn-row">`;
    [0, 50, 100].forEach(v => meterHtml += `<button class="debug-btn" data-action="meter" data-fighter="hate" data-val="${v}">${v}%</button>`);
    meterHtml += `</div>`;
    if (itami.character.abilities.dodge) {
      meterHtml += `<div class="debug-row">Itami Dodge</div><div class="debug-btn-row">`;
      [0, 50, 100].forEach(v => meterHtml += `<button class="debug-btn" data-action="meter" data-fighter="dodge" data-val="${v}">${v}%</button>`);
      meterHtml += `</div>`;
    }
  }
  const dino = game.fighters.find(f => f.character.abilities.determination);
  if (dino) {
    meterHtml += `<div class="debug-row">Dino Det</div><div class="debug-btn-row">`;
    [0, 50, 100].forEach(v => meterHtml += `<button class="debug-btn" data-action="meter" data-fighter="determination" data-val="${v}">${v}%</button>`);
    meterHtml += `</div>`;
  }
  const sam = game.fighters.find(f => f.character.abilities.void_meter);
  if (sam) {
    meterHtml += `<div class="debug-row">Sam Void</div><div class="debug-btn-row">`;
    [0, 50, 100].forEach(v => meterHtml += `<button class="debug-btn" data-action="meter" data-fighter="void_meter" data-val="${v}">${v}%</button>`);
    meterHtml += `</div>`;
  }
  meterHtml += '</div>';
  content.innerHTML += meterHtml;

  content.innerHTML += `
    <div class="debug-section">
      <h4>Last Stand Testing</h4>
      <div class="debug-btn-row">
        <button class="debug-btn" data-action="ls_trigger">Trigger LS</button>
        <button class="debug-btn" data-action="ls_success">Force Success</button>
        <button class="debug-btn" data-action="ls_failure">Force Failure</button>
      </div>
    </div>
    <div class="debug-section">
      <h4>Positions</h4>
      <div class="debug-btn-row">
        <button class="debug-btn" data-action="pos_center">Move All Center</button>
        <button class="debug-btn" data-action="pos_reset">Reset Spawns</button>
      </div>
    </div>
    <div class="debug-section">
      <h4>Round Controls</h4>
      <div class="debug-btn-row">
        <button class="debug-btn" data-action="round_restart">Restart</button>
        <button class="debug-btn" data-action="round_end">End Round</button>
        <button class="debug-btn" data-action="round_pause">Pause</button>
        <button class="debug-btn" data-action="round_resume">Resume</button>
      </div>
    </div>
    <div class="debug-section">
      <h4>Audio</h4>
      <div class="debug-btn-row">
        <button class="debug-btn" data-action="audio_stop_sounds">Stop Sounds</button>
        <button class="debug-btn" data-action="audio_stop_music">Stop Music</button>
        <button class="debug-btn" data-action="audio_replay_music">Replay Music</button>
      </div>
    </div>
    <div class="debug-section">
      <h4>Battle Log</h4>
      <div class="debug-btn-row">
        <button class="debug-btn" data-action="log_clear">Clear Log</button>
        <button class="debug-btn" data-action="log_export">Export Log</button>
      </div>
    </div>
    <div class="debug-section"><h4>Live State</h4><div id="debug-visuals"></div></div>
  `;

  document.querySelectorAll('.debug-btn').forEach(btn => { btn.addEventListener('click', handleDebugAction); });
  if (debugInterval) clearInterval(debugInterval);
  debugInterval = setInterval(updateDebugVisuals, 100);
}

function handleDebugAction(e) {
  const btn = e.target;
  const action = btn.dataset.action;
  
  switch(action) {
    case 'hp':
      const f = game.fighters[parseInt(btn.dataset.fighter)];
      const pct = parseInt(btn.dataset.val);
      if (pct === 0) { f.takeDamage(f.hp, null, game); }
      else { f.hp = Math.max(1, f.maxHp * (pct / 100)); f.alive = true; f.defeatLogged = false; f.lastStandState = 'idle'; f.lastStandActive = false; }
      break;
    case 'meter':
      const meterType = btn.dataset.fighter;
      const val = parseInt(btn.dataset.val);
      const fighter = game.fighters.find(f => f.character.abilities[meterType]);
      if (fighter) {
        if (meterType === 'hate') { fighter.hate = val; if (val >= 100) { fighter.hateMaxed = true; fighter.hateUnlocked = true; } }
        if (meterType === 'dodge') fighter.dodgeMeter = val;
        if (meterType === 'determination') fighter.determination = val;
        if (meterType === 'void_meter') fighter.voidMeter = val;
      }
      break;
    case 'ls_trigger':
      const itamiT = game.fighters.find(f => f.character.abilities.hate);
      if (itamiT) itamiT.startLastStand(game);
      break;
    case 'ls_success':
      game.forceLastStandSuccess = true;
      const itamiS = game.fighters.find(f => f.character.abilities.hate);
      if (itamiS) itamiS.takeDamage(itamiS.hp, null, game);
      break;
    case 'ls_failure':
      game.forceLastStandFailure = true;
      const itamiF = game.fighters.find(f => f.character.abilities.hate);
      if (itamiF) itamiF.takeDamage(itamiF.hp, null, game);
      break;
    case 'pos_center':
      game.fighters.forEach(f => { f.x = game.arena.x + game.arena.size / 2; f.y = game.arena.y + game.arena.size / 2; });
      break;
    case 'pos_reset':
      game.fighters.forEach(f => { f.x = f.originalSpawnX; f.y = f.originalSpawnY; });
      break;
    case 'round_restart': rematch(); break;
    case 'round_end':
      const alive = game.fighters.filter(f => f.alive);
      if (alive.length > 1) { for (let i = 1; i < alive.length; i++) { alive[i].takeDamage(alive[i].hp, alive[0], game); } }
      break;
    case 'round_pause': game.paused = true; break;
    case 'round_resume': game.paused = false; game.lastTime = 0; requestAnimationFrame(t => game.loop(t)); break;
    case 'audio_stop_sounds': Sound.stopAll(); break;
    case 'audio_stop_music': Sound.stopMusic(); break;
    case 'audio_replay_music':
      const itamiM = game.fighters.find(f => f.lastStandActive);
      if (itamiM) Sound.playMusic('last_stand_theme', itamiM.character.assetFolder);
      break;
    case 'log_clear': battleLogEl.innerHTML = ''; break;
    case 'log_export':
      const logText = battleLogEl.innerText;
      const blob = new Blob([logText], {type: 'text/plain'});
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'battle_log.txt';
      link.click();
      break;
  }
}

function updateDebugVisuals() {
  const visualsEl = document.getElementById('debug-visuals');
  if (!visualsEl || !game) return;
  let html = '';
  game.fighters.forEach(f => {
    let state = 'Normal';
    if (!f.alive) state = 'Defeated';
    else if (f.lastStandState === 'charging') state = 'LS Charging';
    else if (f.lastStandActive) state = 'Last Stand';
    else if (f.rushState.startsWith('charging')) state = 'Rush Charging';
    else if (f.rushState.startsWith('rushing')) state = 'Rushing';
    else if (f.voidBeamState === 'charging') state = 'Beam Charging';
    else if (f.voidBeamState === 'firing') state = 'Beam Firing';
    else if (f.voidPortalActive) state = 'Summoning';
    else if (f.rushStunTimer > 0) state = 'Stunned';
    
    html += `<div class="debug-visual-row"><b>${f.name}</b></div>`;
    html += `<div>HP: ${Math.round(f.hp)} | State: ${state}</div>`;
    if (f.character.abilities.hate) html += `<div>Hate: ${Math.round(f.hate)}%</div>`;
    if (f.character.abilities.dodge) html += `<div>Dodge: ${Math.round(f.dodgeMeter)}%</div>`;
    if (f.character.abilities.determination) html += `<div>Det: ${Math.round(f.determination)}%</div>`;
    if (f.character.abilities.void_meter) html += `<div>Void: ${Math.round(f.voidMeter)}%</div>`;
  });
  visualsEl.innerHTML = html;
}