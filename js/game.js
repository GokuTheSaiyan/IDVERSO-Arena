// ============================================================
//  FALLBACK ROSTER
// ============================================================
const FALLBACK_ROSTER = [
  { id: "fighterA", name: "Fighter A", hp: 100, damage: 5, speed: 220, color: "#ff5555", size: 36, abilities: {}, assetFolder: "FighterA" },
  { id: "fighterB", name: "Fighter B", hp: 100, damage: 5, speed: 220, color: "#5555ff", size: 36, abilities: {}, assetFolder: "FighterB" },
  { id: "itami", name: "Itami", hp: 100, damage: 5, speed: 250, color: "#4a1c1c", size: 36, abilities: { knife: true, parry: true, hate: true }, assetFolder: "Itami" },
  { id: "dino", name: "Dino", hp: 100, damage: 6, speed: 200, color: "#855624", size: 42, abilities: { determination: true, determination_rush: true }, assetFolder: "Dino" }
];

// ============================================================
//  CLASS: Arena
// ============================================================
class Arena {
  constructor(x, y, size) { this.x = x; this.y = y; this.size = size; }
  draw(ctx) {
    ctx.fillStyle = '#222222';
    ctx.fillRect(this.x, this.y, this.size, this.size);
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    const grid = 40;
    ctx.beginPath();
    for (let i = grid; i < this.size; i += grid) {
      ctx.moveTo(this.x + i, this.y);
      ctx.lineTo(this.x + i, this.y + this.size);
      ctx.moveTo(this.x, this.y + i);
      ctx.lineTo(this.x + this.size, this.y + i);
    }
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y, this.size, this.size);
  }
}

// ============================================================
//  CLASS: Game
// ============================================================
class Game {
  constructor(canvas, charA, charB, scenario = 'default') {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    let arenaSize = 600;
    if (scenario === 'small') arenaSize = 500;
    if (scenario === 'compact') arenaSize = 400;
    const arenaX = (canvas.width - arenaSize) / 2;
    const arenaY = (canvas.height - arenaSize) / 2;
    this.arena = new Arena(arenaX, arenaY, arenaSize);

    this.fighterA = new Fighter(charA, this.arena.x + arenaSize * 0.25, this.arena.y + arenaSize * 0.25, Math.PI / 4);
    this.fighterB = new Fighter(charB, this.arena.x + arenaSize * 0.75, this.arena.y + arenaSize * 0.75, Math.PI * 5 / 4);
    this.fighters = [this.fighterA, this.fighterB];

    this.particles = [];
    this.damageNumbers = [];
    this.hateSlashes = [];
    this.elapsed = 0;
    this.collisions = 0;
    this.winner = null;
    this.paused = false;
    this.lastTime = 0;
    this.onGameOver = null;
    this.onLog = null;
  }

  log(text) {
    const t = this.elapsed.toFixed(1);
    if (this.onLog) this.onLog(`[${t}s] ${text}`);
  }

  start() {
    this.fighters.forEach(f => {
      const angle = Math.random() * Math.PI * 2;
      f.vx = Math.cos(angle) * f.baseSpeed;
      f.vy = Math.sin(angle) * f.baseSpeed;
    });
    this.lastTime = 0;
    requestAnimationFrame(t => this.loop(t));
  }

  rollDamage(base) {
    const r = Math.random();
    if (r < 0.15) return base - 1;
    if (r > 0.85) return base + 1;
    return base;
  }

  spawnHateSlash(owner, target, hateAmount) {
    this.hateSlashes.push(new HateSlash(owner.x, owner.y, target.x, target.y, owner, hateAmount));
    owner.hateSlashCooldown = 3.0;
    Sound.hateSlashLaunch();
    this.log(`${owner.name} launched a HATE Slash.`);
  }

  spawnRushImpactEffect(x, y, color) {
    for (let i = 0; i < 15; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 150 + Math.random() * 200;
      this.particles.push(new Particle(x, y, Math.cos(a) * speed, Math.sin(a) * speed, color, 0.4, 5 + Math.random() * 4));
    }
  }

  update(dt) {
    this.elapsed += dt;
    this.fighters.forEach(f => f.update(dt, this.arena, this));
    this.checkFighterCollision();

    this.particles = this.particles.filter(p => p.life > 0);
    this.particles.forEach(p => p.update(dt));

    this.damageNumbers = this.damageNumbers.filter(d => d.life > 0);
    this.damageNumbers.forEach(d => d.update(dt));

    this.hateSlashes = this.hateSlashes.filter(s => s.life > 0);
    this.hateSlashes.forEach(s => {
      s.update(dt);
      const target = s.owner === this.fighterA ? this.fighterB : this.fighterA;
      if (target.alive && Math.hypot(s.x - target.x, s.y - target.y) < target.radius + 10) {
        const dmgTaken = target.takeDamage(s.damage, s.owner, this);
        if (dmgTaken) {
          this.log(`HATE Slash hit ${target.name}.`);
          this.log(`${target.name} was launched by the HATE Slash.`);
          Sound.hateSlashHit();
          const len = Math.hypot(s.vx, s.vy);
          target.vx = s.vx / len; target.vy = s.vy / len;
          target.speedBoost = s.knockback;
          this.damageNumbers.push(new DamageNumber(s.x, s.y, s.damage, target.color));
          for (let i = 0; i < 10 + s.scale * 10; i++) {
            const a = Math.random() * Math.PI * 2;
            const speed = 100 + Math.random() * 150;
            this.particles.push(new Particle(s.x, s.y, Math.cos(a) * speed, Math.sin(a) * speed, '#000000', 0.3, (4 + Math.random() * 3) * (0.5 + s.scale)));
          }
        }
        s.life = 0;
      }
      if (s.x < this.arena.x - 50 || s.x > this.arena.x + this.arena.size + 50 || s.y < this.arena.y - 50 || s.y > this.arena.y + this.arena.size + 50) {
        s.life = 0;
      }
    });

    const alive = this.fighters.filter(f => f.hp > 0);
    if (alive.length < 2) {
      this.winner = alive[0] || null;
      this.paused = true;
      this.log(this.winner ? `${this.winner.name} wins the match` : 'Match ended in a draw');
      if (this.onGameOver) this.onGameOver(this.winner, { time: this.elapsed, collisions: this.collisions });
    }
  }

  checkFighterCollision() {
    const [a, b] = this.fighters;
    if (!a.alive || !b.alive) return;

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    const minDist = a.radius + b.radius;

    if (dist < minDist) {
      const safeDist = Math.max(0.0001, dist);
      const nx = dx / safeDist;
      const ny = dy / safeDist;
      const overlap = minDist - safeDist;
      a.x -= nx * overlap / 2; a.y -= ny * overlap / 2;
      b.x += nx * overlap / 2; b.y += ny * overlap / 2;

      const aIsCharging = a.rushState.startsWith('charging');
      const bIsCharging = b.rushState.startsWith('charging');
      const aIsRushing = a.rushState.startsWith('rushing');
      const bIsRushing = b.rushState.startsWith('rushing');

      if (aIsRushing || bIsRushing) {
        const rusher = aIsRushing ? a : b;
        const target = aIsRushing ? b : a;

        // Check if target parries the rush
        if (target.character.abilities && target.character.abilities.parry && Math.random() < 0.15) {
          this.log(`${target.name} parried the Rush.`);
          Sound.rushParry();
          this.spawnParryEffect(target.x, target.y);

          // Itami is launched backwards
          const len = Math.hypot(rusher.vx, rusher.vy);
          target.vx = -rusher.vx / len;
          target.vy = -rusher.vy / len;
          target.speedBoost = 400;

          // Large HATE bonus
          if (target.character.abilities.hate) {
            target.hate += 60;
            if (target.hate > 100) target.hate = 100;
            this.log(`${target.name} gained a large amount of HATE.`);
            Sound.hateGain();
            if (target.hate >= 100 && !target.hateMaxed) {
              target.hateMaxed = true;
              target.hateUnlocked = true;
              Sound.hateFull();
              Sound.hateUnlock();
              this.log(`${target.name}'s HATE reached maximum.`);
              this.log(`${target.name} awakened HATE Slashes.`);
            }
          }

          // Rusher continues normally - no damage to either side
          rusher.hitCooldown = 0.3;
          target.hitCooldown = 0.3;
          return;
        }

        // Normal rush impact
        const speed = Math.hypot(rusher.vx, rusher.vy);
        const baseRushDmg = 8;
        const speedMultiplier = speed / 1200;
        const rushDmg = Math.round(baseRushDmg + speedMultiplier * 10);

        const dmgTaken = target.takeDamage(rushDmg, rusher, this);
        this.log(`${rusher.name} hit ${target.name} with Rush Attack.`);
        Sound.rushImpact();

        const len = Math.hypot(rusher.vx, rusher.vy);
        target.vx = (rusher.vx / len) * 500;
        target.vy = (rusher.vy / len) * 500;
        target.speedBoost = 400;
        rusher.hitCooldown = 0.5;
        target.hitCooldown = 0.5;
        this.damageNumbers.push(new DamageNumber(target.x, target.y, rushDmg, target.color));
        this.spawnRushImpactEffect(target.x, target.y, rusher.color);
        rusher.endRush(this, true);
      } else {
        const dvx = b.vx - a.vx;
        const dvy = b.vy - a.vy;
        const dot = dvx * nx + dvy * ny;
        if (dot < 0) {
          const impulse = dot * 1.2;
          a.vx += impulse * nx; a.vy += impulse * ny;
          b.vx -= impulse * nx; b.vy -= impulse * ny;
          a.vx += (Math.random()-0.5)*50; a.vy += (Math.random()-0.5)*50;
          b.vx += (Math.random()-0.5)*50; b.vy += (Math.random()-0.5)*50;
          a.speedBoost = 80; b.speedBoost = 80;
        }

        if (a.hitCooldown <= 0 && b.hitCooldown <= 0) {
          if (aIsCharging && !bIsCharging) {
            const dmg = this.rollDamage(b.damage);
            const dmgTaken = a.takeDamage(dmg, b, this);
            if (dmgTaken) { this.log(`${b.name} dealt ${dmg} damage to ${a.name}`); this.damageNumbers.push(new DamageNumber(a.x, a.y - 20, dmg, a.color)); }
            b.hitsLanded++;
            a.hitCooldown = 0.18; b.hitCooldown = 0.18;
            Sound.hit();
          } else if (bIsCharging && !aIsCharging) {
            const dmg = this.rollDamage(a.damage);
            const dmgTaken = b.takeDamage(dmg, a, this);
            if (dmgTaken) { this.log(`${a.name} dealt ${dmg} damage to ${b.name}`); this.damageNumbers.push(new DamageNumber(b.x, b.y - 20, dmg, b.color)); }
            a.hitsLanded++;
            a.hitCooldown = 0.18; b.hitCooldown = 0.18;
            Sound.hit();
          } else if (aIsCharging && bIsCharging) {
            a.hitCooldown = 0.18; b.hitCooldown = 0.18;
          } else {
            const dmgA = this.rollDamage(a.damage);
            const dmgB = this.rollDamage(b.damage);
            const cx = (a.x + b.x) / 2;
            const cy = (a.y + b.y) / 2;
            this.log(`${a.name} collided with ${b.name}`);

            // A attacks B
            if (b.character.abilities && b.character.abilities.parry && Math.random() < 0.15) {
              this.log(`${b.name} successfully parried the attack`);
              if (b.character.abilities.hate) {
                b.hate += 35;
                if (b.hate >= 100) { b.hate = 100; if (!b.hateMaxed) { b.hateMaxed = true; b.hateUnlocked = true; Sound.hateFull(); Sound.hateUnlock(); this.log(`${b.name}'s HATE reached maximum.`); this.log(`${b.name} awakened HATE Slashes.`); } }
                this.log(`${b.name} gained HATE from a successful parry.`);
                Sound.hateGain();
              }
              const dmgTaken = a.takeDamage(dmgA, b, this);
              if (dmgTaken) { this.log(`${b.name} dealt ${dmgA} damage to ${a.name}`); this.damageNumbers.push(new DamageNumber(cx - 15, cy, dmgA, a.color)); }
              else { this.damageNumbers.push(new DamageNumber(a.x, a.y - 40, 'BLOCKED!', '#ff0000')); }
              this.damageNumbers.push(new DamageNumber(b.x, b.y - 40, 'PARRY!', b.color));
              this.spawnParryEffect(b.x, b.y);
              Sound.parry(b.character.assetFolder);
            } else {
              const dmgTaken = b.takeDamage(dmgA, a, this);
              if (dmgTaken) { this.log(`${a.name} dealt ${dmgA} damage to ${b.name}`); this.damageNumbers.push(new DamageNumber(cx - 15, cy, dmgA, a.color)); }
              else { this.damageNumbers.push(new DamageNumber(b.x, b.y - 40, 'BLOCKED!', '#ff0000')); }
            }

            // B attacks A
            if (a.character.abilities && a.character.abilities.parry && Math.random() < 0.15) {
              this.log(`${a.name} successfully parried the attack`);
              if (a.character.abilities.hate) {
                a.hate += 35;
                if (a.hate >= 100) { a.hate = 100; if (!a.hateMaxed) { a.hateMaxed = true; a.hateUnlocked = true; Sound.hateFull(); Sound.hateUnlock(); this.log(`${a.name}'s HATE reached maximum.`); this.log(`${a.name} awakened HATE Slashes.`); } }
                this.log(`${a.name} gained HATE from a successful parry.`);
                Sound.hateGain();
              }
              const dmgTaken = b.takeDamage(dmgB, a, this);
              if (dmgTaken) { this.log(`${a.name} dealt ${dmgB} damage to ${b.name}`); this.damageNumbers.push(new DamageNumber(cx + 15, cy, dmgB, b.color)); }
              else { this.damageNumbers.push(new DamageNumber(b.x, b.y - 40, 'BLOCKED!', '#ff0000')); }
              this.damageNumbers.push(new DamageNumber(a.x, a.y - 40, 'PARRY!', a.color));
              this.spawnParryEffect(a.x, a.y);
              Sound.parry(a.character.assetFolder);
            } else {
              const dmgTaken = a.takeDamage(dmgB, b, this);
              if (dmgTaken) { this.log(`${b.name} dealt ${dmgB} damage to ${a.name}`); this.damageNumbers.push(new DamageNumber(cx + 15, cy, dmgB, b.color)); }
              else { this.damageNumbers.push(new DamageNumber(a.x, a.y - 40, 'BLOCKED!', '#ff0000')); }
            }

            a.hitsLanded++; b.hitsLanded++;
            a.hitCooldown = 0.18; b.hitCooldown = 0.18;
            this.collisions++;
            Sound.hit();

            let slashPlayed = false;
            if (a.character.abilities && a.character.abilities.knife) {
              a.triggerAttack(b.x, b.y);
              const slashAngle = Math.atan2(b.y - a.y, b.x - a.x);
              this.spawnSlashEffect(cx, cy, a.color, slashAngle);
              if (!slashPlayed) { Sound.slash(a.character.assetFolder); slashPlayed = true; }
            }
            if (b.character.abilities && b.character.abilities.knife) {
              b.triggerAttack(a.x, a.y);
              const slashAngle = Math.atan2(a.y - b.y, a.x - b.x);
              this.spawnSlashEffect(cx, cy, b.color, slashAngle);
              if (!slashPlayed) { Sound.slash(b.character.assetFolder); slashPlayed = true; }
            }
          }
        }
      }
    }
  }

  spawnSlashEffect(x, y, color, angle) {
    for (let i = 0; i < 12; i++) {
      const spread = (i - 5.5) * 0.09;
      const a = angle + spread;
      const speed = 180 + Math.random() * 100;
      this.particles.push(new Particle(x, y, Math.cos(a) * speed, Math.sin(a) * speed, '#ffffff', 0.15 + Math.random() * 0.05, 3 + Math.random() * 2));
    }
  }

  spawnParryEffect(x, y) {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      this.particles.push(new Particle(x, y, Math.cos(a) * 180, Math.sin(a) * 180, '#ffffff', 0.25, 4));
    }
  }

  draw() {
    const ctx = this.ctx;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.arena.draw(ctx);
    this.particles.forEach(p => p.draw(ctx));
    this.hateSlashes.forEach(s => s.draw(ctx));
    this.fighters.forEach(f => f.draw(ctx));
    this.fighters.forEach(f => f.drawHpBar(ctx));
    this.damageNumbers.forEach(d => d.draw(ctx));
  }

  loop(time) {
    if (!this.lastTime) this.lastTime = time;
    const dt = Math.min(0.033, (time - this.lastTime) / 1000);
    this.lastTime = time;
    if (!this.paused) this.update(dt);
    this.draw();
    updateBattleUI(this);
    if (!this.paused) requestAnimationFrame(t => this.loop(t));
  }
}

// ============================================================
//  INITIALIZATION
// ============================================================
async function init() {
  let roster;
  try {
    const res = await fetch('data/characters.json');
    if (!res.ok) throw new Error('HTTP error');
    roster = await res.json();
  } catch (e) {
    console.warn('Could not fetch data/characters.json. Using fallback data.');
    roster = FALLBACK_ROSTER;
  }
  setupMenu(roster);
}
init();