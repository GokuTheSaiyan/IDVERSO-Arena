// ============================================================
//  CLASS: Particle
// ============================================================
class Particle {
  constructor(x, y, vx, vy, color, life, size) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.color = color;
    this.life = life;
    this.maxLife = life;
    this.size = size;
  }
  update(dt) {
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.vx *= 0.92; this.vy *= 0.92;
    this.life -= dt;
  }
  draw(ctx) {
    const a = Math.max(0, this.life / this.maxLife);
    ctx.globalAlpha = a;
    ctx.fillStyle = this.color;
    const s = this.size;
    ctx.fillRect(this.x - s/2, this.y - s/2, s, s);
    ctx.globalAlpha = 1;
  }
}

// ============================================================
//  CLASS: DamageNumber
// ============================================================
class DamageNumber {
  constructor(x, y, value, color) {
    this.x = x; this.y = y;
    this.value = value;
    this.color = color;
    this.life = 0.8; this.maxLife = 0.8;
    this.vy = -60;
  }
  update(dt) { this.y += this.vy * dt; this.vy *= 0.94; this.life -= dt; }
  draw(ctx) {
    const a = Math.max(0, this.life / this.maxLife);
    ctx.globalAlpha = a;
    ctx.font = "bold 20px 'IDVERSOFont', Arial, sans-serif";
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const text = typeof this.value === 'number' ? '-' + this.value : this.value;
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#000000';
    ctx.lineJoin = 'round';
    ctx.strokeText(text, this.x, this.y);
    ctx.fillStyle = this.color;
    ctx.fillText(text, this.x, this.y);
    ctx.globalAlpha = 1;
  }
}

// ============================================================
//  CLASS: CombatText
// ============================================================
class CombatText {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.life = 0.8;
    this.maxLife = 0.8;
    this.vy = -40;
    this.scale = 1.3;
    this.sprite = CombatText.sprites[type] || null;
  }
  update(dt) {
    this.y += this.vy * dt;
    this.vy *= 0.96;
    this.life -= dt;
    const elapsed = this.maxLife - this.life;
    if (elapsed < 0.15) {
      this.scale = 1.3 - (0.3 * (elapsed / 0.15));
    } else {
      this.scale = 1.0;
    }
  }
  draw(ctx) {
    let alpha = 1.0;
    if (this.life < 0.3) {
      alpha = this.life / 0.3;
    }
    ctx.globalAlpha = Math.max(0, alpha);
    if (this.sprite) {
      const w = this.sprite.width * this.scale;
      const h = this.sprite.height * this.scale;
      ctx.drawImage(this.sprite, this.x - w/2, this.y - h/2, w, h);
    } else {
      ctx.font = "bold 24px 'IDVERSOFont', Arial, sans-serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#000000';
      ctx.lineJoin = 'round';
      const text = this.type.toUpperCase() + '!';
      ctx.strokeText(text, this.x, this.y);
      let color = '#ffffff';
      if (this.type === 'blocked') color = '#ff0000';
      else if (this.type === 'hit') color = '#ffaa00';
      else if (this.type === 'critical') color = '#ff00ff';
      ctx.fillStyle = color;
      ctx.fillText(text, this.x, this.y);
    }
    ctx.globalAlpha = 1;
  }
}
CombatText.sprites = {};

// ============================================================
//  CLASS: HateSlash
// ============================================================
class HateSlash {
  constructor(x, y, targetX, targetY, owner, hateAmount) {
    this.x = x; this.y = y;
    const angle = Math.atan2(targetY - y, targetX - x);
    const speed = 650;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.angle = angle;
    this.life = 2.0;
    this.owner = owner;
    this.hateAmount = hateAmount;
    this.scale = hateAmount / 100;
    this.trail = [];
    this.damage = 6 + hateAmount * 0.06;
    this.knockback = 200 + hateAmount * 3;
  }
  update(dt) {
    this.trail.push({ x: this.x, y: this.y, life: 0.4 });
    if (this.trail.length > 15 + this.scale * 15) this.trail.shift();
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.life -= dt;
    this.trail.forEach(t => t.life -= dt);
  }
  draw(ctx) {
    ctx.lineCap = 'round';
    for (let i = 0; i < this.trail.length - 1; i++) {
      const t1 = this.trail[i]; const t2 = this.trail[i+1];
      const alpha = Math.max(0, t1.life / 0.4);
      ctx.strokeStyle = `rgba(10, 10, 10, ${alpha * 0.9})`;
      ctx.lineWidth = (12 * (i / this.trail.length)) * (0.5 + this.scale * 1.5);
      ctx.beginPath(); ctx.moveTo(t1.x, t1.y); ctx.lineTo(t2.x, t2.y); ctx.stroke();
    }
    ctx.save();
    ctx.translate(this.x, this.y); ctx.rotate(this.angle);
    const s = 0.5 + this.scale * 1.5;
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.moveTo(-14 * s, -12 * s);
    ctx.quadraticCurveTo(14 * s, 0, -14 * s, 12 * s);
    ctx.quadraticCurveTo(0, 0, -14 * s, -12 * s);
    ctx.fill();
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1.5 * s;
    ctx.stroke();
    ctx.restore();
  }
}

// ============================================================
//  CLASS: VoidBeam
// ============================================================
class VoidBeam {
  constructor(x, y, angle, owner, arena) {
    this.x = x; this.y = y;
    this.angle = angle;
    this.owner = owner;
    this.arena = arena;
    this.life = 0.8;
    this.maxLife = 0.8;
    this.damage = 20;
    this.knockback = 600;
    this.baseWidth = 90;
    this.length = 1500;
    this.hitTargets = new Set();
    this.riftSpawned = false;
  }
  
  isHitboxActive() {
    const elapsed = this.maxLife - this.life;
    return elapsed < 0.5;
  }
  
  update(dt) {
    this.life -= dt;
  }
  
  draw(ctx) {
    const elapsed = this.maxLife - this.life;
    let currentWidth = 0;
    let alpha = 0.9;
    if (elapsed < 0.2) {
      const t = elapsed / 0.2;
      currentWidth = 10 + (this.baseWidth * 1.5 - 10) * t;
    } else if (elapsed < 0.5) {
      const t = (elapsed - 0.2) / 0.3;
      currentWidth = this.baseWidth * 1.5 - (this.baseWidth * 0.5 * t);
    } else {
      const t = (elapsed - 0.5) / 0.3;
      currentWidth = this.baseWidth * (1 - t);
      alpha = 0.9 * (1 - t);
    }
    currentWidth = Math.max(0, currentWidth);
    alpha = Math.max(0, alpha);
    
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = '#4b0082';
    ctx.fillRect(0, -currentWidth/2, this.length, currentWidth);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, -currentWidth/4, this.length, currentWidth/2);
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

// ============================================================
//  CLASS: VoidRift
// ============================================================
class VoidRift {
  constructor(x, y, angle, owner, arena) {
    this.x = x; this.y = y;
    this.angle = angle;
    this.owner = owner;
    this.arena = arena;
    this.life = 2.5;
    this.maxLife = 2.5;
    this.damageTimer = 0;
    this.width = 30;
    this.damage = 2;
    this.length = 1500;
    this.flickerTimer = 0;
  }
  
  update(dt) {
    this.life -= dt;
    this.damageTimer -= dt;
    this.flickerTimer += dt;
  }
  
  checkHit(target) {
    if (target.x < this.arena.x || target.x > this.arena.x + this.arena.size || 
        target.y < this.arena.y || target.y > this.arena.y + this.arena.size) return false;
    
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const cos = Math.cos(-this.angle);
    const sin = Math.sin(-this.angle);
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;
    return Math.abs(localX) < this.length / 2 && Math.abs(localY) < this.width / 2 + target.radius;
  }
  
  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    const width = this.width * (0.5 + 0.5 * alpha);
    const flicker = (Math.sin(this.flickerTimer * 15) + 1) / 2;
    
    ctx.save();
    ctx.globalAlpha = alpha * (0.5 + flicker * 0.3);
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    
    ctx.fillStyle = '#2c233b';
    ctx.fillRect(0, -width/2, this.length, width);
    
    ctx.fillStyle = '#080212';
    ctx.fillRect(0, -width/4, this.length, width/2);
    
    ctx.strokeStyle = `rgba(202, 3, 252, ${alpha * 0.8})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -width/2);
    ctx.lineTo(this.length, -width/2);
    ctx.moveTo(0, width/2);
    ctx.lineTo(this.length, width/2);
    ctx.stroke();
    
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

// ============================================================
//  HELPER: distToSegment
// ============================================================
function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx*dx + dy*dy;
  if (l2 === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = ax + t * dx;
  const projY = ay + t * dy;
  return Math.hypot(px - projX, py - projY);
}

// ============================================================
//  CLASS: SliceWarning
// ============================================================
class SliceWarning {
  constructor(x, y, angle, owner, duration) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.owner = owner;
    this.life = duration;
    this.maxLife = duration;
    this.flashTimer = 0;
    this.spawned = false;
  }
  update(dt, game) {
    if (this.spawned) return;
    this.life -= dt;
    this.flashTimer += dt;
    if (this.life <= 0) {
      this.spawned = true;
      game.spawnSlice(this.owner, this.x, this.y, this.angle);
      const angleDeg = Math.round(this.angle * 180 / Math.PI);
      game.log(`Slice executed at ${angleDeg}°.`);
      Sound.sliceAttack(this.owner.character.assetFolder);
    }
  }
  draw(ctx) {
    if (this.spawned) return;
    const flashSpeed = 10;
    const flashVal = Math.floor(this.flashTimer * flashSpeed) % 2;
    const color = flashVal === 0 ? '#ff0000' : '#ffff00';
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle - Math.PI / 2);
    ctx.font = "bold 56px 'IDVERSOFont', Arial, sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.strokeText('!', 0, 0);
    ctx.fillText('!', 0, 0);
    ctx.restore();
  }
}

// ============================================================
//  CLASS: SliceAttack
// ============================================================
class SliceAttack {
  constructor(x, y, angle, arenaSize, owner) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.owner = owner;
    const arenaDiagonal = arenaSize * Math.SQRT2;
    this.length = arenaDiagonal * 10; 
    this.baseWidth = 60;
    this.damage = 8;
    this.knockback = 300;
    this.totalLife = 0.6;
    this.life = 0.6;
    this.expandTime = 0.1;
    this.activeTime = 0.2;
    this.collapseTime = 0.3;
    this.hitTargets = new Set();
  }
  isHitboxActive() {
    const elapsed = this.totalLife - this.life;
    return elapsed < (this.expandTime + this.activeTime);
  }
  update(dt) {
    this.life -= dt;
  }
  checkHit(target) {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const cos = Math.cos(-this.angle);
    const sin = Math.sin(-this.angle);
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;
    return Math.abs(localX) < this.length / 2 && Math.abs(localY) < this.baseWidth / 2 + target.radius;
  }
  getKnockback(target) {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const sin = Math.sin(this.angle);
    const cos = Math.cos(this.angle);
    const localY = dx * sin + dy * cos;
    const side = localY > 0 ? 1 : -1;
    return {
      vx: -sin * side * this.knockback,
      vy: cos * side * this.knockback
    };
  }
  draw(ctx) {
    const elapsed = this.totalLife - this.life;
    let currentWidth = 0;
    let alpha = 1.0;
    if (elapsed < this.expandTime) {
      const t = elapsed / this.expandTime;
      currentWidth = this.baseWidth * t;
    } else if (elapsed < this.expandTime + this.activeTime) {
      currentWidth = this.baseWidth;
    } else {
      const t = (elapsed - (this.expandTime + this.activeTime)) / this.collapseTime;
      currentWidth = this.baseWidth * (1 - t);
      alpha = 1.0 - t;
    }
    currentWidth = Math.max(0, currentWidth);
    alpha = Math.max(0, alpha);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#000000';
    ctx.fillRect(-this.length / 2, -currentWidth / 2, this.length, currentWidth);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(-this.length / 2, -currentWidth / 2, this.length, currentWidth);
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

// ============================================================
//  CLASS: Summon
// ============================================================
class Summon {
  constructor(x, y, type, owner, target) {
    this.x = x; this.y = y;
    this.type = type;
    this.owner = owner;
    this.target = target;
    this.color = '#080212';
    if (type === 'scout') {
      this.radius = 18;
      this.speed = 275;
      this.damage = 2;
      this.hp = 1;
      this.maxHp = 1;
    } else {
      this.radius = 36;
      this.speed = 200;
      this.damage = 3;
      this.hp = 2;
      this.maxHp = 2;
    }
    this.alive = true;
    this.flashTime = 0;
    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;
  }
  update(dt, arena) {
    if (!this.alive) return;
    if (this.target && this.target.alive) {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.1) {
        const steerForce = 150;
        this.vx += (dx / dist) * steerForce * dt;
        this.vy += (dy / dist) * steerForce * dt;
      }
    }
    const m = Math.hypot(this.vx, this.vy);
    if (m > 0.001) {
      this.vx = (this.vx / m) * this.speed;
      this.vy = (this.vy / m) * this.speed;
    } else {
      const angle = Math.random() * Math.PI * 2;
      this.vx = Math.cos(angle) * this.speed;
      this.vy = Math.sin(angle) * this.speed;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.x - this.radius < arena.x) { this.x = arena.x + this.radius; this.vx = Math.abs(this.vx); }
    if (this.x + this.radius > arena.x + arena.size) { this.x = arena.x + arena.size - this.radius; this.vx = -Math.abs(this.vx); }
    if (this.y - this.radius < arena.y) { this.y = arena.y + this.radius; this.vy = Math.abs(this.vy); }
    if (this.y + this.radius > arena.y + arena.size) { this.y = arena.y + arena.size - this.radius; this.vy = -Math.abs(this.vy); }
    if (this.flashTime > 0) this.flashTime -= dt;
  }
  takeDamage(amount) {
    this.hp -= amount;
    this.flashTime = 0.15;
    if (this.hp <= 0) this.alive = false;
  }
  draw(ctx) {
    if (!this.alive) return;
    ctx.fillStyle = this.flashTime > 0 ? '#ffffff' : this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4b0082';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}