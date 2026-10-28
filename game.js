// Hook & Haul Miner — game đào vàng cho YouTube Playables.
// Hình vẽ: art.js (Canvas). Màn chơi: levels.js. Âm thanh & nhạc: tổng hợp bằng WebAudio ngay trong file này.
(() => {
  'use strict';
  const { TYPES, WORLDS, PER_WORLD, COUNT, JUNK, build, rng, hasMonster, makeItem } = window.Levels;
  const Art = window.Art;

  // ---------- YouTube Playables SDK (có fallback để chạy thử ngoài YouTube) ----------
  const yt = typeof ytgame !== 'undefined' ? ytgame : null;
  const IN_YT = !!(yt && yt.IN_PLAYABLES_ENV);
  // Trang chơi thử (ngoài YouTube) có thể bật quảng cáo giả lập để thử luồng nút quảng cáo
  const FAKE_ADS = !IN_YT && !!window.TEST_FAKE_ADS;
  // Công cụ thử nghiệm (nút mở khoá, #level-N...) chỉ có ở máy dev hoặc trang chơi thử, không có trên host public / YouTube
  const DEV = !IN_YT && (!!window.TEST_UNLOCK_ALL || /^(localhost|127\.0\.0\.1)$/.test(location.hostname) || /[?&]dev\b/.test(location.search));

  const sdk = {
    firstFrameReady() { if (IN_YT) yt.game.firstFrameReady(); },
    gameReady() { if (IN_YT) yt.game.gameReady(); },
    sendScore(v) { if (IN_YT) yt.engagement.sendScore({ value: Math.floor(v) }).catch(() => {}); },
    // Trả về chuỗi đã lưu, hoặc null nếu tải thất bại (khi đó KHÔNG được lưu đè lên đám mây)
    async load() {
      for (let i = 0; i < 3; i++) {
        try {
          if (IN_YT) return (await yt.game.loadData()) || '';
          return localStorage.getItem('daovang_save') || '';
        } catch (e) { await new Promise(r => setTimeout(r, 400 * (i + 1))); }
      }
      sdk.warn();
      return null;
    },
    save(str) {
      try {
        if (IN_YT) return yt.game.saveData(str).catch(() => sdk.warn());
        localStorage.setItem('daovang_save', str);
      } catch (e) { sdk.warn(); }
    },
    error() { try { if (IN_YT) yt.health.logError(); } catch (e) { /* bỏ qua */ } },
    warn() { try { if (IN_YT) yt.health.logWarning(); } catch (e) { /* bỏ qua */ } },
    // Quảng cáo: chỉ có trong YouTube. Lỗi/không có quảng cáo => coi như xong, game chạy tiếp.
    canAds: () => FAKE_ADS || (IN_YT && !!(yt.ads && yt.ads.requestInterstitialAd)),
    async interstitial() {
      if (FAKE_ADS) return new Promise(r => setTimeout(r, 1200));
      try { await yt.ads.requestInterstitialAd(); } catch (e) { /* không có quảng cáo: bỏ qua */ }
    },
    async rewarded(id) {
      if (FAKE_ADS) return new Promise(r => setTimeout(() => r(true), 1200));
      try { return !!(await yt.ads.requestRewardedAd(id)); } catch (e) { return false; }
    },
    async language() {
      try { if (IN_YT) return await yt.system.getLanguage(); } catch (e) { /* bỏ qua */ }
      return 'en';
    },
    audioEnabled() { return IN_YT ? yt.system.isAudioEnabled() : true; },
    onAudioChange(cb) { if (IN_YT) yt.system.onAudioEnabledChange(cb); },
    onPause(cb) { if (IN_YT) yt.system.onPause(cb); },
    onResume(cb) { if (IN_YT) yt.system.onResume(cb); },
  };

  // ---------- Ngôn ngữ ----------
  const STR = {
    vi: {
      title: 'Hook & Haul Miner', tapStart: 'Chạm để bắt đầu', total: 'Tổng điểm',
      score: 'Tiền', target: 'Mục tiêu', time: 'Giờ', level: 'Màn',
      howto: 'Chạm để thả móc. Nút 🧨 phá vật nặng đang kéo.',
      win: 'Qua màn!', lose: 'Chưa đạt!', notEnough: 'Chưa đủ tiền mục tiêu', upHint: (a, b) => `💡 Nâng cấp giúp kéo nhanh hơn (khuyên: ${a} cấp, bạn có ${b})`, upTip: 'Chơi lại màn cũ hoặc Cơn sốt vàng để kiếm thêm tiền',
      shop: 'Cửa hàng', play: 'Vào màn ▶', next: 'Màn tiếp ▶', retry: 'Chơi lại', map: 'Bản đồ',
      resume: 'Tiếp tục', paused: 'Tạm dừng', wallet: 'Ví', earned: 'Cộng vào ví', best: 'Kỷ lục màn',
      musicOn: '♪ Nhạc: Bật', musicOff: '♪ Nhạc: Tắt', allClear: 'Bạn đã phá đảo cả 60 màn!',
      bonus: 'MÀN THƯỞNG: ít giờ, toàn vàng dễ lượm!', boss: 'MÀN TRÙM: cục vàng khổng lồ!',
      worlds: ['Đồng Cỏ', 'Sa Mạc', 'Hang Động', 'Núi Băng', 'Núi Lửa', 'Đáy Biển'],
      tips: [
        'Vàng to nặng, kéo lâu. Kim cương nhẹ mà đắt!',
        'Thằn lằn ngậm kim cương rất đáng giá. Hoá thạch cũng vậy!',
        'Cẩn thận thùng TNT: nổ là mất hết đồ xung quanh!',
        'Vàng đóng băng nặng nhưng giá cao. Chim cánh cụt đáng $80.',
        'Đá nham thạch rất nặng mà chẳng đáng tiền. Hồng ngọc giá $800!',
        'Chỉ móc sò khi đang mở để lấy ngọc trai. Rương báu giá $900!',
      ],
      dynamite: 'Thuốc nổ', strength: 'Thuốc khoẻ', clover: 'Cỏ may mắn', polish: 'Đá đánh bóng', rockbook: 'Sách về đá',
      dDynamite: 'Phá vật đang kéo (giữ qua các màn)', dStrength: 'Kéo nhanh gấp 1.8 lần', dClover: 'Túi bí ẩn tốt hơn',
      dPolish: 'Đá quý giá x1.5', dRockbook: 'Đá & nham thạch giá x3',
      owned: 'Đã có', time10: '+10 giây', adDynamite: '📺 QC: +1 🧨', tapHint: '👆 Chạm để thả móc!', testUnlock: 'Mở khoá tất cả (test)', testReset: 'Xoá tiến trình (test)',
      rush: 'Cơn sốt vàng', rushDesc: '60 giây · vàng mọc liên tục · quái dày dần', rushLocked: 'Qua màn 10 để mở',
      record: 'Kỷ lục', playMap: 'Chơi', escape: 'Bấm 🧨 để thoát!', escaped: 'Thoát hiểm!',
      monName: { mole: 'Chuột chũi khổng lồ', worm: 'Sâu cát khổng lồ', spider: 'Nhện hang khổng lồ', serpent: 'Rắn băng', salamander: 'Kỳ nhông lửa', shark: 'Cá mập' },
      monTip: (name) => `⚠ ${name}! Đừng để dây móc chạm vào nó`, eaten: (name) => `Bị ${name.toLowerCase()} kéo đi!`, ouch: 'Ối!',
      upgrades: 'Nâng cấp', max: 'TỐI ĐA', lvShort: 'Cấp', combo: 'COMBO', adDouble: '📺 QC: Nhân đôi tiền', doubled: 'Đã nhân đôi!',
      fakeAd: 'Quảng cáo giả lập (bản thử)',
      upClaw: 'Móc to', upWinch: 'Tời khoẻ', upDrop: 'Thả nhanh', upTime: 'Thêm giờ',
      gift: 'Quà hằng ngày', day: (d) => `Ngày ${d}`, claim: 'Nhận quà', claimAll: 'Nhận hết', claimed: 'Đã nhận', close: 'Đóng',
      giftBack: 'Quay lại ngày mai để nhận tiếp!', giftStreak: 'Vào game mỗi ngày: bỏ một ngày là quay lại Ngày 1', giftDouble: '📺 QC: Nhân đôi quà',
      quests: 'Nhiệm vụ', questsSub: 'Nhiệm vụ mới mỗi ngày', ach: 'Thành tựu mới!', achs: 'Thành tựu', page: 'Trang',
      q: { gold: (g) => `Kéo ${g} cục vàng`, gem: (g) => `Kéo ${g} viên đá quý`, critter: (g) => `Bắt ${g} con vật`, bag: (g) => `Mở ${g} túi bí ẩn`,
        dodge: (g) => `Né ${g} con quái vật`, combo: (g) => `Đạt combo x2 ${g} lần`, win: (g) => `Qua ${g} màn`, star3: (g) => `Đạt 3 sao ${g} màn`,
        earn: (g) => `Kiếm $${g} vào ví`, rush: (g) => `Chơi Cơn sốt vàng ${g} lần`, dyn: (g) => `Dùng ${g} thuốc nổ`, rescue: (g) => `Thoát hiểm ${g} lần`,
        stars: (g) => `Thu ${g} ⭐`, up: (g) => `Nâng cấp tổng ${g} cấp`, rushRec: (g) => `Kỷ lục Cơn sốt vàng $${g}` },
      worldClear: (w) => `Phá đảo ${w}`,
      revive: '📺 QC: Hồi sinh, chơi tiếp', revived: '💪 Hồi sinh!', reviveMon: 'Giữ nguyên tiền, quái đã bỏ đi', reviveTime: (s) => `Giữ nguyên tiền, +${s} giây`,
      dClaw: 'Dễ móc trúng đồ hơn', dWinch: 'Kéo mọi thứ lên nhanh hơn', dDrop: 'Móc lao xuống nhanh hơn', dTime: 'Thêm giờ mỗi màn',
    },
    en: {
      title: 'Hook & Haul Miner', tapStart: 'Tap to start', total: 'Total score',
      score: 'Money', target: 'Goal', time: 'Time', level: 'Level',
      howto: 'Tap to drop the hook. Use 🧨 to blast heavy junk.',
      win: 'Level clear!', lose: 'Not quite!', notEnough: 'Goal not reached', upHint: (a, b) => `💡 Upgrades haul faster (suggested: ${a} lv, you have ${b})`, upTip: 'Replay earlier levels or Gold Rush to earn more',
      shop: 'Shop', play: 'Start ▶', next: 'Next level ▶', retry: 'Retry', map: 'Map',
      resume: 'Resume', paused: 'Paused', wallet: 'Wallet', earned: 'Added to wallet', best: 'Level best',
      musicOn: '♪ Music: On', musicOff: '♪ Music: Off', allClear: 'You cleared all 60 levels!',
      bonus: 'BONUS LEVEL: short timer, easy gold!', boss: 'BOSS LEVEL: giant nugget!',
      worlds: ['Meadow', 'Desert', 'Cave', 'Ice Peak', 'Volcano', 'Sea Floor'],
      tips: [
        'Big gold is heavy and slow. Diamonds are light and pricey!',
        'Lizards carrying diamonds are worth a lot. So are fossils!',
        'Watch out for TNT: it blasts everything nearby!',
        'Frozen gold is heavy but valuable. Penguins are worth $80.',
        'Lava rocks are heavy and worthless. Rubies are $800!',
        'Grab clams only while open to get the pearl. Chests are $900!',
      ],
      dynamite: 'Dynamite', strength: 'Strength tonic', clover: 'Lucky clover', polish: 'Gem polish', rockbook: 'Rock guide',
      dDynamite: 'Blast what you pull (kept between levels)', dStrength: 'Pull 1.8x faster', dClover: 'Better mystery bags',
      dPolish: 'Gems worth x1.5', dRockbook: 'Rocks & lava worth x3',
      owned: 'Owned', time10: '+10 sec', adDynamite: '📺 Ad: +1 🧨', tapHint: '👆 Tap to drop the hook!', testUnlock: 'Unlock all (test)', testReset: 'Reset progress (test)',
      rush: 'Gold Rush', rushDesc: '60 seconds · gold keeps spawning · monsters ramp up', rushLocked: 'Clear level 10 to unlock',
      record: 'Best', playMap: 'Play', escape: 'Tap 🧨 to escape!', escaped: 'Escaped!',
      monName: { mole: 'Giant mole', worm: 'Giant sandworm', spider: 'Giant cave spider', serpent: 'Ice serpent', salamander: 'Fire salamander', shark: 'Shark' },
      monTip: (name) => `⚠ ${name}! Keep your rope away from it`, eaten: (name) => `Dragged away by the ${name.toLowerCase()}!`, ouch: 'Yikes!',
      upgrades: 'Upgrades', max: 'MAX', lvShort: 'Lv', combo: 'COMBO', adDouble: '📺 Ad: Double money', doubled: 'Doubled!',
      fakeAd: 'Simulated ad (test build)',
      upClaw: 'Big claw', upWinch: 'Strong winch', upDrop: 'Fast drop', upTime: 'Extra time',
      gift: 'Daily gift', day: (d) => `Day ${d}`, claim: 'Claim', claimAll: 'Claim all', claimed: 'Claimed', close: 'Close',
      giftBack: 'Come back tomorrow for the next gift!', giftStreak: 'Play every day: miss one and you restart at Day 1', giftDouble: '📺 Ad: Double gift',
      quests: 'Quests', questsSub: 'New quests every day', ach: 'Achievement unlocked!', achs: 'Achievements', page: 'Page',
      q: { gold: (g) => `Haul ${g} gold nuggets`, gem: (g) => `Haul ${g} gems`, critter: (g) => `Catch ${g} critters`, bag: (g) => `Open ${g} mystery bags`,
        dodge: (g) => `Dodge ${g} monsters`, combo: (g) => `Reach combo x2 ${g} times`, win: (g) => `Clear ${g} levels`, star3: (g) => `Get 3 stars on ${g} level${g > 1 ? 's' : ''}`,
        earn: (g) => `Earn $${g} for your wallet`, rush: (g) => `Play Gold Rush ${g} time${g > 1 ? 's' : ''}`, dyn: (g) => `Use ${g} dynamite`, rescue: (g) => `Escape ${g} time${g > 1 ? 's' : ''}`,
        stars: (g) => `Collect ${g} ⭐`, up: (g) => `Reach ${g} upgrade levels`, rushRec: (g) => `Gold Rush record $${g}` },
      worldClear: (w) => `Clear ${w}`,
      revive: '📺 Ad: Revive & continue', revived: '💪 Revived!', reviveMon: 'Money kept, the monster left', reviveTime: (s) => `Money kept, +${s} seconds`,
      dClaw: 'Easier to grab things', dWinch: 'Pull everything up faster', dDrop: 'Hook shoots down faster', dTime: 'More time every level',
    },
  };
  let L = STR.en;

  // ---------- Canvas & kích thước ----------
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const W = 600;          // chiều rộng logic cố định
  let H = 800;            // chiều cao logic thay đổi theo tỉ lệ màn hình
  let scale = 1, dpr = 1;
  // Màn ngang/vuông dùng bố cục "gọn": trời thấp hơn 50px để khung rộng hơn mà phần đất vẫn sâu
  let compact = false, GROUND = 185, OY = 118;
  const OX = W / 2;
  // Hệ số tốc độ móc: quãng đường trung bình tới đáy mỏ so với hình học chuẩn (cao 800, mặt đất 185)
  // => màn hình nào cũng mất cùng thời gian kéo như lúc tính mục tiêu trong levels.js
  let geoK = 1;
  function calcGeo() {
    const b = mineBounds();
    let real = 0, calib = 0;
    for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) {
      const x = 40 + i * (W - 80) / 5 - OX, fy = (j + 0.5) / 6;
      real += Math.hypot(x, b.top + fy * (b.bottom - b.top) - OY);
      calib += Math.hypot(x, 225 + fy * 549 - 118);
    }
    geoK = real / calib;
  }
  const bg = document.createElement('canvas');
  // Ảnh nền menu (asset pack A). Thiếu ảnh thì menu dùng nền vẽ bằng code.
  const menuImg = new Image();
  menuImg.src = 'img/menu_bg.jpg';
  let bgKey = '';

  function resize() {
    const cw = window.innerWidth, ch = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    const v = W * ch / cw;
    compact = v < 760;
    GROUND = compact ? 135 : 185; OY = GROUND - 67;
    H = Math.round(Math.min(1400, Math.max(compact ? 560 : 640, v)));   // màn ngang: tối thiểu 560 (thêm viền hai bên nếu cần)
    calcGeo();
    scale = Math.min(cw / W, ch / H);
    canvas.style.width = Math.round(W * scale) + 'px';
    canvas.style.height = Math.round(H * scale) + 'px';
    canvas.width = Math.round(W * scale * dpr);
    canvas.height = Math.round(H * scale * dpr);
    bgKey = '';
    layoutItems();
  }

  function background(worldId) {
    Art.loadEnv(worldId, () => { bgKey = ''; });     // tải nền ảnh của thế giới này (một lần)
    const key = worldId + H + canvas.width + Art.hasEnv(worldId);
    if (key !== bgKey) {
      bg.width = canvas.width; bg.height = canvas.height;
      const b = bg.getContext('2d');
      b.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
      if (Art.hasEnv(worldId)) Art.drawEnv(b, worldId, W, H, GROUND);
      else Art.drawBackground(b, worldId, W, H, GROUND);
      bgKey = key;
    }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(bg, 0, 0); ctx.restore();
  }

  // ---------- Âm thanh tổng hợp ----------
  let actx = null, master = null, musicGain = null, audioOn = true;
  function ensureAudio() {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      actx = new AC();
      master = actx.createGain();
      master.gain.value = audioOn ? 0.5 : 0;
      master.connect(actx.destination);
      musicGain = actx.createGain();
      musicGain.gain.value = save.music ? 0.6 : 0;
      musicGain.connect(master);
      startMusicTimer();
      startTrack(wantTrack);
      loadSfx();
    }
    if (actx.state === 'suspended' && !paused) actx.resume();
  }
  function setAudio(on) {
    audioOn = on;
    if (master) master.gain.value = on ? 0.5 : 0;
  }
  function osc(f, t, dur, type, vol, dest, f2) {
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function tone(f, dur, type = 'square', vol = 0.2, f2 = null, delay = 0) {
    if (!actx || !audioOn) return;
    osc(f, actx.currentTime + delay, dur, type, vol, master, f2);
  }
  function noise(dur, vol = 0.4) {
    if (!actx || !audioOn) return;
    const n = Math.floor(actx.sampleRate * dur);
    const buf = actx.createBuffer(1, n, actx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = actx.createBufferSource(), g = actx.createGain(), fl = actx.createBiquadFilter();
    fl.type = 'lowpass'; fl.frequency.value = 900;
    s.buffer = buf; g.gain.value = vol;
    s.connect(fl); fl.connect(g); g.connect(master); s.start();
  }
  // ---------- Hiệu ứng âm thanh: file trong sfx/ (tạo bằng tools/make-sfx.py) ----------
  // Tải sau lần chạm đầu (nhỏ, ~200 KB). File nào chưa tải xong/lỗi thì dùng tiếng tổng hợp.
  const SFX_NAMES = ['drop', 'grab', 'coin', 'big', 'gem', 'thud', 'squeak', 'bag', 'boom', 'fuse', 'tick',
    'click', 'buy', 'star1', 'star2', 'star3', 'win', 'lose', 'reel', 'splash', 'rumble', 'sharkwarn', 'chomp', 'hiss', 'roar'];
  const sfxBuf = {};
  let sfxLoading = false;
  function loadSfx() {
    if (sfxLoading || !actx) return;
    sfxLoading = true;
    for (const name of SFX_NAMES) {
      fetch(`sfx/${name}.${FMT}`)
        .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); })
        .then(ab => new Promise((res, rej) => actx.decodeAudioData(ab, res, rej)))
        .then(buf => { sfxBuf[name] = buf; })
        .catch(() => sdk.warn());
    }
  }
  // Phát một hiệu ứng; trả về false nếu chưa có file (để dùng tiếng tổng hợp)
  function play(name, vol = 0.7, rate = 1, delay = 0) {
    if (!actx || !audioOn) return true;
    const buf = sfxBuf[name];
    if (!buf) return false;
    const src = actx.createBufferSource(), g = actx.createGain();
    src.buffer = buf; src.playbackRate.value = rate; g.gain.value = vol;
    src.connect(g); g.connect(master); src.start(actx.currentTime + delay);
    return true;
  }
  const vary = () => 0.94 + Math.random() * 0.12; // lệch cao độ nhẹ cho đỡ lặp lại
  const sfx = {
    drop: () => play('drop', 0.5, vary()) || tone(520, 0.12, 'triangle', 0.15, 260),
    grab: () => play('grab', 0.6, vary()) || tone(180, 0.1, 'square', 0.12),
    coin: () => play('coin', 0.55, vary()) || (tone(880, 0.08, 'square', 0.12), tone(1320, 0.15, 'square', 0.12, null, 0.07)),
    big: () => play('big', 0.6) || [660, 880, 1100, 1320].forEach((f, i) => tone(f, 0.12, 'triangle', 0.15, null, i * 0.07)),
    gem: () => play('gem', 0.6) || sfx.big(),
    thud: () => play('thud', 0.8, vary()) || tone(120, 0.15, 'sine', 0.2, 60),
    squeak: () => play('squeak', 0.45, vary()) || tone(1400, 0.1, 'square', 0.08, 2200),
    bag: () => play('bag', 0.6) || tone(700, 0.1, 'triangle', 0.15, 1000),
    boom: () => play('boom', 0.85, vary()) || (noise(0.5, 0.6), tone(90, 0.4, 'sine', 0.3, 40)),
    fuse: () => play('fuse', 0.5),
    rumble: () => play('rumble', 0.75) || tone(55, 1.2, 'sawtooth', 0.12, 40),
    hiss: () => play('hiss', 0.7) || noise(0.8, 0.3),
    roar: () => play('roar', 0.8) || tone(90, 1.0, 'sawtooth', 0.15, 60),
    sharkwarn: () => play('sharkwarn', 0.8) || [0, 0.4, 0.75, 1.05].forEach(d => tone(82, 0.25, 'triangle', 0.25, null, d)),
    chomp: () => play('chomp', 0.9) || (noise(0.3, 0.6), tone(140, 0.4, 'sawtooth', 0.2, 50)),
    splash: () => play('splash', 0.45, vary()),
    tick: () => play('tick', 0.45) || tone(1000, 0.04, 'square', 0.06),
    win: () => play('win', 0.65) || [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'triangle', 0.18, null, i * 0.12)),
    lose: () => play('lose', 0.6) || [392, 330, 262].forEach((f, i) => tone(f, 0.25, 'sawtooth', 0.12, null, i * 0.18)),
    buy: () => play('buy', 0.55) || tone(700, 0.1, 'triangle', 0.15, 1000),
    click: () => play('click', 0.4) || tone(600, 0.05, 'square', 0.08),
    star: (i) => play('star' + (i + 1), 0.6, 1, 0.5 + i * 0.35) || tone(880 + i * 220, 0.2, 'triangle', 0.18, null, 0.15 + i * 0.25),
  };

  // Tiếng tời quay: lặp trong lúc kéo móc, vật càng nặng tời càng chậm/trầm
  let reel = null;
  function syncReel(pullSpeed) {
    const want = actx && audioOn && sfxBuf.reel && state === 'play' && hook.mode === 'retract';
    if (want && !reel) {
      const src = actx.createBufferSource(), g = actx.createGain();
      src.buffer = sfxBuf.reel; src.loop = true; g.gain.value = 0.1;
      src.connect(g); g.connect(master); src.start();
      reel = { src, g };
    } else if (!want && reel) {
      reel.src.stop(); reel = null;
    }
    if (reel) reel.src.playbackRate.value = Math.max(0.6, Math.min(1.3, pullSpeed / 420));
  }

  // ---------- Nhạc nền: 7 bản nhạc lặp trong audio/ (0 = menu, 1..6 = 6 thế giới) ----------
  // Tải lười: chỉ tải bản cần nghe, khi người chơi đã chạm (không làm chậm lúc mở game).
  // Tải lỗi => dùng nhạc tự sinh bằng code (bên dưới).
  const TRACKS = [
    ['01_Main_Menu', 33.1034], ['02_Grasslands', 30.9677], ['03_Desert', 35.5556], ['04_Cave', 40.0],
    ['05_Ice_Mountains', 34.9091], ['06_Volcano', 27.4286], ['07_Underwater', 38.4],
  ];
  const MUSIC_VOL = 0.55;
  // OGG lặp liền mạch nhất; Safari cũ không đọc được OGG thì dùng MP3
  const FMT = (() => { try { return new Audio().canPlayType('audio/ogg; codecs="vorbis"') ? 'ogg' : 'mp3'; } catch (e) { return 'mp3'; } })();
  const trackBuf = [], trackReq = [];
  let wantTrack = 0, playing = null;

  function loadTrack(i) {
    if (trackReq[i] || !actx) return;
    trackReq[i] = fetch(`audio/${TRACKS[i][0]}.${FMT}`)
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); })
      .then(ab => new Promise((res, rej) => actx.decodeAudioData(ab, res, rej)))
      .then(buf => { trackBuf[i] = buf; })
      .catch(() => { trackBuf[i] = null; sdk.warn(); })
      .then(() => { if (wantTrack === i) startTrack(i); });
  }

  function startTrack(i) {
    if (!actx || (playing && playing.idx === i)) return;
    const buf = trackBuf[i];
    if (buf === undefined) { loadTrack(i); return; }      // đang tải: phát khi tải xong
    const t = actx.currentTime;
    if (playing && playing.src) {                          // mờ dần bản cũ
      const p = playing;
      p.gain.gain.setValueAtTime(p.gain.gain.value, t);
      p.gain.gain.linearRampToValueAtTime(0, t + 0.6);
      p.src.stop(t + 0.7);
    }
    if (buf === null) { playing = { idx: i }; setSynth(i === 0 ? 0 : i - 1); return; }
    setSynth(-1);
    const src = actx.createBufferSource(), g = actx.createGain();
    src.buffer = buf; src.loop = true;
    // MP3 có thể chèn ~1105 mẫu im lặng ở đầu: bỏ qua để vòng lặp không bị khựng
    const dur = TRACKS[i][1], lead = buf.duration - dur > 0.02 ? 1105 / buf.sampleRate : 0;
    src.loopStart = lead; src.loopEnd = Math.min(buf.duration, lead + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(MUSIC_VOL, t + 0.8);
    src.connect(g); g.connect(musicGain); src.start(t, lead);
    playing = { idx: i, src, gain: g };
  }

  function setMusic(i) { wantTrack = i; startTrack(i); }

  // Nhạc dự phòng: mỗi thế giới một giai điệu tự sinh (seed cố định) theo thang âm riêng
  const SONGS = [
    { bpm: 118, wave: 'square',   vol: 0.035, root: 60, scale: [0, 2, 4, 7, 9] },
    { bpm: 104, wave: 'triangle', vol: 0.06,  root: 57, scale: [0, 1, 4, 5, 7, 8, 10] },
    { bpm: 88,  wave: 'triangle', vol: 0.06,  root: 55, scale: [0, 3, 5, 7, 10] },
    { bpm: 100, wave: 'sine',     vol: 0.07,  root: 67, scale: [0, 2, 4, 7, 11] },
    { bpm: 138, wave: 'sawtooth', vol: 0.022, root: 52, scale: [0, 3, 5, 6, 7, 10] },
    { bpm: 94,  wave: 'triangle', vol: 0.06,  root: 62, scale: [0, 2, 3, 5, 7, 9] },
  ];
  const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
  let song = null, songWorld = -1, step = 0, nextNote = 0;
  function makeSong(w) {
    const s = SONGS[w], R = rng(w * 31 + 5), mel = [];
    let d = 4;
    for (let i = 0; i < 32; i++) {
      if (i % 2 && R() < 0.35) { mel.push(null); continue; }
      d = Math.max(0, Math.min(9, d + Math.floor(R() * 5) - 2));
      mel.push(d);
    }
    mel[31] = null; mel[30] = 0;
    return { ...s, mel, stepDur: 60 / s.bpm / 2 };
  }
  function degree(s, d) { return s.root + 12 * Math.floor(d / s.scale.length) + s.scale[d % s.scale.length]; }
  function setSynth(w) {           // w < 0: tắt nhạc tự sinh
    if (w === songWorld) return;
    songWorld = w; song = w < 0 ? null : makeSong(w); step = 0;
    if (actx) nextNote = actx.currentTime + 0.1;
  }
  let musicTimer = null;
  function startMusicTimer() { if (!musicTimer && actx) musicTimer = setInterval(scheduleMusic, 50); }
  function stopMusicTimer() { clearInterval(musicTimer); musicTimer = null; }
  function scheduleMusic() {
    if (!actx || !song || actx.state !== 'running') return;
    if (nextNote < actx.currentTime) nextNote = actx.currentTime + 0.05;
    while (nextNote < actx.currentTime + 0.25) {
      const d = song.mel[step];
      if (d !== null) osc(midi(degree(song, d)), nextNote, song.stepDur * 0.9, song.wave, song.vol, musicGain);
      if (step % 4 === 0) {
        const bassDeg = [0, 0, 3, 4, 0, 0, 3, 2][(step / 4) | 0] || 0;
        osc(midi(degree(song, bassDeg) - 24), nextNote, song.stepDur * 3, 'triangle', 0.08, musicGain);
      }
      nextNote += song.stepDur;
      step = (step + 1) % song.mel.length;
    }
  }

  // ---------- Lưu tiến trình ----------
  const NEW_UP = () => ({ claw: 0, winch: 0, drop: 0, time: 0 });
  const NEW_SAVE = (music = true) => ({ v: 3, unlocked: 1, stars: [], best: [], wallet: 0, dynamite: 1, music, up: NEW_UP(), rushBest: 0,
    daily: { last: -1, streak: 0 }, quests: { day: -1, list: [] }, stats: {}, ach: [] });
  let save = NEW_SAVE();
  const totalStars = () => save.stars.reduce((a, b) => a + (b || 0), 0);
  let loaded = false; // saveData chỉ được gọi sau khi loadData thành công
  function persist() { if (loaded) sdk.save(JSON.stringify(save)); }

  // Đọc bản lưu (kể cả từ phiên bản cũ) một cách an toàn
  function applySave(str) {
    let d = null;
    try { d = JSON.parse(str || '{}'); } catch (e) { sdk.warn(); return; }
    if (!d || typeof d !== 'object') return;
    const num = (v, lo, hi, def) => (Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.floor(v))) : def);
    const arr = (a, hi) => (Array.isArray(a) ? a.slice(0, COUNT).map(v => num(v, 0, hi, 0)) : []);
    save.unlocked = num(d.unlocked, 1, COUNT, 1);
    save.stars = arr(d.stars, 3);
    save.best = arr(d.best, 1e9);
    save.wallet = num(d.wallet, 0, 1e9, 0);
    save.dynamite = num(d.dynamite, 0, 9, 1);
    save.music = d.music !== false;
    save.rushBest = num(d.rushBest, 0, 1e9, 0);
    const u = d.up && typeof d.up === 'object' ? d.up : {};
    save.up = { claw: num(u.claw, 0, 5, 0), winch: num(u.winch, 0, 5, 0), drop: num(u.drop, 0, 5, 0), time: num(u.time, 0, 5, 0) };
    const dl = d.daily && typeof d.daily === 'object' ? d.daily : {};
    save.daily = { last: num(dl.last, -1, 1e7, -1), streak: num(dl.streak, 0, 7, 0) };
    const qs = d.quests && typeof d.quests === 'object' ? d.quests : {};
    const ql = Array.isArray(qs.list) ? qs.list.filter(q => q && QUESTS[q.k]).slice(0, 3) : [];
    save.quests = { day: num(qs.day, -1, 1e7, -1), list: ql.map(q => ({ k: q.k, p: num(q.p, 0, 1e9, 0), c: q.c === true })) };
    const st = d.stats && typeof d.stats === 'object' ? d.stats : {};
    save.stats = {};
    for (const k of STAT_KEYS) if (st[k] !== undefined) save.stats[k] = num(st[k], 0, 1e12, 0);
    save.ach = Array.isArray(d.ach) ? d.ach.filter(id => ACH.some(a => a.id === id)) : [];
  }

  // ---------- Trạng thái ----------
  let state = 'loading'; // menu | map | shop | play | pause | result
  let paused = false;    // do YouTube yêu cầu
  let lvl = null, n = 1, score = 0, timeLeft = 60, items = [];
  let perks = {}, floats = [], particles = [], buttons = [], booms = [], happyT = 0, rings = [], upFlash = null;
  let mon = null, nextMonT = Infinity, caughtT = 0;
  let bonusT = 0, combo = 0, shownScore = 0, scorePop = 0, flashT = 0, coins = [], confetti = [];
  const comboMul = () => (combo >= 5 ? 2 : combo >= 3 ? 1.5 : 1);
  const COMBO_BREAK = new Set(['rock', 'lava', 'anchor', 'bone', 'skull']);
  const CONF_COLORS = ['#ffd23f', '#ff6b6b', '#7dff7a', '#6fd6ff', '#b07aff', '#ffffff'];
  function makeConfetti(x, y) {
    return { x, y, vx: (Math.random() - 0.5) * 320, vy: -160 - Math.random() * 260, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12,
             w: 5 + Math.random() * 5, h: 3 + Math.random() * 3, c: CONF_COLORS[(Math.random() * CONF_COLORS.length) | 0], life: 2.6 };
  }
  let banner = null, result = null, mapWorld = 0, shake = 0, lastTick = 0, now = 0;
  const hook = { phase: 0, angle: 0, len: 40, mode: 'swing', item: null };
  const BASE_LEN = 70; // móc nghỉ treo ngay miệng hố, dưới bệ kéo

  function mineBounds() { return { top: GROUND + 40, bottom: H - 26 }; }
  function layoutItems() {
    const b = mineBounds();
    for (const it of items) if (it !== hook.item) it.baseY = it.y = b.top + it.fy * (b.bottom - b.top);
  }

  const SHOP = [
    { id: 'dynamite', icon: '🧨', price: (k) => 40 + k * 4 },
    { id: 'strength', icon: '💪', price: (k) => 100 + k * 8 },
    { id: 'clover',   icon: '🍀', price: (k) => 60 + k * 5 },
    { id: 'polish',   icon: '💎', price: (k) => 80 + k * 6 },
    { id: 'rockbook', icon: '📘', price: (k) => 30 + k * 2 },
  ];

  // ---------- Nâng cấp vĩnh viễn (5 cấp mỗi loại, mua bằng tiền trong ví) ----------
  const UPGRADES = [
    { id: 'claw',  sprite: 'hook_open', icon: '🪝', prices: window.Levels.UP_PRICES.claw },
    { id: 'winch', sprite: 'winch',     icon: '⚙', prices: window.Levels.UP_PRICES.winch },
    { id: 'drop',  sprite: null,        icon: '⚡', prices: window.Levels.UP_PRICES.drop },
    { id: 'time',  sprite: null,        icon: '⏱', prices: window.Levels.UP_PRICES.time },
  ];
  const upName = { claw: 'upClaw', winch: 'upWinch', drop: 'upDrop', time: 'upTime' };
  const upDesc = { claw: 'dClaw', winch: 'dWinch', drop: 'dDrop', time: 'dTime' };
  // Chỉ số hiển thị cho từng cấp (khớp với grabBonus / pullMul / dropSpeed / thời gian)
  const upEffect = (id, lv) => (id === 'time' ? `+${4 * lv}s` : `+${(id === 'claw' ? 15 : 12) * lv}%`);
  const upPrice = (u) => (save.up[u.id] < 5 ? u.prices[save.up[u.id]] : null);
  const canUpgrade = () => UPGRADES.some(u => upPrice(u) !== null && save.wallet >= upPrice(u));
  const grabBonus = () => 4 * save.up.claw;                          // bán kính kẹp +4/cấp
  const pullMul = () => (perks.strength ? 1.8 : 1) * (1 + 0.12 * save.up.winch);
  const dropSpeed = () => 460 * (1 + 0.12 * save.up.drop) * geoK;
  function pullSpeed() { return (hook.item ? (560 / hook.item.weight) * pullMul() : 650) * geoK; }

  function buyUpgrade(u) {
    const price = upPrice(u);
    if (price === null || save.wallet < price) { sfx.thud(); return; }
    save.wallet -= price; save.up[u.id]++; sfx.buy(); persist();
    upFlash = { id: u.id, t: 1.2 };
    for (let i = 0; i < 24; i++) confetti.push(makeConfetti(W / 2 + (Math.random() - 0.5) * 200, H * 0.35));
  }
  let upFrom = 'map';
  function openUpgrades(from) { upFrom = from; state = 'upgrade'; }

  function openShop(k) { n = k; perks = {}; rewardUsed = false; setMusic(1 + Math.floor((n - 1) / PER_WORLD)); state = 'shop'; }

  function buy(o) {
    const price = o.price(n);
    const owned = o.id === 'dynamite' ? save.dynamite >= 9 : perks[o.id];
    if (owned || save.wallet < price) { sfx.thud(); return; }
    save.wallet -= price; sfx.buy();
    if (o.id === 'dynamite') save.dynamite++;
    else perks[o.id] = true;
    persist();
  }

  // ---------- Chế độ Cơn sốt vàng: 60 giây, đồ mọc liên tục, tính kỷ lục ----------
  const RUSH_UNLOCK = 10, RUSH_ITEMS = 16;
  const rushOpen = () => save.unlocked > RUSH_UNLOCK;
  let rush = false, respawn = [];
  function rushPool(w) {
    const pool = [];
    for (const t of Object.keys(WORLDS[w].mix)) {
      const k = TYPES[t].kind === 'gold' ? 4 : t === 'tnt' ? 1 : 2;
      for (let i = 0; i < k; i++) pool.push(t);
    }
    return pool;
  }
  function spawnRushItem() {
    const pool = rushPool(lvl.world), b = mineBounds();
    const type = pool[(Math.random() * pool.length) | 0], T = TYPES[type];
    for (let tries = 0; tries < 40; tries++) {
      const x = 24 + T.r + Math.random() * (W - 48 - 2 * T.r), fy = 0.04 + Math.random() * 0.94;
      const y = b.top + fy * (b.bottom - b.top);
      if (items.some(o => Math.hypot(o.x - x, o.baseY - y) < o.r + T.r + 8)) continue;
      if (hook.mode !== 'swing' && Math.hypot(tip().x - x, tip().y - y) < T.r + 30) continue;   // không mọc ngay dưới móc
      const it = makeItem(Math.random, type, x, fy);
      it.baseY = it.y = y; it.spawnT = 0;
      items.push(it);
      return;
    }
  }
  function startRush() {
    rush = true; refreshQuests();
    const w = Math.floor(Math.random() * (Math.min(WORLDS.length - 1, Math.floor((save.unlocked - 1) / PER_WORLD)) + 1));
    lvl = { n: 0, world: w, worldId: WORLDS[w].id, idx: 0, tag: 'rush', items: [], time: 60, target: 0, stars: [Infinity, Infinity, Infinity],
            monster: { kind: window.Levels.MONSTERS[w], every: [9, 14], speed: 150 } };
    items = lvl.items; respawn = []; perks = {};
    hook.mode = 'swing'; hook.len = BASE_LEN; hook.item = null; hook.phase = 0;
    for (let i = 0; i < RUSH_ITEMS; i++) spawnRushItem();
    for (const it of items) it.spawnT = 1;
    score = 0; shownScore = 0; timeLeft = 60 + 4 * save.up.time; combo = 0;
    floats = []; particles = []; result = null;
    mon = null; caughtT = 0; nextMonT = 15;          // quái bắt đầu từ giây thứ 15
    Art.loadMonster(lvl.monster.kind);
    setMusic(1 + w);
    banner = { head: '⚡ ' + L.rush, sub: L.rushDesc, life: 2.5 };
    state = 'play';
  }
  const restart = () => (rush ? startRush() : startLevel());

  // ---------- Quà hằng ngày, nhiệm vụ ngày, thành tựu ----------
  // Ngày tính theo đồng hồ máy người chơi (không gọi mạng).
  const today = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
  const worldOf = () => Math.min(WORLDS.length - 1, Math.floor((save.unlocked - 1) / PER_WORLD));
  const rewardScale = () => [1, 1.6, 2.4, 3.4, 4.6, 6][worldOf()];   // thưởng lớn dần theo thế giới đã mở
  const r50 = (v) => Math.round(v / 50) * 50;

  // Quà 7 ngày liên tiếp; bỏ một ngày là quay lại ngày 1
  const DAILY = [{ m: 500 }, { m: 800 }, { d: 1 }, { m: 1500 }, { m: 2000 }, { d: 2 }, { m: 4000, d: 1 }];
  const giftReady = () => save.daily.last !== today();
  const giftDay = () => (save.daily.last === today() - 1 ? save.daily.streak % 7 : 0);   // chỉ số ngày sẽ nhận
  let gift = null;   // { idx, m, d, doubled } sau khi vừa nhận
  function claimGift() {
    if (!giftReady()) return;
    const idx = giftDay(), g = DAILY[idx];
    const m = r50((g.m || 0) * rewardScale()), d = g.d || 0;
    save.daily = { last: today(), streak: idx + 1 };
    save.wallet += m; save.dynamite = Math.min(9, save.dynamite + d);
    gift = { idx, m, d, doubled: false };
    persist(); sfx.big();
    for (let i = 0; i < 70; i++) confetti.push(makeConfetti(W / 2, H * 0.35));
  }

  // Nhiệm vụ ngày: 3 nhiệm vụ chọn theo ngày từ danh sách dưới (g = mục tiêu, r = thưởng gốc)
  const QUESTS = {
    gold:    { g: 12, r: 600 },
    gem:     { g: 4,  r: 700 },
    critter: { g: 4,  r: 600 },
    bag:     { g: 4,  r: 500 },
    dodge:   { g: 4,  r: 700, ok: () => save.unlocked >= 6 },
    combo:   { g: 2,  r: 700 },
    win:     { g: 3,  r: 800 },
    star3:   { g: 1,  r: 800 },
    earn:    { g: 2500, r: 600, scale: true },
    rush:    { g: 1,  r: 600, ok: () => rushOpen() },
    dyn:     { g: 2,  r: 500 },
  };
  const questGoal = (k) => (QUESTS[k].scale ? r50(QUESTS[k].g * rewardScale()) : QUESTS[k].g);
  const questReward = (k) => r50(QUESTS[k].r * rewardScale());
  function refreshQuests() {
    const d = today();
    if (save.quests.day === d && save.quests.list.length) return;
    const R = rng(d * 7919 + 13), pool = Object.keys(QUESTS).filter(k => !QUESTS[k].ok || QUESTS[k].ok()), list = [];
    while (list.length < 3 && pool.length) list.push({ k: pool.splice(Math.floor(R() * pool.length), 1)[0], p: 0, c: false });
    save.quests = { day: d, list };
  }
  const questDone = (q) => q.p >= questGoal(q.k);

  // Thành tựu: mỗi chỉ số có nhiều bậc 🥉🥈🥇, thưởng một lần
  const ACH = [];
  const tiers = (stat, goals, rewards) => goals.forEach((g, i) => ACH.push({ id: `${stat}${i}`, stat, g, r: rewards[i], tier: i }));
  tiers('gold',    [50, 300, 1500],    [500, 2000, 8000]);
  tiers('gem',     [20, 120, 500],     [600, 2500, 9000]);
  tiers('critter', [10, 60, 250],      [500, 2000, 7000]);
  tiers('bag',     [10, 60, 250],      [500, 2000, 7000]);
  tiers('dodge',   [10, 60, 250],      [800, 3000, 9000]);
  tiers('combo',   [5, 30, 120],       [600, 2500, 8000]);
  tiers('rescue',  [1, 10, 40],        [500, 2500, 8000]);
  tiers('earn',    [20000, 150000, 1000000], [1000, 5000, 15000]);
  tiers('stars',   [30, 90, 180],      [1000, 4000, 15000]);
  tiers('up',      [5, 12, 20],        [1000, 4000, 12000]);
  tiers('rushRec', [3000, 10000, 25000], [1000, 4000, 12000]);
  for (let w = 0; w < WORLDS.length; w++) ACH.push({ id: `world${w}`, stat: 'world', w, g: 1, r: [1000, 2000, 3500, 5000, 7000, 12000][w], tier: 3 });
  const STAT_KEYS = ['gold', 'gem', 'critter', 'bag', 'dodge', 'combo', 'rescue', 'earn', 'win', 'star3', 'rush', 'dyn'];
  function statOf(a) {
    if (a.stat === 'stars') return totalStars();
    if (a.stat === 'up') return save.up.claw + save.up.winch + save.up.drop + save.up.time;
    if (a.stat === 'rushRec') return save.rushBest;
    if (a.stat === 'world') return (a.w < WORLDS.length - 1 ? save.unlocked > (a.w + 1) * PER_WORLD : (save.stars[COUNT - 1] || 0) > 0) ? 1 : 0;
    return save.stats[a.stat] || 0;
  }
  const achReady = (a) => !save.ach.includes(a.id) && statOf(a) >= a.g;
  function claimAch(a) {
    if (!achReady(a)) return 0;
    save.ach.push(a.id); save.wallet += a.r;
    return a.r;
  }
  const pending = () => ({
    gift: loaded && giftReady(),
    quests: save.quests.list.some(q => !q.c && questDone(q)),
    ach: ACH.some(achReady),
  });

  // Ghi nhận sự kiện khi chơi => cộng chỉ số thành tựu + tiến độ nhiệm vụ
  function track(k, amount = 1) {
    save.stats[k] = (save.stats[k] || 0) + amount;
    if (save.quests.day !== today()) return;
    for (const q of save.quests.list) {
      if (q.k !== k || q.c) continue;
      const was = questDone(q);
      q.p = Math.min(questGoal(k), q.p + amount);
      if (!was && questDone(q)) {
        floats.push({ x: W / 2, y: GROUND + 96, text: '📋 ✓ ' + L.q[k](questGoal(k)), life: 2, center: true, color: '#7dff7a' });
        sfx.star(2);
      }
    }
    for (const a of ACH) if (a.stat === k && a.g <= save.stats[k] && a.g > save.stats[k] - amount && !save.ach.includes(a.id)) {
      floats.push({ x: W / 2, y: GROUND + 124, text: '🏅 ' + L.ach, life: 2, center: true, color: '#ffd23f' });
    }
  }

  let achPage = 0, toast = null;
  const POPUPS = new Set(['daily', 'quests', 'achieve']);
  function openPopup(s) { refreshQuests(); gift = null; state = s; if (s === 'achieve') achPage = 0; }
  function claimAllQuests() {
    let sum = 0;
    for (const q of save.quests.list) if (!q.c && questDone(q)) { q.c = true; sum += questReward(q.k); }
    if (sum) { save.wallet += sum; persist(); sfx.big(); toast = { text: `+$${sum}`, life: 1.5 }; }
  }
  function claimAllAch() {
    let sum = 0;
    for (const a of ACH) sum += claimAch(a);
    if (sum) { persist(); sfx.big(); toast = { text: `+$${sum}`, life: 1.5 }; for (let i = 0; i < 50; i++) confetti.push(makeConfetti(W / 2, H * 0.3)); }
  }

  function startLevel() {
    rush = false; reviveUsed = false; refreshQuests();
    lvl = build(n);
    items = lvl.items;
    score = 0; shownScore = 0; timeLeft = lvl.time + 4 * save.up.time; combo = 0;
    bonusT = save.up.time > 0 ? 3 : 0;   // Thêm giờ: hiện "+Ns" cạnh đồng hồ vài giây đầu
    hook.mode = 'swing'; hook.len = BASE_LEN; hook.item = null; hook.phase = 0;
    floats = []; particles = []; result = null;
    layoutItems();
    setMusic(1 + lvl.world);
    const head = `${L.level} ${n} · ${L.worlds[lvl.world]}`;
    mon = null; caughtT = 0;
    nextMonT = lvl.monster ? 6 + Math.random() * 4 : Infinity;   // lần đầu sau 6–10 giây
    if (lvl.monster) Art.loadMonster(lvl.monster.kind);
    const sub = lvl.monster ? L.monTip(L.monName[lvl.monster.kind])
      : lvl.tag === 'bonus' ? L.bonus : lvl.tag === 'boss' ? L.boss : L.tips[lvl.world];
    banner = { head, sub, life: 3 };
    state = 'play';
  }

  let levelsSinceAd = 0, adBusy = false, rewardUsed = false;
  const AD_EVERY = 3;

  // Chạy quảng cáo (nếu có) rồi mới làm tiếp `then`. Nhạc/tiếng tắt trong lúc chờ.
  async function withAd(kind, then, rewardId) {
    if (adBusy) return;
    adBusy = true; state = 'ad';
    if (master) master.gain.value = 0;
    let ok = false;
    const timeout = new Promise(r => setTimeout(() => r(false), 90000)); // phòng khi promise treo
    try {
      ok = kind === 'reward' ? await Promise.race([sdk.rewarded(rewardId), timeout])
                             : (await Promise.race([sdk.interstitial(), timeout]), true);
    } finally {
      adBusy = false;
      setAudio(audioOn);
      last = performance.now();
    }
    then(ok);
  }

  // Thua: chơi lại màn từ đầu, hoặc xem QC tặng thưởng để hồi sinh (một lần mỗi lượt chơi), giữ nguyên tiền đang có
  const REVIVE_TIME = 15;
  let reviveUsed = false;
  const canRevive = () => !!result && !result.win && !result.rush && !reviveUsed && sdk.canAds()
    && (result.eatenBy || items.some(i => !JUNK.has(i.kind)));
  function revive() {
    withAd('reward', (ok) => {
      state = 'result';
      if (!ok || !canRevive()) return;
      reviveUsed = true;
      save.wallet -= result.earned; track('earn', -result.earned); persist();   // tiền nửa màn chưa tính, chơi tiếp
      const eaten = result.eatenBy;
      if (eaten) { mon = null; nextMonT = nextGap() + 3; caughtT = 0; } else timeLeft = REVIVE_TIME;
      timeLeft = Math.max(timeLeft, 8);
      hook.mode = 'swing'; hook.len = BASE_LEN; hook.item = null; hook.phase = 0; combo = 0;
      result = null; confetti = [];
      banner = { head: L.revived, sub: eaten ? L.reviveMon : L.reviveTime(REVIVE_TIME), life: 2 };
      sfx.big(); state = 'play';
    }, 'revive-1');
  }

  // Điểm dừng tự nhiên giữa các màn
  function betweenLevels(next) {
    levelsSinceAd++;
    if (sdk.canAds() && save.unlocked > 3 && levelsSinceAd >= AD_EVERY) {
      levelsSinceAd = 0;
      withAd('interstitial', () => next());
    } else next();
  }

  function endLevel(eatenBy = null) {
    hook.item = null; hook.mode = 'swing'; hook.len = BASE_LEN;
    if (rush) {
      const earned = Math.floor(score / 2), newBest = score > save.rushBest;
      save.wallet += earned; track('earn', earned); track('rush');
      if (newBest) save.rushBest = score;
      persist();
      sdk.sendScore(save.rushBest);   // bảng điểm YouTube = kỷ lục Cơn sốt vàng (khớp với số hiển thị trong game)
      result = { rush: true, win: true, stars: 0, earned, newBest, doubled: false, eatenBy };
      mon = null; caughtT = 0;
      if (newBest && score > 0) { for (let i = 0; i < 110; i++) confetti.push(makeConfetti(W * (0.2 + Math.random() * 0.6), H * 0.3)); sfx.win(); }
      else if (eatenBy) sfx.lose(); else sfx.win();
      state = 'result';
      return;
    }
    const win = !eatenBy && score >= lvl.target;
    const stars = lvl.stars.filter(s => score >= s).length;
    const earned = win ? score : Math.floor(score / 2);
    const i = n - 1;
    const newBest = score > (save.best[i] || 0);
    save.wallet += earned; track('earn', earned);
    if (win) {
      track('win'); if (stars === 3) track('star3');
      save.stars[i] = Math.max(save.stars[i] || 0, stars);
      if (newBest) save.best[i] = score;
      save.unlocked = Math.min(COUNT, Math.max(save.unlocked, n + 1));
    }
    persist();
    result = { win, stars: win ? stars : 0, earned, newBest: win && newBest, doubled: false, eatenBy };
    mon = null; caughtT = 0;
    if (win) {
      const k = stars === 3 ? 110 : stars === 2 ? 50 : 20;
      for (let i = 0; i < k; i++) confetti.push(makeConfetti(W * (0.2 + Math.random() * 0.6), H * 0.3));
    }
    if (win) { sfx.win(); for (let k = 0; k < stars; k++) sfx.star(k); } else sfx.lose();
    state = 'result';
  }

  // ---------- Điều khiển ----------
  let firedOnce = false;
  function fireHook() {
    if (state !== 'play' || hook.mode !== 'swing') return;
    firedOnce = true;
    hook.mode = 'extend'; sfx.drop();
  }

  const RESCUE = 0.55;   // khung thời gian (theo đồng hồ của cảnh bị ngoạm) để dùng thuốc nổ thoát
  const rescueOpen = () => state === 'caught' && mon && caughtT < RESCUE && save.dynamite > 0;
  function rescue() {
    save.dynamite--; track('dyn'); track('rescue'); persist();
    burst(mon.x, mon.y, 60, '#ff6a1a'); burst(mon.x - mon.dir * 60, mon.y, 40, '#ff6a1a');
    shake = 0.5; sfx.boom();
    floats.push({ x: W / 2, y: GROUND + 34, text: '💥 ' + L.escaped, life: 1.4, big: true, center: true, color: '#7dff7a' });
    mon = null; nextMonT = nextGap(); caughtT = 0;
    hook.item = null; hook.mode = 'retract';
    state = 'play';
  }

  function useDynamite() {
    if (rescueOpen()) { rescue(); return; }
    if (state !== 'play' || hook.mode !== 'retract' || !hook.item || save.dynamite <= 0) return;
    save.dynamite--; track('dyn'); persist();
    const it = hook.item;
    burst(it.x, it.y, it.r, '#ffb02e');
    hook.item = null;
    shake = 0.25;
    sfx.boom();
  }

  function burst(x, y, r, color) {
    booms.push({ x, y, size: Math.max(70, r * 3.2), p: 0 });
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 260;
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.6 + Math.random() * 0.4, r: 2 + Math.random() * (r / 6), c: Math.random() < 0.5 ? color : '#7a6a5a' });
    }
  }

  function blowTNT(t) {
    burst(t.x, t.y, 40, '#ff6a1a');
    const R = 100;
    for (const o of items.slice()) {
      if (Math.hypot(o.x - t.x, o.y - t.y) < R + o.r * 0.5) {
        items.splice(items.indexOf(o), 1);
        if (o.kind === 'tnt') blowTNT(o);
        else burst(o.x, o.y, o.r, '#ffb02e');
      }
    }
    shake = 0.4;
    sfx.boom();
  }

  let mapSel = 0;
  function goMap(w) {
    mapWorld = w; setMusic(0); loadTrack(1 + w); state = 'map';
    mapSel = Math.max(0, Math.min(PER_WORLD - 1, save.unlocked - 1 - w * PER_WORLD));
  }
  function moveMapSel(code) {
    const lastWorld = Math.floor((save.unlocked - 1) / PER_WORLD);
    let i = mapSel + (code === 'ArrowLeft' ? -1 : code === 'ArrowRight' ? 1 : code === 'ArrowUp' ? -5 : 5);
    if (i < 0 && mapWorld > 0) { mapWorld--; i += PER_WORLD; }
    else if (i >= PER_WORLD && mapWorld < lastWorld) { mapWorld++; i -= PER_WORLD; }
    mapSel = Math.max(0, Math.min(PER_WORLD - 1, i));
    sfx.click();
  }

  // Nút trúng điểm chạm. Nút nhỏ được nới vùng chạm tới tối thiểu 48x48 px màn hình.
  function hitButton(px, py) {
    const min = 48 / scale;
    let best = null, bestD = Infinity;
    for (let i = buttons.length - 1; i >= 0; i--) {
      const b = buttons[i];
      if (b.enabled === false) continue;
      if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) return b;
      const padX = Math.max(0, (min - b.w) / 2), padY = Math.max(0, (min - b.h) / 2);
      if (px >= b.x - padX && px <= b.x + b.w + padX && py >= b.y - padY && py <= b.y + b.h + padY) {
        const d = Math.hypot(px - (b.x + b.w / 2), py - (b.y + b.h / 2));
        if (d < bestD) { bestD = d; best = b; }
      }
    }
    return best;
  }

  function onTap(px, py) {
    ensureAudio();
    if (paused) return;
    const b = hitButton(px, py);
    if (b) { b.fn(); return; }
    if (state === 'menu') { sfx.click(); goMap(Math.floor((save.unlocked - 1) / PER_WORLD)); return; }
    if (state === 'play') fireHook();
    else if (state === 'caught') useDynamite();   // chạm bất kỳ đâu để dùng thuốc nổ thoát
  }

  let hoverX = -1, hoverY = -1;
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = canvas.getBoundingClientRect();
    hoverX = (e.clientX - r.left) / r.width * W; hoverY = (e.clientY - r.top) / r.height * H;
  });
  canvas.addEventListener('pointerleave', () => { hoverX = hoverY = -1; });
  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    onTap((e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H);
  });
  window.addEventListener('keydown', (e) => {
    ensureAudio();
    if (paused) return;
    if (state === 'map' && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
      e.preventDefault(); moveMapSel(e.code); return;
    }
    if (state === 'shop' && /^Digit[1-5]$/.test(e.code)) { buy(SHOP[+e.code.slice(5) - 1]); return; }
    if (state === 'upgrade' && /^Digit[1-4]$/.test(e.code)) { buyUpgrade(UPGRADES[+e.code.slice(5) - 1]); return; }
    if (state === 'map' && e.code === 'KeyU') { openUpgrades('map'); return; }
    if (state === 'result' && e.code === 'KeyV' && canRevive()) { revive(); return; }
    if (state === 'menu' && e.code === 'KeyR' && rushOpen()) { startRush(); return; }
    if (state === 'menu' && e.code === 'KeyG') { openPopup('daily'); return; }
    if (state === 'menu' && e.code === 'KeyQ') { openPopup('quests'); return; }
    if (state === 'menu' && e.code === 'KeyA') { openPopup('achieve'); return; }
    if (POPUPS.has(state)) {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault(); sfx.click();
        const p = pending();
        if (state === 'daily' && giftReady()) claimGift();
        else if (state === 'quests' && p.quests) claimAllQuests();
        else if (state === 'achieve' && p.ach) claimAllAch();
        else state = 'menu';
      } else if (state === 'achieve' && (e.code === 'ArrowLeft' || e.code === 'ArrowRight')) {
        e.preventDefault(); achPage += e.code === 'ArrowLeft' ? -1 : 1; sfx.click();
      } else if (e.code === 'Escape') state = 'menu';
      return;
    }
    if (e.code === 'Space' || e.code === 'ArrowDown' || e.code === 'Enter') {
      e.preventDefault();
      if (state === 'play') fireHook();
      else if (state === 'caught') useDynamite();
      else if (state === 'menu') goMap(Math.floor((save.unlocked - 1) / PER_WORLD));
      else if (state === 'map') { const k = mapWorld * PER_WORLD + mapSel + 1; if (k <= save.unlocked) { sfx.click(); openShop(k); } }
      else if (state === 'shop') startLevel();
      else if (state === 'pause') state = 'play';
      else if (state === 'result') betweenLevels(() => (result.rush ? startRush() : openShop(result.win && n < COUNT ? n + 1 : n)));
    } else if (e.code === 'ArrowUp') {
      e.preventDefault(); useDynamite();
    } else if (e.code === 'Escape' || e.code === 'KeyP') {
      // Không gọi preventDefault cho Esc (yêu cầu 3.2)
      if (state === 'play') state = 'pause';
      else if (state === 'pause') state = 'play';
      else if (e.code === 'Escape') {
        if (state === 'shop') goMap(Math.floor((n - 1) / PER_WORLD));
        else if (state === 'upgrade') { if (upFrom === 'shop') state = 'shop'; else goMap(mapWorld); }
        else if (state === 'map') state = 'menu';
        else if (state === 'result') betweenLevels(() => (result.rush ? (state = 'menu') : goMap(Math.floor((n - 1) / PER_WORLD))));
      }
    }
  });
  window.addEventListener('resize', resize);
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  // ---------- Cập nhật ----------
  function tip() {
    return { x: OX + Math.sin(hook.angle) * hook.len, y: OY + Math.cos(hook.angle) * hook.len };
  }

  function collect(it) {
    let gain = it.value, label = null;
    if (perks.polish && (it.kind === 'diamond' || it.kind === 'ruby' || it.kind === 'crystal')) gain = Math.round(gain * 1.5);
    if (perks.polish && it.carry) gain += 300;
    if (perks.rockbook && (it.kind === 'rock' || it.kind === 'lava')) gain *= 3;
    if (it.kind === 'gold') track('gold');
    else if (it.kind === 'diamond' || it.kind === 'ruby' || it.kind === 'crystal' || it.carry || (it.kind === 'clam' && it.value >= 300)) track('gem');
    if (it.critter) track('critter');
    if (it.kind === 'bag') {
      track('bag');
      const luck = perks.clover ? 1.6 : 1;
      const r = Math.random();
      if (r < 0.12 * luck) { save.dynamite = Math.min(9, save.dynamite + 1); persist(); gain = 0; label = '+1 🧨'; }
      else if (r < 0.2 * luck) { perks.strength = true; gain = 0; label = '💪'; }
      else if (r < 0.28 * luck) { timeLeft += 10; gain = 0; label = L.time10; }
      else gain = Math.round((20 + Math.random() * (220 + n * 25)) * luck / 5) * 5;
    }
    // combo: kéo liên tiếp đồ có giá trị => nhân tiền; kéo phải đá/rác => mất combo
    if (COMBO_BREAK.has(it.kind)) {
      if (combo >= 3) floats.push({ x: W / 2, y: GROUND + 30, text: '💔', life: 0.9, center: true });
      combo = 0;
    } else if (gain > 0) {
      combo++;
      const m = comboMul();
      if (m > 1) {
        gain = Math.round(gain * m);
        if (combo === 5) track('combo');
        if (combo === 3 || combo === 5 || combo % 5 === 0) floats.push({ x: W / 2, y: GROUND + 30, text: `${L.combo} x${m}!`, life: 1.3, big: true, center: true, color: '#ff9a2e' });
      }
    }
    score += gain;
    floats.push({ x: OX + 60, y: OY - 10, text: label || ('+$' + gain), life: 1.2, big: gain >= 300 });
    if (gain > 0) {   // xu bay về bộ đếm tiền
      const k = Math.min(10, 2 + Math.floor(gain / 80));
      for (let i = 0; i < k; i++) coins.push({ x0: OX + (Math.random() - 0.5) * 30, y0: OY + 60, t: -i * 0.05, cx: OX - 80 - Math.random() * 120, cy: OY - 60 - Math.random() * 60 });
    }
    if (gain >= 300) { flashT = 0.25; shake = Math.max(shake, 0.15); }
    if (it.kind === 'bag') sfx.bag();
    if (it.kind === 'diamond' || it.kind === 'ruby' || it.kind === 'crystal' || it.carry) { sfx.gem(); happyT = 1.2; }
    else if (gain >= 300) { sfx.big(); happyT = 1.2; }
    else if (it.kind === 'rock' || it.kind === 'lava' || it.kind === 'anchor') sfx.thud();
    else if (gain > 0) sfx.coin();
  }

  // ---------- Quái vật ----------
  const WARN_SFX = { mole: 'rumble', worm: 'rumble', spider: 'hiss', serpent: 'roar', salamander: 'roar', shark: 'sharkwarn' };
  function spawnMonster() {
    const kind = lvl.monster.kind, spec = Art.MON[kind], b = mineBounds(), dir = Math.random() < 0.5 ? 1 : -1;
    const pad = kind === 'serpent' ? 0.2 : 0.12;   // rắn băng uốn rộng: tránh sát mép
    const y = b.top + (pad + Math.random() * (0.9 - pad)) * (b.bottom - b.top);
    mon = { kind, dir, y, len: spec.len, r: spec.r, speed: lvl.monster.speed * spec.speed,
            x: dir > 0 ? -12 : W + 12, phase: Math.random() * 6, warn: 1.5, open: 0, walking: true,
            pauseT: 0, paused: false, anim: 0, frame: 0, fps: spec.fps };
    sfx[WARN_SFX[kind]]();
  }
  const nextGap = () => { const [a, b] = lvl.monster.every; return a + Math.random() * (b - a); };

  // Dây (từ ròng rọc tới móc) có chạm thân quái không
  function ropeHitsMonster() {
    const t = tip(), body = Art.monsterBody(mon), pts = 32;
    const near = (px, py, extra) => body.some(c => Math.hypot(px - c.x, py - c.y) < c.r + extra);
    for (let i = 0; i <= pts; i++) {
      if (near(OX + (t.x - OX) * i / pts, OY + (t.y - OY) * i / pts, 4)) return true;
    }
    return !!hook.item && near(hook.item.x, hook.item.y, hook.item.r * 0.7);
  }

  function updateMonster(dt) {
    if (!mon) { nextMonT -= dt; if (nextMonT <= 0) spawnMonster(); return; }
    mon.phase += dt * (mon.kind === 'serpent' ? 3.5 : 6);
    if (mon.warn > 0) { mon.warn -= dt; return; }
    if (mon.kind === 'spider' && !mon.paused && Math.abs(mon.x - W / 2) < 30) { mon.paused = true; mon.pauseT = 0.9; }
    if (mon.pauseT > 0) { mon.pauseT -= dt; mon.walking = false; }   // nhện dừng rình giữa màn
    else { mon.walking = true; mon.x += mon.dir * mon.speed * dt; }
    if (mon.walking) { mon.anim += dt * mon.fps; mon.frame = Math.floor(mon.anim) % 4; }
    if (mon.kind === 'salamander' && Math.random() < dt * 30) {     // vệt tàn lửa
      const tl = Art.monsterBody(mon).pop();
      particles.push({ x: tl.x, y: tl.y, vx: (Math.random() - 0.5) * 40, vy: -40 - Math.random() * 60, life: 0.7, r: 2 + Math.random() * 3, c: Math.random() < 0.5 ? '#ffb02e' : '#ff5a1a' });
    }

    const tail = mon.x - mon.dir * mon.len;
    if ((mon.dir > 0 && tail > W + 40) || (mon.dir < 0 && tail < -40)) {
      mon = null; nextMonT = nextGap(); track('dodge');
      if (rush) { const m = lvl.monster; m.every = [Math.max(5, m.every[0] - 0.8), Math.max(8, m.every[1] - 0.8)]; m.speed += 10; }
      return;
    }
    if (hook.mode !== 'swing' && ropeHitsMonster()) {
      // bị ngoạm: quái kéo móc và thợ mỏ đi, thua ngay
      state = 'caught'; caughtT = 0; mon.open = 1; hook.item = null;
      sfx.chomp(); shake = 0.6; combo = 0;
    }
  }

  function updateCaught(dt) {
    if (rescueOpen()) dt *= 0.45;   // chậm lại để kịp bấm thuốc nổ
    caughtT += dt;
    mon.phase += dt * 9; mon.open = Math.max(0.2, 1 - caughtT * 2);
    mon.x += mon.dir * mon.speed * 1.4 * dt;
    mon.anim += dt * mon.fps * 1.5; mon.frame = Math.floor(mon.anim) % 4;
    const tx = mon.x + mon.dir * 12, ty = mon.y + Math.sin(mon.phase) * 6;
    hook.angle = Math.atan2(tx - OX, ty - OY); hook.len = Math.hypot(tx - OX, ty - OY);
    if (caughtT > 0.4 && caughtT - dt <= 0.4) sfx.thud();
    if (caughtT >= 1.7) endLevel(mon.kind);
  }

  function update(dt) {
    now += dt;
    shake = Math.max(0, shake - dt);
    for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt; }
    particles = particles.filter(p => p.life > 0);
    for (const b of booms) b.p += dt / 0.55;
    for (const r of rings) r.life -= dt;
    rings = rings.filter(r => r.life > 0);
    if (upFlash) { upFlash.t -= dt; if (upFlash.t <= 0) upFlash = null; }
    booms = booms.filter(b => b.p < 1);
    happyT = Math.max(0, happyT - dt);
    flashT = Math.max(0, flashT - dt);
    scorePop = Math.max(0, scorePop - dt * 4);
    shownScore += (score - shownScore) * Math.min(1, dt * 8);
    if (Math.abs(score - shownScore) < 1) shownScore = score;
    for (const c of coins) { c.t += dt * 1.8; if (c.t >= 1 && !c.done) { c.done = true; scorePop = 1; } }
    coins = coins.filter(c => !c.done);
    for (const c of confetti) { c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 260 * dt; c.vx *= 0.99; c.rot += c.vr * dt; c.life -= dt; }
    confetti = confetti.filter(c => c.life > 0 && c.y < H + 20);
    for (const f of floats) { f.y -= 40 * dt; f.life -= dt; }
    floats = floats.filter(f => f.life > 0);
    if (banner && (banner.life -= dt) <= 0) banner = null;
    if (toast && (toast.life -= dt) <= 0) toast = null;
    bonusT = Math.max(0, bonusT - dt);

    if (state === 'caught') { updateCaught(dt); return; }
    if (state !== 'play') return;

    timeLeft -= dt;
    const sec = Math.ceil(timeLeft);
    if (sec <= 10 && sec !== lastTick && sec > 0) { lastTick = sec; sfx.tick(); }
    if (timeLeft <= 0) { timeLeft = 0; endLevel(); return; }

    // sinh vật di chuyển, sò đóng mở
    for (const it of items) {
      if (it.critter) {
        it.x += it.speed * it.dir * dt;
        if (it.x < 24 || it.x > W - 24) { it.dir *= -1; it.x = Math.max(24, Math.min(W - 24, it.x)); }
        if (it.kind === 'bat') it.y = it.baseY + Math.sin(now * 3 + it.phase) * 10;
      } else if (it.kind === 'clam') {
        it.open = Math.sin(now * 1.3 + it.phase) > -0.1;
      }
    }

    if (lvl.monster) { updateMonster(dt); if (state !== 'play') return; }
    for (const it of items) if (it.spawnT < 1) it.spawnT = Math.min(1, it.spawnT + dt * 3);
    if (rush) {
      while (items.length + respawn.length < RUSH_ITEMS) respawn.push(0.6 + Math.random() * 0.9);
      respawn = respawn.map(t => t - dt).sort((a, b) => a - b);
      while (respawn.length && respawn[0] <= 0) { respawn.shift(); spawnRushItem(); }
    }

    if (hook.mode === 'swing') {
      hook.phase += dt * 1.7;
      hook.angle = Math.sin(hook.phase) * 1.25;
    } else if (hook.mode === 'extend') {
      hook.len += dropSpeed() * dt;
      const t = tip();
      for (const it of items) {
        if (Math.hypot(it.x - t.x, it.y - t.y) < it.r + 6 + grabBonus()) {
          items.splice(items.indexOf(it), 1);
          hook.mode = 'retract';
          if (it.kind === 'tnt') { sfx.fuse(); blowTNT(it); break; }
          if (it.kind === 'clam') it.value = it.open ? 300 : 40;
          if (it.critter) sfx.squeak(); else sfx.grab();
          if (lvl.worldId === 'sea') sfx.splash();
          hook.item = it;
          if (save.up.claw > 0) rings.push({ x: t.x, y: t.y, r: it.r + 6 + grabBonus(), life: 0.35 });   // Móc to: vòng tầm kẹp
          break;
        }
      }
      if (hook.mode === 'extend' && (t.x < 0 || t.x > W || t.y > H)) hook.mode = 'retract';
    } else if (hook.mode === 'retract') {
      hook.len -= pullSpeed() * dt;
      if (hook.item && save.up.winch > 0 && Math.random() < dt * 10 * save.up.winch) {   // Tời khoẻ: tia lửa ở ròng rọc
        particles.push({ x: OX + (Math.random() - 0.5) * 20, y: OY + 4, vx: (Math.random() - 0.5) * 160, vy: -60 - Math.random() * 100, life: 0.45, r: 1.5 + Math.random() * 1.5, c: Math.random() < 0.5 ? '#ffe066' : '#ff9a2e' });
      }
      if (hook.item) {
        const t = tip();
        hook.item.x = t.x + Math.sin(hook.angle) * hook.item.r * 0.8;
        hook.item.y = t.y + Math.cos(hook.angle) * hook.item.r * 0.8;
      }
      if (hook.len <= BASE_LEN) {
        hook.len = BASE_LEN; hook.mode = 'swing';
        if (hook.item) { collect(hook.item); hook.item = null; }
        if (!rush && !items.some(i => !JUNK.has(i.kind))) endLevel();
      }
    }
  }

  // ---------- Vẽ giao diện ----------
  function text(s, x, y, size, color = '#fff', align = 'center', weight = 'bold') {
    ctx.font = `${weight} ${size}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
    ctx.textAlign = align; ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(3, size / 6); ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineJoin = 'round';
    ctx.strokeText(s, x, y); ctx.fillStyle = color; ctx.fillText(s, x, y);
  }

  function button(x, y, w, h, label, fn, color = '#e8a33a', enabled = true, size) {
    const hover = enabled && hoverX >= x && hoverX <= x + w && hoverY >= y && hoverY <= y + h;
    ctx.fillStyle = enabled ? color : '#6b6b6b';
    ctx.strokeStyle = hover ? '#fff3c4' : 'rgba(0,0,0,0.5)'; ctx.lineWidth = hover ? 4 : 3;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 12); ctx.fill(); ctx.stroke();
    if (hover) { ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.roundRect(x + 3, y + 3, w - 6, h * 0.4, 9); ctx.fill();
    text(label, x + w / 2, y + h / 2, size || Math.min(22, h * 0.42));
    buttons.push({ x, y, w, h, enabled, fn: () => { if (enabled) sfx.click(); fn(); } });
  }

  // Nút dạng biểu tượng (sprite); thiếu sprite thì dùng nút chữ thường
  function iconButton(x, y, size, name, label, fn, enabled = true) {
    const im = Art.spr(name);
    if (!im) return button(x, y, size, size, label, fn, '#5a4a3a', enabled);
    const hover = enabled && hoverX >= x && hoverX <= x + size && hoverY >= y && hoverY <= y + size;
    ctx.save();
    if (!enabled) { ctx.globalAlpha = 0.35; ctx.filter = 'grayscale(1)'; }
    Art.blit(ctx, im, x + size / 2, y + size / 2, size * (hover ? 1.08 : 1));
    ctx.restore();
    buttons.push({ x, y, w: size, h: size, enabled, fn: () => { if (enabled) sfx.click(); fn(); } });
  }

  let solidPanels = false;
  function panel(x, y, w, h) {
    ctx.fillStyle = solidPanels ? '#1e1208' : 'rgba(30,18,8,0.9)';
    ctx.strokeStyle = '#e8a33a'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 20); ctx.fill(); ctx.stroke();
  }

  function drawHUD() {
    // bố cục gọn: hai hộp ở hai góc, chừa giữa cho thợ mỏ; nút tạm dừng nằm cạnh hộp phải
    const pauseX = compact ? W - 254 : W / 2 - 24;
    if (compact) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.roundRect(4, 2, 196, 62, 12); ctx.fill();
      ctx.beginPath(); ctx.roundRect(W - 200, 2, 196, 62, 12); ctx.fill();
    } else { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(0, 0, W, 66); }
    const ps = 20 * (1 + scorePop * 0.25);
    text(`${L.score}: $${Math.round(shownScore)}`, 14, 20, ps, scorePop > 0.5 ? '#fff6b0' : '#ffe066', 'left');
    if (comboMul() > 1) text(`🔥 x${comboMul()}`, compact ? W - 14 : W / 2 + 70, compact ? 80 : 22, 18, '#ff9a2e', compact ? 'right' : 'center');
    text(rush ? `🏆 ${L.record}: $${save.rushBest}` : `${L.target}: $${lvl.target}`, 14, 46, 17, '#ffffff', 'left');
    text(`${L.time}: ${Math.ceil(timeLeft)}`, W - 14, 20, 20, timeLeft <= 10 ? '#ff6b6b' : '#fff', 'right');
    if (bonusT > 0 && !rush) {
      ctx.globalAlpha = Math.min(1, bonusT);
      text(`⏱ +${4 * save.up.time}s`, W - 14, compact ? 98 : 84 - (3 - bonusT) * 6, 18, '#7dff7a', 'right');
      ctx.globalAlpha = 1;
    }
    text(rush ? '⚡ ' + L.rush : `${L.level} ${n}`, W - 14, 46, 17, rush ? '#ffd23f' : '#fff', 'right');
    const sx = compact ? 22 : W / 2 - 60, sy = compact ? 78 : 52;
    if (!rush) for (let k = 0; k < 3; k++) Art.star(ctx, sx + k * 18, sy, 7, score >= lvl.stars[k]);
    const icons = (perks.strength ? '💪' : '') + (perks.clover ? '🍀' : '') + (perks.polish ? '💎' : '') + (perks.rockbook ? '📘' : '');
    if (icons) text(icons, compact ? 76 : W / 2 + 50, compact ? 78 : 50, 15, '#fff', compact ? 'left' : 'center');
    iconButton(pauseX, 4, 48, 'icon_pause', 'II', () => { state = 'pause'; });
    const active = (hook.mode === 'retract' && hook.item && save.dynamite > 0) || rescueOpen();
    const bx = W - 84, by = H - 84;
    ctx.globalAlpha = active ? 1 : 0.55;
    ctx.save();
    if (rescueOpen()) { const k = 1.15 + 0.12 * Math.sin(now * 20); ctx.translate(bx + 35, by + 35); ctx.scale(k, k); ctx.translate(-bx - 35, -by - 35); }
    ctx.fillStyle = rescueOpen() ? '#ff2d1a' : '#c0392b'; ctx.beginPath(); ctx.roundRect(bx, by, 70, 70, 16); ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.stroke();
    if (Art.spr('dynamite')) Art.blit(ctx, Art.spr('dynamite'), bx + 35, by + 30, 40, false, -0.3); else text('🧨', bx + 35, by + 30, 30);
    text('x' + save.dynamite, bx + 35, by + 58, 16);
    ctx.restore();
    ctx.globalAlpha = 1;
    buttons.push({ x: bx, y: by, w: 70, h: 70, fn: useDynamite });
  }

  function drawMenu() {
    const hasImg = menuImg.complete && menuImg.naturalWidth > 0;
    if (hasImg) {
      const k = Math.max(W / menuImg.naturalWidth, H / menuImg.naturalHeight);
      const iw = menuImg.naturalWidth * k, ih = menuImg.naturalHeight * k;
      ctx.drawImage(menuImg, (W - iw) / 2, Math.min(0, H * 0.4 - ih * 0.4), iw, ih);
    }
    const ph = 410;
    const py = hasImg ? Math.max(10, Math.min(H * 0.45, H - ph - 10)) : Math.min(Math.max(GROUND - 60, H / 2 - 150), H - ph - 10);
    panel(40, py, W - 80, ph);
    text(L.title, W / 2, py + 50, 40, '#ffd23f');
    text(L.howto, W / 2, py + 100, 16, '#fff', 'center', 'normal');
    // trang trí vài món đồ
    const deco = [['gold', -150, 28], ['diamond', -60, 12], ['ruby', 0, 13], ['crystal', 60, 18], ['gold', 150, 20]];
    for (const [kind, dx, r] of deco) Art.drawItem(ctx, { kind, x: W / 2 + dx, y: py + 155, r }, now);
    text(`⭐ ${totalStars()}/${COUNT * 3}   ·   🏆 ${L.record}: $${save.rushBest}`, W / 2, py + 205, 18, '#9fe8ff');
    button(70, py + 232, 200, 50, '▶ ' + L.playMap, () => goMap(Math.floor((save.unlocked - 1) / PER_WORLD)), '#3aa655', true, 22);
    button(W - 270, py + 232, 200, 50, '⚡ ' + L.rush, startRush, '#d98a1f', rushOpen(), 20);
    if (!rushOpen()) text(L.rushLocked, W - 170, py + 290, 13, '#ddd', 'center', 'normal');
    const pd = pending(), mw = 148, mg = (W - 140 - 3 * mw) / 2;
    [['🎁 ' + L.gift.split(' ')[0], 'daily', pd.gift], ['📋 ' + L.quests, 'quests', pd.quests], ['🏅 ' + L.achs, 'achieve', pd.ach]].forEach(([label, st, dot], i) => {
      const x = 70 + i * (mw + mg);
      button(x, py + 302, mw, 44, label, () => openPopup(st), '#7a5a2a', true, 15);
      if (dot) badge(x + mw - 6, py + 306);
    });
    button(W / 2 - 90, py + ph - 52, 180, 38, save.music ? L.musicOn : L.musicOff, toggleMusic, '#5a4a3a', true, 16);
    if (DEV) {   // công cụ thử nghiệm, không bao giờ hiện trên YouTube / host public
      const ty = py + ph + 12 + 38 <= H - 6 ? py + ph + 12 : 8; // không đủ chỗ dưới bảng thì đặt lên trên cùng
      button(40, ty, 250, 38, '🔓 ' + L.testUnlock, () => { save.unlocked = COUNT; mapWorld = WORLDS.length - 1; persist(); }, '#2f6fd0', save.unlocked < COUNT, 15);
      button(W - 290, ty, 250, 38, '🗑 ' + L.testReset, () => {
        save = NEW_SAVE(save.music);
        mapWorld = 0; persist();
      }, '#8a3a2a', true, 15);
    }
  }

  // ---------- Bảng Quà / Nhiệm vụ / Thành tựu ----------
  function badge(x, y) { ctx.fillStyle = '#ff3b3b'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 8, 0, 7); ctx.fill(); ctx.stroke(); }
  function bar(x, y, w, h, k, color = '#3aa655') {
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); ctx.fill();
    if (k > 0) { ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, y, Math.max(h, w * Math.min(1, k)), h, h / 2); ctx.fill(); }
  }
  function drawToast(y) {
    if (!toast) return;
    ctx.globalAlpha = Math.min(1, toast.life * 2);
    text(toast.text, W / 2, y - (1.5 - toast.life) * 30, 34, '#7dff7a');
    ctx.globalAlpha = 1;
  }

  function drawDaily() {
    const ph = 380, py = Math.max(8, (H - ph) / 2);
    panel(30, py, W - 60, ph);
    text('🎁 ' + L.gift, W / 2, py + 40, 30, '#ffd23f');
    text(L.giftStreak, W / 2, py + 76, 14, '#cfe8ff', 'center', 'normal');
    const ready = giftReady();
    const cur = ready ? giftDay() : (save.daily.streak - 1 + 7) % 7;   // ô của hôm nay
    const tw = 66, gap = 6, x0 = W / 2 - (7 * tw + 6 * gap) / 2, ty = py + 100, th = 110;
    DAILY.forEach((g, i) => {
      const x = x0 + i * (tw + gap), done = i < cur || (i === cur && !ready), now_ = i === cur;
      ctx.fillStyle = done ? 'rgba(58,166,85,0.45)' : now_ ? 'rgba(255,210,63,0.3)' : 'rgba(255,255,255,0.08)';
      ctx.strokeStyle = now_ ? '#ffd23f' : 'rgba(0,0,0,0.4)'; ctx.lineWidth = now_ ? 3 : 2;
      ctx.beginPath(); ctx.roundRect(x, ty, tw, th, 10); ctx.fill(); ctx.stroke();
      text(L.day(i + 1), x + tw / 2, ty + 16, 13, '#fff');
      const big = i === 6;
      if (g.m) {
        const gs = Art.spr(big ? 'goldL' : 'goldM');
        if (gs) Art.blit(ctx, gs, x + tw / 2, ty + 48, big ? 40 : 32); else text('💰', x + tw / 2, ty + 48, 24);
        text('$' + r50(g.m * rewardScale()), x + tw / 2, ty + 78, 13, '#ffe066');
      }
      if (g.d) {
        const yy = g.m ? ty + 96 : ty + 56;
        if (!g.m && Art.spr('dynamite')) Art.blit(ctx, Art.spr('dynamite'), x + tw / 2, yy - 6, 34, false, -0.3);
        text((g.m ? '+🧨' : '') + 'x' + g.d, x + tw / 2, g.m ? yy : yy + 30, 13, '#ff9a9a');
      }
      if (done) text('✓', x + tw - 12, ty + th - 14, 20, '#7dff7a');
    });
    const by = py + ph - 64;
    if (ready) button(W / 2 - 110, by - 56, 220, 52, '🎁 ' + L.claim, claimGift, '#3aa655', true, 22);
    else if (gift) {
      text(`+$${gift.m}${gift.d ? '  +🧨x' + gift.d : ''}`, W / 2, ty + th + 26, 24, '#7dff7a');
      if (sdk.canAds() && !gift.doubled) button(W / 2 - 150, by - 46, 300, 46, L.giftDouble, () => withAd('reward', (ok) => {
        state = 'daily';
        if (ok && gift && !gift.doubled) {
          save.wallet += gift.m; save.dynamite = Math.min(9, save.dynamite + gift.d);
          gift.m *= 2; gift.d *= 2; gift.doubled = true; persist(); sfx.big();
        }
      }, 'double-gift-1'), '#2f6fd0', true, 18);
      else text(L.giftBack, W / 2, by - 20, 15, '#cfe8ff', 'center', 'normal');
    } else text(L.giftBack, W / 2, ty + th + 30, 16, '#cfe8ff', 'center', 'normal');
    button(W / 2 - 80, by + 8, 160, 44, L.close, () => { state = 'menu'; }, '#5a4a3a', true, 18);
    drawToast(py + 200);
  }

  function drawQuests() {
    const row = 84, ph = 130 + 3 * row + 70, py = Math.max(8, (H - ph) / 2);
    panel(30, py, W - 60, ph);
    text('📋 ' + L.quests, W / 2, py + 38, 28, '#ffd23f');
    text(L.questsSub, W / 2, py + 72, 14, '#cfe8ff', 'center', 'normal');
    save.quests.list.forEach((q, i) => {
      const y = py + 96 + i * row, goal = questGoal(q.k), done = questDone(q);
      ctx.fillStyle = q.c ? 'rgba(58,166,85,0.3)' : done ? 'rgba(255,210,63,0.22)' : 'rgba(255,255,255,0.08)';
      ctx.beginPath(); ctx.roundRect(46, y, W - 92, row - 10, 12); ctx.fill();
      text(L.q[q.k](goal), 62, y + 22, 17, '#fff', 'left');
      bar(62, y + 42, W - 270, 14, q.p / goal, done ? '#ffd23f' : '#3aa655');
      text(`${Math.min(q.p, goal)}/${goal}`, 62 + (W - 270) / 2, y + 49, 11, '#fff');
      text(q.c ? '✓ ' + L.claimed : `+$${questReward(q.k)}`, W - 62, y + 37, 18, q.c ? '#7dff7a' : '#ffe066', 'right');
    });
    const by = py + ph - 62, any = save.quests.list.some(q => !q.c && questDone(q));
    button(60, by, 200, 48, L.close, () => { state = 'menu'; }, '#5a4a3a', true, 18);
    button(W - 260, by, 200, 48, L.claimAll, claimAllQuests, '#3aa655', any, 20);
    drawToast(py + ph / 2);
  }

  const MEDAL = ['🥉', '🥈', '🥇', '🌍'];
  const achLabel = (a) => (a.stat === 'world' ? L.worldClear(L.worlds[a.w]) : L.q[a.stat](a.g));
  const achPerPage = () => Math.max(3, Math.min(8, Math.floor((H - 250) / 56)));
  function achPages() { return Math.ceil(ACH.length / achPerPage()); }
  function drawAchievements() {
    const per = achPerPage(), row = 56, ph = 150 + per * row + 70, py = Math.max(8, (H - ph) / 2);
    achPage = Math.max(0, Math.min(achPages() - 1, achPage));
    panel(30, py, W - 60, ph);
    const got = save.ach.length;
    text(`🏅 ${L.achs}  ${got}/${ACH.length}`, W / 2, py + 38, 26, '#ffd23f');
    // thứ tự: có thể nhận trước, rồi chưa đạt, cuối cùng là đã nhận
    const order = ACH.slice().sort((a, b) => (achReady(b) - achReady(a)) || (save.ach.includes(a.id) - save.ach.includes(b.id)));
    order.slice(achPage * per, achPage * per + per).forEach((a, i) => {
      const y = py + 70 + i * row, have = save.ach.includes(a.id), ready = achReady(a), v = statOf(a);
      ctx.fillStyle = have ? 'rgba(58,166,85,0.28)' : ready ? 'rgba(255,210,63,0.25)' : 'rgba(255,255,255,0.07)';
      ctx.beginPath(); ctx.roundRect(46, y, W - 92, row - 8, 10); ctx.fill();
      ctx.globalAlpha = have || ready ? 1 : 0.6; text(MEDAL[a.tier], 72, y + 24, 24); ctx.globalAlpha = 1;
      text(achLabel(a), 98, y + 16, 15, '#fff', 'left');
      bar(98, y + 30, W - 300, 10, v / a.g, ready || have ? '#ffd23f' : '#3aa655');
      text(have ? '✓' : `+$${a.r}`, W - 62, y + 24, 17, have ? '#7dff7a' : '#ffe066', 'right');
    });
    const ny = py + 70 + per * row + 22;
    iconButton(W / 2 - 110, ny - 22, 44, 'icon_left', '◀', () => { achPage--; }, achPage > 0);
    text(`${L.page} ${achPage + 1}/${achPages()}`, W / 2, ny, 16, '#fff', 'center', 'normal');
    iconButton(W / 2 + 66, ny - 22, 44, 'icon_right', '▶', () => { achPage++; }, achPage < achPages() - 1);
    const by = py + ph - 60;
    button(60, by, 200, 48, L.close, () => { state = 'menu'; }, '#5a4a3a', true, 18);
    button(W - 260, by, 200, 48, L.claimAll, claimAllAch, '#3aa655', ACH.some(achReady), 20);
    drawToast(py + ph / 2);
  }

  function toggleMusic() {
    save.music = !save.music;
    if (musicGain) musicGain.gain.value = save.music ? 0.6 : 0;
    persist();
  }

  function drawMap() {
    const ph = 380, py = Math.max(10, Math.min(GROUND - 40, H - ph - 10));
    panel(30, py, W - 60, ph);
    const lastWorld = Math.floor((save.unlocked - 1) / PER_WORLD);
    iconButton(46, py + 12, 50, 'icon_left', '◀', () => goMap(mapWorld - 1), mapWorld > 0);
    iconButton(W - 96, py + 12, 50, 'icon_right', '▶', () => goMap(mapWorld + 1), mapWorld < lastWorld);
    text(`${mapWorld + 1}. ${L.worlds[mapWorld]}`, W / 2, py + 38, 28, '#ffd23f');
    text(L.tips[mapWorld], W / 2, py + 78, 14, '#ddd', 'center', 'normal');
    const bw = 84, gap = 14, gx = (W - (5 * bw + 4 * gap)) / 2;
    for (let i = 0; i < PER_WORLD; i++) {
      const k = mapWorld * PER_WORLD + i + 1;
      const x = gx + (i % 5) * (bw + gap), y = py + 104 + Math.floor(i / 5) * (bw + gap);
      const locked = k > save.unlocked;
      const tag = i === 4 ? '💰' : i === 9 ? '👑' : '';
      ctx.fillStyle = locked ? '#4a4038' : (save.stars[k - 1] ? '#3aa655' : '#e8a33a');
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect(x, y, bw, bw, 14); ctx.fill(); ctx.stroke();
      if (locked) { if (Art.spr('lock')) Art.blit(ctx, Art.spr('lock'), x + bw / 2, y + bw / 2, 40); else text('🔒', x + bw / 2, y + bw / 2 - 4, 26); }
      else {
        text(String(k), x + bw / 2, y + 32, 28);
        for (let s = 0; s < 3; s++) Art.star(ctx, x + bw / 2 - 20 + s * 20, y + 64, 8, (save.stars[k - 1] || 0) > s);
      }
      const badge = i === 4 ? Art.spr('badge_bonus') : i === 9 ? Art.spr('badge_boss') : null;
      if (badge) Art.blit(ctx, badge, x + bw - 10, y + 8, 30); else if (tag) text(tag, x + bw - 12, y + 12, 16);
      if (!locked && hasMonster(k)) text(mapWorld === 5 ? '🦈' : '⚠', x + 12, y + 12, 14);
      if (i === mapSel) { ctx.strokeStyle = '#fff3c4'; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(x - 4, y - 4, bw + 8, bw + 8, 16); ctx.stroke(); }
      if (!locked) buttons.push({ x, y, w: bw, h: bw, fn: () => { sfx.click(); openShop(k); } });
    }
    const iy = py + 104 + 2 * bw + gap + 26;
    text(`${L.wallet}: $${save.wallet}   🧨 x${save.dynamite}   ⭐ ${totalStars()}/${COUNT * 3}`, W / 2, iy, 18, '#ffe066');
    button(46, py + ph - 54, 130, 42, '⌂ Menu', () => { state = 'menu'; }, '#5a4a3a');
    button(W / 2 - 105, py + ph - 56, 210, 46, '⚙ ' + L.upgrades, () => openUpgrades('map'), '#d98a1f', true, 20);
    if (canUpgrade() && Math.sin(now * 6) > -0.5) {   // chấm đỏ: có thứ mua được
      ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.arc(W / 2 + 98, py + ph - 52, 8, 0, 7); ctx.fill();
    }
    button(W - 176, py + ph - 54, 130, 42, save.music ? '♪ On' : '♪ Off', toggleMusic, '#5a4a3a');
  }

  function drawShop() {
    const row = H < 640 ? 54 : 72;
    const ph = 100 + SHOP.length * row + 70;
    const py = Math.max(8, (H - ph) / 2);
    panel(30, py, W - 60, ph);
    text(`${L.level} ${n} · ${L.shop}`, W / 2, py + 34, 26, '#7dff7a');
    text(`${L.wallet}: $${save.wallet}`, W / 2, py + 72, 22, '#ffe066');
    const desc = { dynamite: L.dDynamite, strength: L.dStrength, clover: L.dClover, polish: L.dPolish, rockbook: L.dRockbook };
    SHOP.forEach((o, i) => {
      const y = py + 98 + i * row, h = row - 8, m = h / 2;
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.beginPath(); ctx.roundRect(46, y, W - 92, h, 12); ctx.fill();
      if (o.id === 'dynamite' && Art.spr('dynamite')) Art.blit(ctx, Art.spr('dynamite'), 78, y + m, 36, false, -0.3);
      else text(o.icon, 78, y + m, 28);
      const label = o.id === 'dynamite' ? `${L.dynamite} (x${save.dynamite})` : L[o.id];
      text(label, 108, y + m - 11, 18, '#fff', 'left');
      text(desc[o.id], 108, y + m + 12, 13, '#ddd', 'left', 'normal');
      const owned = o.id === 'dynamite' ? save.dynamite >= 9 : perks[o.id];
      const price = o.price(n);
      button(W - 160, y + m - 19, 100, 38, owned ? L.owned : '$' + price, () => buy(o), '#e8a33a', !owned && save.wallet >= price, 18);
    });
    button(46, py + ph - 58, 140, 46, L.map, () => goMap(Math.floor((n - 1) / PER_WORLD)), '#5a4a3a');
    button(W - 246, py + ph - 58, 200, 46, L.play, startLevel, '#3aa655');
    iconButton(W - 94, py + 14, 46, null, '⚙', () => openUpgrades('shop'));
    if (canUpgrade()) { ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.arc(W - 52, py + 18, 7, 0, 7); ctx.fill(); }
    if (sdk.canAds() && !rewardUsed && save.dynamite < 9) {
      button(194, py + ph - 56, 152, 42, L.adDynamite, () => withAd('reward', (ok) => {
        state = 'shop';
        if (ok) { rewardUsed = true; save.dynamite++; persist(); sfx.buy(); }
      }, 'free-dynamite-1'), '#2f6fd0', true, 17);
    }
  }

  function drawUpgrades() {
    const row = H < 640 ? 62 : 78;
    const ph = 100 + UPGRADES.length * row + 70, py = Math.max(8, (H - ph) / 2);
    panel(30, py, W - 60, ph);
    text('⚙ ' + L.upgrades, W / 2, py + 34, 28, '#ffd23f');
    text(`${L.wallet}: $${save.wallet}`, W / 2, py + 72, 22, '#ffe066');
    UPGRADES.forEach((u, i) => {
      const y = py + 96 + i * row, h = row - 8, m = h / 2, lv = save.up[u.id];
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.beginPath(); ctx.roundRect(46, y, W - 92, h, 12); ctx.fill();
      const im = u.sprite && Art.spr(u.sprite);
      if (im) Art.blit(ctx, im, 80, y + m, 40); else text(u.icon, 80, y + m, 28);
      text(L[upName[u.id]], 112, y + m - 13, 18, '#fff', 'left');
      const fx = upEffect(u.id, lv), nx = lv < 5 ? upEffect(u.id, lv + 1) : null;
      text(L[upDesc[u.id]] + `: ${fx}` + (nx ? ` → ${nx}` : ''), 112, y + m + 10, 13, '#ddd', 'left', 'normal');
      if (upFlash && upFlash.id === u.id) {   // vừa mua: dòng loé sáng + chữ LÊN CẤP
        const k = upFlash.t / 1.2;
        ctx.fillStyle = `rgba(255,224,102,${0.35 * k})`; ctx.beginPath(); ctx.roundRect(46, y, W - 92, h, 12); ctx.fill();
        text(`${L.lvShort} ${lv}!`, W - 114, y + m - 26 - (1 - k) * 14, 18, '#7dff7a');
      }
      for (let k = 0; k < 5; k++) {   // 5 vạch cấp
        ctx.fillStyle = k < lv ? '#ffd23f' : 'rgba(255,255,255,0.18)';
        ctx.beginPath(); ctx.roundRect(112 + k * 22, y + m + 21, 18, 6, 3); ctx.fill();
      }
      const price = upPrice(u);
      button(W - 168, y + m - 20, 108, 40, price === null ? L.max : '$' + price, () => buyUpgrade(u),
        '#e8a33a', price !== null && save.wallet >= price, 18);
    });
    button(W / 2 - 100, py + ph - 58, 200, 46, upFrom === 'shop' ? L.shop + ' ▶' : L.map, () => (upFrom === 'shop' ? (state = 'shop') : goMap(mapWorld)), '#3aa655');
  }

  function doubleButton(x, y, w) {
    button(x, y, w, 46, result.doubled ? '✓ ' + L.doubled : `${L.adDouble} (+$${result.earned})`, () => withAd('reward', (ok) => {
      state = 'result';
      if (ok && !result.doubled) {
        save.wallet += result.earned; track('earn', result.earned); result.earned *= 2; result.doubled = true; persist(); sfx.big();
        for (let i = 0; i < 60; i++) confetti.push(makeConfetti(W / 2, y + 20));
      }
    }, 'double-money-1'), '#2f6fd0', !result.doubled, 18);
  }

  function drawRushResult() {
    const showDouble = result.earned > 0 && sdk.canAds();
    const ph = showDouble ? 380 : 324, py = Math.max(8, Math.min(H / 2 - ph / 2, H - ph - 10));
    panel(40, py, W - 80, ph);
    text(result.eatenBy ? L.ouch : '⚡ ' + L.rush, W / 2, py + 42, 34, result.eatenBy ? '#ff6b6b' : '#ffd23f');
    text(`$${score}`, W / 2, py + 102, 48, '#ffe066');
    text(`🏆 ${L.record}: $${save.rushBest}${result.newBest && score > 0 ? '  ★NEW' : ''}`, W / 2, py + 150, 20, result.newBest ? '#7dff7a' : '#9fe8ff');
    text(`${L.earned}: +$${result.earned}`, W / 2, py + 182, 17, '#fff', 'center', 'normal');
    if (result.eatenBy) text(L.eaten(L.monName[result.eatenBy]), W / 2, py + 210, 16, '#ff9a9a', 'center', 'normal');
    const by = py + ph - 64;
    if (showDouble) doubleButton(W / 2 - 150, by - 58, 300);
    button(60, by, 180, 48, 'Menu', () => betweenLevels(() => { state = 'menu'; }), '#5a4a3a');
    button(W - 260, by, 200, 48, L.retry, () => betweenLevels(startRush), '#3aa655');
  }

  function drawResult() {
    if (result.rush) return drawRushResult();
    const showDouble = result.win && result.earned > 0 && sdk.canAds();
    const myUp = save.up.claw + save.up.winch + save.up.drop + save.up.time;
    const showHint = !result.win && myUp < 20;   // thua: gợi ý nâng cấp
    const showRevive = canRevive();
    const ph = showDouble ? 396 : (showHint ? 420 : 340) + (showRevive ? 58 : 0), py = Math.max(8, Math.min(H / 2 - ph / 2, H - ph - 10));
    panel(40, py, W - 80, ph);
    text(result.win ? L.win : result.eatenBy ? L.ouch : L.lose, W / 2, py + 42, 36, result.win ? '#7dff7a' : '#ff6b6b');
    for (let k = 0; k < 3; k++) Art.star(ctx, W / 2 - 60 + k * 60, py + 100, 24, result.stars > k);
    text(`${L.score}: $${score} / $${lvl.target}`, W / 2, py + 150, 22, '#ffe066');
    text(`${L.earned}: +$${result.earned}`, W / 2, py + 182, 17, '#fff', 'center', 'normal');
    const bestTxt = `${L.best}: $${save.best[n - 1] || 0}${result.newBest ? '  ★NEW' : ''}`;
    const why = result.eatenBy ? L.eaten(L.monName[result.eatenBy]) : L.notEnough;
    text(result.win ? bestTxt : why, W / 2, py + 210, 17, result.eatenBy ? '#ff9a9a' : '#9fe8ff', 'center', 'normal');
    if (result.win && n === COUNT) text(L.allClear, W / 2, py + 240, 20, '#ffd23f');
    const by = py + ph - 64;
    if (showHint) {
      text(L.upHint(lvl.expUp, myUp), W / 2, py + 240, 15, myUp < lvl.expUp ? '#ffd23f' : '#cfe8ff', 'center', 'normal');
      text(L.upTip, W / 2, py + 262, 14, '#cfe8ff', 'center', 'normal');
      button(W / 2 - 130, by - 62, 260, 48, '⚙ ' + L.upgrades, () => betweenLevels(() => { openShop(n); openUpgrades('shop'); }), '#d98a1f', true, 20);
    }
    if (showDouble) doubleButton(W / 2 - 150, by - 58, 300);
    if (showRevive) button(W / 2 - 160, by - (showHint ? 120 : 62), 320, 50, L.revive, revive, '#2f6fd0', true, 20);
    button(60, by, 140, 48, L.map, () => betweenLevels(() => goMap(Math.floor((n - 1) / PER_WORLD))), '#5a4a3a');
    if (result.win && n < COUNT) {
      button(210, by, 140, 48, L.retry, () => betweenLevels(() => openShop(n)), '#e8a33a');
      button(360, by, 180, 48, L.next, () => betweenLevels(() => openShop(n + 1)), '#3aa655');
    } else {
      button(W - 260, by, 200, 48, L.retry, () => betweenLevels(() => openShop(n)), '#3aa655');
    }
  }

  function drawPause() {
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, W, H);
    const ph = 260, py = H / 2 - ph / 2;
    panel(120, py, W - 240, ph);
    text(L.paused, W / 2, py + 44, 32);
    button(170, py + 80, W - 340, 46, L.resume, () => { state = 'play'; }, '#3aa655');
    button(170, py + 136, W - 340, 46, L.retry, restart, '#e8a33a');
    button(170, py + 192, W - 340, 46, rush ? 'Menu' : L.map, () => (rush ? (state = 'menu') : goMap(lvl.world)), '#5a4a3a');
  }

  function draw() {
    buttons = [];
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    const world = state === 'map' || state === 'menu' || state === 'upgrade' || POPUPS.has(state) ? mapWorld : lvl ? lvl.world : Math.floor((n - 1) / PER_WORLD);
    const inLevel = (state === 'play' || state === 'pause' || state === 'result' || state === 'caught') && lvl;
    if (shake > 0) ctx.translate((Math.random() - 0.5) * 12 * shake, (Math.random() - 0.5) * 12 * shake);
    background(WORLDS[state === 'shop' ? Math.floor((n - 1) / PER_WORLD) : world].id);

    if (inLevel) for (const it of items) {
      if (it.spawnT < 1) {   // đồ mới mọc: phóng to dần
        const k = 0.3 + 0.7 * it.spawnT;
        ctx.save(); ctx.translate(it.x, it.y); ctx.scale(k, k); ctx.translate(-it.x, -it.y);
        ctx.globalAlpha = it.spawnT; Art.drawItem(ctx, it, now); ctx.restore();
      } else Art.drawItem(ctx, it, now);
    }
    if (inLevel && mon && state !== 'result') {
      if (mon.warn > 0) Art.drawMonsterWarning(ctx, mon.dir > 0 ? 30 : W - 30, mon.y, now, mon.kind);
      else Art.drawMonster(ctx, mon, lvl.worldId, now);
    }
    Art.drawMiner(ctx, OX, OY, GROUND, {
      spin: hook.mode === 'swing' ? 0 : hook.len / 10,
      pulling: (hook.mode === 'retract' && state === 'play') || state === 'caught', frame: Math.floor(now * 10), happy: happyT > 0,
      yank: state === 'caught' ? Math.max(0, Math.min(1, (caughtT - 0.35) / 1.2)) : 0,
    });
    if (inLevel && state !== 'result') {
      if (hook.mode === 'extend' && save.up.drop > 0) {   // Thả nhanh: bóng mờ phía sau móc
        for (let k = save.up.drop; k >= 1; k--) Art.drawHook(ctx, OX, OY, hook.angle, Math.max(BASE_LEN, hook.len - k * 16), false, save.up, 0.2 + 0.08 * (save.up.drop - k));
      }
      Art.drawHook(ctx, OX, OY, hook.angle, hook.len, !!hook.item, save.up);
      if (hook.item) Art.drawItem(ctx, hook.item, now);
    }
    for (const b of booms) Art.boom(ctx, b.x, b.y, b.size, b.p);
    for (const r of rings) {
      ctx.strokeStyle = `rgba(255,224,102,${r.life / 0.35})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r * (1.15 - 0.15 * r.life / 0.35), 0, 7); ctx.stroke();
    }
    for (const p of particles) { ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
    for (const f of floats) { ctx.globalAlpha = Math.min(1, f.life); text(f.text, f.x, f.y, f.big ? 30 : 22, f.color || '#ffe066', f.center ? 'center' : 'left'); }
    ctx.globalAlpha = 1;
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);

    if (state === 'play' || state === 'pause' || state === 'caught') {
      if (rescueOpen()) {
        const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7);
        v.addColorStop(0, 'rgba(255,0,0,0)'); v.addColorStop(1, `rgba(255,0,0,${0.35 + 0.15 * Math.sin(now * 20)})`);
        ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
        if (Math.sin(now * 16) > -0.3) text(L.escape, W / 2, H - 140, 30, '#ffffff');
      }
      drawHUD();
      if (n === 1 && !firedOnce && !banner && state === 'play' && Math.sin(now * 5) > -0.4) {
        text(L.tapHint, W / 2, H - 120, 26, '#ffffff');
      }
      if (banner) {
        ctx.globalAlpha = Math.min(1, banner.life * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, GROUND + 20, W, 70);
        text(banner.head, W / 2, GROUND + 42, 22, '#ffd23f');
        text(banner.sub, W / 2, GROUND + 70, 15, '#fff', 'center', 'normal');
        ctx.globalAlpha = 1;
      }
    }
    // xu bay về bộ đếm tiền (đường cong)
    for (const c of coins) {
      if (c.t < 0) continue;
      const t = Math.min(1, c.t), u = 1 - t, tx = 60, ty = 20;
      const x = u * u * c.x0 + 2 * u * t * c.cx + t * t * tx, y = u * u * c.y0 + 2 * u * t * c.cy + t * t * ty;
      const g = Art.spr('goldS');
      if (g) Art.blit(ctx, g, x, y, 16 - t * 4); else { ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.fill(); }
    }
    if (flashT > 0) { ctx.fillStyle = `rgba(255,240,180,${flashT * 1.2})`; ctx.fillRect(0, 0, W, H); }

    if (state === 'menu') drawMenu();
    else if (POPUPS.has(state)) {
      drawMenu(); buttons = [];          // menu chỉ làm nền, không bấm được
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, W, H);
      solidPanels = true;                // bảng popup đặc, không lộ chữ menu phía sau
      if (state === 'daily') drawDaily(); else if (state === 'quests') drawQuests(); else drawAchievements();
      solidPanels = false;
    }
    else if (state === 'map') drawMap();
    else if (state === 'upgrade') drawUpgrades();
    else if (state === 'shop') drawShop();
    else if (state === 'result') drawResult();
    else if (state === 'pause') drawPause();
    else if (state === 'ad') {
      ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(0, 0, W, H);
      text(FAKE_ADS ? '📺 ' + L.fakeAd : '…', W / 2, H / 2, FAKE_ADS ? 22 : 48);
    }
    // pháo giấy luôn nằm trên cùng
    for (const c of confetti) {
      ctx.save(); ctx.globalAlpha = Math.min(1, c.life); ctx.translate(c.x, c.y); ctx.rotate(c.rot);
      ctx.fillStyle = c.c; ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h); ctx.restore();
    }

  }

  // ---------- Vòng lặp ----------
  let last = performance.now();
  let raf = 0;
  function frame(t) {
    raf = 0;
    if (paused) return; // onPause: dừng hẳn vòng lặp và việc vẽ cho tới onResume
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    if (state !== 'pause' && state !== 'ad') update(dt);
    syncReel(pullSpeed());
    draw();
    raf = requestAnimationFrame(frame);
  }

  sdk.onPause(() => {
    if (state === 'play') state = 'pause';
    persist();
    draw();             // khung hình cuối: hiện bảng "Tạm dừng" + nút Tiếp tục
    paused = true;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    stopMusicTimer();
    if (actx) actx.suspend();
  });
  sdk.onResume(() => {
    paused = false;
    last = performance.now();
    if (actx) actx.resume();
    startMusicTimer();
    if (!raf) raf = requestAnimationFrame(frame);
  });
  sdk.onAudioChange((on) => setAudio(on));

  // Báo lỗi JS về YouTube (best-effort)
  window.addEventListener('error', () => sdk.error());
  window.addEventListener('unhandledrejection', () => sdk.error());

  async function boot() {
    resize();
    draw();
    sdk.firstFrameReady();
    raf = requestAnimationFrame(frame);

    setAudio(sdk.audioEnabled());
    const lang = (await sdk.language()).toLowerCase();
    L = lang.startsWith('vi') ? STR.vi : STR.en;
    document.title = L.title;
    const [data] = await Promise.all([sdk.load(), Art.loadSprites()]);
    bgKey = '';
    if (data !== null) { applySave(data); loaded = true; }
    mapWorld = Math.floor((save.unlocked - 1) / PER_WORLD);
    mapSel = Math.min(PER_WORLD - 1, (save.unlocked - 1) % PER_WORLD);
    state = 'menu';
    refreshQuests();
    if (loaded && save.unlocked >= 2 && giftReady()) openPopup('daily');   // quà hằng ngày hiện ngay khi mở game

    // Chỉ để thử nghiệm ngoài YouTube: ?level=23 ?unlock=all ?lang=vi
    // hoặc dạng #level-23 #unlock-all #lang-vi (khi trang chỉ giữ được phần sau dấu #)
    if (DEV) {
      const q = new URLSearchParams(location.search);
      const h = location.hash.slice(1);
      // window.TEST_UNLOCK_ALL: chỉ đặt trong trang chơi thử, không có trong index.html nộp YouTube
      if (q.get('unlock') === 'all' || h === 'unlock-all' || window.TEST_UNLOCK_ALL) save.unlocked = COUNT;
      const lang = q.get('lang') || (h.startsWith('lang-') ? h.slice(5) : '');
      if (lang) L = lang === 'vi' ? STR.vi : STR.en;
      const lv = parseInt(q.get('level') || (h.startsWith('level-') ? h.slice(6) : ''), 10);
      if (lv >= 1 && lv <= COUNT) { save.unlocked = Math.max(save.unlocked, lv); n = lv; startLevel(); }
    }
    sdk.gameReady();
    // tải dần nền ảnh các thế giới đã mở (sau gameReady nên không làm chậm lúc mở game)
    const lastW = Math.floor((save.unlocked - 1) / PER_WORLD);
    for (let w = 0; w <= lastW; w++) Art.loadEnv(WORLDS[w].id, () => { bgKey = ''; });
  }
  // Cổng đọc trạng thái cho bộ kiểm thử tự động (chỉ ngoài YouTube)
  if (!IN_YT) window.__hh = { get: () => ({ state, score, combo, mul: comboMul(), timeLeft, hook, items, result, wallet: save.wallet, OX, OY, mon, nextMonT, rush, caughtT, dynamite: save.dynamite, rushBest: save.rushBest, quests: save.quests, stats: save.stats, ach: save.ach }) };
  boot();
})();
