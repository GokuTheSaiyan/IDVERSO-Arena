// ============================================================
//  CLASS: Particle — simple flat square, no glow
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
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= 0.92;
    this.vy *= 0.92;
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
//  CLASS: DamageNumber — floating text
// ============================================================
class DamageNumber {
  constructor(x, y, value, color) {
    this.x = x; this.y = y;
    this.value = value;
    this.color = color;
    this.life = 0.8;
    this.maxLife = 0.8;
    this.vy = -60;
  }

  update(dt) {
    this.y += this.vy * dt;
    this.vy *= 0.94;
    this.life -= dt;
  }

  draw(ctx) {
    const a = Math.max(0, this.life / this.maxLife);
    ctx.globalAlpha = a;
    ctx.fillStyle = this.color;
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const text = typeof this.value === 'number' ? '-' + this.value : this.value;
    ctx.fillText(text, this.x, this.y);
    ctx.globalAlpha = 1;
  }
}

// ============================================================
//  CLASS: HateSlash — Itami's HATE projectile
// ============================================================
class HateSlash {
  constructor(x, y, targetX, targetY, owner, hateAmount) {
    this.x = x; this.y = y;
    const angle = Math.atan2(targetY - y, targetX - x);
    const speed = 650; // Rapid but visible
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.angle = angle;
    this.life = 2.0;
    this.owner = owner;
    this.hateAmount = hateAmount;
    this.scale = hateAmount / 100; // 0.25 to 1.0
    this.trail = [];
    this.damage = 6 + hateAmount * 0.08; // Scales from 8 to 14
    this.knockback = 250 + hateAmount * 3.5; // Scales from 337 to 600
  }

  update(dt) {
    this.trail.push({ x: this.x, y: this.y, life: 0.4 });
    if (this.trail.length > 15 + this.scale * 15) this.trail.shift();
    
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    
    this.trail.forEach(t => t.life -= dt);
  }

  draw(ctx) {
    // Draw fading black trail
    ctx.lineCap = 'round';
    for (let i = 0; i < this.trail.length - 1; i++) {
      const t1 = this.trail[i];
      const t2 = this.trail[i+1];
      const alpha = Math.max(0, t1.life / 0.4);
      ctx.strokeStyle = `rgba(10, 10, 10, ${alpha * 0.9})`;
      ctx.lineWidth = (12 * (i / this.trail.length)) * (0.5 + this.scale * 1.5);
      ctx.beginPath();
      ctx.moveTo(t1.x, t1.y);
      ctx.lineTo(t2.x, t2.y);
      ctx.stroke();
    }

    // Draw core black crescent
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    
    const s = 0.5 + this.scale * 1.5; // 25% -> 0.875, 100% -> 2.0
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