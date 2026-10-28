// Toàn bộ hình ảnh của game, vẽ bằng Canvas 2D. Không dùng file ảnh nào.
// Dùng chung cho game.js và tools/export.html (xuất PNG).
(() => {
  'use strict';

  // Safari < 16 / Firefox < 112 chưa có roundRect: tự bổ sung để game chạy trên mọi trình duyệt YouTube hỗ trợ
  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      r = Math.max(0, Math.min(typeof r === 'number' ? r : 0, w / 2, h / 2));
      this.moveTo(x + r, y);
      this.arcTo(x + w, y, x + w, y + h, r);
      this.arcTo(x + w, y + h, x, y + h, r);
      this.arcTo(x, y + h, x, y, r);
      this.arcTo(x, y, x + w, y, r);
      this.closePath();
    };
  }


  function poly(ctx, pts, x, y) {
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i ? ctx.lineTo(x + px, y + py) : ctx.moveTo(x + px, y + py)));
    ctx.closePath();
  }

  function radial(ctx, x, y, r, stops) {
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
    return g;
  }

  function blob(r, n, seed) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const j = 0.85 + 0.15 * Math.sin(seed * 3.7 + i * 2.3);
      pts.push([Math.cos(a) * r * j, Math.sin(a) * r * j]);
    }
    return pts;
  }

  function gold(ctx, x, y, r, shape) {
    poly(ctx, shape || blob(r, 10, r), x, y);
    ctx.fillStyle = radial(ctx, x, y, r, ['#fff6a8', '#f4c430', '#a86b00']); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#7a4c00'; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath(); ctx.ellipse(x - r * 0.35, y - r * 0.35, r * 0.18, r * 0.1, -0.6, 0, 7); ctx.fill();
    if (r > 30) { ctx.beginPath(); ctx.ellipse(x + r * 0.25, y + r * 0.1, r * 0.1, r * 0.05, -0.6, 0, 7); ctx.fill(); }
  }

  function rock(ctx, x, y, r, shape, lava) {
    poly(ctx, shape || blob(r, 8, r + 1), x, y);
    ctx.fillStyle = radial(ctx, x, y, r, lava ? ['#5a4040', '#1e1414'] : ['#b9b2a8', '#5d564e']); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = lava ? '#110a0a' : '#3d3832'; ctx.stroke();
    ctx.strokeStyle = lava ? '#ff7a1a' : 'rgba(0,0,0,0.25)'; ctx.lineWidth = lava ? 2.5 : 2;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.5, y - r * 0.1); ctx.lineTo(x - r * 0.1, y + r * 0.2); ctx.lineTo(x + r * 0.3, y - r * 0.15);
    if (lava) { ctx.moveTo(x - r * 0.1, y + r * 0.2); ctx.lineTo(x, y + r * 0.55); }
    ctx.stroke();
  }

  function diamond(ctx, x, y, r, fill, line, t) {
    ctx.beginPath();
    ctx.moveTo(x - r, y - r * 0.3); ctx.lineTo(x - r * 0.5, y - r); ctx.lineTo(x + r * 0.5, y - r);
    ctx.lineTo(x + r, y - r * 0.3); ctx.lineTo(x, y + r * 1.1); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = line; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - r, y - r * 0.3); ctx.lineTo(x + r, y - r * 0.3);
    ctx.moveTo(x - r * 0.5, y - r); ctx.lineTo(x, y + r * 1.1); ctx.lineTo(x + r * 0.5, y - r); ctx.stroke();
    sparkle(ctx, x + r * 0.6, y - r, (Math.sin(t * 5 + x) + 1) / 2);
  }

  function sparkle(ctx, x, y, a) {
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.beginPath();
    ctx.moveTo(x, y - 5); ctx.lineTo(x + 1.3, y - 1.3); ctx.lineTo(x + 5, y); ctx.lineTo(x + 1.3, y + 1.3);
    ctx.lineTo(x, y + 5); ctx.lineTo(x - 1.3, y + 1.3); ctx.lineTo(x - 5, y); ctx.lineTo(x - 1.3, y - 1.3);
    ctx.fill();
  }

  function ruby(ctx, x, y, r, t) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + Math.PI / 6; ctx.lineTo(x + Math.cos(a) * r * 1.1, y + Math.sin(a) * r * 1.1); }
    ctx.closePath();
    ctx.fillStyle = radial(ctx, x, y, r * 1.1, ['#ff9aa8', '#e0193a', '#7a0018']); ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#5a0010'; ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + Math.PI / 6; ctx.lineTo(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55); }
    ctx.closePath(); ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.stroke();
    sparkle(ctx, x - r * 0.5, y - r * 0.7, (Math.sin(t * 4 + y) + 1) / 2);
  }

  function crystal(ctx, x, y, r, t) {
    const prism = (dx, h, w, a) => {
      ctx.save(); ctx.translate(x + dx, y + r * 0.6); ctx.rotate(a);
      ctx.beginPath(); ctx.moveTo(-w, 0); ctx.lineTo(-w, -h); ctx.lineTo(0, -h - w * 1.2); ctx.lineTo(w, -h); ctx.lineTo(w, 0); ctx.closePath();
      ctx.fillStyle = '#b07aff'; ctx.fill(); ctx.strokeStyle = '#4b2286'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-w + 2, -h, w * 0.5, h - 2);
      ctx.restore();
    };
    prism(-r * 0.5, r * 0.9, r * 0.28, -0.35);
    prism(r * 0.5, r * 0.8, r * 0.26, 0.35);
    prism(0, r * 1.25, r * 0.34, 0);
    ctx.fillStyle = '#5d4a3a'; ctx.beginPath(); ctx.ellipse(x, y + r * 0.65, r * 0.9, r * 0.25, 0, 0, 7); ctx.fill();
    sparkle(ctx, x + r * 0.1, y - r * 0.6, (Math.sin(t * 3 + x) + 1) / 2);
  }

  function bag(ctx, x, y, r) {
    ctx.fillStyle = '#9b6b3c'; ctx.strokeStyle = '#5a3a1c'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, y + r * 0.15, r, r * 0.85, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - r * 0.4, y - r * 0.6); ctx.lineTo(x - r * 0.25, y - r * 1.05);
    ctx.lineTo(x + r * 0.25, y - r * 1.05); ctx.lineTo(x + r * 0.4, y - r * 0.6); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#d9a441'; ctx.beginPath(); ctx.moveTo(x - r * 0.42, y - r * 0.62); ctx.lineTo(x + r * 0.42, y - r * 0.62); ctx.stroke();
    ctx.fillStyle = '#ffe9a8'; ctx.font = `bold ${r}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('?', x, y + r * 0.2);
  }

  function bone(ctx, x, y, r, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.fillStyle = '#f4ecd8'; ctx.strokeStyle = '#8a7d63'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.rect(-r * 0.75, -r * 0.18, r * 1.5, r * 0.36); ctx.fill(); ctx.stroke();
    for (const s of [-1, 1]) for (const k of [-1, 1]) {
      ctx.beginPath(); ctx.arc(s * r * 0.8, k * r * 0.2, r * 0.25, 0, 7); ctx.fill(); ctx.stroke();
    }
    ctx.fillRect(-r * 0.74, -r * 0.16, r * 1.48, r * 0.32);
    ctx.restore();
  }

  function skull(ctx, x, y, r) {
    ctx.fillStyle = '#f4ecd8'; ctx.strokeStyle = '#8a7d63'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, y - r * 0.15, r, Math.PI * 0.85, Math.PI * 2.15); ctx.lineTo(x + r * 0.5, y + r * 0.9); ctx.lineTo(x - r * 0.5, y + r * 0.9); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#3a2f22';
    ctx.beginPath(); ctx.ellipse(x - r * 0.38, y - r * 0.1, r * 0.25, r * 0.3, 0, 0, 7); ctx.ellipse(x + r * 0.38, y - r * 0.1, r * 0.25, r * 0.3, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x, y + r * 0.2); ctx.lineTo(x - r * 0.12, y + r * 0.42); ctx.lineTo(x + r * 0.12, y + r * 0.42); ctx.fill();
    ctx.strokeStyle = '#3a2f22';
    for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(x + k * r * 0.17, y + r * 0.6); ctx.lineTo(x + k * r * 0.17, y + r * 0.88); ctx.stroke(); }
  }

  function fossil(ctx, x, y, r) {
    ctx.fillStyle = radial(ctx, x, y, r, ['#e9d9b5', '#b49a6c']); ctx.strokeStyle = '#6e5a3a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.85, 0.2, 0, 7); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#7d6440'; ctx.lineWidth = 2.5; ctx.beginPath();
    for (let a = 0; a < Math.PI * 5; a += 0.15) {
      const rr = r * 0.72 * (1 - a / (Math.PI * 5.4));
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.9;
      a ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.stroke();
  }

  function iceGold(ctx, x, y, r) {
    gold(ctx, x, y, r * 0.55, null);
    ctx.fillStyle = 'rgba(190,230,255,0.55)'; ctx.strokeStyle = '#e8f7ff'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.roundRect(x - r, y - r * 0.9, r * 2, r * 1.8, r * 0.3); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x - r * 0.7, y - r * 0.55); ctx.lineTo(x - r * 0.3, y - r * 0.7); ctx.stroke();
  }

  function clam(ctx, x, y, r, open) {
    const o = open ? 0.55 : 0.05;
    ctx.fillStyle = '#e8a0b4'; ctx.strokeStyle = '#8a4a5a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, y + r * 0.2, r, r * 0.55, 0, 0, Math.PI); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (open) {
      ctx.fillStyle = radial(ctx, x, y + r * 0.1, r * 0.35, ['#ffffff', '#e8e4f4', '#a9a2c4']);
      ctx.beginPath(); ctx.arc(x, y + r * 0.1, r * 0.33, 0, 7); ctx.fill();
    }
    ctx.save(); ctx.translate(x - r, y + r * 0.2); ctx.rotate(-o);
    ctx.fillStyle = '#f2b6c6'; ctx.strokeStyle = '#8a4a5a';
    ctx.beginPath(); ctx.ellipse(r, 0, r, r * 0.6, 0, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 1.2;
    for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(r + k * r * 0.35, -r * 0.5 + Math.abs(k) * r * 0.08); ctx.stroke(); }
    ctx.restore();
  }

  function chest(ctx, x, y, r) {
    const w = r * 1.7, h = r * 1.2;
    ctx.fillStyle = '#8b5a2b'; ctx.strokeStyle = '#3e2410'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(x - w / 2, y - h * 0.15, w, h * 0.65, 3); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - w / 2, y - h * 0.15); ctx.quadraticCurveTo(x, y - h * 0.75, x + w / 2, y - h * 0.15); ctx.closePath();
    ctx.fillStyle = '#a06a35'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e8c140';
    ctx.fillRect(x - w / 2 + 4, y - h * 0.4, 6, h * 0.9); ctx.fillRect(x + w / 2 - 10, y - h * 0.4, 6, h * 0.9);
    ctx.fillRect(x - 6, y - h * 0.22, 12, 14);
    ctx.fillStyle = '#3e2410'; ctx.fillRect(x - 2, y - h * 0.12, 4, 6);
    gold(ctx, x - w * 0.22, y - h * 0.3, 5); gold(ctx, x + w * 0.18, y - h * 0.32, 4);
  }

  function anchor(ctx, x, y, r) {
    ctx.strokeStyle = '#5c6670'; ctx.lineWidth = r * 0.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y - r * 0.75); ctx.lineTo(x, y + r * 0.8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - r * 0.45, y - r * 0.4); ctx.lineTo(x + r * 0.45, y - r * 0.4); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y + r * 0.1, r * 0.75, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
    ctx.lineWidth = r * 0.12; ctx.beginPath(); ctx.arc(x, y - r * 0.9, r * 0.18, 0, 7); ctx.stroke();
    ctx.lineCap = 'butt';
  }

  function tnt(ctx, x, y, r, t) {
    ctx.fillStyle = '#c62828'; ctx.strokeStyle = '#4a0d0d'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(x - r, y - r * 0.85, r * 2, r * 1.7, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#4a0d0d'; ctx.fillRect(x - r, y - r * 0.5, r * 2, 3); ctx.fillRect(x - r, y + r * 0.4, r * 2, 3);
    ctx.fillStyle = '#fff3c4'; ctx.font = `bold ${r * 0.7}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('TNT', x, y);
    ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - r * 0.85); ctx.quadraticCurveTo(x + 6, y - r * 1.3, x + 2, y - r * 1.5); ctx.stroke();
    ctx.fillStyle = Math.sin(t * 20) > 0 ? '#ffd23f' : '#ff7a1a'; ctx.beginPath(); ctx.arc(x + 2, y - r * 1.5, 3, 0, 7); ctx.fill();
  }

  function lizard(ctx, x, y, r, dir, t, carry) {
    ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
    const leg = Math.sin(t * 14) * 4;
    ctx.strokeStyle = '#2e6b2a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-r * 0.4, 0); ctx.lineTo(-r * 0.6 + leg, r * 0.55); ctx.moveTo(r * 0.3, 0); ctx.lineTo(r * 0.5 - leg, r * 0.55);
    ctx.moveTo(-r * 0.4, 0); ctx.lineTo(-r * 0.6 - leg, -r * 0.55); ctx.moveTo(r * 0.3, 0); ctx.lineTo(r * 0.5 + leg, -r * 0.55); ctx.stroke();
    ctx.fillStyle = '#58b04a';
    ctx.beginPath(); ctx.moveTo(-r * 0.7, 0); ctx.quadraticCurveTo(-r * 1.4, r * 0.1, -r * 1.7, -r * 0.3); ctx.quadraticCurveTo(-r * 1.3, r * 0.25, -r * 0.7, r * 0.25); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.8, r * 0.35, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#2e6b2a'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(r * 0.95, -r * 0.05, r * 0.38, r * 0.28, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(r * 1.05, -r * 0.15, 2, 0, 7); ctx.fill();
    ctx.lineCap = 'butt';
    ctx.restore();
    if (carry) diamond(ctx, x + dir * r * 1.45, y, 6, '#9fe8ff', '#2a8fb5', t);
  }

  function bat(ctx, x, y, r, t) {
    const f = Math.sin(t * 16) * 0.6;
    ctx.fillStyle = '#4a3a66';
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + s * r * 1.2, y - r * (0.9 + f), x + s * r * 2, y - r * 0.2 * f);
      ctx.quadraticCurveTo(x + s * r * 1.5, y + r * 0.1, x + s * r * 1.3, y + r * 0.4);
      ctx.quadraticCurveTo(x + s * r * 0.9, y + r * 0.1, x, y + r * 0.3); ctx.fill();
    }
    ctx.beginPath(); ctx.ellipse(x, y, r * 0.5, r * 0.6, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - r * 0.35, y - r * 0.4); ctx.lineTo(x - r * 0.25, y - r * 0.85); ctx.lineTo(x - r * 0.05, y - r * 0.5);
    ctx.moveTo(x + r * 0.35, y - r * 0.4); ctx.lineTo(x + r * 0.25, y - r * 0.85); ctx.lineTo(x + r * 0.05, y - r * 0.5); ctx.fill();
    ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(x - r * 0.18, y - r * 0.15, 2, 0, 7); ctx.arc(x + r * 0.18, y - r * 0.15, 2, 0, 7); ctx.fill();
  }

  function penguin(ctx, x, y, r, dir, t) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 8) * 0.12);
    ctx.fillStyle = '#ff9a1a'; ctx.fillRect(-r * 0.45, r * 0.85, r * 0.35, r * 0.15); ctx.fillRect(r * 0.1, r * 0.85, r * 0.35, r * 0.15);
    ctx.fillStyle = '#23262e'; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.75, r * 0.95, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#f7f7f7'; ctx.beginPath(); ctx.ellipse(r * 0.1 * dir, r * 0.15, r * 0.5, r * 0.7, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(r * 0.25 * dir, -r * 0.45, 2, 0, 7); ctx.fill();
    ctx.fillStyle = '#ff9a1a'; ctx.beginPath(); ctx.moveTo(r * 0.45 * dir, -r * 0.35); ctx.lineTo(r * 0.85 * dir, -r * 0.25); ctx.lineTo(r * 0.45 * dir, -r * 0.15); ctx.fill();
    ctx.restore();
  }

  function fish(ctx, x, y, r, dir, t, carry) {
    ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
    const w = Math.sin(t * 10) * 0.25;
    ctx.fillStyle = '#ff8a3d';
    ctx.beginPath(); ctx.moveTo(-r * 0.8, 0); ctx.lineTo(-r * 1.5, -r * (0.6 + w)); ctx.lineTo(-r * 1.5, r * (0.6 - w)); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.6, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#a84a12'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillRect(-r * 0.2, -r * 0.55, r * 0.18, r * 1.1);
    ctx.beginPath(); ctx.arc(r * 0.5, -r * 0.15, 3, 0, 7); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(r * 0.55, -r * 0.15, 1.5, 0, 7); ctx.fill();
    ctx.restore();
    if (carry) diamond(ctx, x + dir * r * 1.2, y + 2, 6, '#9fe8ff', '#2a8fb5', t);
  }

  // ---------- Sprite từ asset pack A (img/sprites/*.png) ----------
  // Có sprite thì vẽ sprite, chưa có (hoặc tải lỗi) thì dùng hình vẽ bằng code bên dưới.
  const SPRITES = [
    'miner_idle', 'miner_pull1', 'miner_pull2', 'miner_pull3', 'miner_pull4', 'miner_happy',
    'winch', 'platform', 'hook_open', 'hook_closed',
    'goldS', 'goldM', 'goldL', 'rockS', 'rockL', 'lavaRock', 'diamond', 'ruby', 'crystal', 'bag',
    'bone', 'skull', 'fossil', 'iceGold', 'clam_open', 'clam_closed', 'chest', 'anchor', 'tnt', 'gem_small',
    'lizard1', 'lizard2', 'lizard3', 'lizard4', 'bat1', 'bat2', 'bat3', 'penguin1', 'penguin2', 'penguin3',
    'fish1', 'fish2', 'fish3', 'star', 'lock', 'icon_pause', 'icon_music', 'icon_home', 'icon_left', 'icon_right',
    'dynamite', 'badge_bonus', 'badge_boss', 'boom1', 'boom2', 'boom3', 'boom4',
  ];
  const SPR = {};
  function loadSprites(base = 'img/sprites/') {
    return Promise.all(SPRITES.map(n => new Promise(res => {
      const im = new Image();
      im.onload = () => { SPR[n] = im; res(); };
      im.onerror = () => res();
      im.src = base + n + '.png';
    })));
  }
  const spr = (n) => SPR[n];

  // Vẽ ảnh căn giữa tại (x, y), cạnh dài nhất = size
  function blit(ctx, im, x, y, size, flip = false, rot = 0) {
    const k = size / Math.max(im.width, im.height), w = im.width * k, h = im.height * k;
    ctx.save(); ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(im, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  // loại vật -> [tên sprite (hoặc danh sách khung), hệ số kích thước so với đường kính]
  const ITEM_SPRITE = {
    goldS: ['goldS', 1.25], goldM: ['goldM', 1.2], goldL: ['goldL', 1.15], goldXL: ['goldL', 1.15],
    rockS: ['rockS', 1.2], rockL: ['rockL', 1.15], lavaRock: ['lavaRock', 1.15],
    diamond: ['diamond', 1.6], ruby: ['ruby', 1.6], crystal: ['crystal', 1.35], bag: ['bag', 1.35],
    bone: ['bone', 1.3], skull: ['skull', 1.3], fossil: ['fossil', 1.2], iceGold: ['iceGold', 1.15],
    chest: ['chest', 1.25], anchor: ['anchor', 1.25], tnt: ['tnt', 1.3],
    lizard: [['lizard1', 'lizard2', 'lizard3', 'lizard4'], 2.3], bat: [['bat1', 'bat2', 'bat3', 'bat2'], 2.5],
    penguin: [['penguin1', 'penguin2', 'penguin3', 'penguin2'], 1.7], fish: [['fish1', 'fish2', 'fish3', 'fish2'], 2.0],
  };
  const KIND_DEFAULT = { gold: 'goldM', rock: 'rockS', lava: 'lavaRock', ice: 'iceGold' };

  function drawSprite(ctx, it, t) {
    const type = it.type || KIND_DEFAULT[it.kind] || it.kind;
    if (it.kind === 'clam') {
      const im = spr(it.open ? 'clam_open' : 'clam_closed');
      if (!im) return false;
      blit(ctx, im, it.x, it.y, it.r * 2 * 1.35);
      return true;
    }
    const m = ITEM_SPRITE[type];
    if (!m) return false;
    let name = m[0];
    if (Array.isArray(name)) {
      const fps = it.kind === 'bat' ? 12 : it.kind === 'penguin' ? 5 : 8;
      name = name[Math.floor((t + (it.phase || 0)) * fps) % name.length];
    }
    const im = spr(name);
    if (!im) return false;
    const dir = it.dir || 1;
    blit(ctx, im, it.x, it.y, it.r * 2 * m[1], it.critter && dir < 0);
    if (it.carry && spr('gem_small')) blit(ctx, spr('gem_small'), it.x + dir * it.r * 1.15, it.y + it.r * 0.1, 13);
    return true;
  }

  function drawItem(ctx, it, t = 0) {
    if (drawSprite(ctx, it, t)) return;
    const { x, y, r } = it;
    switch (it.kind) {
      case 'gold': return gold(ctx, x, y, r, it.shape);
      case 'rock': return rock(ctx, x, y, r, it.shape, false);
      case 'lava': return rock(ctx, x, y, r, it.shape, true);
      case 'diamond': return diamond(ctx, x, y, r, '#9fe8ff', '#2a8fb5', t);
      case 'ruby': return ruby(ctx, x, y, r, t);
      case 'crystal': return crystal(ctx, x, y, r, t);
      case 'bag': return bag(ctx, x, y, r);
      case 'bone': return bone(ctx, x, y, r, it.rot || 0);
      case 'skull': return skull(ctx, x, y, r);
      case 'fossil': return fossil(ctx, x, y, r);
      case 'ice': return iceGold(ctx, x, y, r);
      case 'clam': return clam(ctx, x, y, r, it.open);
      case 'chest': return chest(ctx, x, y, r);
      case 'anchor': return anchor(ctx, x, y, r);
      case 'tnt': return tnt(ctx, x, y, r, t);
      case 'lizard': return lizard(ctx, x, y, r, it.dir || 1, t + (it.phase || 0), it.carry);
      case 'bat': return bat(ctx, x, y, r, t + (it.phase || 0));
      case 'penguin': return penguin(ctx, x, y, r, it.dir || 1, t + (it.phase || 0));
      case 'fish': return fish(ctx, x, y, r, it.dir || 1, t + (it.phase || 0), it.carry);
    }
  }

  // ---------- Phông nền theo thế giới (vẽ 1 lần rồi lưu đệm) ----------
  // Nhiều lớp có chiều sâu cho hợp với sprite vẽ tay: trời, mây, núi xa/gần, mặt đất, lòng đất nhiều tầng.
  function seeded(str) {
    let h = 2166136261;
    for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
  }
  function vgrad(ctx, y0, y1, stops) {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
    return g;
  }
  // dãy núi/đồi: đường gợn ngẫu nhiên có đỉnh nhọn hoặc tròn
  function ridge(ctx, R, W, base, amp, step, color, sharp, light) {
    const pts = [];
    for (let x = -step; x <= W + step; x += step) pts.push([x, base - amp * (0.35 + 0.65 * R())]);
    ctx.beginPath(); ctx.moveTo(-step, base + 400);
    pts.forEach(([x, y], i) => {
      if (sharp || i === 0) ctx.lineTo(x, y);
      else { const [px, py] = pts[i - 1]; ctx.quadraticCurveTo(px + step / 2, Math.min(py, y) - amp * 0.15, x, y); }
    });
    ctx.lineTo(W + step, base + 400); ctx.closePath();
    ctx.fillStyle = color; ctx.fill();
    if (light) { // viền sáng phía trên cho có khối
      ctx.save(); ctx.clip();
      ctx.strokeStyle = light; ctx.lineWidth = 3; ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + 2) : ctx.moveTo(x, y + 2)));
      ctx.stroke(); ctx.restore();
    }
    return pts;
  }
  function cloud(ctx, x, y, s, alpha = 0.95) {
    const g = ctx.createLinearGradient(0, y - 22 * s, 0, y + 12 * s);
    g.addColorStop(0, `rgba(255,255,255,${alpha})`); g.addColorStop(1, `rgba(214,230,245,${alpha})`);
    ctx.fillStyle = g; ctx.beginPath();
    for (const [dx, dy, r] of [[-26, 2, 13], [-10, -8, 18], [10, -12, 20], [28, -2, 14], [42, 4, 10], [0, 4, 15]]) {
      ctx.moveTo(x + dx * s + r * s, y + dy * s); ctx.arc(x + dx * s, y + dy * s, r * s, 0, 7);
    }
    ctx.fill();
  }
  function tree(ctx, x, y, s, c1, c2) {
    ctx.fillStyle = '#5b3b22'; ctx.fillRect(x - 3 * s, y - 16 * s, 6 * s, 16 * s);
    for (const [dx, dy, r, c] of [[-9, -20, 11, c2], [9, -20, 11, c2], [0, -30, 14, c1], [-6, -24, 10, c1], [7, -26, 10, c1]]) {
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, r * s, 0, 7); ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.arc(x - 4 * s, y - 34 * s, 6 * s, 0, 7); ctx.fill();
  }
  function pine(ctx, x, y, s, c, snow) {
    ctx.fillStyle = '#4a3324'; ctx.fillRect(x - 2 * s, y - 8 * s, 4 * s, 8 * s);
    for (let k = 0; k < 3; k++) {
      const w = (14 - k * 3.5) * s, top = y - (14 + k * 10) * s - 10 * s;
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x - w, y - (6 + k * 10) * s); ctx.lineTo(x, top); ctx.lineTo(x + w, y - (6 + k * 10) * s); ctx.fill();
      if (snow) { ctx.fillStyle = snow; ctx.beginPath(); ctx.moveTo(x - w * 0.45, top + 9 * s); ctx.lineTo(x, top); ctx.lineTo(x + w * 0.45, top + 9 * s); ctx.fill(); }
    }
  }
  function cactus(ctx, x, y, s) {
    ctx.fillStyle = '#4f8a3a';
    ctx.beginPath(); ctx.roundRect(x - 6 * s, y - 52 * s, 12 * s, 52 * s, 6 * s); ctx.fill();
    ctx.beginPath(); ctx.roundRect(x - 20 * s, y - 38 * s, 7 * s, 20 * s, 4 * s); ctx.roundRect(x - 20 * s, y - 23 * s, 16 * s, 7 * s, 4 * s); ctx.fill();
    ctx.beginPath(); ctx.roundRect(x + 13 * s, y - 44 * s, 7 * s, 22 * s, 4 * s); ctx.roundRect(x + 4 * s, y - 27 * s, 16 * s, 7 * s, 4 * s); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(x - 3 * s, y - 50 * s, 3 * s, 46 * s);
  }

  const THEMES = {
    meadow:  { sky: ['#5fb8f2', '#a9dcff', '#e8f6ff'], far: '#9cc4d8', mid: '#7fb36a', near: '#5f9e48', lip: '#5aa33c', lipTop: '#86cf5a',
               soil: ['#a0703f', '#7a5230', '#4d321d'], band: '#8a5f36', pebble: ['#6e5642', '#8c7a6a', '#5a4535'] },
    desert:  { sky: ['#f39a54', '#fbc884', '#fff0cf'], far: '#e9b47e', mid: '#e0a565', near: '#d39552', lip: '#e2b46e', lipTop: '#f2d08f',
               soil: ['#d9a663', '#b27d42', '#7d532a'], band: '#c48f4e', pebble: ['#9a7448', '#b8936a', '#7d5a36'] },
    cave:    { sky: ['#1a1424', '#2c2240', '#3d3052'], far: '#2a2236', mid: '#352b45', near: '#41354f', lip: '#4b3f5a', lipTop: '#6a5a7e',
               soil: ['#4a3f56', '#342b3e', '#1e1826'], band: '#3e3449', pebble: ['#2a2232', '#5c4f6c', '#3a3044'] },
    ice:     { sky: ['#7fb6ea', '#bcdcf7', '#f0f8ff'], far: '#c9dcee', mid: '#e3eef8', near: '#f6fbff', lip: '#e9f4ff', lipTop: '#ffffff',
               soil: ['#a8c4dc', '#7b9bbb', '#4c6a8a'], band: '#95b2cc', pebble: ['#6f8eab', '#c8dbec', '#5a7898'] },
    volcano: { sky: ['#2a0c0c', '#7a2416', '#e4692c'], far: '#4a1f1a', mid: '#36160f', near: '#25100b', lip: '#2c1510', lipTop: '#4a2418',
               soil: ['#4a2a22', '#2e1914', '#170c09'], band: '#3a201a', pebble: ['#1d0f0b', '#5a3a30', '#2a1712'] },
    sea:     { sky: ['#4cb4f0', '#a3dcff', '#e4f6ff'], far: '#8cc7e6', mid: '#5aa9d6', near: '#3d8fc4', lip: '#e8d39a', lipTop: '#f6e6b8',
               soil: ['#3398cc', '#1d6ea3', '#0d3f6b'], band: '#2a86bd', pebble: ['#e8d39a', '#cdb57c', '#a98f58'] },
  };

  function drawBackground(ctx, worldId, W, H, G) {
    const th = THEMES[worldId] || THEMES.meadow;
    const R = seeded(worldId);

    // ===== bầu trời / không gian phía trên =====
    ctx.fillStyle = vgrad(ctx, 0, G, th.sky); ctx.fillRect(0, 0, W, G);
    if (worldId === 'desert' || worldId === 'meadow' || worldId === 'ice' || worldId === 'sea') {
      const sx = worldId === 'desert' ? W * 0.78 : W * 0.85, sy = G * 0.28;
      const glow = ctx.createRadialGradient(sx, sy, 4, sx, sy, 90);
      glow.addColorStop(0, 'rgba(255,250,220,0.9)'); glow.addColorStop(0.25, 'rgba(255,240,190,0.45)'); glow.addColorStop(1, 'rgba(255,240,190,0)');
      ctx.fillStyle = glow; ctx.fillRect(sx - 90, sy - 90, 180, 180);
      ctx.fillStyle = '#fff8dc'; ctx.beginPath(); ctx.arc(sx, sy, worldId === 'desert' ? 22 : 16, 0, 7); ctx.fill();
    }
    if (worldId === 'meadow' || worldId === 'ice' || worldId === 'sea') {
      cloud(ctx, W * 0.15, G * 0.3, 1.0); cloud(ctx, W * 0.55, G * 0.2, 1.25); cloud(ctx, W * 0.92, G * 0.42, 0.8, 0.85);
    }
    if (worldId === 'desert') cloud(ctx, W * 0.3, G * 0.25, 0.9, 0.5);

    if (worldId === 'cave') {
      // vách hang phía xa + pha lê phát sáng
      ridge(ctx, R, W, G - 20, 50, 70, th.far, true);
      for (const [x, y, c] of [[W * 0.12, G - 26, '#b07aff'], [W * 0.86, G - 30, '#6fd6ff'], [W * 0.66, G - 18, '#b07aff']]) {
        const g = ctx.createRadialGradient(x, y, 2, x, y, 45);
        g.addColorStop(0, c + 'aa'); g.addColorStop(1, c + '00'); ctx.fillStyle = g; ctx.fillRect(x - 45, y - 45, 90, 90);
        ctx.fillStyle = c;
        for (const [dx, h, w] of [[-6, 16, 4], [0, 24, 5], [7, 14, 4]]) { ctx.beginPath(); ctx.moveTo(x + dx - w, y + 6); ctx.lineTo(x + dx, y + 6 - h); ctx.lineTo(x + dx + w, y + 6); ctx.fill(); }
      }
      ridge(ctx, R, W, G - 4, 26, 45, th.mid, true, 'rgba(255,255,255,0.06)');
      // trần hang + nhũ đá
      ctx.fillStyle = vgrad(ctx, 0, 40, ['#120d19', '#1d1628']); ctx.fillRect(0, 0, W, 30);
      for (let x = 6; x < W; x += 28 + R() * 24) {
        const h = 22 + R() * 40, w = 8 + R() * 8;
        ctx.fillStyle = '#1d1628'; ctx.beginPath(); ctx.moveTo(x - w, 28); ctx.lineTo(x, 28 + h); ctx.lineTo(x + w, 28); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.beginPath(); ctx.moveTo(x - w * 0.6, 28); ctx.lineTo(x - 1, 28 + h * 0.8); ctx.lineTo(x - w * 0.1, 28); ctx.fill();
      }
      for (const cx of [W * 0.2, W * 0.8]) {   // đèn lồng
        const g = ctx.createRadialGradient(cx, G - 42, 2, cx, G - 42, 70);
        g.addColorStop(0, 'rgba(255,190,90,0.6)'); g.addColorStop(1, 'rgba(255,190,90,0)');
        ctx.fillStyle = g; ctx.fillRect(cx - 70, G - 112, 140, 140);
        ctx.fillStyle = '#5a4a3a'; ctx.fillRect(cx - 1.5, G - 40, 3, 40);
        ctx.fillStyle = '#3a2a1a'; ctx.fillRect(cx - 7, G - 52, 14, 3);
        ctx.fillStyle = '#ffcf5a'; ctx.fillRect(cx - 5, G - 49, 10, 11);
      }
    } else if (worldId === 'volcano') {
      ridge(ctx, R, W, G - 30, 40, 60, th.far, true);
      // núi lửa
      const vx = W * 0.78;
      ctx.fillStyle = '#2a120d'; ctx.beginPath(); ctx.moveTo(vx - 130, G); ctx.lineTo(vx - 26, G - 100); ctx.lineTo(vx + 26, G - 100); ctx.lineTo(vx + 140, G); ctx.fill();
      const lava = ctx.createLinearGradient(0, G - 100, 0, G - 40);
      lava.addColorStop(0, '#ffd04a'); lava.addColorStop(1, '#ff4d1a');
      ctx.fillStyle = lava; ctx.beginPath(); ctx.moveTo(vx - 26, G - 100); ctx.lineTo(vx + 26, G - 100); ctx.lineTo(vx + 10, G - 60); ctx.lineTo(vx + 16, G - 30); ctx.lineTo(vx - 2, G - 62); ctx.lineTo(vx - 14, G - 52); ctx.fill();
      for (const [dx, dy, r] of [[0, -118, 16], [-14, -136, 20], [10, -150, 24], [-4, -172, 28]]) {
        ctx.fillStyle = 'rgba(70,50,50,0.55)'; ctx.beginPath(); ctx.arc(vx + dx, G + dy, r, 0, 7); ctx.fill();
      }
      const glow = ctx.createRadialGradient(vx, G - 100, 4, vx, G - 100, 120);
      glow.addColorStop(0, 'rgba(255,120,40,0.45)'); glow.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = glow; ctx.fillRect(vx - 120, G - 220, 240, 240);
      ridge(ctx, R, W, G - 6, 22, 40, th.mid, true, 'rgba(255,120,60,0.25)');
    } else if (worldId === 'sea') {
      // biển xa + đảo nhỏ
      ctx.fillStyle = vgrad(ctx, G - 46, G, ['#4aa3d8', '#2f86c0']); ctx.fillRect(0, G - 46, W, 46);
      ctx.fillStyle = '#7fb06a'; ctx.beginPath(); ctx.ellipse(W * 0.18, G - 46, 46, 14, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      for (let i = 0; i < 18; i++) { const x = R() * W, y = G - 40 + R() * 34; ctx.fillRect(x, y, 10 + R() * 18, 2); }
    } else {
      // núi xa (mờ) -> núi giữa -> đồi gần
      ridge(ctx, R, W, G - 34, worldId === 'ice' ? 70 : 50, worldId === 'ice' ? 70 : 90, th.far, worldId !== 'meadow', 'rgba(255,255,255,0.35)');
      if (worldId === 'ice') {   // tuyết trên đỉnh
        ctx.save(); ctx.globalAlpha = 0.9;
        ridge(ctx, seeded('ice-snow'), W, G - 16, 40, 55, th.mid, true, '#ffffff');
        ctx.restore();
      } else {
        ridge(ctx, R, W, G - 16, worldId === 'desert' ? 26 : 30, worldId === 'desert' ? 120 : 70, th.mid, false, 'rgba(255,255,255,0.25)');
      }
      ridge(ctx, R, W, G - 4, 12, 90, th.near, false);
      if (worldId === 'meadow') {
        for (const [x, s] of [[W * 0.06, 1.0], [W * 0.15, 0.75], [W * 0.84, 0.9], [W * 0.95, 1.1]]) tree(ctx, x, G - 2, s, '#4f9a3a', '#3d7f2d');
      }
      if (worldId === 'desert') { cactus(ctx, W * 0.1, G - 2, 0.9); cactus(ctx, W * 0.9, G - 2, 1.1); }
      if (worldId === 'ice') for (const [x, s] of [[W * 0.05, 1.0], [W * 0.13, 0.8], [W * 0.88, 0.9], [W * 0.96, 1.1]]) pine(ctx, x, G - 2, s, '#3f6b5a', '#ffffff');
    }

    // ===== lòng đất =====
    ctx.fillStyle = vgrad(ctx, G, H, th.soil); ctx.fillRect(0, G, W, H - G);
    if (worldId === 'sea') {
      // tia sáng xuyên nước
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 6; i++) {
        const x = R() * W, w = 30 + R() * 40;
        const g = ctx.createLinearGradient(0, G, 0, G + (H - G) * 0.7);
        g.addColorStop(0, 'rgba(180,230,255,0.16)'); g.addColorStop(1, 'rgba(180,230,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, G); ctx.lineTo(x + w, G); ctx.lineTo(x + w * 2.4, H * 0.8); ctx.lineTo(x + w * 1.2, H * 0.8); ctx.fill();
      }
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 26; i++) { ctx.beginPath(); ctx.arc(R() * W, G + 30 + R() * (H - G - 80), 1.5 + R() * 3.5, 0, 7); ctx.stroke(); }
    } else {
      // các tầng đất gợn sóng, mép trên sáng
      const bands = 5, span = (H - G) / bands;
      for (let b = 1; b < bands; b++) {
        const y0 = G + b * span, ph = R() * 10, amp = 5 + R() * 6;
        const wave = (x) => y0 + Math.sin(x / (55 + b * 9) + ph) * amp + Math.sin(x / 23 + ph * 2) * 2;
        ctx.beginPath(); ctx.moveTo(0, H);
        for (let x = 0; x <= W; x += 8) ctx.lineTo(x, wave(x));
        ctx.lineTo(W, H); ctx.closePath();
        ctx.fillStyle = 'rgba(0,0,0,0.07)'; ctx.fill();
        ctx.beginPath(); for (let x = 0; x <= W; x += 8) (x ? ctx.lineTo(x, wave(x)) : ctx.moveTo(x, wave(x)));
        ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 3; ctx.stroke();
        ctx.beginPath(); for (let x = 0; x <= W; x += 8) (x ? ctx.lineTo(x, wave(x) + 3) : ctx.moveTo(x, wave(x) + 3));
        ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 2; ctx.stroke();
      }
      // sỏi có bóng và điểm sáng
      for (let i = 0; i < 260; i++) {
        const x = R() * W, y = G + 18 + R() * (H - G - 24), r = 1 + R() * R() * 6;
        ctx.fillStyle = th.pebble[i % 3];
        ctx.beginPath(); ctx.ellipse(x, y, r * 1.3, r, R() * 3, 0, 7); ctx.fill();
        if (r > 2.5) { ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.arc(x - r * 0.4, y - r * 0.4, r * 0.35, 0, 7); ctx.fill(); }
      }
      if (worldId === 'volcano') {   // khe dung nham phát sáng
        for (let i = 0; i < 7; i++) {
          let x = R() * W, y = G + 40 + R() * (H - G - 80);
          ctx.strokeStyle = 'rgba(255,110,30,0.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y);
          for (let k = 0; k < 5; k++) { x += (R() - 0.5) * 30; y += 6 + R() * 10; ctx.lineTo(x, y); }
          ctx.stroke();
        }
        ctx.fillStyle = vgrad(ctx, H - 80, H, ['rgba(255,90,20,0)', 'rgba(255,90,20,0.5)']); ctx.fillRect(0, H - 80, W, 80);
      }
    }
    if (worldId === 'sea') {   // đáy cát + rong
      ctx.fillStyle = vgrad(ctx, H - 34, H, ['#e8d39a', '#c8ad6e']); ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 20) ctx.lineTo(x, H - 22 - Math.sin(x / 50) * 7);
      ctx.lineTo(W, H); ctx.fill();
      for (const sx of [24, 120, 300, 470, 575]) {
        ctx.strokeStyle = '#3f9a5a'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(sx, H - 14);
        for (let k = 1; k < 7; k++) ctx.lineTo(sx + Math.sin(k * 1.3) * 7, H - 14 - k * 13);
        ctx.stroke(); ctx.lineCap = 'butt';
      }
    }
    // tối dần ở hai bên và đáy (chiều sâu)
    const vg = ctx.createLinearGradient(0, 0, W, 0);
    vg.addColorStop(0, 'rgba(0,0,0,0.28)'); vg.addColorStop(0.12, 'rgba(0,0,0,0)'); vg.addColorStop(0.88, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = vg; ctx.fillRect(0, G, W, H - G);
    ctx.fillStyle = vgrad(ctx, H - 120, H, ['rgba(0,0,0,0)', 'rgba(0,0,0,0.25)']); ctx.fillRect(0, H - 120, W, 120);
    ctx.fillStyle = vgrad(ctx, G, G + 26, ['rgba(0,0,0,0.3)', 'rgba(0,0,0,0)']); ctx.fillRect(0, G, W, 26);

    // ===== mép mặt đất =====
    ctx.fillStyle = th.lip;
    ctx.beginPath(); ctx.moveTo(0, G + 8);
    for (let x = 0; x <= W; x += 12) ctx.lineTo(x, G - 2 + Math.sin(x / 17) * 1.5);
    ctx.lineTo(W, G + 8);
    for (let x = W; x >= 0; x -= 10) ctx.lineTo(x, G + 7 + (R() * 4));
    ctx.fill();
    ctx.fillStyle = th.lipTop; ctx.fillRect(0, G - 3, W, 3);
    if (worldId === 'meadow') {    // cỏ
      ctx.fillStyle = '#4f9a35';
      for (let x = 0; x < W; x += 5 + R() * 5) {
        const h = 5 + R() * 7; ctx.beginPath(); ctx.moveTo(x - 2, G); ctx.lineTo(x + R() * 3 - 1, G - h); ctx.lineTo(x + 2, G); ctx.fill();
      }
    }
    if (worldId === 'ice') {       // tuyết đọng
      ctx.fillStyle = '#ffffff';
      for (let x = 0; x < W; x += 26) { ctx.beginPath(); ctx.ellipse(x + R() * 10, G - 1, 16, 5, 0, Math.PI, 0); ctx.fill(); }
    }

    drawPit(ctx, worldId, W, G);
  }

  // Miệng hố dưới bệ kéo: lỗ tối có viền gỗ nằm ngang mặt đất (vẽ trên cả nền vẽ code lẫn nền ảnh)
  function drawPit(ctx, worldId, W, G) {
    const hx = W / 2, hw = 58;
    const pit = ctx.createRadialGradient(hx, G + 2, 6, hx, G + 6, hw * 1.1);
    pit.addColorStop(0, worldId === 'sea' ? 'rgba(4,25,50,0.85)' : 'rgba(12,6,3,0.95)');
    pit.addColorStop(0.7, worldId === 'sea' ? 'rgba(4,25,50,0.5)' : 'rgba(12,6,3,0.6)');
    pit.addColorStop(1, 'rgba(12,6,3,0)');
    ctx.fillStyle = pit; ctx.beginPath(); ctx.ellipse(hx, G + 4, hw * 1.1, 26, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#7a5030'; ctx.strokeStyle = '#3e2410'; ctx.lineWidth = 1.5;
    for (const s of [-1, 1]) {      // hai thanh gỗ chặn mép hố
      ctx.beginPath(); ctx.roundRect(hx + s * (hw + 4) - 12, G - 5, 24, 8, 3); ctx.fill(); ctx.stroke();
    }
  }

  // ---------- Nền ảnh vẽ tay (img/env/*.jpg) — tải theo thế giới, chưa có thì dùng nền vẽ code ----------
  // surf: hàng pixel của mặt đất (nơi bệ kéo đứng) trong ảnh gốc 941x1672
  const ENV = { meadow: 306, desert: 318, cave: 269, ice: 313, volcano: 318, sea: 322 };
  const envImg = {}, envReq = {};
  function loadEnv(worldId, onload) {
    if (envReq[worldId] || !(worldId in ENV)) return;
    envReq[worldId] = true;
    const im = new Image();
    im.onload = () => { envImg[worldId] = im; if (onload) onload(worldId); };
    im.src = `img/env/${worldId}.jpg`;
  }
  const hasEnv = (worldId) => !!envImg[worldId];
  // Vẽ ảnh nền: mặt đất trong ảnh khớp đúng G; phủ kín màn hình (cắt bớt hai bên/trên nếu cần)
  function drawEnv(ctx, worldId, W, H, G) {
    const im = envImg[worldId], sy = ENV[worldId];
    const s = Math.max(W / im.width, (H - G) / (im.height - sy), G / sy);
    const dw = im.width * s, dh = im.height * s;
    ctx.drawImage(im, (W - dw) / 2, G - sy * s, dw, dh);
    drawPit(ctx, worldId, W, G);
  }

  // ---------- Thợ mỏ & ròng rọc ----------
  function drawMiner(ctx, OX, OY, G, opts = {}) {
    const { spin = 0, pulling = false, frame = 0, happy = false, yank = 0 } = opts;
    if (spr('platform') && spr('winch') && spr('miner_idle')) {
      const top = OY + 16;                                   // mặt bệ, nơi thợ mỏ đứng
      const pf = spr('platform'), pw = 150, ph = pf.height * pw / pf.width;
      ctx.drawImage(pf, OX - pw / 2, top - 15, pw, ph);
      const name = happy ? 'miner_happy' : pulling ? 'miner_pull' + (1 + (frame % 4)) : 'miner_idle';
      const im = spr(name) || spr('miner_idle');
      const mh = 72, mw = im.width * mh / im.height;
      if (yank > 0) {   // bị quái kéo: bay về phía tời rồi rơi xuống hố
        const cx = OX - 26 - mw / 2 + yank * 40, cy = top - mh / 2 + 4 + yank * yank * 150;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(yank * 2.2); ctx.globalAlpha = Math.max(0, 1 - Math.max(0, yank - 0.75) * 4);
        ctx.drawImage(im, -mw / 2, -mh / 2, mw, mh); ctx.restore();
      } else ctx.drawImage(im, OX - 26 - mw, top - mh + 4, mw, mh);
      const wi = spr('winch'), ww = 74, wh = wi.height * ww / wi.width;
      ctx.drawImage(wi, OX - ww / 2, top - wh + 2, ww, wh);
      return;
    }
    ctx.fillStyle = '#8b5e34'; ctx.fillRect(OX - 70, OY + 10, 140, 12);
    ctx.fillStyle = '#6b4424'; ctx.fillRect(OX - 62, OY + 22, 10, G - OY - 22); ctx.fillRect(OX + 52, OY + 22, 10, G - OY - 22);
    ctx.fillStyle = '#555'; ctx.beginPath(); ctx.arc(OX, OY, 13, 0, 7); ctx.fill();
    ctx.strokeStyle = '#999'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(OX + Math.cos(spin) * 11, OY + Math.sin(spin) * 11); ctx.lineTo(OX - Math.cos(spin) * 11, OY - Math.sin(spin) * 11); ctx.stroke();
    const mx = OX + 38, my = OY + 10;
    ctx.fillStyle = '#2f5d8a'; ctx.fillRect(mx - 10, my - 30, 20, 26);
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(mx - 10, my - 18, 20, 3);
    ctx.fillStyle = '#3b3b3b'; ctx.fillRect(mx - 9, my - 6, 7, 6); ctx.fillRect(mx + 2, my - 6, 7, 6);
    ctx.strokeStyle = '#f1c27d'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(mx - 8, my - 24); ctx.lineTo(OX + 8, OY + (pulling ? -4 : 2)); ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.fillStyle = '#f1c27d'; ctx.beginPath(); ctx.arc(mx, my - 40, 10, 0, 7); ctx.fill();
    ctx.fillStyle = '#ff8c1a'; ctx.beginPath(); ctx.arc(mx, my - 43, 11, Math.PI, 0); ctx.fill();
    ctx.fillRect(mx - 14, my - 44, 28, 3);
    ctx.fillStyle = '#fff59a'; ctx.beginPath(); ctx.arc(mx - 4, my - 49, 3, 0, 7); ctx.fill();
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(mx - 4, my - 39, 1.5, 0, 7); ctx.fill();
    ctx.strokeStyle = '#8a5a3a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(mx - 2, my - 35, 3, 0.2, Math.PI - 0.2); ctx.stroke();
  }

  // up: { claw, winch } cấp nâng cấp => móc to hơn + ánh vàng, dây tời to & sáng màu thép hơn
  // ghost: chỉ vẽ móc mờ (bóng mờ khi lao nhanh), không vẽ dây
  function drawHook(ctx, OX, OY, angle, len, closed, up = {}, ghost = 0) {
    const tx = OX + Math.sin(angle) * len, ty = OY + Math.cos(angle) * len;
    const hk = spr(closed ? 'hook_closed' : 'hook_open');
    const claw = up.claw || 0, winch = up.winch || 0;
    if (hk) {
      if (!ghost) {
        const rope = ['#6b4a2a', '#6f5a44', '#77706a', '#8a8f96', '#a3adb8', '#c9d3dd'][winch];
        ctx.strokeStyle = rope; ctx.lineWidth = 3 + winch * 0.35;
        ctx.beginPath(); ctx.moveTo(OX, OY); ctx.lineTo(tx, ty); ctx.stroke();
        if (winch >= 3) {   // dây cáp thép: thêm vệt sáng
          ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(OX + 1, OY); ctx.lineTo(tx + 1, ty); ctx.stroke();
        }
      }
      const h = 46 * (1 + 0.08 * claw), w = hk.width * h / hk.height;
      ctx.save(); ctx.translate(tx, ty); ctx.rotate(-angle);
      if (ghost) ctx.globalAlpha *= ghost;
      if (claw > 0 && !ghost) { ctx.shadowColor = claw >= 4 ? '#ffd23f' : '#ffe9a0'; ctx.shadowBlur = 3 + claw * 3; }
      ctx.drawImage(hk, -w / 2, -h * 0.45, w, h);
      ctx.restore();
      return { x: tx, y: ty };
    }
    ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(OX, OY); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.save(); ctx.translate(tx, ty); ctx.rotate(-angle);
    ctx.strokeStyle = '#444'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    const open = closed ? 0.25 : 0.7;
    ctx.beginPath(); ctx.arc(-6, 6, 9, -Math.PI / 2 - open, Math.PI / 2 - 0.4); ctx.stroke();
    ctx.beginPath(); ctx.arc(6, 6, 9, Math.PI / 2 + 0.4, Math.PI * 1.5 + open); ctx.stroke();
    ctx.fillStyle = '#666'; ctx.fillRect(-5, -4, 10, 6);
    ctx.lineCap = 'butt';
    ctx.restore();
    return { x: tx, y: ty };
  }

  function star(ctx, x, y, r, filled) {
    if (spr('star')) {
      ctx.save();
      if (!filled) { ctx.globalAlpha *= 0.3; ctx.filter = 'grayscale(1)'; }
      blit(ctx, spr('star'), x, y, r * 2.3);
      ctx.restore();
      return;
    }
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = filled ? '#ffd23f' : 'rgba(255,255,255,0.15)'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = filled ? '#a86b00' : 'rgba(255,255,255,0.35)'; ctx.stroke();
  }

  // Vụ nổ: p từ 0 -> 1
  function boom(ctx, x, y, size, p) {
    const im = spr('boom' + (1 + Math.min(3, Math.floor(p * 4))));
    if (!im) return false;
    ctx.save(); ctx.globalAlpha = Math.max(0, 1 - Math.max(0, p - 0.6) / 0.4);
    blit(ctx, im, x, y, size * (0.7 + p * 0.5));
    ctx.restore();
    return true;
  }

  // ---------- Quái vật: mỗi thế giới một loài ----------
  // m: { kind, x (đầu), y, dir, len, r, phase, open (0..1 độ há miệng) }
  // len: chiều dài vẽ (sprite) · r: bán kính thân (bản vẽ code dự phòng) · fps: tốc độ hoạt ảnh
  const MON = {
    mole:       { len: 180, r: 42, speed: 0.7,  fps: 6 },    // Đồng Cỏ: chậm, đào đất
    worm:       { len: 300, r: 36, speed: 1,    fps: 7 },    // Sa Mạc: uốn lượn
    spider:     { len: 180, r: 34, speed: 0.95, fps: 9 },    // Hang Động: dừng giữa màn
    serpent:    { len: 300, r: 30, speed: 1,    fps: 5 },    // Núi Băng: uốn chữ S cao
    salamander: { len: 260, r: 28, speed: 1.2,  fps: 12 },   // Núi Lửa: nhanh, để lại tàn lửa
    shark:      { len: 260, r: 36, speed: 1.05, fps: 7 },    // Đáy Biển: lao thẳng
  };

  // Sprite quái (img/monsters/<loài>_<khung>.png + monsters-data.js). Tải khi cần; chưa có thì vẽ bằng code.
  const monImg = {}, monReq = {};
  function loadMonster(kind) {
    if (monReq[kind] || !window.MONSTER_SPRITES || !window.MONSTER_SPRITES[kind]) return;
    monReq[kind] = true;
    const frames = [];
    let left = window.MONSTER_SPRITES[kind].frames;
    for (let k = 0; k < window.MONSTER_SPRITES[kind].frames; k++) {
      const im = new Image();
      im.onload = () => { frames[k] = im; if (--left === 0) monImg[kind] = frames; };
      im.src = `img/monsters/${kind}_${k}.png`;
    }
  }
  const monSprite = (m) => monImg[m.kind] && window.MONSTER_SPRITES[m.kind];

  // Các hình tròn tạo nên thân quái (đầu trước). Dùng chung cho vẽ và kiểm tra va chạm.
  function monsterBody(m) {
    const d = m.dir, out = [];
    const spr = monSprite(m);
    if (spr) {   // vùng va chạm lấy từ hình dạng thật của khung đang hiện (thu nhỏ 15% cho khoan dung)
      for (const [hx, hy, hr] of spr.hit[m.frame || 0]) out.push({ x: m.x + d * hx * m.len, y: m.y + hy * m.len, r: hr * m.len * 0.85 });
      return out;
    }
    if (m.kind === 'worm' || m.kind === 'serpent') {
      const n = 14, step = m.len / n, amp = m.kind === 'serpent' ? 30 : 9, k = m.kind === 'serpent' ? 0.35 : 0.55;
      for (let i = 0; i <= n; i++) out.push({ x: m.x - d * i * step, y: m.y + Math.sin(m.phase + i * k) * amp, r: m.r * (1 - i / (n + 6)) + 5 });
    } else if (m.kind === 'mole') {
      const bob = Math.abs(Math.sin(m.phase * 0.8)) * 8;
      out.push({ x: m.x - d * m.r * 0.3, y: m.y - bob, r: m.r * 0.75 }, { x: m.x - d * m.r * 1.2, y: m.y - bob * 0.6, r: m.r },
               { x: m.x - d * m.r * 2.1, y: m.y - bob * 0.3, r: m.r * 0.85 });
    } else if (m.kind === 'spider') {
      out.push({ x: m.x - d * m.r * 0.3, y: m.y, r: m.r * 0.62 }, { x: m.x - d * m.r * 1.35, y: m.y - 4, r: m.r });
    } else if (m.kind === 'salamander') {
      const n = 9, step = m.len / n;
      for (let i = 0; i <= n; i++) {
        out.push({ x: m.x - d * i * step, y: m.y + Math.sin(m.phase * 1.4 + i * 0.7) * 5 * (i / n),
                   r: i === 0 ? m.r * 0.8 : m.r * Math.max(0.25, 1 - Math.pow(i / n, 1.3) * 0.85) });
      }
    } else {   // cá mập
      const L = m.len, y = m.y + Math.sin(m.phase) * 5;
      for (const [f, rr] of [[0.06, 0.1], [0.22, 0.15], [0.4, 0.16], [0.58, 0.13], [0.76, 0.08]]) out.push({ x: m.x - d * L * f, y, r: L * rr });
    }
    return out;
  }

  function ball(ctx, x, y, r, c1, c2, c3) {
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, c1); g.addColorStop(0.6, c2); g.addColorStop(1, c3);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  }

  // miệng tròn đầy răng (sâu cát)
  function roundMouth(ctx, mo) {
    ctx.fillStyle = '#2a0d08'; ctx.beginPath(); ctx.ellipse(16, 0, 11, 20 * mo, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff4dc';
    for (let k = 0; k < 7; k++) {
      const a = -Math.PI / 2 + (k / 6) * Math.PI, px = 16 + Math.cos(a) * 9, py = Math.sin(a) * 18 * mo;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - 6 * Math.cos(a), py - 6 * Math.sin(a) * mo); ctx.lineTo(px + 3, py + 3 * Math.sign(-py || 1)); ctx.fill();
    }
  }

  function drawWorm(ctx, m, body) {
    for (let i = body.length - 1; i >= 0; i--) {
      const { x, y, r } = body[i];
      ball(ctx, x, y, r, '#e8b874', '#a8743a', '#6e4520');
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, r * 0.92, Math.PI * 0.6, Math.PI * 1.4); ctx.stroke();
    }
    const h = body[0], k = m.r / 26;
    ctx.save(); ctx.translate(h.x + m.dir * 6, h.y); ctx.scale(m.dir * k, k);
    roundMouth(ctx, 0.55 + 0.45 * (m.open || 0));
    ctx.fillStyle = '#ffdd55'; ctx.beginPath(); ctx.arc(-2, -16, 4.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#200'; ctx.beginPath(); ctx.arc(-1, -16, 2.2, 0, 7); ctx.fill();
    ctx.restore();
  }

  function drawSerpent(ctx, m, body) {
    for (let i = body.length - 1; i >= 0; i--) {
      const { x, y, r } = body[i];
      ctx.fillStyle = '#d8f0ff';   // gai băng trên lưng
      ctx.beginPath(); ctx.moveTo(x - r * 0.45, y - r * 0.75); ctx.lineTo(x - m.dir * r * 0.2, y - r * 1.45); ctx.lineTo(x + r * 0.45, y - r * 0.75); ctx.fill();
      ball(ctx, x, y, r, '#eaf7ff', '#8cc3e6', '#3d6f96');
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(x, y + r * 0.45, r * 0.6, r * 0.25, 0, 0, 7); ctx.fill();
    }
    const h = body[0], mo = 0.2 + 0.8 * (m.open || 0);
    ctx.save(); ctx.translate(h.x, h.y); ctx.scale(m.dir, 1);
    // đầu dài, hàm trên/dưới, sừng băng
    ctx.fillStyle = '#9fd0ef';
    ctx.beginPath(); ctx.moveTo(-10, -18); ctx.lineTo(36, -8 - 6 * mo); ctx.lineTo(36, -2); ctx.lineTo(-6, 4); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-6, 6); ctx.lineTo(32, 4 + 10 * mo); ctx.lineTo(30, 10 + 10 * mo); ctx.lineTo(-10, 18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff';
    for (let k = 0; k < 4; k++) {
      ctx.beginPath(); ctx.moveTo(8 + k * 7, -3); ctx.lineTo(11 + k * 7, 3 + 4 * mo); ctx.lineTo(14 + k * 7, -3); ctx.fill();
    }
    ctx.fillStyle = '#e8f8ff';
    ctx.beginPath(); ctx.moveTo(-6, -16); ctx.lineTo(-20, -36); ctx.lineTo(0, -18); ctx.fill();
    ctx.beginPath(); ctx.moveTo(4, -14); ctx.lineTo(-4, -32); ctx.lineTo(10, -14); ctx.fill();
    ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.ellipse(12, -11, 4, 2.2, -0.2, 0, 7); ctx.fill();
    ctx.restore();
  }

  function drawMole(ctx, m, body, t) {
    const d = m.dir;
    for (let i = body.length - 1; i >= 0; i--) {
      const { x, y, r } = body[i];
      ball(ctx, x, y, r, '#c9b8c4', '#7d6878', '#3a2c38');
      ctx.strokeStyle = 'rgba(30,18,30,0.35)'; ctx.lineWidth = 1.5;   // lông
      for (let k = 0; k < 6; k++) { const a = -2.4 + k * 0.5; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55); ctx.lineTo(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9); ctx.stroke(); }
    }
    const h = body[0], dig = Math.sin(t * 14), k = m.r / 34;
    ctx.save(); ctx.translate(h.x, h.y); ctx.scale(d * k, k);
    // móng vuốt đào đất
    ctx.fillStyle = '#f2e3c4'; ctx.strokeStyle = '#8a7350'; ctx.lineWidth = 1.5;
    for (const [oy, rot] of [[14, 0.3 + dig * 0.4], [22, 0.5 - dig * 0.4]]) {
      ctx.save(); ctx.translate(14, oy); ctx.rotate(rot);
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(0, k * 4 - 4); ctx.quadraticCurveTo(14, k * 4 - 6, 20, k * 5 - 2); ctx.lineTo(0, k * 4); ctx.fill(); ctx.stroke(); }
      ctx.restore();
    }
    // mũi hồng to, mắt bé, râu
    ctx.fillStyle = '#ff8fa8'; ctx.beginPath(); ctx.ellipse(26, -2, 10, 8, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#c45a74'; ctx.beginPath(); ctx.arc(30, -3, 2, 0, 7); ctx.arc(25, -4, 2, 0, 7); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(8, -12, 2.6, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1;
    for (const a of [-0.3, 0, 0.3]) { ctx.beginPath(); ctx.moveTo(22, 2); ctx.lineTo(22 + Math.cos(a) * 18, 2 + Math.sin(a) * 10); ctx.stroke(); }
    if (m.open > 0) { ctx.fillStyle = '#3a0a0a'; ctx.beginPath(); ctx.ellipse(20, 8, 7, 5 * m.open, 0, 0, 7); ctx.fill(); }
    ctx.restore();
  }

  function drawSpider(ctx, m, body, t) {
    const d = m.dir, [head, abd] = body;
    // 8 chân, chia hai bên, cử động so le
    ctx.strokeStyle = '#9a6cc4'; ctx.lineCap = 'round';
    for (let k = 0; k < 4; k++) {
      for (const side of [-1, 1]) {
        const ph = Math.sin(t * 12 + k * 1.3 + (side > 0 ? 0 : 1.5)) * (m.walking ? 1 : 0.2);
        const bx = head.x - d * (k - 1.5) * 9, by = head.y + 4;
        const kx = bx + d * (14 - k * 9) + ph * 6, ky = by + side * 22 - 18;
        const fx = kx + d * (16 - k * 10) + ph * 4, fy = by + side * 40 + 6;
        ctx.lineWidth = 6; ctx.strokeStyle = '#3a1f52'; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
        ctx.lineWidth = 2.5; ctx.strokeStyle = '#b58ae0'; ctx.stroke();
      }
    }
    ctx.lineCap = 'butt';
    ball(ctx, abd.x, abd.y, abd.r, '#a56fd6', '#5a2f86', '#22103a');
    ctx.fillStyle = '#ff3b5c';   // hoa văn đỏ trên bụng
    ctx.beginPath(); ctx.moveTo(abd.x - d * 6, abd.y - abd.r * 0.5); ctx.lineTo(abd.x + d * 8, abd.y); ctx.lineTo(abd.x - d * 6, abd.y + abd.r * 0.5); ctx.lineTo(abd.x - d * 18, abd.y); ctx.closePath(); ctx.fill();
    ball(ctx, head.x, head.y, head.r, '#9466c2', '#4a2870', '#1c0c2c');
    ctx.save(); ctx.translate(head.x, head.y); ctx.scale(d, 1);
    ctx.fillStyle = '#ff2a2a';
    for (const [ex, ey, er] of [[10, -8, 4], [16, -4, 3.5], [6, -12, 2.6], [14, -12, 2.4], [18, 1, 2.2], [4, -4, 2.2]]) { ctx.beginPath(); ctx.arc(ex, ey, er, 0, 7); ctx.fill(); }
    const mo = 0.3 + 0.7 * (m.open || 0);
    ctx.fillStyle = '#e9e1d0';
    ctx.beginPath(); ctx.moveTo(14, 6); ctx.quadraticCurveTo(24, 10 + 4 * mo, 18, 18 + 6 * mo); ctx.lineTo(14, 10); ctx.fill();
    ctx.beginPath(); ctx.moveTo(8, 8); ctx.quadraticCurveTo(14, 14 + 4 * mo, 6, 20 + 6 * mo); ctx.lineTo(4, 10); ctx.fill();
    ctx.restore();
  }

  function drawSalamander(ctx, m, body, t) {
    const d = m.dir;
    const glow = ctx.createRadialGradient(body[2].x, body[2].y, 4, body[2].x, body[2].y, m.len * 0.6);
    glow.addColorStop(0, 'rgba(255,120,30,0.35)'); glow.addColorStop(1, 'rgba(255,120,30,0)');
    ctx.fillStyle = glow; ctx.fillRect(body[2].x - m.len * 0.6, body[2].y - m.len * 0.6, m.len * 1.2, m.len * 1.2);
    // 4 chân đi bộ
    ctx.strokeStyle = '#a82c10'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    for (const [bi, ph] of [[1, 0], [3, Math.PI]]) {
      const b = body[bi], sw = Math.sin(t * 14 + ph) * 10;
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x + d * (8 + sw), b.y + b.r + 10); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x + d * (8 - sw), b.y - b.r - 8); ctx.stroke();
    }
    ctx.lineCap = 'butt';
    for (let i = body.length - 1; i >= 0; i--) {
      const { x, y, r } = body[i];
      ball(ctx, x, y, r, '#ffc061', '#f0641e', '#7a1a08');
      if (i > 0 && i % 2 === 0) { ctx.fillStyle = 'rgba(40,8,0,0.55)'; ctx.beginPath(); ctx.arc(x - d * r * 0.2, y - r * 0.35, r * 0.28, 0, 7); ctx.fill(); }
    }
    const h = body[0], mo = 0.25 + 0.75 * (m.open || 0);
    ctx.save(); ctx.translate(h.x, h.y); ctx.scale(d, 1);
    ctx.fillStyle = '#ffb04a'; ctx.beginPath(); ctx.ellipse(14, 0, 18, 13, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#4a0c00'; ctx.beginPath(); ctx.moveTo(4, 4); ctx.lineTo(32, 2); ctx.lineTo(28, 4 + 10 * mo); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffee55'; ctx.beginPath(); ctx.arc(10, -7, 5, 0, 7); ctx.fill();
    ctx.fillStyle = '#200'; ctx.beginPath(); ctx.ellipse(11, -7, 1.6, 4, 0, 0, 7); ctx.fill();
    ctx.restore();
  }

  function drawMonster(ctx, m, worldId, t) {
    ctx.save();
    ctx.shadowColor = 'rgba(255,240,220,0.4)'; ctx.shadowBlur = 10;   // quầng sáng để quái luôn nổi trên nền
    const spr = monSprite(m);
    if (spr) {   // mép trước (đầu) của sprite nằm tại m.x, quay theo hướng đi
      const im = monImg[m.kind][m.frame || 0], dw = m.len, dh = dw * spr.aspect;
      ctx.translate(m.x, m.y); ctx.scale(m.dir, 1);
      ctx.drawImage(im, -dw, -dh / 2, dw, dh);
    } else drawMonsterBody(ctx, m, worldId, t);
    ctx.restore();
  }
  function drawMonsterBody(ctx, m, worldId, t) {
    if (m.kind === 'shark') return drawShark(ctx, m, t);
    const body = monsterBody(m);
    if (m.kind === 'mole') return drawMole(ctx, m, body, t);
    if (m.kind === 'spider') return drawSpider(ctx, m, body, t);
    if (m.kind === 'serpent') return drawSerpent(ctx, m, body);
    if (m.kind === 'salamander') return drawSalamander(ctx, m, body, t);
    return drawWorm(ctx, m, body);
  }

  function drawShark(ctx, m, t) {
    const L = m.len;
    ctx.save(); ctx.translate(m.x, m.y + Math.sin(m.phase) * 5); ctx.scale(m.dir, 1);
    const sw = Math.sin(t * 9 + m.phase) * 0.18;
    // đuôi
    ctx.fillStyle = '#5b7488';
    ctx.beginPath(); ctx.moveTo(-L * 0.82, 0); ctx.lineTo(-L * (1.02 + sw * 0.2), -L * 0.24); ctx.lineTo(-L * 0.92, 0); ctx.lineTo(-L * (1.02 - sw * 0.2), L * 0.2); ctx.closePath(); ctx.fill();
    // thân
    const g = ctx.createLinearGradient(0, -L * 0.2, 0, L * 0.2);
    g.addColorStop(0, '#6f8ca3'); g.addColorStop(0.55, '#8fa9bd'); g.addColorStop(0.56, '#e9eef2'); g.addColorStop(1, '#cfd8df');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-L * 0.1, -L * 0.2, -L * 0.6, -L * 0.18, -L * 0.86, -L * 0.02);
    ctx.lineTo(-L * 0.86, L * 0.03);
    ctx.bezierCurveTo(-L * 0.6, L * 0.16, -L * 0.1, L * 0.16, 0, 0); ctx.fill();
    ctx.strokeStyle = 'rgba(20,40,60,0.5)'; ctx.lineWidth = 2; ctx.stroke();
    // vây lưng + vây ngực
    ctx.fillStyle = '#5b7488';
    ctx.beginPath(); ctx.moveTo(-L * 0.36, -L * 0.15); ctx.lineTo(-L * 0.5, -L * 0.42); ctx.lineTo(-L * 0.56, -L * 0.14); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-L * 0.3, L * 0.08); ctx.lineTo(-L * 0.46, L * 0.26); ctx.lineTo(-L * 0.42, L * 0.08); ctx.fill();
    // mang
    ctx.strokeStyle = 'rgba(30,50,70,0.45)'; ctx.lineWidth = 2;
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(-L * (0.2 + k * 0.035), -L * 0.07); ctx.lineTo(-L * (0.22 + k * 0.035), L * 0.06); ctx.stroke(); }
    // miệng + răng
    const mo = 0.3 + 0.7 * (m.open || 0);
    ctx.fillStyle = '#5a1a22'; ctx.beginPath(); ctx.moveTo(-L * 0.02, L * 0.02); ctx.lineTo(-L * 0.17, L * 0.02 + L * 0.07 * mo); ctx.lineTo(-L * 0.17, L * 0.035); ctx.fill();
    ctx.fillStyle = '#fff';
    for (let k = 0; k < 5; k++) { const x = -L * (0.04 + k * 0.026); ctx.beginPath(); ctx.moveTo(x, L * 0.03); ctx.lineTo(x - 3, L * 0.03 + 6 * mo); ctx.lineTo(x - 6, L * 0.03); ctx.fill(); }
    // mắt
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(-L * 0.1, -L * 0.05, 3.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-L * 0.1 + 1, -L * 0.05 - 1, 1.2, 0, 7); ctx.fill();
    ctx.restore();
  }

  // Cảnh báo ở mép màn hình trước khi quái xuất hiện
  function drawMonsterWarning(ctx, x, y, t, kind) {
    const a = 0.55 + 0.45 * Math.sin(t * 14);
    ctx.save(); ctx.globalAlpha = a;
    const g = ctx.createRadialGradient(x, y, 4, x, y, 60);
    g.addColorStop(0, 'rgba(255,40,40,0.55)'); g.addColorStop(1, 'rgba(255,40,40,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 60, y - 60, 120, 120);
    ctx.fillStyle = '#ffcc00'; ctx.strokeStyle = '#3a0000'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y - 20); ctx.lineTo(x + 20, y + 16); ctx.lineTo(x - 20, y + 16); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#3a0000'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('!', x, y + 4);
    ctx.restore();
  }

  window.Art = { THEMES, drawItem, drawBackground, drawMiner, drawHook, star, gold, loadSprites, spr, blit, boom, drawMonster, drawMonsterWarning, loadEnv, hasEnv, drawEnv, MON, monsterBody, loadMonster };
})();
