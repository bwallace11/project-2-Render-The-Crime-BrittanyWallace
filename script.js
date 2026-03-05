/* ============================================
   MAIN.JS — Lost in the Scroll  v2.0
   ============================================ */

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── GLOBAL STATE ──
const caseName = "CASE #4471 — THE RENDER MURDERS";
let cluesFound = 0;
let suspectsInterrogated = 0;
let introComplete = false;
let introTimeline = null;

// Mouse position
let mouseX = 0, mouseY = 0;
let parallaxRaf = null;

// All DOM refs populated in DOMContentLoaded
let dom = {};


/* ─────────────────────────────────────────────
   DOM READY
   ───────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {

  dom = {
    introScene:      document.querySelector('#intro-scene'),
    scrollWrapper:   document.querySelector('#scroll-wrapper'),
    continuePrompt:  document.querySelector('#continue-prompt'),
    bloodOverlay:    document.querySelector('#blood-overlay'),
    progressBar:     document.querySelector('#progress-bar'),
    chapterNav:      document.querySelector('#chapter-nav'),
    flashlightEl:    document.querySelector('#flashlight-overlay'),
    darkroomFlash:   document.querySelector('#darkroom-flashlight'),
    scrollHint:      document.querySelector('#scroll-hint'),
    cursor:          document.querySelector('#custom-cursor'),
    skipBtn:         document.querySelector('#skip-intro-btn'),
    introMurderer:   document.querySelector('#intro-murderer'),
    introShooting:   document.querySelector('#intro-shooting'),
    introVictim:     document.querySelector('#intro-victim'),
    introVictimDead: document.querySelector('#intro-victim-dead'),
  };

  initRain('intro-rain');
  setupMouseListeners();
  setupKeyboard();
  setupNavDots();
  setupContinuePrompt();
  setupSkipButton();
  initThemeSystem();

  console.log(
    '%c╔════════════════════════════════╗\n║  RENDER THE CRIME  v3.0        ║\n║  Open DevTools to begin (F12)  ║\n╚════════════════════════════════╝',
    'color: #00ff41; font-family: monospace; font-size: 11px;'
  );

  const title = document.querySelector('#intro-title');
  if (title) gsap.to(title, { opacity: 1, duration: 0.8, delay: 0.3 });

  setTimeout(startIntroSequence, 600);
});


/* ─────────────────────────────────────────────
   THEME SYSTEM — hamburger menu, light/dark/system
   ───────────────────────────────────────────── */
function initThemeSystem() {
  const btn   = document.querySelector('#hamburger-btn');
  const menu  = document.querySelector('#hamburger-menu');
  const items = document.querySelectorAll('.hm-item[data-theme-choice]');

  if (!btn || !menu) return;

  // Load saved preference
  const saved = localStorage.getItem('theme') || 'dark';
  applyTheme(saved);
  setActiveThemeBtn(saved);

  // Hamburger toggle
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = menu.classList.toggle('open');
    btn.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-hidden', String(!open));
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target) && e.target !== btn) {
      menu.classList.remove('open');
      btn.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      menu.setAttribute('aria-hidden', 'true');
    }
  });

  // Theme buttons
  items.forEach(item => {
    item.addEventListener('click', () => {
      const choice = item.dataset.themeChoice;
      localStorage.setItem('theme', choice);
      applyTheme(choice);
      setActiveThemeBtn(choice);
      console.log('%c🎨 Theme set to: ' + choice + (choice === 'light' ? ' (UV Blacklight)' : ''), 'color: #a855ff;');
    });
  });

  // Listen for system changes when in system mode
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (localStorage.getItem('theme') === 'system') applyTheme('system');
  });
}

function applyTheme(choice) {
  let resolved;
  if (choice === 'system') {
    resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } else {
    resolved = choice;
  }
  document.documentElement.setAttribute('data-theme', resolved);
}

function setActiveThemeBtn(choice) {
  document.querySelectorAll('.hm-item[data-theme-choice]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.themeChoice === choice);
  });
}


/* ─────────────────────────────────────────────
   MOUSE: cursor + parallax + flashlights
   ───────────────────────────────────────────── */
function setupMouseListeners() {
  document.addEventListener('mousemove', (e) => {
    if (dom.cursor) {
      dom.cursor.style.left = e.clientX + 'px';
      dom.cursor.style.top  = e.clientY + 'px';
    }

    mouseX = (e.clientX / window.innerWidth  - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;

    if (!introComplete) updateParallax();

    // Ch1 flashlight — chapter-relative coords
    if (dom.flashlightEl && introComplete) {
      const ch1 = document.querySelector('#chapter-1');
      if (ch1) {
        const r = ch1.getBoundingClientRect();
        dom.flashlightEl.style.background =
          `radial-gradient(circle 200px at ${e.clientX - r.left}px ${e.clientY - r.top}px, transparent 0%, rgba(0,0,0,.97) 100%)`;
      }
    }

    // Ch4 darkroom flashlight
    if (dom.darkroomFlash && dom.darkroomFlash.classList.contains('active')) {
      const ch4 = document.querySelector('#chapter-4');
      if (ch4) {
        const r = ch4.getBoundingClientRect();
        dom.darkroomFlash.style.background =
          `radial-gradient(circle 220px at ${e.clientX - r.left}px ${e.clientY - r.top}px, transparent 0%, rgba(0,0,0,.98) 100%)`;
      }
    }
  });
}


/* ─────────────────────────────────────────────
   PARALLAX
   ───────────────────────────────────────────── */
function updateParallax() {
  if (parallaxRaf) cancelAnimationFrame(parallaxRaf);
  parallaxRaf = requestAnimationFrame(() => {
    const ease = 'transform 0.12s cubic-bezier(0.25,0.46,0.45,0.94)';
    const layers = {
      '#parallax-sky':   [-4,  -2],
      '#parallax-far':   [-10, -4],
      '#parallax-mid':   [-20, -8],
      '#parallax-close': [-32, -12],
      '#parallax-fg':    [-46, -16],
      '#parallax-chars': [-60, -22],
    };
    Object.entries(layers).forEach(([sel, [mx, my]]) => {
      const el = document.querySelector(sel);
      if (!el) return;
      el.style.transition = ease;
      el.style.transform  = `translate(${mouseX * mx}px, ${mouseY * my}px)`;
    });
    const title = document.querySelector('#intro-title');
    if (title && title.style.opacity !== '0') {
      title.style.transition = ease;
      title.style.transform  = `translate(${mouseX * 8}px, ${mouseY * 4}px)`;
    }
  });
}


/* ─────────────────────────────────────────────
   INTRO ANIMATION — murder in the alley
   ───────────────────────────────────────────── */
function startIntroSequence() {
  if (prefersReducedMotion) { showContinuePrompt(); return; }

  const { introMurderer: murderer, introShooting: shooting,
          introVictim: victimAlive, introVictimDead: victimDead,
          bloodOverlay, introScene } = dom;

  if (!murderer || !shooting || !victimAlive || !victimDead) {
    console.warn('Intro characters missing — skipping to prompt');
    showContinuePrompt();
    return;
  }

  // Initial states
  gsap.set(murderer,    { x: -520, display: 'none', opacity: 1 });
  gsap.set(shooting,    { display: 'none', opacity: 1, x: 0 });
  gsap.set(victimAlive, { display: 'block', opacity: 1 });
  gsap.set(victimDead,  { display: 'none' });

  introTimeline = gsap.timeline({ onComplete: showContinuePrompt });

  // ── 1. Murderer creeps in from left ──
  introTimeline.to(murderer, {
    x: 0, duration: 2.4, ease: 'power1.inOut',
    onStart: () => gsap.set(murderer, { display: 'block' })
  });

  // ── 2. Pause — murderer waits ──
  introTimeline.to({}, { duration: 0.7 });

  // ── 3. Switch to shooting pose ──
  introTimeline.call(() => {
    gsap.set(murderer, { display: 'none' });
    gsap.set(shooting, { display: 'block', x: 0 });
  });
  introTimeline.to({}, { duration: 0.3 });

  // ── 4. GUNSHOT: white screen flash ──
  if (bloodOverlay) {
    introTimeline.to(bloodOverlay, { opacity: 1, duration: 0.05, ease: 'none' });
    introTimeline.to(bloodOverlay, { opacity: 0, duration: 0.35, ease: 'power2.out' });
  }

  // ── 5. Screen shake (happens same time as flash) ──
  if (introScene) {
    introTimeline.to(introScene, {
      x: 11, duration: 0.04, ease: 'none', yoyo: true, repeat: 8
    }, '<');
  }

  // ── 6. Victim collapses ──
  introTimeline.call(() => {
    gsap.set(victimAlive, { display: 'none' });
    gsap.set(victimDead,  { display: 'block' });
  });

  // ── 7. Blood splatter ──
  introTimeline.call(() => animateBloodDrip());

  // ── 8. Murderer RETREATS — flees back the way they came ──
  introTimeline.to(shooting, {
    x: -600, opacity: 0, duration: 1.1, ease: 'power2.in', delay: 0.7
  });

  // ── 9. Hold for blood to settle, then prompt ──
  introTimeline.to({}, { duration: 3.8 });
}


/* ─────────────────────────────────────────────
   BLOOD SPLATTER — canvas animation
   More dramatic: bigger explosion, runs DOWN screen, fades at 15s
   ───────────────────────────────────────────── */
function animateBloodDrip() {
  const canvas = document.querySelector('#blood-canvas');
  if (!canvas) return;

  const W = window.innerWidth;
  const H = window.innerHeight;
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Impact where victim stands
  const impactX = W * 0.74;
  const impactY = H * 0.55;

  const drops = [];

  // ── Central blob ──
  drops.push({
    type: 'blob', x: impactX, y: impactY,
    rx: 0, ry: 0, targetRx: 55, targetRy: 40,
    rotation: Math.random() * Math.PI, opacity: 1, color: '#6a0000'
  });

  // ── Radiating splatter drops — more of them, more chaotic ──
  for (let i = 0; i < 48; i++) {
    const angle  = (Math.PI * 2 * i / 48) + (Math.random() - 0.5) * 0.6;
    const speed  = 100 + Math.random() * 380;
    const size   = 2 + Math.random() * 16;
    drops.push({
      type: 'drop',
      x: impactX, y: impactY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (Math.random() * 60),
      gravity: 80 + Math.random() * 100,
      size, stretch: 1.5 + Math.random() * 3, angle,
      opacity: 0.6 + Math.random() * 0.4,
      color: `rgba(${75 + Math.floor(Math.random()*35)}, 0, 0, 1)`,
      landed: false, landX: 0, landY: 0,
      dripping: false, dripLen: 0, dripMaxLen: 0, dripSpeed: 0
    });
  }

  // ── Fine mist particles ──
  for (let i = 0; i < 80; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist  = 15 + Math.random() * 160;
    drops.push({
      type: 'mist',
      x: impactX + Math.cos(angle) * dist * (0.3 + Math.random()),
      y: impactY + Math.sin(angle) * dist * (0.3 + Math.random()),
      r: 1 + Math.random() * 5,
      opacity: 0.3 + Math.random() * 0.7,
      color: `rgba(${85 + Math.floor(Math.random()*45)}, ${Math.floor(Math.random()*10)}, 0, 1)`
    });
  }

  // ── Slow wall drips — start at random points on screen edges/mid ──
  for (let i = 0; i < 12; i++) {
    drops.push({
      type: 'walldrip',
      x: impactX + (Math.random() - 0.5) * W * 0.6,
      y: impactY - 30 + Math.random() * 80,
      width: 2 + Math.random() * 5,
      len: 0, maxLen: 80 + Math.random() * 300,
      speed: 0.3 + Math.random() * 0.9,
      opacity: 0.5 + Math.random() * 0.5,
      color: `rgba(${70 + Math.floor(Math.random()*30)}, 0, 0, 1)`,
      startDelay: 0.8 + Math.random() * 2.5
    });
  }

  const PHASE_LAND   = 0.4;
  const PHASE_DRIP   = 1.0;
  const FADE_START   = 15.0;
  const FADE_DURATION = 2.5;
  let startTime = null;

  gsap.to(canvas, { opacity: 1, duration: 0.06 });

  function drawFrame(ts) {
    if (!startTime) startTime = ts;
    const elapsed = (ts - startTime) / 1000;
    ctx.clearRect(0, 0, W, H);

    drops.forEach(d => {
      ctx.save();
      ctx.globalAlpha = d.opacity;

      if (d.type === 'blob') {
        d.rx = Math.min(d.rx + 2.8, d.targetRx);
        d.ry = Math.min(d.ry + 2.0, d.targetRy);
        ctx.translate(d.x, d.y);
        ctx.rotate(d.rotation);
        ctx.fillStyle = d.color;
        ctx.beginPath();
        for (let a = 0; a < Math.PI * 2; a += 0.25) {
          const jitter = 1 + (Math.sin(a * 4.7 + d.rotation) * 0.3);
          const px = Math.cos(a) * d.rx * jitter;
          const py = Math.sin(a) * d.ry * jitter;
          a < 0.25 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, d.rx * 0.7);
        g.addColorStop(0, 'rgba(25,0,0,0.6)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fill();

      } else if (d.type === 'drop') {
        if (!d.landed) {
          if (elapsed > 0) {
            d.x += d.vx * 0.016;
            d.y += d.vy * 0.016;
            d.vy += d.gravity * 0.016;
          }
          if (elapsed > PHASE_LAND) {
            d.landed = true; d.landX = d.x; d.landY = d.y;
            d.dripping   = Math.random() > 0.35;
            d.dripMaxLen = 30 + Math.random() * 180;
            d.dripSpeed  = 0.5 + Math.random() * 1.4;
          }
          ctx.translate(d.x, d.y);
          ctx.rotate(Math.atan2(d.vy, d.vx));
          ctx.fillStyle = d.color;
          ctx.beginPath();
          ctx.ellipse(0, 0, d.size * d.stretch * 0.5, d.size * 0.5, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.translate(d.landX, d.landY);
          ctx.fillStyle = d.color;
          ctx.beginPath();
          ctx.ellipse(0, 0, d.size * 1.5, d.size * 0.75, d.angle + Math.PI/2, 0, Math.PI * 2);
          ctx.fill();
          if (d.dripping && elapsed > PHASE_DRIP) {
            d.dripLen = Math.min(d.dripLen + d.dripSpeed, d.dripMaxLen);
            const dg = ctx.createLinearGradient(0, 0, 0, d.dripLen);
            dg.addColorStop(0, d.color);
            dg.addColorStop(1, 'rgba(55,0,0,0.3)');
            ctx.strokeStyle = dg;
            ctx.lineWidth   = d.size * 0.55;
            ctx.lineCap     = 'round';
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, d.dripLen); ctx.stroke();
            // teardrop tip
            ctx.fillStyle = 'rgba(75,0,0,0.75)';
            ctx.beginPath();
            ctx.arc(0, d.dripLen, d.size * 0.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }

      } else if (d.type === 'mist') {
        if (elapsed > 0.05) {
          ctx.fillStyle = d.color;
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
          ctx.fill();
        }

      } else if (d.type === 'walldrip') {
        if (elapsed > d.startDelay) {
          d.len = Math.min(d.len + d.speed, d.maxLen);
          const dg = ctx.createLinearGradient(d.x, d.y, d.x, d.y + d.len);
          dg.addColorStop(0, d.color);
          dg.addColorStop(0.7, d.color);
          dg.addColorStop(1, 'rgba(50,0,0,0.15)');
          ctx.strokeStyle = dg;
          ctx.lineWidth   = d.width;
          ctx.lineCap     = 'round';
          ctx.beginPath();
          // Slightly wobbly path for each drip
          ctx.moveTo(d.x, d.y);
          ctx.bezierCurveTo(
            d.x + (Math.random() - 0.5) * 4, d.y + d.len * 0.3,
            d.x + (Math.random() - 0.5) * 6, d.y + d.len * 0.7,
            d.x + (Math.random() - 0.5) * 3, d.y + d.len
          );
          ctx.stroke();
          // Bulging tip
          ctx.fillStyle = d.color;
          ctx.beginPath();
          ctx.arc(d.x, d.y + d.len, d.width * 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    });

    // ── Fade out after 15 seconds ──
    if (elapsed >= FADE_START) {
      const fp = Math.min((elapsed - FADE_START) / FADE_DURATION, 1);
      canvas.style.opacity = String(1 - fp);
      if (fp >= 1) { canvas.style.opacity = '0'; return; }
    }

    requestAnimationFrame(drawFrame);
  }

  requestAnimationFrame(drawFrame);
}


/* ─────────────────────────────────────────────
   CONTINUE PROMPT & SKIP
   ───────────────────────────────────────────── */
function showContinuePrompt() {
  const { continuePrompt } = dom;
  if (continuePrompt) gsap.to(continuePrompt, { opacity: 1, duration: 1.0, ease: 'power2.out' });
}

function setupContinuePrompt() {
  const { continuePrompt } = dom;
  if (!continuePrompt) return;
  continuePrompt.addEventListener('click', beginStory);
  continuePrompt.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') beginStory(); });
}

function setupSkipButton() {
  const { skipBtn } = dom;
  if (!skipBtn) return;
  skipBtn.addEventListener('click', () => {
    if (introTimeline) { introTimeline.kill(); introTimeline = null; }
    const { introMurderer: m, introShooting: s, introVictim: va, introVictimDead: vd, bloodOverlay } = dom;
    if (m)  gsap.set(m,  { display: 'none', x: 0 });
    if (s)  gsap.set(s,  { display: 'none', x: 0, opacity: 1 });
    if (va) gsap.set(va, { display: 'none' });
    if (vd) gsap.set(vd, { display: 'block' });
    if (bloodOverlay) gsap.set(bloodOverlay, { opacity: 0 });
    beginStory();
  });
}

function beginStory() {
  if (introComplete) return;
  introComplete = true;

  const { skipBtn, introScene, scrollWrapper, chapterNav, scrollHint } = dom;
  if (skipBtn) skipBtn.style.display = 'none';

  console.log('%c🔍 CASE FILE OPENED: ' + caseName, 'color: #00ff41; font-size: 14px; font-family: monospace;');
  console.log('%c"The case talks back to me."', 'color: #7ab3ff; font-style: italic;');

  gsap.to(introScene, {
    opacity: 0, duration: 0.8,
    onComplete: () => {
      introScene.style.display = 'none';
      scrollWrapper.style.display = 'block';
      if (chapterNav) gsap.to(chapterNav, { opacity: 1, duration: 0.6 });
      if (scrollHint) gsap.to(scrollHint, { opacity: 1, duration: 0.8, delay: 1 });
      requestAnimationFrame(() => requestAnimationFrame(() => {
        initHorizontalScroll();
        initRain('ch1-rain');
        initRain('ch5-rain');
        setTimeout(() => initSkyline('window-skyline'), 200);
      }));
    }
  });
}


/* ─────────────────────────────────────────────
   HORIZONTAL SCROLL
   ───────────────────────────────────────────── */
function initHorizontalScroll() {
  gsap.registerPlugin(ScrollTrigger);
  const track    = document.querySelector('#scroll-track');
  const chapters = document.querySelectorAll('.chapter');
  if (!track) return;

  const totalWidth = track.scrollWidth - window.innerWidth;
  if (totalWidth <= 0) { requestAnimationFrame(initHorizontalScroll); return; }

  gsap.to(track, {
    x: -totalWidth, ease: 'none',
    scrollTrigger: {
      trigger: '#scroll-wrapper',
      start: 'top top',
      end: () => '+=' + (totalWidth + window.innerWidth),
      scrub: 1, pin: true, anticipatePin: 1,
      onUpdate: (self) => {
        if (dom.progressBar) dom.progressBar.style.width = (self.progress * 100) + '%';
        if (self.progress > 0.02 && dom.scrollHint) gsap.to(dom.scrollHint, { opacity: 0, duration: 0.4 });
        updateNavDots(Math.round(self.progress * (chapters.length - 1)));
        // Ch1 text slam animation
        updateCh1Text(self.progress);
      }
    }
  });

  initChapter1_Flashlight();
  initChapter2_Interrogation();
  initChapter3_EvidenceWeb();
  initChapter4_Darkroom();
  initChapter5_CaseFile();
}

function updateNavDots(activeIdx) {
  document.querySelectorAll('.nav-dot').forEach((dot, i) => dot.classList.toggle('active', i === activeIdx));
}


/* ─────────────────────────────────────────────
   CHAPTER 1: THE ALLEY
   ───────────────────────────────────────────── */
function initChapter1_Flashlight() {
  console.log('%c📁 CASE FILE OPENED: ' + caseName, 'color: #ffaa00; font-weight:bold;');
  const consoleLines = document.querySelector('#console-lines');

  // ── GSAP STICKY TEXT: pin ch1 text to viewport, slam out when leaving ch1 ──
  initCh1StickyText();

  function addConsoleLine(html, cls) {
    if (!consoleLines) return;
    const div = document.createElement('div');
    div.className = 'cline ' + cls;
    div.innerHTML = html;
    consoleLines.appendChild(div);
    consoleLines.scrollTop = consoleLines.scrollHeight;
  }

  document.querySelectorAll('.clue-item').forEach((clue, idx) => {
    clue.addEventListener('click', function() {
      if (this.classList.contains('found')) return;
      this.classList.add('found');
      cluesFound++;

      const name   = this.dataset.clue;
      const detail = this.dataset.detail;

      const counter = document.querySelector('.clues-count');
      if (counter) {
        counter.textContent = cluesFound;
        gsap.fromTo(counter,
          { color: '#ffffff', textShadow: '0 0 20px white' },
          { color: '#00ff41', textShadow: '0 0 15px #00ff41', duration: 0.4 }
        );
      }

      addConsoleLine(`<span class="c-key">console</span>.log(<span class="c-str">"🔎 ${name}"</span>);`, 'cline-find');
      addConsoleLine(`<span class="c-comment">// → ${detail}</span>`, 'cline-dim');
      addConsoleLine(`cluesFound = <span class="c-num">${cluesFound}</span>;`, 'cline-log');

      console.log('%c🔎 Clue: ' + name, 'color: #ffaa00;');
      console.log('  Detail:', detail);
      console.log('  cluesFound =', cluesFound);

      const evItem = document.querySelector('#ev-' + idx);
      if (evItem) evItem.classList.add('found');

      if (cluesFound >= 5) {
        addConsoleLine('<span style="color:#00ff41;">// ✅ All clues found — scroll forward</span>', 'cline-log');
        console.log('%c✅ All 5 clues found!', 'color: #00ff41; font-weight: bold;');
      }
    });
  });
}



/* ─────────────────────────────────────────────
   CH1 STICKY TEXT — force fixed position via JS
   Items slam in staggered on enter.
   Panel slams into left wall when scrolling to ch2.
   Slams back in when scrolling back.
   ───────────────────────────────────────────── */
function initCh1StickyText() {
  const panel = document.querySelector('#ch1-text-panel');
  if (!panel) return;

  // Force fixed positioning via JS style (overrides .text-panel absolute)
  panel.style.cssText = 'position:fixed!important;left:28px;top:60px;z-index:1000;max-width:380px;padding:28px 24px;';

  const items = Array.from(panel.querySelectorAll('.chapter-label,.chapter-title,.chapter-subtitle,.chapter-body,.code-block,.metaphor-line'));

  if (prefersReducedMotion) {
    items.forEach(el => { el.style.opacity='1'; el.style.transform=''; });
    window._ch1Panel = panel;
    window._ch1Slammed = false;
    return;
  }

  // SLAM IN: each line flies in from the left wall, staggered
  gsap.set(items, { opacity: 0, x: -180, skewX: -10, rotation: -2 });
  gsap.to(items, {
    opacity: 1, x: 0, skewX: 0, rotation: 0,
    duration: 0.65,
    stagger: 0.1,
    ease: 'power4.out',
    delay: 0.5
  });

  window._ch1Panel = panel;
  window._ch1Slammed = false;
}

// Called every frame from the main ScrollTrigger onUpdate
function updateCh1Text(p) {
  const panel = window._ch1Panel;
  if (!panel) return;

  // Ch1 = progress 0 → ~0.205 (1/4.88 of scroll range with totalWidth math)
  // Conservative: start exit at progress 0.11, fully gone by 0.22
  const S = 0.11, E = 0.22;

  if (p <= S) {
    if (window._ch1Slammed) {
      window._ch1Slammed = false;
      // SLAM BACK IN from left wall
      gsap.fromTo(panel,
        { x: -1100, opacity: 0, rotation: -8, skewX: -14 },
        { x: 0,     opacity: 1, rotation: 0,  skewX: 0,
          duration: 0.6, ease: 'back.out(1.4)',
          onStart: () => { panel.style.pointerEvents = 'auto'; }
        }
      );
    }
  } else if (p < E) {
    // SLAM OUT: accelerates into wall (cubic ease-in feel via manual t^3)
    const t = (p - S) / (E - S);
    const e = t * t * t;
    panel.style.pointerEvents = 'none';
    gsap.set(panel, {
      x:        -e * 1200,
      opacity:  Math.max(0, 1 - t * 1.6),
      rotation: -e * 12,
      skewX:    -e * 18
    });
    if (t > 0.9) window._ch1Slammed = true;
  } else {
    gsap.set(panel, { x: -1200, opacity: 0, rotation: -12 });
    window._ch1Slammed = true;
    panel.style.pointerEvents = 'none';
  }
}


/* ─────────────────────────────────────────────
   CHAPTER 2: INTERROGATION ROOM
   ───────────────────────────────────────────── */
const SUSPECTS = {
  doctor: {
    name: 'Dr. Victor Harlow', role: 'The Family Physician',
    img:  'assets/images/suspectDoctor.png',
    body: 'Been treating the deceased for three years. His coat carries stains he cannot explain — and he was seen near the east wing at 2 AM.',
    motive: 'MOTIVE: Blackmail — victim knew of a malpractice cover-up worth $800K'
  },
  widow: {
    name: 'Evelyn Morrow', role: 'The Widow',
    img:  'assets/images/suspectWidow.png',
    body: 'Stands to inherit the entire estate — $4.2 million. Filed for divorce six weeks before the murder, then abruptly withdrew the papers.',
    motive: 'MOTIVE: Inheritance — $4.2M estate, sole beneficiary'
  },
  butler: {
    name: 'Edmund Graves', role: 'The Butler',
    img:  'assets/images/suspectButler.png',
    body: 'Forty years of service, dismissed without severance three days before the murder. He holds the only key to the east exit. Used at 2:08 AM.',
    motive: 'MOTIVE: Resentment — dismissed after 40 years, privy to all family secrets'
  },
  nephew: {
    name: 'Dante Morrow', role: 'The Nephew',
    img:  'assets/images/suspectNephew.png',
    body: 'Cut from the will eight months ago. Three ATM withdrawals place him six blocks from the estate between 1 and 3 AM. Cigarette monogram: D.M.',
    motive: 'MOTIVE: Disinheritance — removed from $4.2M will, $180K gambling debt'
  }
};

function initChapter2_Interrogation() {
  const cards    = document.querySelectorAll('.suspect-card');
  const panel    = document.querySelector('#suspect-info-panel');
  const prompt   = document.querySelector('#interrogation-prompt');
  const lockMsg  = document.querySelector('#scroll-lock-msg');
  const closeBtn = document.querySelector('#suspect-info-close');
  const clReadout = document.querySelector('#classlist-value');

  function updateCLDisplay(card, isNew) {
    if (!clReadout) return;
    const cls = Array.from(card.classList).filter(c => ['active','interrogated'].includes(c));
    clReadout.textContent = cls.length ? '[ "' + cls.join('", "') + '" ]' : '[ ]';
    const actionEl = document.querySelector('#classlist-action');
    if (actionEl) {
      if (isNew) {
        actionEl.textContent = '→ classList.add("interrogated") called';
      } else {
        actionEl.textContent = '→ already interrogated (classList unchanged)';
      }
    }
  }

  // Lamp toggle
  const lampBtn = document.querySelector('#lamp-toggle-btn');
  let lampOn = true;
  const lampCone = document.querySelector('#lamp-cone');
  if (lampBtn) {
    lampBtn.addEventListener('click', () => {
      lampOn = !lampOn;
      lampBtn.classList.toggle('lamp--off', !lampOn);
      lampBtn.setAttribute('aria-pressed', String(lampOn));
      const ch2 = document.querySelector('#chapter-2');
      if (lampCone) {
        gsap.to(lampCone, { opacity: lampOn ? 1 : 0, duration: 0.6 });
      }
      if (ch2) {
        ch2.classList.toggle('lamp-off', !lampOn);
        // Animate room brightness
        gsap.to(ch2, { backgroundColor: lampOn ? '' : '#010005', duration: 0.7 });
      }
      // Light mode purple tint: add class to chapter for UV blacklight feel
      const ch2b = document.querySelector('#chapter-2');
      if (ch2b) ch2b.classList.toggle('lamp-off', !lampOn);
      console.log('%c💡 Lamp: ' + (lampOn ? 'ON' : 'OFF'), 'color: #ffaa00;');
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      // Keep the active card lit (full color) after panel closes
      const activeCard = document.querySelector('.suspect-card.active');
      if (activeCard) {
        activeCard.classList.remove('active');
        // interrogated class now = full color per CSS, so no extra class needed
      }
      panel.classList.remove('open');
      if (clReadout) clReadout.textContent = '[ ]';
    });
  }

  cards.forEach(card => {
    card.addEventListener('click', function() {
      const data = SUSPECTS[this.dataset.suspect];
      if (!data) return;
      // Remove only 'active' (highlight ring) from others – keep interrogated (full color)
      cards.forEach(c => c.classList.remove('active'));
      this.classList.add('active');

      let isNew = false;
      if (!this.classList.contains('interrogated')) {
        this.classList.add('interrogated');
        suspectsInterrogated++;
        isNew = true;
        const susItem = document.querySelector('#sus-' + this.dataset.suspect);
        if (susItem) susItem.classList.add('done');
        console.log('%c🕵 Interrogating: ' + data.name, 'color: #ff5555;');
        console.log('  classList.add("interrogated") → triggers CSS filter change');
      } else {
        console.log('%c🕵 Already interrogated: ' + data.name, 'color: #aa3333;');
      }

      updateCLDisplay(this, isNew);
      document.querySelector('#suspect-portrait').src = data.img;
      document.querySelector('#suspect-portrait').alt = data.name;
      document.querySelector('#suspect-info-name').textContent   = data.name;
      document.querySelector('#suspect-info-role').textContent   = data.role;
      document.querySelector('#suspect-info-body').textContent   = data.body;
      document.querySelector('#suspect-info-motive').textContent = data.motive;
      panel.classList.add('open');

      const remaining = 4 - suspectsInterrogated;
      if (suspectsInterrogated >= 4) {
        if (lockMsg) gsap.to(lockMsg, { opacity: 0, duration: 0.4 });
        if (prompt) { prompt.textContent = '✓ ALL SUSPECTS QUESTIONED — SCROLL TO CONTINUE'; gsap.fromTo(prompt, { opacity: 0 }, { opacity: 1, duration: 0.5 }); }
        console.log('%c✅ All 4 suspects interrogated', 'color: #00ff41; font-weight:bold;');
      } else {
        if (lockMsg) lockMsg.textContent = `${remaining} SUSPECT${remaining > 1 ? 'S' : ''} REMAINING`;
      }
    });
  });
}


/* ─────────────────────────────────────────────
   CHAPTER 3: CRIME BOARD
   Web draws ON CLICK — lines connect clicked items to each other
   Lines go BEHIND cards/photos (SVG z-index:4, cards z-index:6)
   ───────────────────────────────────────────── */
// Track which elements have been clicked so we can connect new ones to previous
const clickedBoardItems = [];

function initChapter3_EvidenceWeb() {
  const allItems = [
    ...document.querySelectorAll('.evidence-card'),
    ...document.querySelectorAll('.suspect-photo--board')
  ];

  allItems.forEach(item => {
    item.addEventListener('click', function() {
      const info  = this.dataset.info;
      const label = this.dataset.label;

      this.classList.toggle('revealed');
      showBoardTooltip(this, (label ? label + ': ' : '') + info);

      console.log('%c📌 ' + (label || 'Item'), 'color: #ffaa00; font-weight:bold;');
      console.log('  dataset.info →', info);

      const board   = document.querySelector('#corkboard');
      const svg     = document.querySelector('#evidence-strings');
      const textPin = document.querySelector('#ch3-text-panel');

      if (!clickedBoardItems.includes(this)) {
        if (board && svg) {
          const boardRect = board.getBoundingClientRect();
          const newCenter = getElementCenter(this, boardRect);

          // Connect to previous item (chain)
          if (clickedBoardItems.length > 0) {
            const prevCenter = getElementCenter(clickedBoardItems[clickedBoardItems.length - 1], boardRect);
            drawString(svg, prevCenter.x, prevCenter.y, newCenter.x, newCenter.y);
          }

          // ALSO connect this item to the center text panel
          if (textPin) {
            const panelCenter = getElementCenter(textPin, boardRect);
            drawString(svg, newCenter.x, newCenter.y, panelCenter.x, panelCenter.y, 'rgba(61,127,255,0.5)');
          }
        }
        clickedBoardItems.push(this);
      }
    });

    // Keyboard support
    item.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.click(); }
    });
  });

  // Update SVG viewBox when layout settles
  setTimeout(() => {
    const board = document.querySelector('#corkboard');
    const svg   = document.querySelector('#evidence-strings');
    if (board && svg) {
      const r = board.getBoundingClientRect();
      svg.setAttribute('viewBox', `0 0 ${r.width} ${r.height}`);
    }
  }, 600);

  // Crime board panel stays visible – it's part of the board, never hides
  // The strings will draw around/behind it naturally
}

function getElementCenter(el, boardRect) {
  const r = el.getBoundingClientRect();
  // For evidence cards, target the pin (top center); for photos target center
  const isCard = el.classList.contains('evidence-card');
  const isPhoto = el.classList.contains('suspect-photo--board');
  return {
    x: r.left + r.width  / 2 - boardRect.left,
    y: isCard ? r.top + 6 - boardRect.top :  // aim at pin
       isPhoto ? r.top + 20 - boardRect.top : // aim at pin
       r.top  + r.height / 2 - boardRect.top
  };
}

function drawString(svg, x1, y1, x2, y2, color) {
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', x1); line.setAttribute('y1', y1);
  line.setAttribute('x2', x2); line.setAttribute('y2', y2);
  line.setAttribute('stroke', color || '#cc1500');
  line.setAttribute('stroke-width', '1.5');
  line.setAttribute('stroke-dasharray', '600');
  line.setAttribute('stroke-dashoffset', '600');
  line.setAttribute('opacity', '0.7');
  line.classList.add('evidence-string-line');
  svg.appendChild(line);

  // Animate the line drawing in
  requestAnimationFrame(() => {
    line.style.transition = 'stroke-dashoffset 0.55s ease-out, opacity 0.3s';
    line.setAttribute('stroke-dashoffset', '0');
  });
}

function showBoardTooltip(el, text) {
  const old = el.querySelector('.board-tooltip');
  if (old) old.remove();
  const tip = document.createElement('div');
  tip.className = 'board-tooltip';
  tip.textContent = text;
  el.style.position = 'absolute';
  el.appendChild(tip);
  gsap.fromTo(tip, { opacity: 0, y: 4 }, { opacity: 1, y: 0, duration: 0.2 });
  setTimeout(() => gsap.to(tip, { opacity: 0, duration: 0.3, onComplete: () => tip.remove() }), 3500);
}


/* ─────────────────────────────────────────────
   CHAPTER 4: DARKROOM
   ───────────────────────────────────────────── */
let darkroomLightsOn = true;
let photosDeveloped  = false;
let darkroomParallaxActive = false;
let drParallaxRaf = null;

function initChapter4_Darkroom() {
  const switchBtn   = document.querySelector('#light-switch-btn');
  const roomLight   = document.querySelector('#darkroom-light');
  const safelight   = document.querySelector('#darkroom-safelight');
  const flashlight  = document.querySelector('#darkroom-flashlight');
  const instruction = document.querySelector('#darkroom-instruction');
  const statusLabel = document.querySelector('#switch-status');
  const trNight     = document.querySelector('#tr-night');
  const trAmber     = document.querySelector('#tr-amber');

  if (!switchBtn) return;

  // All photos start completely black (already set by CSS brightness(0))
  // Evidence content starts invisible
  document.querySelectorAll('.evidence-photo-content').forEach(c => {
    c.style.opacity = '0';
  });

  switchBtn.addEventListener('click', () => {
    darkroomLightsOn = !darkroomLightsOn;

    if (!darkroomLightsOn) {
      switchBtn.classList.add('off');
      if (roomLight)  roomLight.classList.add('off');
      if (safelight)  safelight.style.opacity = '1';
      if (statusLabel) statusLabel.textContent = 'OFF';
      if (instruction) instruction.textContent = 'MOVE MOUSE — CAST LIGHT OVER THE DEVELOPING PHOTOS';
      document.documentElement.style.setProperty('--color-night', '#080005');
      document.documentElement.style.setProperty('--color-amber', '#ff3300');
      if (trNight) trNight.textContent = '#080005';
      if (trAmber) trAmber.textContent = '#ff3300';
      setTimeout(() => {
        if (flashlight) { flashlight.classList.add('active'); dom.darkroomFlash = flashlight; }
      }, 1100);
      if (!photosDeveloped) {
        photosDeveloped = true;
        developPhotos();
      }
      // Activate parallax after photos start to appear
      setTimeout(() => {
        darkroomParallaxActive = true;
        startDarkroomParallax();
      }, 2000);
      console.log('%c🔴 Lights OFF — photos begin developing', 'color: #cc2200;');
      console.log('%cdocument.documentElement.style.setProperty("--color-night", "#080005")', 'color: #9b4dff; font-family: monospace;');
    } else {
      switchBtn.classList.remove('off');
      if (roomLight)  roomLight.classList.remove('off');
      if (safelight)  safelight.style.opacity = '0';
      if (flashlight) flashlight.classList.remove('active');
      if (statusLabel) statusLabel.textContent = 'ON';
      if (instruction) instruction.textContent = 'TURN OFF THE LIGHTS — WATCH THE EVIDENCE DEVELOP';
      document.documentElement.style.setProperty('--color-night', '#0a0818');
      document.documentElement.style.setProperty('--color-amber', '#ffaa00');
      if (trNight) trNight.textContent = '#0a0818';
      if (trAmber) trAmber.textContent = '#ffaa00';
      darkroomParallaxActive = false;
      console.log('%c💡 Lights ON', 'color: #ffaa00;');
      console.log('%cdocument.documentElement.style.setProperty("--color-night", "#0a0818")', 'color: #9b4dff; font-family: monospace;');
    }
  });
}

/* Develop photos and evidence: stagger them in, then start drip animations */
function developPhotos() {
  // Develop suspect photos (brightness 0 → normal)
  document.querySelectorAll('.photo-frame img').forEach((img, i) => {
    setTimeout(() => {
      img.classList.add('developed');
      // Start water drip on this photo's canvas
      const canvas = img.closest('.photo-frame').querySelector('.drip-canvas');
      if (canvas) {
        canvas.classList.add('active');
        animateWaterDrip(canvas);
      }
      console.log('%c🖼 Developing: ' + img.alt, 'color: #9b4dff;');
    }, 600 + i * 550);
  });

  // Develop evidence SVG photos (opacity 0 → 1)
  document.querySelectorAll('.evidence-photo-content').forEach((evidenceContent, i) => {
    setTimeout(() => {
      evidenceContent.classList.add('developed');
      evidenceContent.style.opacity = '1';
      const canvas = evidenceContent.closest('.photo-frame--evidence').querySelector('.drip-canvas');
      if (canvas) {
        canvas.classList.add('active');
        animateWaterDrip(canvas);
      }
      // Reveal evidence label when photo develops
      const label = evidenceContent.closest('.photo-frame--evidence').querySelector('.photo-evidence-label');
      if (label) label.classList.add('revealed');
      // Also reveal caption
      const caption = evidenceContent.closest('.darkroom-photo').querySelector('.photo-caption');
      if (caption) {
        gsap.fromTo(caption, { opacity: 0 }, { opacity: 1, duration: 1.2, delay: 0.5 });
        console.log('%c🖼 Evidence developing: ' + caption.textContent, 'color: #9b4dff;');
      }
    }, 800 + i * 450);
  });

  // Also reveal labels on suspect photos
  document.querySelectorAll('.photo-frame img').forEach((img, i) => {
    setTimeout(() => {
      const label = img.closest('.photo-frame').querySelector('.photo-evidence-label');
      if (label) label.classList.add('revealed');
    }, 600 + i * 550 + 600);
  });
}

/* Water drip animation — simulates photos fresh out of developing bath */
function animateWaterDrip(canvas) {
  if (!canvas || prefersReducedMotion) return;
  const W = canvas.width;
  const H = canvas.height;
  const ctx = canvas.getContext('2d');

  const drips = [];
  const COUNT = 4 + Math.floor(Math.random() * 4);
  for (let i = 0; i < COUNT; i++) {
    drips.push({
      x: 8 + Math.random() * (W - 16),
      y: -Math.random() * H * 0.5,
      speed: 0.3 + Math.random() * 0.6,
      len: 6 + Math.random() * 18,
      width: 1 + Math.random() * 1.5,
      opacity: 0.35 + Math.random() * 0.4,
      drop: false,
      dropY: 0,
      dropR: 0,
      dropMaxR: 1.5 + Math.random() * 2,
      phase: 'fall', // fall → pool → done
      delay: i * 400
    });
  }

  let startTime = null;
  const TOTAL_DURATION = 8000; // 8 seconds total drip life

  function draw(ts) {
    if (!startTime) startTime = ts;
    const elapsed = ts - startTime;
    if (elapsed > TOTAL_DURATION) {
      ctx.clearRect(0, 0, W, H);
      canvas.classList.remove('active');
      return;
    }

    ctx.clearRect(0, 0, W, H);
    let anyActive = false;

    drips.forEach(d => {
      if (elapsed < d.delay) return;
      anyActive = true;

      ctx.save();
      ctx.globalAlpha = d.opacity;

      if (d.phase === 'fall') {
        d.y += d.speed;
        // Draw teardrop
        ctx.fillStyle = 'rgba(120,160,220,.8)';
        ctx.beginPath();
        ctx.ellipse(d.x, d.y, d.width, d.len * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        // Teardrop bulge at bottom
        ctx.beginPath();
        ctx.arc(d.x, d.y + d.len * 0.4, d.width * 1.3, 0, Math.PI * 2);
        ctx.fill();

        if (d.y > H) {
          d.phase = 'pool';
          d.dropY = H;
          d.y = H + 100; // move off screen
        }
      } else if (d.phase === 'pool') {
        d.dropR = Math.min(d.dropR + 0.08, d.dropMaxR);
        // Spreading water ring
        ctx.strokeStyle = 'rgba(100,140,200,.5)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.ellipse(d.x, d.dropY, d.dropR * 3, d.dropR, 0, 0, Math.PI * 2);
        ctx.stroke();
        if (d.dropR >= d.dropMaxR) d.phase = 'done';
      }

      ctx.restore();
    });

    if (anyActive) requestAnimationFrame(draw);
    else {
      ctx.clearRect(0, 0, W, H);
      canvas.classList.remove('active');
    }
  }

  requestAnimationFrame(draw);
}

/* Darkroom mouse parallax — photos shift at different depths for 3D effect */
function startDarkroomParallax() {
  const ch4 = document.querySelector('#chapter-4');
  if (!ch4) return;

  ch4.addEventListener('mousemove', (e) => {
    if (!darkroomParallaxActive) return;
    if (drParallaxRaf) cancelAnimationFrame(drParallaxRaf);
    drParallaxRaf = requestAnimationFrame(() => {
      const r = ch4.getBoundingClientRect();
      const mx = ((e.clientX - r.left) / r.width  - 0.5) * 2;
      const my = ((e.clientY - r.top)  / r.height - 0.5) * 2;

      document.querySelectorAll('.dr-parallax').forEach(photo => {
        const depth = parseFloat(photo.dataset.depth) || 0.06;
        const tx = mx * depth * -80;
        const ty = my * depth * -40;
        photo.style.transition = 'transform 0.15s cubic-bezier(0.25,0.46,0.45,0.94)';
        photo.style.transform  = `translate(${tx}px, ${ty}px)`;
      });
    });
  });
}


/* ─────────────────────────────────────────────
   CHAPTER 5: CASE FILE — localStorage
   ───────────────────────────────────────────── */
// ── RANDOM MURDER SELECTION: ensures no repeats in a row ──
const MURDERERS = ['doctor', 'widow', 'butler', 'nephew'];
let murdererPool = [];
let lastMurderer = null;

function pickMurderer() {
  if (murdererPool.length === 0) {
    murdererPool = [...MURDERERS].filter(m => m !== lastMurderer);
    // Shuffle
    for (let i = murdererPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [murdererPool[i], murdererPool[j]] = [murdererPool[j], murdererPool[i]];
    }
  }
  lastMurderer = murdererPool.pop();
  return lastMurderer;
}

const MURDERER_DATA = {
  doctor:  { name: 'DR. HARLOW',  img: 'assets/images/suspectDoctor.png',  reason: 'The blackmail victim became the victim. He silenced the one man who could destroy him.', style: 'color:#cc0000;' },
  widow:   { name: 'THE WIDOW',   img: 'assets/images/suspectWidow.png',   reason: 'She withdrew the divorce papers — then withdrew the man. $4.2M and no witnesses.', style: 'color:#cc0000;' },
  butler:  { name: 'THE BUTLER',  img: 'assets/images/suspectButler.png',  reason: 'Forty years of service. Dismissed without a word. He kept the key — and used it.', style: 'color:#cc0000;' },
  nephew:  { name: 'THE NEPHEW',  img: 'assets/images/suspectNephew.png', reason: 'Disinherited. Desperate. The monogram D.M. left at the scene sealed it.', style: 'color:#cc0000;' }
};

function initChapter5_CaseFile() {
  const saveBtn = document.querySelector('#save-btn');
  const loadBtn = document.querySelector('#load-btn');
  const status  = document.querySelector('#storage-status');

  // Inject random murderer reveal into the overview page
  const folderTitle = document.querySelector('.folder-title');
  if (folderTitle) {
    const murdererKey = pickMurderer();
    const mData = MURDERER_DATA[murdererKey];
    const revealEl = document.createElement('div');
    revealEl.style.cssText = 'margin-top:14px;padding:10px 14px;background:rgba(139,0,0,.08);border-left:3px solid #8b0000;font-family:var(--font-ui);font-size:.7rem;';
    revealEl.innerHTML = `<div style="font-size:.55rem;letter-spacing:.2em;color:#8b5020;text-transform:uppercase;margin-bottom:4px;">DETECTIVE'S CONCLUSION</div><div style="color:#8b0000;font-weight:bold;font-size:.85rem;font-family:var(--font-display);">THE MURDERER: ${mData.name}</div><div style="color:#5c2000;font-size:.7rem;line-height:1.6;margin-top:4px;">${mData.reason}</div>`;
    const divider = folderTitle.nextElementSibling;
    if (divider) divider.after(revealEl);
  }

  document.querySelectorAll('.folder-tab').forEach(tab => {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.folder-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.folder-page').forEach(p => p.classList.remove('active'));
      this.classList.add('active');
      const page = document.querySelector('#fpage-' + this.dataset.tab);
      if (page) page.classList.add('active');
    });
  });

  function refreshDisplay() {
    const sc = document.querySelector('#saved-clues');
    const ss = document.querySelector('#saved-suspects');
    if (sc) sc.textContent = cluesFound;
    if (ss) ss.textContent = suspectsInterrogated;
  }
  refreshDisplay();
  setInterval(refreshDisplay, 1200);
  loadFromStorage();

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      localStorage.setItem('cluesFound', cluesFound);
      localStorage.setItem('suspectsInterrogated', suspectsInterrogated);
      localStorage.setItem('savedAt', new Date().toLocaleTimeString());
      if (status) status.textContent = 'SAVED AT ' + new Date().toLocaleTimeString();
      gsap.fromTo(saveBtn, { backgroundColor: '#006600' }, { backgroundColor: '#8b0000', duration: 0.8 });
      console.log('%c💾 Saved to localStorage', 'color: #ffaa00;');
    });
  }
  if (loadBtn) loadBtn.addEventListener('click', loadFromStorage);

  function loadFromStorage() {
    const saved = localStorage.getItem('cluesFound');
    if (saved !== null) {
      const sc = document.querySelector('#saved-clues');
      const ss = document.querySelector('#saved-suspects');
      const st = localStorage.getItem('savedAt');
      if (sc) sc.textContent = saved;
      if (ss) ss.textContent = localStorage.getItem('suspectsInterrogated') || '0';
      if (status) status.textContent = 'LOADED — SAVED AT ' + (st || '—');
    } else {
      if (status) status.textContent = 'NO SAVED DATA — HIT SAVE FIRST';
    }
  }
}


/* ─────────────────────────────────────────────
   RAIN CANVAS
   ───────────────────────────────────────────── */
function initRain(canvasId) {
  const canvas = document.querySelector('#' + canvasId);
  if (!canvas || prefersReducedMotion) return;
  const ctx = canvas.getContext('2d');
  canvas.width  = canvas.offsetWidth  || window.innerWidth;
  canvas.height = canvas.offsetHeight || window.innerHeight;

  const drops = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width, y: Math.random() * canvas.height,
    speed: 4 + Math.random() * 8, length: 8 + Math.random() * 20,
    opacity: 0.05 + Math.random() * 0.1
  }));

  (function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drops.forEach(d => {
      ctx.strokeStyle = `rgba(100,150,255,${d.opacity})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 1, d.y + d.length); ctx.stroke();
      d.y += d.speed;
      if (d.y > canvas.height) { d.y = -d.length; d.x = Math.random() * canvas.width; }
    });
    requestAnimationFrame(draw);
  })();

  window.addEventListener('resize', () => {
    canvas.width  = canvas.offsetWidth  || window.innerWidth;
    canvas.height = canvas.offsetHeight || window.innerHeight;
  });
}


/* ─────────────────────────────────────────────
   CITY SKYLINE CANVAS
   ───────────────────────────────────────────── */
function initSkyline(canvasId) {
  const canvas = document.querySelector('#' + canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width  = canvas.offsetWidth  || window.innerWidth;
  canvas.height = canvas.offsetHeight || 220;

  const buildings = [];
  let x = 0;
  while (x < canvas.width + 100) {
    const w = 40 + Math.random() * 80;
    const h = 60 + Math.random() * 140;
    const wins = [];
    for (let wy = canvas.height - h + 10; wy < canvas.height - 10; wy += 16)
      for (let wx = x + 6; wx < x + w - 10; wx += 14)
        wins.push({ x: wx, y: wy, on: Math.random() > .5, rate: .001 + Math.random() * .003 });
    buildings.push({ x, y: canvas.height - h, w, h, windows: wins });
    x += w + 2;
  }

  (function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    buildings.forEach(b => {
      ctx.fillStyle = '#060412'; ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = 'rgba(61,127,255,.1)'; ctx.lineWidth = 1; ctx.strokeRect(b.x, b.y, b.w, b.h);
      b.windows.forEach(w => {
        if (Math.random() < w.rate) w.on = !w.on;
        ctx.fillStyle = w.on ? 'rgba(255,200,80,.65)' : 'rgba(15,12,30,.9)';
        ctx.fillRect(w.x, w.y, 8, 8);
      });
    });
    requestAnimationFrame(draw);
  })();
}


/* ─────────────────────────────────────────────
   KEYBOARD NAV
   ───────────────────────────────────────────── */
function setupKeyboard() {
  document.addEventListener('keydown', e => {
    if (!introComplete) return;
    const step = window.innerWidth * 0.8;
    if (e.key === 'ArrowRight') window.scrollBy({ top: step,  behavior: 'smooth' });
    if (e.key === 'ArrowLeft')  window.scrollBy({ top: -step, behavior: 'smooth' });
  });

  // Touch swipe support for mobile
  let touchStartX = 0, touchStartY = 0;
  document.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener('touchend', e => {
    if (!introComplete) return;
    const dx = touchStartX - e.changedTouches[0].clientX;
    const dy = Math.abs(touchStartY - e.changedTouches[0].clientY);
    if (Math.abs(dx) > 50 && dy < 80) {
      const step = window.innerWidth * 0.9;
      window.scrollBy({ top: dx > 0 ? step : -step, behavior: 'smooth' });
    }
  }, { passive: true });
}

function setupNavDots() {
  document.querySelectorAll('.nav-dot').forEach((dot, i) => {
    dot.addEventListener('click', () => {
      const chapters = document.querySelectorAll('.chapter');
      const total = document.body.scrollHeight - window.innerHeight;
      window.scrollTo({ top: (i / (chapters.length - 1)) * total, behavior: 'smooth' });
    });
  });
}
