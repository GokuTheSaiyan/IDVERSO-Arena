// ============================================================
//  SPRITE MANAGER
// ============================================================
class SpriteManager {
  constructor() { this.cache = {}; }
  loadSprite(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { this.cache[url] = img; resolve(img); };
      img.onerror = () => { this.cache[url] = null; resolve(null); };
      img.src = url;
    });
  }
  async getSprite(charFolder, name) {
    if (!charFolder) return null;
    const url = `sprites/${charFolder}/${name}.png`;
    if (this.cache[url] === undefined) await this.loadSprite(url);
    return this.cache[url];
  }
}
const Sprites = new SpriteManager();

// ============================================================
//  CLASS: Fighter
// ============================================================
class Fighter {
  constructor(character, x, y, angle) {
    this.character = character;
    this.name      = character.name;
    this.color     = character.color;
    this.maxHp     = character.hp;
    this.hp        = character.hp;
    this.damage    = character.damage;
    this.baseSpeed = character.speed;

    this.x = x; this.y = y;
    this.radius = character.size || 36;
    this.vx = Math.cos(angle) * this.baseSpeed;
    this.vy = Math.sin(angle) * this.baseSpeed;

    this.flashTime   = 0;
    this.hitCooldown = 0;
    this.hitsLanded  = 0;
    this.alive       = true;
    this.defeatLogged = false; // For Triple Threat logging

    this.attackTime  = 0;
    this.attackAngle = 0;
    this.speedBoost  = 0;

    // Determination & Protection
    this.determination = 0;
    this.shieldActive = false;
    this.detCooldown = 0;
    this.detChoicePending = false;
    
    // Determination Protection (Fortnite Shield)
    this.protection = 0;
    this.maxProtection = 0;
    if (character.abilities && character.abilities.determination) {
      this.maxProtection = 50;
      this.protection = this.maxProtection;
    }

    // Rush
    this.rushState = 'idle';
    this.rushChargesLeft = 0;
    this.rushChargeTime = 0;
    this.rushMaxChargeTime = 5.0;
    this.rushTimer = 0;
    this.rushMaxTimer = 1.5;
    this.rushAngle = 0;
    this.rushDirectionLocked = false;
    this.rushCooldownTimer = 0;
    this.rushInvulnerable = false;
    this.rushStunTimer = 0;
    this.rushTarget = null;
    this.afterimages = [];
    this.chargeFlashTimer = 0;
    this.chargeFlashValue = 0;
    this.shakeIntensity = 0;

    // HATE
    this.hate = 0;
    this.hateMaxed = false;
    this.hateUnlocked = false;
    this.hateSlashCooldown = 0;
    this.hateWindupTime = 0;
    this.hateSlashTarget = null;
    this.hateSlashAmount = 0;
    this.storedVx = 0;
    this.storedVy = 0;

    // Void Meter & Portal & Beam
    this.voidMeter = 100; // Starts at 100% now
    this.lastVoidMilestone = 100;
    this.voidPortalActive = false;
    this.voidPortalTriggered = false;
    this.voidExhausted = false;
    this.portalX = 0;
    this.portalY = 0;
    
    // Void Beam
    this.voidBeamDisabled = false;
    this.voidBeamState = 'idle'; // 'idle', 'charging', 'firing'
    this.voidBeamChargeTime = 0;
    this.voidBeamMaxChargeTime = 3.0;
    this.voidBeamAngle = 0;
    this.voidBeamCooldown = 0;
    this.voidBeamTarget = null;
    this.voidBeamChargeFlash = 0;
    this.voidBeamTimer = 0; // New timer for firing lock

    this.sprite = null;
    if (character.assetFolder) {
      Sprites.getSprite(character.assetFolder, 'idle').then(s => this.sprite = s);
    }
  }

  triggerAttack(targetX, targetY) {
    this.attackTime  = 0.3;
    this.attackAngle = Math.atan2(targetY - this.y, targetX - this.x);
  }

  startRushCharge(game) {
    this.rushState = this.rushChargesLeft === 2 ? 'charging_rush_1' : 'charging_rush_2';
    this.rushChargeTime = this.rushMaxChargeTime;
    this.rushDirectionLocked = false;
    this.storedVx = this.vx;
    this.storedVy = this.vy;
    this.vx = 0; this.vy = 0;
    
    // Find a valid opponent naturally
    const opponents = game.fighters.filter(f => f !== this && f.alive);
    let actualTarget = this; // Fallback
    if (opponents.length > 0) {
      actualTarget = opponents[Math.floor(Math.random() * opponents.length)];
      if (actualTarget.voidPortalActive) {
        const validSummons = game.summons.filter(s => s.alive);
        if (validSummons.length > 0) {
          actualTarget = validSummons[Math.floor(Math.random() * validSummons.length)];
        }
      }
    }
    this.rushTarget = actualTarget;
    this.rushAngle = Math.atan2(actualTarget.y - this.y, actualTarget.x - this.x);
    
    game.log(`${this.name} began charging Rush Attack #${3 - this.rushChargesLeft}.`);
    Sound.rushCharge();
  }

  launchRush(game) {
    this.rushState = this.rushChargesLeft === 2 ? 'rushing_1' : 'rushing_2';
    this.rushTimer = this.rushMaxTimer;
    this.rushInvulnerable = true;
    const rushSpeed = 1200;
    this.vx = Math.cos(this.rushAngle) * rushSpeed;
    this.vy = Math.sin(this.rushAngle) * rushSpeed;
    this.shakeIntensity = 0;
    this.chargeFlashValue = 0;
    Sound.rushLaunch();
    game.log(`${this.name} launched Rush Attack #${3 - this.rushChargesLeft}.`);
  }

  endRush(game, hitOpponent) {
    this.rushInvulnerable = false;
    this.rushState = 'idle';
    this.rushChargesLeft--;
    const len = Math.hypot(this.vx, this.vy);
    if (len > 0) { this.vx = (this.vx / len) * this.baseSpeed; this.vy = (this.vy / len) * this.baseSpeed; }
    if (this.rushChargesLeft > 0) {
      this.startRushCharge(game);
    } else {
      this.rushCooldownTimer = 8.0;
      game.log(`${this.name}'s Determination entered cooldown.`);
    }
  }

  applyWallStun(game) {
    this.rushInvulnerable = false;
    this.rushState = 'idle';
    this.rushChargesLeft = 0;
    this.vx = 0; this.vy = 0;
    this.rushStunTimer = 3.0;
    this.rushCooldownTimer = 8.0;
    game.log(`${this.name} crashed into a wall and became stunned.`);
    Sound.rushCrash();
    Sound.rushStun();
  }

  update(dt, arena, game) {
    if (!this.alive) return;

    if (this.rushStunTimer > 0) {
      this.rushStunTimer -= dt;
      if (this.flashTime > 0) this.flashTime -= dt;
      return;
    }

    if (this.rushCooldownTimer > 0) this.rushCooldownTimer -= dt;

    // Void Meter Generation & Comeback Compatibility
    if (this.character.abilities && this.character.abilities.void_meter && this.alive) {
      // Regenerate ONLY if depleted to 0 and disabled by beam
      if (this.voidBeamDisabled && !this.voidExhausted && this.voidMeter < 100) {
        this.voidMeter += dt * 1.25; // Slow regen for comeback
        if (this.voidMeter > 100) this.voidMeter = 100;

        const currentMilestone = Math.floor(this.voidMeter / 25) * 25;
        if (currentMilestone > this.lastVoidMilestone && currentMilestone > 0) {
          this.lastVoidMilestone = currentMilestone;
          if (currentMilestone === 100) {
            game.log(`${this.name}'s Void Meter reached maximum.`);
            Sound.voidFull(this.character.assetFolder);
          }
        }
      }

      // Void Portal Activation (Comeback)
      if (this.hp <= 30 && this.voidMeter >= 100 && !this.voidPortalTriggered && !this.voidExhausted) {
        this.voidPortalTriggered = true;
        this.voidPortalActive = true;
        this.storedVx = this.vx;
        this.storedVy = this.vy;
        this.vx = 0; this.vy = 0;
        
        const cx = this.x;
        const cy = this.y;
        const distLeft = cx - arena.x;
        const distRight = (arena.x + arena.size) - cx;
        const distTop = cy - arena.y;
        const distBottom = (arena.y + arena.size) - cy;
        const minDist = Math.min(distLeft, distRight, distTop, distBottom);
        
        if (minDist === distLeft) { this.portalX = arena.x + 35; this.portalY = arena.y + arena.size / 2; }
        else if (minDist === distRight) { this.portalX = arena.x + arena.size - 35; this.portalY = arena.y + arena.size / 2; }
        else if (minDist === distTop) { this.portalX = arena.x + arena.size / 2; this.portalY = arena.y + 70; }
        else { this.portalX = arena.x + arena.size / 2; this.portalY = arena.y + arena.size - 70; }

        game.log(`${this.name} activated Void Portal.`);
        Sound.portalOpen(this.character.assetFolder);
        game.log(`Void Portal opened on the nearest wall.`);
      }

      if (this.voidPortalActive) {
        this.voidMeter -= dt * 4;
        if (this.voidMeter <= 0) {
          this.voidMeter = 0;
          this.voidPortalActive = false;
          this.voidExhausted = true; // Locks meter permanently for the round
          this.vx = this.storedVx;
          this.vy = this.storedVy;
          game.log(`Void Meter depleted.`);
          game.log(`Void Portal closed.`);
          Sound.portalClose(this.character.assetFolder);
          game.log(`${this.name} returned to battle.`);
        }
        if (this.flashTime > 0) this.flashTime -= dt;
        return;
      }
    }

    // Determination
    if (this.character.abilities && this.character.abilities.determination && this.alive) {
      if (this.rushCooldownTimer > 0) {
        // No gen during cooldown
      } else if (this.shieldActive) {
        this.determination -= dt * 22;
        if (this.determination <= 0) {
          this.determination = 0;
          this.shieldActive = false;
          this.detCooldown = 2;
          game.log(`${this.name}'s Determination Shield expired`);
          Sound.shieldOff(this.character.assetFolder);
        }
      } else if (this.rushState === 'idle' && this.determination < 100) {
        this.determination += dt * 3;
        if (this.determination >= 100) {
          this.determination = 100;
          this.detChoicePending = true;
        }
      }

      if (this.detChoicePending) {
        this.detChoicePending = false;
        if (Math.random() < 0.5) {
          this.shieldActive = true;
          game.log(`${this.name} selected Determination Shield.`);
          game.log(`${this.name} activated Determination Shield.`);
          Sound.detFull(this.character.assetFolder);
          Sound.shieldOn(this.character.assetFolder);
        } else {
          this.rushChargesLeft = 2;
          this.determination = 0;
          game.log(`${this.name} selected Determination Rush.`);
          game.log(`${this.name} consumed 100% Determination.`);
          this.startRushCharge(game);
        }
      }
    }

    // Rush Charging
    if (this.rushState.startsWith('charging')) {
      this.rushChargeTime -= dt;
      this.chargeFlashTimer += dt;

      const progress = 1 - (this.rushChargeTime / this.rushMaxChargeTime);

      if (progress >= 0.4 && !this.rushDirectionLocked) {
        this.rushDirectionLocked = true;
        game.log(`${this.name}'s Rush direction locked.`);
        Sound.rushLock();
      }

      if (!this.rushDirectionLocked) {
        let trackTarget = this.rushTarget;
        if (!trackTarget || !trackTarget.alive) {
          const opponents = game.fighters.filter(f => f !== this && f.alive);
          if (opponents.length > 0) trackTarget = opponents[Math.floor(Math.random() * opponents.length)];
        }
        if (trackTarget && trackTarget.alive) {
          this.rushAngle = Math.atan2(trackTarget.y - this.y, trackTarget.x - this.x);
        }
      }

      const flashSpeed = 1 + Math.pow(progress, 2) * 11;
      this.chargeFlashValue = (Math.sin(this.chargeFlashTimer * flashSpeed * Math.PI * 2) + 1) / 2;

      if (this.rushChargeTime < 2.0) {
        this.shakeIntensity = (2.0 - this.rushChargeTime) / 2.0 * 6;
      } else {
        this.shakeIntensity = 0;
      }

      if (this.rushChargeTime <= 0) {
        this.launchRush(game);
      }
      if (this.flashTime > 0) this.flashTime -= dt;
      return;
    }

    // Rushing
    if (this.rushState.startsWith('rushing')) {
      this.rushTimer -= dt;

      this.afterimages.push({ x: this.x, y: this.y, life: 0.2 });
      if (this.afterimages.length > 10) this.afterimages.shift();
      this.afterimages.forEach(a => a.life -= dt);
      this.afterimages = this.afterimages.filter(a => a.life > 0);

      this.x += this.vx * dt;
      this.y += this.vy * dt;

      let hitWall = false;
      if (this.x - this.radius < arena.x) { this.x = arena.x + this.radius; this.vx = Math.abs(this.vx) * 0.95; hitWall = true; }
      if (this.x + this.radius > arena.x + arena.size) { this.x = arena.x + arena.size - this.radius; this.vx = -Math.abs(this.vx) * 0.95; hitWall = true; }
      if (this.y - this.radius < arena.y) { this.y = arena.y + this.radius; this.vy = Math.abs(this.vy) * 0.95; hitWall = true; }
      if (this.y + this.radius > arena.y + arena.size) { this.y = arena.y + arena.size - this.radius; this.vy = -Math.abs(this.vy) * 0.95; hitWall = true; }

      if (hitWall && this.rushState === 'rushing_2') {
        this.applyWallStun(game);
        return;
      }

      if (this.rushTimer <= 0) {
        this.endRush(game, false);
      }
      if (this.flashTime > 0) this.flashTime -= dt;
      return;
    }

    // HATE Slash Windup
    if (this.hateWindupTime > 0) {
      this.hateWindupTime -= dt;
      if (this.hateWindupTime <= 0) {
        this.hateWindupTime = 0;
        if (this.hateSlashTarget) {
          game.spawnHateSlash(this, this.hateSlashTarget, this.hateSlashAmount);
          this.hate -= this.hateSlashAmount;
          if (this.hate < 0) this.hate = 0;
        }
        this.vx = this.storedVx;
        this.vy = this.storedVy;
      }
      if (this.flashTime > 0) this.flashTime -= dt;
      if (this.attackTime > 0) this.attackTime -= dt;
      return;
    }

    // Void Beam Firing Lock (Sam remains stationary until beam completely disappears)
    if (this.voidBeamState === 'firing') {
      this.voidBeamTimer -= dt;
      if (this.voidBeamTimer <= 0) {
        this.voidBeamState = 'idle';
        this.vx = this.storedVx;
        this.vy = this.storedVy;
        this.voidBeamCooldown = 5.0;
      }
      if (this.flashTime > 0) this.flashTime -= dt;
      return; // Skip normal movement
    }

    // Void Beam Charging
    if (this.voidBeamState === 'charging') {
      this.voidBeamChargeTime -= dt;
      this.voidBeamChargeFlash += dt;
      
      const progress = 1 - (this.voidBeamChargeTime / this.voidBeamMaxChargeTime);
      // Track target until 50% charge
      if (progress < 0.5) {
        if (this.voidBeamTarget && this.voidBeamTarget.alive) {
          this.voidBeamAngle = Math.atan2(this.voidBeamTarget.y - this.y, this.voidBeamTarget.x - this.x);
        }
      }
      
      if (this.voidBeamChargeTime <= 0) {
        // Fire Beam
        this.voidBeamState = 'firing';
        this.voidBeamTimer = 0.8; // Matches VoidBeam total lifetime
        game.spawnVoidBeam(this, this.voidBeamAngle);
        this.voidMeter -= 25;
        game.log(`${this.name} fired Void Beam.`);
        game.log(`Void Meter: ${Math.max(0, this.voidMeter)}%.`);
        Sound.beamFire(this.character.assetFolder);
        
        if (this.voidMeter <= 0) {
          this.voidMeter = 0;
          this.voidBeamDisabled = true;
          this.lastVoidMilestone = 0; // Reset for regen logging
          game.log(`Void Meter depleted.`);
          game.log(`Void Beam disabled.`);
        }
      }
      // NOT invulnerable, takes normal damage and knockback
      if (this.flashTime > 0) this.flashTime -= dt;
      return; // Skip normal movement while charging
    }

    // Normal Movement
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.x - this.radius < arena.x) { this.x = arena.x + this.radius; this.vx = Math.abs(this.vx); this.vy += (Math.random()-0.5)*70; }
    if (this.x + this.radius > arena.x + arena.size) { this.x = arena.x + arena.size - this.radius; this.vx = -Math.abs(this.vx); this.vy += (Math.random()-0.5)*70; }
    if (this.y - this.radius < arena.y) { this.y = arena.y + this.radius; this.vy = Math.abs(this.vy); this.vx += (Math.random()-0.5)*70; }
    if (this.y + this.radius > arena.y + arena.size) { this.y = arena.y + arena.size - this.radius; this.vy = -Math.abs(this.vy); this.vx += (Math.random()-0.5)*70; }

    const m = Math.hypot(this.vx, this.vy);
    if (m > 0.001) {
      let currentSpeed = this.baseSpeed + this.speedBoost;
      if (this.character.abilities && this.character.abilities.hate) {
        currentSpeed += (this.hate / 100) * 50;
      }
      this.vx = (this.vx / m) * currentSpeed;
      this.vy = (this.vy / m) * currentSpeed;
    } else {
      const angle = Math.random() * Math.PI * 2;
      this.vx = Math.cos(angle) * this.baseSpeed;
      this.vy = Math.sin(angle) * this.baseSpeed;
    }

    if (this.speedBoost > 0) { this.speedBoost -= dt * 250; if (this.speedBoost < 0) this.speedBoost = 0; }

    // HATE System
    if (this.character.abilities && this.character.abilities.hate && this.alive) {
      if (this.hateSlashCooldown > 0) {
        this.hateSlashCooldown -= dt;
      } else if (this.hateUnlocked && this.hate >= 25) {
        if (Math.random() < 0.5 * dt) {
          const choices = [25, 50, 75, 100];
          let validChoices = choices.filter(c => c <= this.hate);
          if (validChoices.length === 0) validChoices = [this.hate];
          this.hateSlashAmount = validChoices[Math.floor(Math.random() * validChoices.length)];
          
          // Select a valid opponent naturally
          const opponents = game.fighters.filter(f => f !== this && f.alive);
          if (opponents.length > 0) {
            let actualTarget = opponents[Math.floor(Math.random() * opponents.length)];
            if (actualTarget.voidPortalActive) {
              const validSummons = game.summons.filter(s => s.alive);
              if (validSummons.length > 0) {
                actualTarget = validSummons[Math.floor(Math.random() * validSummons.length)];
                game.log(`${this.name}'s HATE Slash targeted a ${actualTarget.type}.`);
              }
            }
            
            if (actualTarget.alive) {
              this.hateSlashTarget = actualTarget;
              this.hateWindupTime = 0.3;
              this.storedVx = this.vx;
              this.storedVy = this.vy;
              this.vx = 0; this.vy = 0;
              this.triggerAttack(actualTarget.x, actualTarget.y);
              Sound.hateSlashPrep();
              game.log(`${this.name} prepared a HATE Slash.`);
              game.log(`${this.name} decided to use ${this.hateSlashAmount}% HATE.`);
            }
          }
        }
      }
    }

    // Void Beam Activation Check
    if (this.character.abilities && this.character.abilities.void_beam && this.alive) {
      if (this.voidBeamCooldown > 0) {
        this.voidBeamCooldown -= dt;
      } else if (!this.voidBeamDisabled && this.voidBeamState === 'idle' && this.voidMeter >= 25) {
        // Random chance to start charging
        if (Math.random() < 0.3 * dt) {
          this.voidBeamState = 'charging';
          this.voidBeamChargeTime = this.voidBeamMaxChargeTime;
          this.storedVx = this.vx;
          this.storedVy = this.vy;
          this.vx = 0; this.vy = 0;
          const opponents = game.fighters.filter(f => f !== this && f.alive);
          if (opponents.length > 0) {
            this.voidBeamTarget = opponents[Math.floor(Math.random() * opponents.length)];
            this.voidBeamAngle = Math.atan2(this.voidBeamTarget.y - this.y, this.voidBeamTarget.x - this.x);
          }
          game.log(`${this.name} began charging Void Beam.`);
          Sound.beamCharge(this.character.assetFolder);
        }
      }
    }

    if (this.flashTime > 0) this.flashTime -= dt;
    if (this.hitCooldown > 0) this.hitCooldown -= dt;
    if (this.attackTime > 0) this.attackTime -= dt;
  }

  takeDamage(amount, attacker, game) {
    if (!this.alive) return false;

    if (this.voidPortalActive) {
      game.log(`${this.name} is invulnerable during Void Portal!`);
      return false;
    }

    if (this.rushInvulnerable) {
      game.log(`${this.name} is invulnerable during Rush!`);
      return false;
    }

    if (this.character.abilities && this.character.abilities.determination && this.shieldActive) {
      game.log(`${this.name} blocked an attack with Determination Shield`);
      return false;
    }

    // Determination Protection (Absorbs damage first)
    if (this.protection > 0) {
      const protDmg = Math.max(1, Math.round(amount * 1.5)); // Amplified damage
      this.protection -= protDmg;
      if (this.protection <= 0) {
        this.protection = 0;
        game.log(`${this.name}'s Determination Protection broke.`);
        Sound.protectionBreak(this.character.assetFolder);
        game.spawnProtectionBreakEffect(this.x, this.y);
        this.flashTime = 0.15;
      }
      
      // Gain determination from damage absorbed
      if (this.character.abilities && this.character.abilities.determination && this.rushCooldownTimer <= 0 && this.rushState === 'idle' && !this.shieldActive) {
        this.determination += amount * 3;
        if (this.determination >= 100) {
          this.determination = 100;
          this.detChoicePending = true;
        }
      }
      return true; // Damage absorbed by protection
    }

    this.hp = Math.max(0, this.hp - amount);
    this.flashTime = 0.15;

    if (this.character.abilities && this.character.abilities.determination && this.rushCooldownTimer <= 0 && this.rushState === 'idle' && !this.shieldActive) {
      this.determination += amount * 3;
      if (this.determination >= 100) {
        this.determination = 100;
        this.detChoicePending = true;
      }
    }

    if (this.character.abilities && this.character.abilities.hate) {
      this.hate += amount * 1.5;
      if (this.hate > 100) this.hate = 100;
      Sound.hateGain();
      if (this.hate >= 100 && !this.hateMaxed) {
        this.hateMaxed = true;
        this.hateUnlocked = true;
        Sound.hateFull();
        Sound.hateUnlock();
        game.log(`${this.name}'s HATE reached maximum.`);
        game.log(`${this.name} awakened HATE Slashes.`);
      }
    }

    if (this.hp <= 0) this.alive = false;
    return true;
  }

  draw(ctx) {
    if (!this.alive) {
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      return;
    }

    let drawX = this.x;
    let drawY = this.y;

    if (this.rushState.startsWith('charging') && this.shakeIntensity > 0) {
      drawX += (Math.random() - 0.5) * this.shakeIntensity;
      drawY += (Math.random() - 0.5) * this.shakeIntensity;
    }

    if (this.rushStunTimer > 0) {
      drawX += (Math.random() - 0.5) * 3;
      drawY += (Math.random() - 0.5) * 3;
    }

    if (this.rushState.startsWith('rushing') && this.afterimages.length > 0) {
      this.afterimages.forEach(a => {
        const alpha = a.life / 0.2;
        ctx.globalAlpha = alpha * 0.5;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(a.x, a.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }

    if (this.sprite) {
      ctx.drawImage(this.sprite, drawX - this.radius, drawY - this.radius, this.radius * 2, this.radius * 2);
    } else {
      ctx.fillStyle = this.flashTime > 0 ? '#ffffff' : this.color;
      ctx.beginPath();
      ctx.arc(drawX, drawY, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.arc(drawX, drawY, this.radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Determination Protection Visual Indicator (Faint Red Glow)
    if (this.character.abilities && this.character.abilities.determination && this.protection > 0) {
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(drawX, drawY, this.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    if (this.rushState.startsWith('charging')) {
      ctx.globalAlpha = this.chargeFlashValue * 0.6;
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(drawX, drawY, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(drawX, drawY, this.radius + 12, this.rushAngle - 0.7, this.rushAngle + 0.7);
      ctx.stroke();
    }

    if (this.rushStunTimer > 0) {
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(drawX, drawY, this.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (this.shieldActive) {
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(drawX, drawY, this.radius + 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Void Meter Visual Indicator (Full)
    if (this.character.abilities && this.character.abilities.void_meter && this.voidMeter >= 100 && !this.voidExhausted) {
      ctx.strokeStyle = '#4b0082';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(drawX, drawY, this.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Void Beam Charging Visuals
    if (this.voidBeamState === 'charging') {
      const progress = 1 - (this.voidBeamChargeTime / this.voidBeamMaxChargeTime);
      // Glow gets brighter
      ctx.globalAlpha = 0.3 + progress * 0.5;
      ctx.fillStyle = '#4b0082';
      ctx.beginPath();
      ctx.arc(drawX, drawY, this.radius + 5 + progress * 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      
      // Blinking Targeting Indicator
      const blinkSpeed = 2 + progress * 12;
      const blinkVal = (Math.sin(this.voidBeamChargeFlash * blinkSpeed * Math.PI * 2) + 1) / 2;
      ctx.globalAlpha = blinkVal * 0.8;
      ctx.strokeStyle = '#9b30ff';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(drawX, drawY);
      ctx.lineTo(drawX + Math.cos(this.voidBeamAngle) * 1000, drawY + Math.sin(this.voidBeamAngle) * 1000);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    if (this.character.abilities && this.character.abilities.knife && this.attackTime > 0) {
      const angle = this.attackAngle;
      ctx.save();
      ctx.translate(drawX, drawY);
      ctx.rotate(angle);
      const progress = 1 - (this.attackTime / 0.3);
      const swing = Math.sin(progress * Math.PI);
      const swingAngle = -0.8 + progress * 1.6;
      ctx.strokeStyle = `rgba(255, 255, 255, ${swing * 0.8})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 16, -0.8, 0.8);
      ctx.stroke();
      ctx.rotate(swingAngle);
      ctx.fillStyle = '#4a3010';
      ctx.fillRect(this.radius - 2, -3, 8, 6);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(this.radius - 2, -3, 8, 6);
      ctx.fillStyle = '#888888';
      ctx.fillRect(this.radius + 5, -5, 3, 10);
      ctx.strokeRect(this.radius + 5, -5, 3, 10);
      ctx.fillStyle = '#e0e0e0';
      ctx.beginPath();
      ctx.moveTo(this.radius + 8, -4);
      ctx.lineTo(this.radius + 26, 0);
      ctx.lineTo(this.radius + 8, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  drawHpBar(ctx) {
    if (!this.alive) return;
    const w = 64, h = 6;
    const x = this.x - w / 2;
    let y = this.y - this.radius - 22;

    // Draw Determination Protection Bar above HP
    if (this.protection > 0) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
      const protPct = this.protection / this.maxProtection;
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(x, y, Math.max(0, w * protPct), h);
      y -= h + 4; // Move HP bar up
    }

    ctx.fillStyle = '#000000';
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    const pct = this.hp / this.maxHp;
    let hpColor = '#44dd44';
    if (pct <= 0.25) hpColor = '#dd4444';
    else if (pct <= 0.5) hpColor = '#ddaa44';
    ctx.fillStyle = hpColor;
    ctx.fillRect(x, y, Math.max(0, w * pct), h);
    
    // Text with 1.5px outline
    ctx.font = "bold 14px 'IDVERSOFont', Arial, sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#000000';
    ctx.lineJoin = 'round';
    ctx.strokeText(this.name, this.x, y - 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(this.name, this.x, y - 4);
  }
}