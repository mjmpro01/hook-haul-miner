// Dữ liệu màn chơi: 6 thế giới x 10 màn = 60 màn cố định (sinh bằng seed nên mỗi lần chơi giống nhau).
(() => {
  'use strict';

  // r = bán kính, value = giá, weight = độ nặng (càng nặng kéo càng chậm)
  const TYPES = {
    goldS:    { r: 13, value: 50,   weight: 1.6,  kind: 'gold' },
    goldM:    { r: 22, value: 150,  weight: 3.2,  kind: 'gold' },
    goldL:    { r: 38, value: 500,  weight: 7.0,  kind: 'gold', deep: 0.4 },
    goldXL:   { r: 56, value: 1500, weight: 12,   kind: 'gold', deep: 0.6 },
    rockS:    { r: 17, value: 20,   weight: 4.0,  kind: 'rock' },
    rockL:    { r: 32, value: 50,   weight: 8.5,  kind: 'rock' },
    lavaRock: { r: 30, value: 5,    weight: 9.5,  kind: 'lava' },
    diamond:  { r: 10, value: 600,  weight: 1.2,  kind: 'diamond', deep: 0.35 },
    ruby:     { r: 11, value: 800,  weight: 1.2,  kind: 'ruby', deep: 0.45 },
    crystal:  { r: 16, value: 350,  weight: 2.2,  kind: 'crystal', deep: 0.25 },
    bag:      { r: 17, value: 0,    weight: 2.0,  kind: 'bag' },
    bone:     { r: 15, value: 15,   weight: 1.2,  kind: 'bone' },
    skull:    { r: 14, value: 30,   weight: 1.4,  kind: 'skull' },
    fossil:   { r: 24, value: 250,  weight: 4.0,  kind: 'fossil', deep: 0.3 },
    iceGold:  { r: 28, value: 400,  weight: 6.0,  kind: 'ice', deep: 0.25 },
    clam:     { r: 17, value: 300,  weight: 2.0,  kind: 'clam' },
    chest:    { r: 30, value: 900,  weight: 8.0,  kind: 'chest', deep: 0.5 },
    anchor:   { r: 26, value: 10,   weight: 9.0,  kind: 'anchor' },
    tnt:      { r: 16, value: 0,    weight: 1.0,  kind: 'tnt' },
    lizard:   { r: 15, value: 10,   weight: 1.4,  kind: 'lizard',  speed: 45, critter: true },
    bat:      { r: 13, value: 25,   weight: 1.0,  kind: 'bat',     speed: 80, critter: true },
    penguin:  { r: 16, value: 80,   weight: 2.0,  kind: 'penguin', speed: 32, critter: true },
    fish:     { r: 14, value: 40,   weight: 1.2,  kind: 'fish',    speed: 70, critter: true },
  };

  // Vật "không có giá trị": khi chỉ còn những thứ này thì kết thúc màn sớm
  const JUNK = new Set(['rock', 'lava', 'bone', 'anchor', 'tnt']);

  // Mỗi thế giới: [min, max] số lượng từng vật, tăng dần từ màn 1 -> màn 10
  const WORLDS = [
    { id: 'meadow', mix: { goldS: [5, 7], goldM: [3, 5], goldL: [1, 3], rockS: [3, 6], rockL: [1, 3], diamond: [0, 2], bag: [1, 3] } },
    { id: 'desert', mix: { goldS: [4, 6], goldM: [2, 4], goldL: [1, 3], rockS: [2, 4], rockL: [1, 3], bone: [2, 4], skull: [1, 3], fossil: [1, 3], lizard: [1, 3], diamond: [0, 2], bag: [1, 2] } },
    { id: 'cave',   mix: { goldS: [3, 5], goldM: [2, 4], goldL: [1, 3], rockS: [2, 4], rockL: [2, 4], crystal: [2, 4], bat: [1, 3], tnt: [1, 3], diamond: [1, 2], bag: [1, 2] } },
    { id: 'ice',    mix: { goldS: [3, 5], goldM: [2, 3], iceGold: [2, 4], rockS: [2, 4], rockL: [2, 3], penguin: [1, 3], diamond: [1, 3], tnt: [0, 2], bag: [1, 2] } },
    { id: 'volcano', mix: { goldS: [3, 5], goldM: [2, 4], goldL: [1, 3], lavaRock: [2, 5], rockS: [1, 3], ruby: [1, 3], bat: [1, 2], tnt: [2, 4], bag: [1, 2] } },
    { id: 'sea',    mix: { goldS: [2, 4], goldM: [2, 3], goldL: [1, 2], clam: [2, 4], chest: [1, 2], anchor: [1, 3], rockS: [2, 4], rockL: [1, 3], fish: [2, 4], diamond: [1, 2], bag: [1, 2] } },
  ];
  const PER_WORLD = 10;
  // loài quái của từng thế giới (cùng thứ tự với WORLDS)
  const MONSTERS = ['mole', 'worm', 'spider', 'serpent', 'salamander', 'shark'];
  const hasMonster = (n) => {
    const w = Math.floor((n - 1) / PER_WORLD), i = (n - 1) % PER_WORLD;
    return i !== 4 && (w === 0 ? i >= 5 : i >= 2);
  };
  const COUNT = WORLDS.length * PER_WORLD;
  const W = 600;

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shape(R, r, n, jitter) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rr = r * (1 - jitter / 2 + R() * jitter);
      pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
    }
    return pts;
  }

  function makeItem(R, type, x, fy) {
    const T = TYPES[type];
    const it = { type, ...T, x, fy, y: 0, rot: R() * Math.PI * 2, dir: R() < 0.5 ? -1 : 1, phase: R() * 10 };
    if (T.kind === 'gold' || T.kind === 'rock' || T.kind === 'lava') it.shape = shape(R, T.r, T.kind === 'gold' ? 10 : 8, T.kind === 'gold' ? 0.3 : 0.35);
    // một số sinh vật ngậm kim cương
    if ((type === 'lizard' || type === 'fish') && R() < 0.35) { it.carry = true; it.value += 600; }
    return it;
  }

  // n: 1..60
  const build = (n) => buildWith(n, expectedUp(n));
  function buildWith(n, expUp) {
    const w = Math.floor((n - 1) / PER_WORLD), i = (n - 1) % PER_WORLD;
    const world = WORLDS[w];
    const R = rng(n * 9973 + 17);
    const tag = i === 4 ? 'bonus' : i === 9 ? 'boss' : 'normal';
    const plan = [];
    for (const [type, [lo, hi]] of Object.entries(world.mix)) {
      let c = Math.round(lo + (hi - lo) * (i / 9) + (R() - 0.5));
      if (tag === 'bonus') c = TYPES[type].kind === 'gold' ? c * 2 : (type === 'tnt' ? 0 : Math.floor(c / 2));
      for (let k = 0; k < Math.max(0, c); k++) plan.push(type);
    }
    if (tag === 'boss') plan.unshift('goldXL');
    // vật to xếp trước cho dễ tìm chỗ
    plan.sort((a, b) => TYPES[b].r - TYPES[a].r);

    const items = [];
    const lanes = [];
    // vị trí thực tế được tính lại theo chiều cao màn hình; ở đây kiểm tra chồng lấn với chiều cao chuẩn 600
    const SPAN = 600;
    for (const type of plan) {
      const T = TYPES[type];
      if (T.critter) {
        let fy = 0.1 + R() * 0.85;
        for (let t = 0; t < 20 && lanes.some(l => Math.abs(l - fy) < 0.08); t++) fy = 0.1 + R() * 0.85;
        lanes.push(fy);
        items.push(makeItem(R, type, 40 + R() * (W - 80), fy));
        continue;
      }
      const minFy = (T.deep || 0) + (T.deep ? i * 0.02 : 0);
      for (let tries = 0; tries < 80; tries++) {
        const x = 24 + T.r + R() * (W - 48 - 2 * T.r);
        const fy = Math.min(0.98, minFy + R() * (1 - minFy));
        const y = fy * SPAN;
        if (items.some(o => !o.critter && Math.hypot(o.x - x, o.fy * SPAN - y) < o.r + T.r + 6)) continue;
        items.push(makeItem(R, type, x, fy));
        break;
      }
    }

    // Mục tiêu dựa trên số tiền kiếm được trong thời gian cho phép:
    // mô phỏng người chơi luôn chọn món "đáng giá nhất trên mỗi giây".
    // Thời gian ngắn => không thể vét sạch màn, nâng cấp (tời nhanh, thêm giờ...) tạo khác biệt rõ.
    const time = tag === 'bonus' ? 28 : tag === 'boss' ? 50 : 40;
    // expUp: mức nâng cấp dự kiến của người chơi khi tới màn này
    const picked = new Set();
    const reach = estimate(items, time, expUp, picked);
    // Bỏ vàng/đá quý thừa: chỉ giữ những món người chơi tối ưu kịp kéo trong thời gian
    // => tổng giá trị trong màn sát với mục tiêu, món nào cũng đáng kể. Đá/rác giữ lại làm chướng ngại.
    // Màn thưởng giữ nguyên ("vàng khắp nơi").
    if (tag !== 'bonus') for (let k = items.length - 1; k >= 0; k--) {
      const it = items[k];
      if (!JUNK.has(it.kind) && !picked.has(it)) items.splice(k, 1);
    }
    // Đồng Cỏ tăng dần 50% -> 70%, từ màn 11 cố định 70% của mức kéo được KHI ĐÃ CÓ nâng cấp dự kiến
    const pct = n <= 10 ? 0.5 + 0.2 * (n - 1) / 9 : 0.7;
    const round50 = (v) => Math.max(50, Math.round(v / 50) * 50);
    const target = round50(reach * pct);
    const s2 = Math.max(round50(reach * (pct + 1) / 2), target + 50);
    const s3 = Math.max(round50(reach * 0.95), s2 + 50);
    // Mỗi thế giới một loài quái đi ngang: chạm dây/móc là thua ngay.
    // Đồng Cỏ từ màn 6 (cho người mới làm quen), các thế giới khác từ màn 3; không có ở màn thưởng.
    const monster = hasMonster(n) ? {
      kind: MONSTERS[w],
      every: [Math.max(9, 17 - w - (i >> 2)), Math.max(14, 25 - w - (i >> 2))],   // giây giữa hai lần xuất hiện
      speed: 120 + w * 12 + i * 3,
    } : null;
    // màn có quái: người chơi phải chờ né => hạ mục tiêu một chút
    const k = monster ? 0.92 : 1;
    const t1 = round50(target * k), m2 = round50(s2 * k), m3 = round50(s3 * k);
    return { n, world: w, worldId: world.id, idx: i, tag, items, time, expUp: expUp.total, target: t1, stars: [t1, Math.max(m2, t1 + 50), Math.max(m3, m2 + 50, t1 + 100)], reach, monster };
  }

  // Giá nâng cấp vĩnh viễn (5 cấp mỗi loại) — dùng chung cho game và cho phần tính mục tiêu
  const UP_PRICES = {
    claw:  [3750, 6400, 10900, 18400, 31250],
    winch: [4500, 7650, 13000, 22150, 37500],
    drop:  [3000, 5150, 8650, 14750, 25000],
    time:  [5000, 8500, 14500, 24650, 41900],
  };
  // Mức nâng cấp DỰ KIẾN ở màn n: tăng đều từ 0 cấp (màn 3) tới đủ 20 cấp (màn 52).
  // Mục tiêu màn được tính với mức này, nên ai chỉ chơi mỗi màn một lần sẽ thiếu tiền nâng cấp
  // và phải chơi lại màn cũ / Cơn sốt vàng để cày (nhiều nhất ở Núi Lửa & Đáy Biển).
  const UP_ORDER = ['winch', 'time', 'claw', 'drop'];
  const UP_FROM = 3, UP_FULL = 52;
  const expectedUp = (n) => {
    const total = Math.max(0, Math.min(20, Math.round(20 * (n - UP_FROM) / (UP_FULL - UP_FROM))));
    const up = { claw: 0, winch: 0, drop: 0, time: 0, total };
    for (let k = 0; k < total; k++) up[UP_ORDER[k % 4]]++;
    return up;
  };

  // Ước lượng số tiền kiếm được: người chơi luôn kéo món "đáng giá nhất trên mỗi giây", có nâng cấp `up`
  function estimate(items, time, up, picked) {
    const top = 225, span = 549, OX = W / 2, OY = 118; // hình học chuẩn (màn hình cao 800, mặt đất 185)
    time += 4 * up.time;
    const drop = 460 * (1 + 0.12 * up.drop), pull = 1 + 0.12 * up.winch, wait = 1.2 - 0.05 * up.claw;
    const opts = items.filter(it => it.kind !== 'tnt').map(it => {
      const d = Math.hypot(it.x - OX, top + it.fy * span - OY);
      const v = it.kind === 'bag' ? 150 : it.value;
      return { it, v, t: d / drop + d / ((560 / it.weight) * pull) + wait };
    }).sort((a, b) => b.v / b.t - a.v / a.t);
    let got = 0;
    for (const o of opts) if (o.t <= time) { time -= o.t; got += o.v; if (picked) picked.add(o.it); }
    return got;
  }

  window.Levels = { expectedUp, UP_PRICES, estimate, TYPES, WORLDS, PER_WORLD, COUNT, JUNK, MONSTERS, build, rng, hasMonster, makeItem };
})();
