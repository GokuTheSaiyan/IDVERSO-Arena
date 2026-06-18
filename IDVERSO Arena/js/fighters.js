// ============================================================
//  SPRITE MANAGER
//  Attempts to load character sprites. Falls back to shapes.
// ============================================================
class SpriteManager {
  constructor() {
    this.cache = {};
  }

  loadSprite(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.cache[url] = img;
        resolve(img);
      };
      img.onerror = () => {
        this.cache[url] = null;
        resolve(null);
      };
      img.src = url;
    });
  }

  async getSprite(charFolder, name) {
    if (!charFolder) return null;
    const url = `sprites/${charFolder}/${name}.png`;
    if (this.cache[url] === undefined) {
      await this.loadSprite(url);
    }
    return this.cache[url];
  }
}

const Sprites = new SpriteManager();

// ============================================================
//  CLASS: Fighter
//  Created from roster data. Fully generic.
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

    this.x = x;
    this.y = y;
    this.radius = character.size || 36;
    this.vx = Math.cos(angle) * this.baseSpeed;
    this.vy = Math.sin(angle) * this.baseSpeed;

    this.flashTime   = 0;
    this.hitCooldown = 0;
    this.hitsLanded  = 0;
    this.alive       = true;

    this.attackTime  = 0;
    this.attackAngle = 0;
    this.speedBoost  = 0;

    // Determination System
    this.determination = 0;
    this.shieldActive = false;
    this.detCooldown = 0;

    // Load Sprite if available
    this.sprite = null;
    if (character.assetFolder) {
      Sprites.getSprite(character.assetFolder, 'idle').then(s => this.sprite = s);
    }
  }

  triggerAttack(targetX, targetY) {
    this.attackTime  = 0.3;
    this.attackAngle = Math.atan2(targetY - this.y, targetX - this.x);
  }

  update(dt, arena, game) {
    if (!this.alive) return;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Wall bounce
    if (this.x - this.radius < arena.x) {
      this.x = arena.x + this.radius;
      this.vx = Math.abs(this.vx);
      this.vy += (Math.random() - 0.5) * 70;
    }
    if (this.x + this.radius > arena.x + arena.size) {
      this.x = arena.x + arena.size - this.radius;
      this.vx = -Math.abs(this.vx);
      this.vy += (Math.random() - 0.5) * 70;
    }
    if (this.y - this.radius < arena.y) {
      this.y = arena.y + this.radius;
      this.vy = Math.abs(this.vy);
      this.vx += (Math.random() - 0.5) * 70;
    }
    if (this.y + this.radius > arena.y + arena.size) {
      this.y = arena.y + arena.size - this.radius;
      this.vy = -Math.abs(this.vy);
      this.vx += (Math.random() - 0.5) * 70;
    }

    // Maintain speed with minimum threshold
    const m = Math.hypot(this.vx, this.vy);
    if (m > 0.001) {
      const currentSpeed = this.baseSpeed + this.speedBoost;
      this.vx = (this.vx / m) * currentSpeed;
      this.vy = (this.vy / m) * currentSpeed;
    } else {
      const angle = Math.random() * Math.PI * 2;
      this.vx = Math.cos(angle) * this.baseSpeed;
      this.vy = Math.sin(angle) * this.baseSpeed;
    }

    if (this.speedBoost > 0) {
      this.speedBoost -= dt * 250;
      if (this.speedBoost < 0) this.speedBoost = 0;
    }

    // Determination System Logic
    if (this.character.abilities && this.character.abilities.determination && this.alive) {
      if (this.detCooldown > 0) {
        this.detCooldown -= dt;
      } else if (this.shieldActive) {
        this.determination -= dt * 22;
        if (this.determination <= 0) {
          this.determination = 0;
          this.shieldActive = false;
          this.detCooldown = 2;
          game.log(`${this.name}'s Determination Shield expired`);
          Sound.shieldOff(this.character.assetFolder);
        }
      } else {
        this.determination += dt * 3;
        if (this.determination >= 100) {
          this.determination = 100;
          this.shieldActive = true;
          game.log(`${this.name} reached full Determination`);
          game.log(`${this.name} activated Determination Shield`);
          Sound.detFull(this.character.assetFolder);
          Sound.shieldOn(this.character.assetFolder);
        }
      }
    }

    if (this.flashTime > 0) this.flashTime -= dt;
    if (this.hitCooldown > 0) this.hitCooldown -= dt;
    if (this.attackTime > 0) this.attackTime -= dt;
  }

  takeDamage(amount, attacker, game) {
    if (!this.alive) return false;
    
    if (this.character.abilities && this.character.abilities.determination && this.shieldActive) {
      game.log(`${this.name} blocked an attack with Determination Shield`);
      return false;
    }
    
    this.hp = Math.max(0, this.hp - amount);
    this.flashTime = 0.15;
    
    if (this.character.abilities && this.character.abilities.determination && this.detCooldown <= 0) {
      this.determination += amount * 3;
      if (this.determination >= 100) {
        this.determination = 100;
        this.shieldActive = true;
        game.log(`${this.name} reached full Determination`);
        game.log(`${this.name} activated Determination Shield`);
        Sound.detFull(this.character.assetFolder);
        Sound.shieldOn(this.character.assetFolder);
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

    // Body: Draw Sprite if loaded, otherwise draw shape
    if (this.sprite) {
      ctx.drawImage(this.sprite, this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
    } else {
      ctx.fillStyle = this.flashTime > 0 ? '#ffffff' : this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Determination Shield Visual
    if (this.shieldActive) {
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Knife + slash animation
    if (this.character.abilities && this.character.abilities.knife && this.attackTime > 0) {
      const angle = this.attackAngle;
      ctx.save();
      ctx.translate(this.x, this.y);
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
    const y = this.y - this.radius - 22;

    ctx.fillStyle = '#000000';
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);

    const pct = this.hp / this.maxHp;
    let hpColor = '#44dd44';
    if (pct <= 0.25) hpColor = '#dd4444';
    else if (pct <= 0.5) hpColor = '#ddaa44';
    ctx.fillStyle = hpColor;
    ctx.fillRect(x, y, Math.max(0, w * pct), h);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(this.name, this.x, y - 4);
  }
}