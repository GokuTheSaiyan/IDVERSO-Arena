// ============================================================
//  AUDIO MANAGER
// ============================================================
class AudioManager {
  constructor() {
    this.ctx = null;
    this.cache = {};
    this.rushChargeOsc = null;
  }

  init() {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) {}
    }
  }

  playTone(freq, duration, type = 'square', volume = 0.15) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(); osc.stop(this.ctx.currentTime + duration);
  }

  async loadSound(url) {
    if (this.cache[url] !== undefined) return this.cache[url] !== null;
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.src = url;
      audio.load();
      audio.addEventListener('canplaythrough', () => { this.cache[url] = audio; resolve(true); }, { once: true });
      audio.addEventListener('error', () => { this.cache[url] = null; resolve(false); }, { once: true });
    });
  }

  playSound(url) {
    if (this.cache[url]) {
      const sound = this.cache[url].cloneNode();
      sound.volume = 0.5;
      sound.play().catch(() => {});
      return true;
    }
    return false;
  }

  async play(action, charFolder = null, fallbackTone = null) {
    if (!this.ctx) return;
    let played = false;
    if (charFolder) {
      const charUrl = `audio/${charFolder}/${action}.wav`;
      if (this.cache[charUrl] === undefined) await this.loadSound(charUrl);
      played = this.playSound(charUrl);
    }
    if (!played) {
      const globalUrl = `audio/global/${action}.wav`;
      if (this.cache[globalUrl] === undefined) await this.loadSound(globalUrl);
      played = this.playSound(globalUrl);
    }
    if (!played && fallbackTone) fallbackTone();
  }

  hit() { this.play('hit', null, () => this.playTone(120, 0.04, 'sawtooth', 0.1)); }
  slash(charFolder) {
    this.play('attack', charFolder, () => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(); osc.stop(this.ctx.currentTime + 0.1);
    });
  }
  parry(charFolder) {
    this.play('parry', charFolder, () => {
      this.playTone(880, 0.06, 'sine', 0.15);
      setTimeout(() => this.playTone(1320, 0.12, 'sine', 0.15), 60);
    });
  }
  shieldOn(charFolder) { this.play('shield_on', charFolder, () => this.playTone(400, 0.2, 'sine', 0.15)); }
  shieldOff(charFolder) { this.play('shield_off', charFolder, () => this.playTone(200, 0.2, 'sine', 0.15)); }
  detFull(charFolder) { this.play('determination_full', charFolder, () => this.playTone(800, 0.15, 'square', 0.15)); }
  victory(charFolder) {
    this.play('victory', charFolder, () => {
      this.playTone(523, 0.12);
      setTimeout(() => this.playTone(659, 0.12), 120);
      setTimeout(() => this.playTone(784, 0.3), 240);
    });
  }

  hateGain() { this.play('hate_gain', null, () => this.playTone(60, 0.05, 'sawtooth', 0.04)); }
  hateFull() {
    this.play('hate_full', null, () => {
      this.playTone(80, 0.3, 'sawtooth', 0.15);
      setTimeout(() => this.playTone(50, 0.4, 'sawtooth', 0.15), 100);
    });
  }
  hateUnlock() {
    this.play('hate_unlock', null, () => {
      this.playTone(200, 0.05, 'sawtooth', 0.1);
      setTimeout(() => this.playTone(150, 0.6, 'sawtooth', 0.15), 60);
    });
  }
  hateSlashPrep() {
    this.play('hate_slash_prep', null, () => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(250, this.ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(); osc.stop(this.ctx.currentTime + 0.2);
    });
  }
  hateSlashLaunch() {
    this.play('hate_slash_launch', null, () => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(); osc.stop(this.ctx.currentTime + 0.25);
    });
  }
  hateSlashHit() {
    this.play('hate_slash_hit', null, () => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(150, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(); osc.stop(this.ctx.currentTime + 0.2);
    });
  }

  rushCharge() {
    this.play('rush_charge', null, () => {
      if (!this.ctx) return;
      if (this.rushChargeOsc) { try { this.rushChargeOsc.stop(); } catch(e) {} }
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(50, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(400, this.ctx.currentTime + 5.0);
      gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.15, this.ctx.currentTime + 5.0);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(); osc.stop(this.ctx.currentTime + 5.0);
      this.rushChargeOsc = osc;
    });
  }
  rushLock() {
    this.play('rush_lock', null, () => {
      this.playTone(600, 0.1, 'square', 0.15);
      setTimeout(() => this.playTone(800, 0.15, 'square', 0.15), 80);
    });
  }
  rushLaunch() {
    if (this.rushChargeOsc) { try { this.rushChargeOsc.stop(); } catch(e) {} this.rushChargeOsc = null; }
    this.play('rush_launch', null, () => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(); osc.stop(this.ctx.currentTime + 0.3);
    });
  }
  rushImpact() {
    this.play('rush_impact', null, () => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(80, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(20, this.ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(); osc.stop(this.ctx.currentTime + 0.3);
    });
  }
  rushCrash() {
    this.play('rush_crash', null, () => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(120, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(); osc.stop(this.ctx.currentTime + 0.4);
    });
  }
  rushStun() {
    this.play('rush_stun', null, () => {
      this.playTone(150, 0.5, 'sine', 0.1);
      setTimeout(() => this.playTone(130, 0.5, 'sine', 0.08), 300);
    });
  }
  rushParry() {
    this.play('rush_parry', null, () => {
      this.playTone(880, 0.06, 'sine', 0.15);
      setTimeout(() => this.playTone(440, 0.2, 'sawtooth', 0.15), 60);
      setTimeout(() => this.playTone(1100, 0.3, 'sine', 0.2), 200);
    });
  }

  voidFull(charFolder) {
    this.play('void_full', charFolder, () => {
      this.playTone(300, 0.4, 'sine', 0.15);
      setTimeout(() => this.playTone(400, 0.6, 'sine', 0.12), 150);
    });
  }
  portalOpen(charFolder) {
    this.play('portal_open', charFolder, () => {
      this.playTone(200, 0.6, 'sawtooth', 0.12);
      setTimeout(() => this.playTone(100, 0.8, 'sawtooth', 0.15), 100);
    });
  }
  portalClose(charFolder) {
    this.play('portal_close', charFolder, () => {
      this.playTone(100, 0.4, 'sawtooth', 0.12);
      setTimeout(() => this.playTone(50, 0.5, 'sawtooth', 0.1), 100);
    });
  }
  scoutSpawn(charFolder) {
    this.play('scout_spawn', charFolder, () => this.playTone(800, 0.1, 'square', 0.1));
  }
  heavySpawn(charFolder) {
    this.play('heavy_spawn', charFolder, () => this.playTone(150, 0.2, 'square', 0.15));
  }
  scoutAbsorb(charFolder) {
    this.play('scout_absorb', charFolder, () => this.playTone(600, 0.2, 'sine', 0.15));
  }
  heavyAbsorb(charFolder) {
    this.play('heavy_absorb', charFolder, () => this.playTone(400, 0.3, 'sine', 0.15));
  }
  heal(charFolder) {
    this.play('heal', charFolder, () => {
      this.playTone(523, 0.1, 'sine', 0.15);
      setTimeout(() => this.playTone(659, 0.2, 'sine', 0.15), 100);
    });
  }
  scoutParry(charFolder) {
    this.play('scout_parry', charFolder, () => this.playTone(900, 0.06, 'sine', 0.12));
  }
  heavyParry(charFolder) {
    this.play('heavy_parry', charFolder, () => this.playTone(700, 0.1, 'sine', 0.15));
  }
  parryHeal(charFolder) {
    this.play('parry_heal', charFolder, () => {
      this.playTone(660, 0.15, 'sine', 0.15);
      setTimeout(() => this.playTone(880, 0.2, 'sine', 0.15), 100);
    });
  }

  countdown() { this.playTone(440, 0.15); }
  fight() { this.playTone(660, 0.1); setTimeout(() => this.playTone(880, 0.3), 100); }
}

const Sound = new AudioManager();