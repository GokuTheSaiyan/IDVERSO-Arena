const FALLBACK_ROSTER = [
  { id: "fighterA", name: "Fighter A", hp: 100, damage: 5, speed: 220, color: "#ff5555", size: 36, abilities: {}, assetFolder: "FighterA" },
  { id: "fighterB", name: "Fighter B", hp: 100, damage: 5, speed: 220, color: "#5555ff", size: 36, abilities: {}, assetFolder: "FighterB" },
  { id: "itami", name: "Itami", hp: 100, damage: 5, speed: 250, color: "#4a1c1c", size: 36, abilities: { knife: true, parry: true, hate: true, dodge: true }, assetFolder: "Itami" },
  { id: "dino", name: "Dino", hp: 100, damage: 6, speed: 200, color: "#855624", size: 42, abilities: { determination: true, determination_rush: true }, assetFolder: "Dino" },
  { id: "sam", name: "Sam", hp: 100, damage: 4, speed: 265, color: "#2c233b", size: 36, abilities: { void_meter: true, void_beam: true }, assetFolder: "Sam" }
];

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

class Game {
  constructor(canvas, charA, charB, scenario = 'default', mode = 'standard', charC = null) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.mode = mode;
    let arenaSize = 600;
    if (scenario === 'small') arenaSize = 500;
    if (scenario === 'compact') arenaSize = 400;
    const arenaX = (canvas.width - arenaSize) / 2;
    const arenaY = (canvas.height - arenaSize) / 2;
    this.arena = new Arena(arenaX, arenaY, arenaSize);

    if (mode === 'triple') {
      this.fighterA = new Fighter(charA, this.arena.x + arenaSize * 0.5, this.arena.y + arenaSize * 0.15, Math.PI / 2);
      this.fighterB = new Fighter(charB, this.arena.x + arenaSize * 0.15, this.arena.y + arenaSize * 0.85, -Math.PI / 4);
      this.fighterC = new Fighter(charC, this.arena.x + arenaSize * 0.85, this.arena.y + arenaSize * 0.85, -3 * Math.PI / 4);
      this.fighters = [this.fighterA, this.fighterB, this.fighterC];
    } else {
      this.fighterA = new Fighter(charA, this.arena.x + arenaSize * 0.25, this.arena.y + arenaSize * 0.25, Math.PI / 4);
      this.fighterB = new Fighter(charB, this.arena.x + arenaSize * 0.75, this.arena.y + arenaSize * 0.75, Math.PI * 5 / 4);
      this.fighters = [this.fighterA, this.fighterB];
    }

    this.particles = [];
    this.damageNumbers = [];
    this.combatTexts = [];
    this.hateSlashes = [];
    this.voidBeams = [];
    this.voidRifts = [];
    this.sliceWarnings = [];
    this.sliceAttacks = [];
    this.summons = [];
    this.summonSpawnTimer = 0;
    this.elapsed = 0;
    this.collisions = 0;
    this.winner = null;
    this.paused = false;
    this.lastTime = 0;
    this.onGameOver = null;
    this.onLog = null;
    this.cinematicMode = false;
    this.cinematicTarget = null;
    this.cinematicZoom = 1.0;
    
    this.forceLastStandSuccess = false;
    this.forceLastStandFailure = false;

    // Two-Part Last Stand Dialogue System
    this.dialogueActive = false;
    this.dialoguePhase = 'none'; // 'part1', 'full'
    this.dialoguePart1 = '';
    this.dialoguePart2 = '';
    this.dialogueAlpha1 = 0;
    this.dialogueAlpha2 = 0;
    this.dialogueScale1 = 1;
    this.dialogueScale2 = 1;
    this.dialogueTimer = 0;
    this.dialogueShake = 0;

    // Last Stand Glitch System
    this.glitchActive = false;
    this.glitchTimer = 0;
    this.glitchNextBurst = 3.0; // Seconds until first burst
    this.glitchIntensity = 1.0;

    if (Object.keys(CombatText.sprites).length === 0) {
      const types = ['parry', 'blocked', 'hit', 'critical'];
      types.forEach(type => {
        const img = new Image();
        img.onload = () => { CombatText.sprites[type] = img; };
        img.onerror = () => { CombatText.sprites[type] = null; };
        img.src = `assets/ui/combat_text/${type}.png`;
      });
    }
  }

  log(text) { const t = this.elapsed.toFixed(1); if (this.onLog) this.onLog(`[${t}s] ${text}`); }
  
  startLastStandDialogue(part1, part2) {
    this.dialogueActive = true;
    this.dialoguePhase = 'part1';
    this.dialoguePart1 = part1;
    this.dialoguePart2 = part2;
    this.dialogueAlpha1 = 0;
    this.dialogueAlpha2 = 0;
    this.dialogueScale1 = 1;
    this.dialogueScale2 = 1;
    this.dialogueTimer = 0;
    this.dialogueShake = 0;
  }

  revealLastStandPart2() {
    this.dialoguePhase = 'full';
    this.dialogueAlpha2 = 0;
    this.dialogueScale2 = 1.5;
    this.dialogueShake = 1.0;
    this.dialogueTimer = 0;
  }

  start() {
    if (this.mode === 'triple') this.log(`Triple Threat started.`);
    this.fighters.forEach(f => {
      const angle = Math.random() * Math.PI * 2;
      f.vx = Math.cos(angle) * f.baseSpeed;
      f.vy = Math.sin(angle) * f.baseSpeed;
      if (f.protection > 0) { this.log(`${f.name}'s Determination Protection is active.`); }
    });
    this.lastTime = 0;
    requestAnimationFrame(t => this.loop(t));
  }

  rollDamage(base) { const r = Math.random(); if (r < 0.15) return base - 1; if (r > 0.85) return base + 1; return base; }

  spawnHateSlash(owner, target, hateAmount) {
    this.hateSlashes.push(new HateSlash(owner.x, owner.y, target.x, target.y, owner, hateAmount));
    owner.hateSlashCooldown = 3.0;
    Sound.hateSlashLaunch();
    if (!(target instanceof Summon)) { this.log(`${owner.name} launched a HATE Slash.`); }
  }

  spawnVoidBeam(owner, angle) {
    const offset = 25;
    const perpX = Math.cos(angle + Math.PI / 2);
    const perpY = Math.sin(angle + Math.PI / 2);
    if (owner.voidBeamType === 'double') {
      const beam1 = new VoidBeam(owner.x + perpX * offset, owner.y + perpY * offset, angle, owner, this.arena);
      const beam2 = new VoidBeam(owner.x - perpX * offset, owner.y - perpY * offset, angle, owner, this.arena);
      this.voidBeams.push(beam1, beam2);
    } else {
      const beam = new VoidBeam(owner.x, owner.y, angle, owner, this.arena);
      this.voidBeams.push(beam);
    }
    for(let i=0; i<20; i++) {
      const spread = (Math.random() - 0.5) * 0.6;
      const a = angle + spread;
      const speed = 200 + Math.random() * 200;
      this.particles.push(new Particle(owner.x, owner.y, Math.cos(a)*speed, Math.sin(a)*speed, '#4b0082', 0.4, 4 + Math.random() * 4));
    }
  }

  spawnVoidRift(beam) {
    this.voidRifts.push(new VoidRift(beam.x, beam.y, beam.angle, beam.owner, this.arena));
    this.log(`Void Rift created.`);
    Sound.voidRift(beam.owner.character.assetFolder);
  }

  spawnSlice(owner, x, y, angle) { this.sliceAttacks.push(new SliceAttack(x, y, angle, this.arena.size, owner)); }

  spawnDodgeEffect(x, y) {
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 120;
      this.particles.push(new Particle(x, y, Math.cos(a)*speed, Math.sin(a)*speed, '#000000', 0.25, 4));
      this.particles.push(new Particle(x, y, Math.cos(a)*speed*0.5, Math.sin(a)*speed*0.5, '#ae00ff', 0.25, 3));
    }
  }

  spawnRushImpactEffect(x, y, color) {
    for (let i = 0; i < 15; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 150 + Math.random() * 200;
      this.particles.push(new Particle(x, y, Math.cos(a) * speed, Math.sin(a) * speed, color, 0.4, 5 + Math.random() * 4));
    }
  }

  spawnHealEffect(x, y) {
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 40;
      this.particles.push(new Particle(x, y, Math.cos(a) * speed, Math.sin(a) * speed, '#000000', 0.4, 3 + Math.random() * 2));
    }
  }

  spawnProtectionBreakEffect(x, y) {
    for (let i = 0; i < 20; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 150;
      this.particles.push(new Particle(x, y, Math.cos(a) * speed, Math.sin(a) * speed, '#ff0000', 0.5, 4 + Math.random() * 3));
    }
  }

  update(dt) {
    this.elapsed += dt;
    
    // Dialogue Update Logic
    if (this.dialogueActive) {
      this.dialogueTimer += dt;
      if (this.dialogueShake > 0) {
        this.dialogueShake -= dt * 2;
        if (this.dialogueShake < 0) this.dialogueShake = 0;
      }
      
      if (this.dialoguePhase === 'part1') {
        this.dialogueAlpha1 = Math.min(1, this.dialogueAlpha1 + dt * 0.7); 
        this.dialogueScale1 = 1.0;
      } else if (this.dialoguePhase === 'full') {
        this.dialogueAlpha2 = Math.min(1, this.dialogueAlpha2 + dt * 5); 
        this.dialogueScale2 = Math.max(1.0, this.dialogueScale2 - dt * 2.5);
        if (this.dialogueTimer > 3.5) {
          this.dialogueAlpha1 -= dt * 0.8;
          this.dialogueAlpha2 -= dt * 0.8;
          if (this.dialogueAlpha1 <= 0) {
            this.dialogueActive = false;
            this.dialoguePhase = 'none';
          }
        }
      }
    }

    // Last Stand Glitch System
    if (this.glitchActive) {
      // Increase intensity over time
      this.glitchIntensity = Math.min(3.0, this.glitchIntensity + dt * 0.1);
      
      // Handle burst
      if (this.glitchTimer > 0) {
        this.glitchTimer -= dt;
        if (this.glitchTimer <= 0) {
          this.glitchActive = false;
          this.glitchTimer = 0;
        }
      } else {
        // Check for next burst
        this.glitchNextBurst -= dt;
        if (this.glitchNextBurst <= 0) {
          this.glitchTimer = 0.15 + Math.random() * 0.1; // Burst duration
          this.glitchActive = true;
          Sound.laststandGlitch(this.fighterA.character.assetFolder);
          // Schedule next burst with randomness, intensity increases frequency
          const baseWait = 4.0 - (this.glitchIntensity * 0.8);
          this.glitchNextBurst = Math.max(1.5, baseWait + (Math.random() - 0.5) * 2.0);
        }
      }
    }
    
    if (this.cinematicMode) { this.cinematicTarget.update(dt, this.arena, this); return; }
    
    this.fighters.forEach(f => f.update(dt, this.arena, this));
    for (let i = 0; i < this.fighters.length; i++) {
      for (let j = i + 1; j < this.fighters.length; j++) { this.resolveCollision(this.fighters[i], this.fighters[j]); }
    }
    
    this.fighters.forEach(f => {
      if (f.voidPortalActive) {
        this.summonSpawnTimer -= dt;
        if (this.summonSpawnTimer <= 0 && this.summons.filter(s => s.alive).length < 3) {
          this.summonSpawnTimer = 2.0;
          const type = Math.random() < 0.5 ? 'scout' : 'heavy';
          const opponents = this.fighters.filter(fighter => fighter !== f && fighter.alive);
          const target = opponents[Math.floor(Math.random() * opponents.length)] || f;
          const summon = new Summon(f.portalX, f.portalY, type, f, target);
          this.summons.push(summon);
          if (type === 'scout') Sound.scoutSpawn(f.character.assetFolder);
          else Sound.heavySpawn(f.character.assetFolder);
          this.log(`${type.charAt(0).toUpperCase() + type.slice(1)} spawned.`);
        }
      }
    });
    
    this.summons.forEach(s => s.update(dt, this.arena));
    this.summons = this.summons.filter(s => s.alive);
    this.checkSummonCollisions();
    
    this.particles = this.particles.filter(p => p.life > 0);
    this.particles.forEach(p => p.update(dt));
    this.damageNumbers = this.damageNumbers.filter(d => d.life > 0);
    this.damageNumbers.forEach(d => d.update(dt));
    this.combatTexts = this.combatTexts.filter(t => t.life > 0);
    this.combatTexts.forEach(t => t.update(dt));

    this.sliceWarnings.forEach(w => w.update(dt, this));
    this.sliceWarnings = this.sliceWarnings.filter(w => !w.spawned);

    this.sliceAttacks.forEach(s => s.update(dt));
    this.sliceAttacks.forEach(slice => {
      if (this.cinematicMode) return;
      if (slice.isHitboxActive()) {
        this.fighters.forEach(target => {
          if (target !== slice.owner && target.alive && !slice.hitTargets.has(target)) {
            if (slice.checkHit(target)) {
              slice.hitTargets.add(target);
              const dmgTaken = target.takeDamage(slice.damage, slice.owner, this, true, 15);
              if (dmgTaken) {
                this.log(`Slice hit ${target.name}.`);
                Sound.sliceAttack(slice.owner.character.assetFolder);
                const kb = slice.getKnockback(target);
                target.vx = kb.vx; target.vy = kb.vy; target.speedBoost = 300;
                this.damageNumbers.push(new DamageNumber(target.x, target.y, slice.damage, target.color));
                this.combatTexts.push(new CombatText(target.x, target.y - 20, 'hit'));
                for (let i=0; i<10; i++) {
                  const a = Math.random() * Math.PI * 2;
                  const speed = 100 + Math.random() * 150;
                  this.particles.push(new Particle(target.x, target.y, Math.cos(a)*speed, Math.sin(a)*speed, '#000000', 0.3, 4 + Math.random() * 3));
                }
              } else { this.combatTexts.push(new CombatText(target.x, target.y - 20, 'blocked')); }
            }
          }
        });
      }
    });
    this.sliceAttacks = this.sliceAttacks.filter(s => s.life > 0);

    this.hateSlashes = this.hateSlashes.filter(s => s.life > 0);
    this.hateSlashes.forEach(s => {
      if (this.cinematicMode) return;
      s.update(dt);
      let hitSummon = false;
      this.summons.forEach(summon => {
        if (summon.alive && summon.owner !== s.owner && Math.hypot(s.x - summon.x, s.y - summon.y) < summon.radius + 10) {
          summon.takeDamage(1);
          if (!summon.alive) this.log(`${summon.type} was destroyed.`);
          Sound.hateSlashHit();
          s.life = 0;
          hitSummon = true;
        }
      });
      if (hitSummon) return;
      let hitFighter = false;
      this.fighters.forEach(target => {
        if (!hitFighter && target.alive && target !== s.owner && Math.hypot(s.x - target.x, s.y - target.y) < target.radius + 10) {
          const dmgTaken = target.takeDamage(s.damage, s.owner, this, true, 10);
          if (dmgTaken) {
            this.log(`HATE Slash hit ${target.name}.`);
            this.log(`${target.name} was launched by the HATE Slash.`);
            Sound.hateSlashHit();
            const len = Math.hypot(s.vx, s.vy);
            target.vx = s.vx / len; target.vy = s.vy / len;
            target.speedBoost = s.knockback;
            this.damageNumbers.push(new DamageNumber(s.x, s.y, s.damage, target.color));
            this.combatTexts.push(new CombatText(s.x, s.y - 20, 'hit'));
            for (let i = 0; i < 10 + s.scale * 10; i++) {
              const a = Math.random() * Math.PI * 2;
              const speed = 100 + Math.random() * 150;
              this.particles.push(new Particle(s.x, s.y, Math.cos(a) * speed, Math.sin(a) * speed, '#000000', 0.3, (4 + Math.random() * 3) * (0.5 + s.scale)));
            }
          }
          s.life = 0;
          hitFighter = true;
        }
      });
      if (hitFighter) return;
      if (s.x < this.arena.x - 50 || s.x > this.arena.x + this.arena.size + 50 || s.y < this.arena.y - 50 || s.y > this.arena.y + this.arena.size + 50) { s.life = 0; }
    });

    this.voidBeams.forEach(b => b.update(dt));
    this.voidBeams.forEach(beam => {
      if (!beam.isHitboxActive() && !beam.riftSpawned) { beam.riftSpawned = true; this.spawnVoidRift(beam); }
      if (this.cinematicMode) return;
      if (beam.isHitboxActive()) {
        this.fighters.forEach(target => {
          if (target !== beam.owner && target.alive && !beam.hitTargets.has(target)) {
            const hitRadius = target.radius + beam.baseWidth / 2;
            let hit = false;
            let knockAngle = beam.angle;
            const end1X = beam.x + Math.cos(beam.angle) * beam.length;
            const end1Y = beam.y + Math.sin(beam.angle) * beam.length;
            if (distToSegment(target.x, target.y, beam.x, beam.y, end1X, end1Y) < hitRadius) { hit = true; knockAngle = beam.angle; }
            if (hit) {
              beam.hitTargets.add(target);
              const dmgTaken = target.takeDamage(beam.damage, beam.owner, this, true, 15);
              if (dmgTaken) {
                this.log(`Void Beam hit ${target.name}.`);
                Sound.beamHit(beam.owner.character.assetFolder);
                target.vx = Math.cos(knockAngle) * beam.knockback;
                target.vy = Math.sin(knockAngle) * beam.knockback;
                target.speedBoost = 400;
                this.damageNumbers.push(new DamageNumber(target.x, target.y, beam.damage, target.color));
                this.combatTexts.push(new CombatText(target.x, target.y - 20, 'critical'));
                for (let i=0; i<15; i++) {
                  const a = Math.random() * Math.PI * 2;
                  const speed = 100 + Math.random() * 150;
                  this.particles.push(new Particle(target.x, target.y, Math.cos(a)*speed, Math.sin(a)*speed, '#000000', 0.4, 4 + Math.random() * 3));
                }
              } else { this.combatTexts.push(new CombatText(target.x, target.y - 20, 'blocked')); }
            }
          }
        });
      }
    });
    this.voidBeams = this.voidBeams.filter(b => b.life > 0);

    this.voidRifts.forEach(rift => {
      rift.update(dt);
      if (rift.damageTimer <= 0) {
        rift.damageTimer = 0.5;
        this.fighters.forEach(target => {
          if (target !== rift.owner && target.alive) {
            if (rift.checkHit(target)) {
              const dmgTaken = target.takeDamage(rift.damage, rift.owner, this, false, 0);
              if (dmgTaken) {
                this.log(`Void Rift hit ${target.name} for ${rift.damage} damage.`);
                this.damageNumbers.push(new DamageNumber(target.x, target.y, rift.damage, target.color));
              }
            }
          }
        });
      }
    });
    this.voidRifts = this.voidRifts.filter(r => r.life > 0);

    this.fighters.forEach(f => {
      if (!f.alive && !f.defeatLogged) { f.defeatLogged = true; this.log(`${f.name} defeated.`); }
    });

    const alive = this.fighters.filter(f => f.alive);
    if (this.fighters.length > 1 && alive.length <= 1) {
      this.winner = alive[0] || null;
      this.paused = true;
      this.log(this.winner ? `${this.winner.name} wins.` : 'Match ended in a draw');
      Sound.stopAll();
      if (this.onGameOver) this.onGameOver(this.winner, { time: this.elapsed, collisions: this.collisions });
    }
  }

  checkSummonCollisions() {
    if (this.cinematicMode) return;
    this.summons.forEach(s => {
      if (!s.alive) return;
      this.summons.forEach(s2 => {
        if (s !== s2 && s2.alive) {
          const dx = s2.x - s.x; const dy = s2.y - s.y; const dist = Math.hypot(dx, dy); const minDist = s.radius + s2.radius;
          if (dist < minDist) {
            const safeDist = Math.max(0.0001, dist);
            const nx = dx / safeDist; const ny = dy / safeDist;
            const overlap = minDist - safeDist;
            s.x -= nx * overlap / 2; s.y -= ny * overlap / 2;
            s2.x += nx * overlap / 2; s2.y += ny * overlap / 2;
            s.vx = -s.vx; s.vy = -s.vy;
          }
        }
      });
      const enemy = s.target;
      if (enemy && enemy.alive && !enemy.voidPortalActive && Math.hypot(s.x - enemy.x, s.y - enemy.y) < s.radius + enemy.radius) {
        if (enemy.character.abilities && enemy.character.abilities.parry && Math.random() < 0.15) {
          s.alive = false;
          if (s.type === 'scout') { enemy.hate += 5; enemy.hp = Math.min(enemy.maxHp, enemy.hp + 8); Sound.scoutParry(enemy.character.assetFolder); this.log(`${enemy.name} parried a Scout and recovered health.`); }
          else { enemy.hate += 10; enemy.hp = Math.min(enemy.maxHp, enemy.hp + 15); Sound.heavyParry(enemy.character.assetFolder); this.log(`${enemy.name} parried a Heavy and recovered health.`); }
          if (enemy.hate > 100) enemy.hate = 100;
          Sound.parryHeal(enemy.character.assetFolder);
          this.spawnParryEffect(s.x, s.y);
          this.spawnHealEffect(enemy.x, enemy.y);
          this.combatTexts.push(new CombatText(s.x, s.y - 20, 'parry'));
          return;
        }
        const dx = enemy.x - s.x; const dy = enemy.y - s.y; const dist = Math.max(0.1, Math.hypot(dx, dy));
        const nx = dx / dist, ny = dy / dist;
        const overlap = (s.radius + enemy.radius) - dist;
        s.x -= nx * overlap * 0.5; s.y -= ny * overlap * 0.5;
        enemy.x += nx * overlap * 0.5; enemy.y += ny * overlap * 0.5;
        const dvx = enemy.vx - s.vx; const dvy = enemy.vy - s.vy;
        const dot = dvx * nx + dvy * ny;
        if (dot < 0) { s.vx += dot * nx; s.vy += dot * ny; enemy.vx -= dot * nx; enemy.vy -= dot * ny; }
        if (enemy.hitCooldown <= 0) {
          const dmgTaken = enemy.takeDamage(s.damage, s.owner, this, false, 0);
          if (dmgTaken) {
            this.log(`${s.type} hit ${enemy.name} for ${s.damage} damage.`);
            enemy.hitCooldown = 0.18;
            this.damageNumbers.push(new DamageNumber(enemy.x, enemy.y, s.damage, enemy.color));
            this.combatTexts.push(new CombatText(enemy.x, enemy.y - 20, 'hit'));
            Sound.hit();
            s.takeDamage(1);
            if (!s.alive) this.log(`${s.type} was destroyed.`);
          } else { this.combatTexts.push(new CombatText(enemy.x, enemy.y - 20, 'blocked')); enemy.hitCooldown = 0.18; }
        }
      }
      const owner = s.owner;
      if (owner.alive && !owner.voidPortalActive && Math.hypot(s.x - owner.x, s.y - owner.y) < s.radius + owner.radius) {
        s.alive = false;
        if (s.type === 'scout') { owner.hp = Math.min(owner.maxHp, owner.hp + 10); Sound.scoutAbsorb(owner.character.assetFolder); this.log(`${owner.name} absorbed a Scout and recovered health.`); }
        else { owner.hp = Math.min(owner.maxHp, owner.hp + 15); Sound.heavyAbsorb(owner.character.assetFolder); this.log(`${owner.name} absorbed a Heavy and recovered health.`); }
        Sound.heal(owner.character.assetFolder);
      }
    });
  }

  resolveCollision(a, b) {
    if (this.cinematicMode) return;
    if (!a.alive || !b.alive) return;
    const dx = b.x - a.x; const dy = b.y - a.y; const dist = Math.hypot(dx, dy); const minDist = a.radius + b.radius;
    if (a.voidPortalActive || b.voidPortalActive) {
      const sam = a.voidPortalActive ? a : b;
      const other = a.voidPortalActive ? b : a;
      const sDx = other.x - sam.x; const sDy = other.y - sam.y; const sDist = Math.hypot(sDx, sDy); const sMinDist = sam.radius + other.radius;
      if (sDist < sMinDist) {
        const safeDist = Math.max(0.0001, sDist);
        const nx = sDx / safeDist; const ny = sDy / safeDist;
        const overlap = sMinDist - safeDist;
        other.x += nx * overlap; other.y += ny * overlap;
        const dot = other.vx * nx + other.vy * ny;
        if (dot < 0) { other.vx -= 2 * dot * nx; other.vy -= 2 * dot * ny; }
      }
      return;
    }
    if (dist < minDist) {
      a.lastCombatTime = this.elapsed;
      b.lastCombatTime = this.elapsed;
      const safeDist = Math.max(0.0001, dist);
      const nx = dx / safeDist; const ny = dy / safeDist;
      const overlap = minDist - safeDist;
      a.x -= nx * overlap / 2; a.y -= ny * overlap / 2;
      b.x += nx * overlap / 2; b.y += ny / 2;
      const aIsCharging = a.rushState.startsWith('charging');
      const bIsCharging = b.rushState.startsWith('charging');
      const aIsRushing = a.rushState.startsWith('rushing');
      const bIsRushing = b.rushState.startsWith('rushing');
      if (aIsRushing || bIsRushing) {
        const rusher = aIsRushing ? a : b;
        const target = aIsRushing ? b : a;
        let hitSummon = false;
        this.summons.forEach(s => {
          if (s.alive && s.owner !== rusher && Math.hypot(s.x - rusher.x, s.y - rusher.y) < s.radius + rusher.radius) {
            const speed = Math.hypot(rusher.vx, rusher.vy);
            const rushDmg = Math.round(8 + (speed / 1200) * 10);
            s.takeDamage(rushDmg);
            this.log(`${rusher.name}'s Rush collided with a ${s.type}.`);
            if (!s.alive) this.log(`${s.type} was destroyed.`);
            Sound.rushImpact();
            this.spawnRushImpactEffect(s.x, s.y, rusher.color);
            this.combatTexts.push(new CombatText(s.x, s.y - 20, 'critical'));
            hitSummon = true;
          }
        });
        if (hitSummon) { rusher.endRush(this, true); return; }
        if (target.character.abilities && target.character.abilities.parry && Math.random() < 0.15) {
          this.log(`${target.name} parried the Rush.`);
          Sound.rushParry();
          this.spawnParryEffect(target.x, target.y);
          this.combatTexts.push(new CombatText(target.x, target.y - 20, 'parry'));
          const len = Math.hypot(rusher.vx, rusher.vy);
          target.vx = -rusher.vx / len; target.vy = -rusher.vy / len;
          target.speedBoost = 400;
          if (target.character.abilities.hate) {
            target.hate += 60;
            if (target.hate > 100) target.hate = 100;
            this.log(`${target.name} gained a large amount of HATE.`);
            Sound.hateGain();
            if (target.hate >= 100 && !target.hateMaxed) {
              target.hateMaxed = true; target.hateUnlocked = true;
              Sound.hateFull(); Sound.hateUnlock();
              this.log(`${target.name}'s HATE reached maximum.`);
              this.log(`${target.name} awakened HATE Slashes.`);
            }
          }
          rusher.hitCooldown = 0.3; target.hitCooldown = 0.3;
          return;
        }
        const speed = Math.hypot(rusher.vx, rusher.vy);
        const baseRushDmg = 8;
        const speedMultiplier = speed / 1200;
        const rushDmg = Math.round(baseRushDmg + speedMultiplier * 10);
        const dmgTaken = target.takeDamage(rushDmg, rusher, this, true, 15);
        if (dmgTaken) {
          this.log(`${rusher.name} hit ${target.name} with Rush Attack.`);
          Sound.rushImpact();
          const len = Math.hypot(rusher.vx, rusher.vy);
          target.vx = (rusher.vx / len) * 500;
          target.vy = (rusher.vy / len) * 500;
          target.speedBoost = 400;
          rusher.hitCooldown = 0.5; target.hitCooldown = 0.5;
          this.damageNumbers.push(new DamageNumber(target.x, target.y, rushDmg, target.color));
          this.combatTexts.push(new CombatText(target.x, target.y - 20, 'critical'));
          this.spawnRushImpactEffect(target.x, target.y, rusher.color);
          rusher.endRush(this, true);
        } else { if (rusher.rushState.startsWith('rushing')) { rusher.endRush(this, true); } }
      } else {
        const dvx = b.vx - a.vx; const dvy = b.vy - a.vy;
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
            const dmgTaken = a.takeDamage(dmg, b, this, false, 0);
            if (dmgTaken) { this.log(`${b.name} dealt ${dmg} damage to ${a.name}`); this.damageNumbers.push(new DamageNumber(a.x, a.y - 20, dmg, a.color)); this.combatTexts.push(new CombatText(a.x, a.y - 30, dmg > b.damage ? 'critical' : 'hit')); }
            b.hitsLanded++;
            a.hitCooldown = 0.18; b.hitCooldown = 0.18;
            Sound.hit();
          } else if (bIsCharging && !aIsCharging) {
            const dmg = this.rollDamage(a.damage);
            const dmgTaken = b.takeDamage(dmg, a, this, false, 0);
            if (dmgTaken) { this.log(`${a.name} dealt ${dmg} damage to ${b.name}`); this.damageNumbers.push(new DamageNumber(b.x, b.y - 20, dmg, b.color)); this.combatTexts.push(new CombatText(b.x, b.y - 30, dmg > a.damage ? 'critical' : 'hit')); }
            a.hitsLanded++;
            a.hitCooldown = 0.18; b.hitCooldown = 0.18;
            Sound.hit();
          } else if (aIsCharging && bIsCharging) { a.hitCooldown = 0.18; b.hitCooldown = 0.18; }
          else {
            const dmgA = this.rollDamage(a.damage);
            const dmgB = this.rollDamage(b.damage);
            const cx = (a.x + b.x) / 2; const cy = (a.y + b.y) / 2;
            this.log(`${a.name} collided with ${b.name}`);
            if (b.character.abilities && b.character.abilities.parry && Math.random() < 0.15) {
              this.log(`${b.name} successfully parried the attack`);
              if (b.character.abilities.hate) {
                b.hate += 35;
                if (b.hate >= 100) { b.hate = 100; if (!b.hateMaxed) { b.hateMaxed = true; b.hateUnlocked = true; Sound.hateFull(); Sound.hateUnlock(); this.log(`${b.name}'s HATE reached maximum.`); this.log(`${b.name} awakened HATE Slashes.`); } }
                this.log(`${b.name} gained HATE from a successful parry.`);
                Sound.hateGain();
              }
              const dmgTaken = a.takeDamage(dmgA, b, this, false, 0);
              if (dmgTaken) { this.log(`${b.name} dealt ${dmgA} damage to ${a.name}`); this.damageNumbers.push(new DamageNumber(cx - 15, cy, dmgA, a.color)); }
              this.combatTexts.push(new CombatText(cx, cy - 10, 'parry'));
              this.spawnParryEffect(b.x, b.y);
              Sound.parry(b.character.assetFolder);
            } else {
              const dmgTaken = b.takeDamage(dmgA, a, this, false, 0);
              if (dmgTaken) { this.log(`${a.name} dealt ${dmgA} damage to ${b.name}`); this.damageNumbers.push(new DamageNumber(cx - 15, cy, dmgA, a.color)); this.combatTexts.push(new CombatText(cx, cy - 10, dmgA > a.damage ? 'critical' : 'hit')); }
              else { this.combatTexts.push(new CombatText(cx, cy - 10, 'blocked')); }
            }
            if (a.character.abilities && a.character.abilities.parry && Math.random() < 0.15) {
              this.log(`${a.name} successfully parried the attack`);
              if (a.character.abilities.hate) {
                a.hate += 35;
                if (a.hate >= 100) { a.hate = 100; if (!a.hateMaxed) { a.hateMaxed = true; a.hateUnlocked = true; Sound.hateFull(); Sound.hateUnlock(); this.log(`${a.name}'s HATE reached maximum.`); this.log(`${a.name} awakened HATE Slashes.`); } }
                this.log(`${a.name} gained HATE from a successful parry.`);
                Sound.hateGain();
              }
              const dmgTaken = b.takeDamage(dmgB, a, this, false, 0);
              if (dmgTaken) { this.log(`${a.name} dealt ${dmgB} damage to ${b.name}`); this.damageNumbers.push(new DamageNumber(cx + 15, cy, dmgB, b.color)); }
              this.combatTexts.push(new CombatText(cx, cy - 10, 'parry'));
              this.spawnParryEffect(a.x, a.y);
              Sound.parry(a.character.assetFolder);
            } else {
              const dmgTaken = a.takeDamage(dmgB, b, this, false, 0);
              if (dmgTaken) { this.log(`${b.name} dealt ${dmgB} damage to ${a.name}`); this.damageNumbers.push(new DamageNumber(cx + 15, cy, dmgB, b.color)); this.combatTexts.push(new CombatText(cx, cy - 10, dmgB > b.damage ? 'critical' : 'hit')); }
              else { this.combatTexts.push(new CombatText(cx, cy - 10, 'blocked')); }
            }
            a.hitsLanded++; b.hitsLanded++;
            a.hitCooldown = 0.18; b.hitCooldown = 0.18;
            this.collisions++;
            Sound.hit();
            let slashPlayed = false;
            if (a.character.abilities && a.character.abilities.knife) { a.triggerAttack(b.x, b.y); const slashAngle = Math.atan2(b.y - a.y, b.x - a.x); this.spawnSlashEffect(cx, cy, a.color, slashAngle); if (!slashPlayed) { Sound.slash(a.character.assetFolder); slashPlayed = true; } }
            if (b.character.abilities && b.character.abilities.knife) { b.triggerAttack(a.x, a.y); const slashAngle = Math.atan2(a.y - b.y, a.x - b.x); this.spawnSlashEffect(cx, cy, b.color, slashAngle); if (!slashPlayed) { Sound.slash(b.character.assetFolder); slashPlayed = true; } }
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
    ctx.save();
    if (this.cinematicMode) {
      this.cinematicZoom += 0.015;
      if (this.cinematicZoom > 2.5) this.cinematicZoom = 2.5;
      const zoom = this.cinematicZoom;
      ctx.translate(350, 350);
      ctx.scale(zoom, zoom);
      ctx.translate(-this.cinematicTarget.x, -this.cinematicTarget.y);
    }
    if (this.dialogueActive) {
      const shakeAmt = 4 + this.dialogueShake * 15;
      const shakeX = (Math.random() - 0.5) * shakeAmt;
      const shakeY = (Math.random() - 0.5) * shakeAmt;
      ctx.translate(shakeX, shakeY);
    }
    this.arena.draw(ctx);
    this.voidRifts.forEach(r => r.draw(ctx));
    this.particles.forEach(p => p.draw(ctx));
    this.hateSlashes.forEach(s => s.draw(ctx));
    this.voidBeams.forEach(b => b.draw(ctx));
    this.fighters.forEach(f => {
      if (f.voidPortalActive) {
        ctx.fillStyle = '#1a0a2a';
        ctx.beginPath();
        ctx.ellipse(f.portalX, f.portalY, 35, 70, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#4b0082';
        ctx.lineWidth = 4;
        ctx.stroke();
      }
    });
    this.summons.forEach(s => s.draw(ctx));
    
    // Draw Itami with glitch duplicates if Last Stand is active and glitch is bursting
    this.fighters.forEach(f => {
      f.draw(ctx);
      // If Itami is in Last Stand and a glitch is active, draw duplicates
      if (f.lastStandActive && f.name === 'Itami' && this.glitchActive) {
        // Determine number of duplicates based on intensity
        const dupes = Math.floor(this.glitchIntensity);
        for (let i = 0; i < dupes; i++) {
          ctx.globalAlpha = 0.4 - (i * 0.1);
          // Offset position
          const offX = (Math.random() - 0.5) * 20 * this.glitchIntensity;
          const offY = (Math.random() - 0.5) * 20 * this.glitchIntensity;
          // Color: semi-transparent black, purple, or magenta
          const colors = ['rgba(0,0,0,0.4)', 'rgba(174,0,255,0.4)', 'rgba(202,3,252,0.4)'];
          ctx.fillStyle = colors[i % colors.length];
          // Draw duplicate circle
          ctx.beginPath();
          ctx.arc(f.x + offX, f.y + offY, f.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
    });
    
    this.fighters.forEach(f => f.drawHpBar(ctx));
    this.damageNumbers.forEach(d => d.draw(ctx));
    this.sliceWarnings.forEach(w => w.draw(ctx));
    this.sliceAttacks.forEach(s => s.draw(ctx));
    this.combatTexts.forEach(t => t.draw(ctx));
    ctx.restore();
    
    // Apply screen distortion jitter during glitch burst
    if (this.glitchActive) {
      const jitterX = (Math.random() - 0.5) * 6 * this.glitchIntensity;
      const jitterY = (Math.random() - 0.5) * 6 * this.glitchIntensity;
      ctx.translate(jitterX, jitterY);
    }
    
    if (this.dialogueActive) { this.drawDialogue(ctx); }
  }

  drawDialogueText(ctx, text, y, alpha, scale, shake) {
    if (alpha <= 0) return;
    const centerX = this.canvas.width / 2;
    
    // Rear text
    const rearShakeX = (Math.random() - 0.5) * shake;
    const rearShakeY = (Math.random() - 0.5) * shake;
    ctx.globalAlpha = alpha * 0.6;
    ctx.font = `bold ${36 * scale}px 'IDVERSOFont', Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ca03fc';
    ctx.fillText(text, centerX + 4 + rearShakeX, y + 3 + rearShakeY);
    
    // Front text
    const frontShakeX = (Math.random() - 0.5) * shake;
    const frontShakeY = (Math.random() - 0.5) * shake;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    ctx.strokeText(text, centerX + frontShakeX, y + frontShakeY);
    ctx.fillStyle = '#000000';
    ctx.fillText(text, centerX + frontShakeX, y + frontShakeY);
    
    ctx.globalAlpha = 1;
  }

  drawDialogue(ctx) {
    const centerY = this.canvas.height / 2;
    const baseShake = 8;
    const burstShake = this.dialogueShake * 20;
    
    const shake1 = baseShake + burstShake;
    this.drawDialogueText(ctx, this.dialoguePart1, centerY - 30, this.dialogueAlpha1, this.dialogueScale1, shake1);
    
    const shake2 = baseShake + burstShake * 1.5;
    this.drawDialogueText(ctx, this.dialoguePart2, centerY + 30, this.dialogueAlpha2, this.dialogueScale2, shake2);
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