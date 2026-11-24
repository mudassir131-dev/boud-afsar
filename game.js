/**
 * Moh Hunter — Exact Reference Video Gameplay Workflow
 * - Clean full-body illustrated character in bed (.webp assets)
 * - Hold & drag anywhere to project dashed aim line from hands/blaster
 * - Release to fire at the flying mosquito
 * - +1 kill counter, floating +1 popup, splat + confetti particles
 * - 100% clean, witty Kashmiri phrases & audio reactions
 */

(() => {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const stageEl = document.getElementById("gameStage");

  // HUD & UI references
  const scoreValueEl = document.getElementById("scoreValue");
  const streakPillEl = document.getElementById("streakPill");
  const aimHintEl = document.getElementById("aimHint");

  const onboardingOverlayEl = document.getElementById("onboardingOverlay");
  const loadingFillEl = document.getElementById("loadingFill");
  const loadingPercentEl = document.getElementById("loadingPercent");

  const startOverlayEl = document.getElementById("startOverlay");
  const pauseOverlayEl = document.getElementById("pauseOverlay");
  const startBestScoreEl = document.getElementById("startBestScore");
  const pauseKillsEl = document.getElementById("pauseKills");
  const pauseAccuracyEl = document.getElementById("pauseAccuracy");
  const pauseBestEl = document.getElementById("pauseBest");

  const btnStart = document.getElementById("btnStart");
  const btnPause = document.getElementById("btnPause");
  const btnHome = document.getElementById("btnHome");
  const btnResume = document.getElementById("btnResume");
  const btnRestart = document.getElementById("btnRestart");
  const btnQuickMute = document.getElementById("btnQuickMute");
  const iconSoundOn = document.getElementById("iconSoundOn");
  const iconSoundOff = document.getElementById("iconSoundOff");
  const toggleSfx = document.getElementById("toggleSfx");
  const toggleVoice = document.getElementById("toggleVoice");

  const audio = new window.KashmiriAudioEngine();

  // ==================== LOAD WEBP SPRITES ====================
  const ASSET_PATHS = {
    bedIdle: "./assets/character-bed-idle.webp?v=2",
    bedShoot: "./assets/character-bed-shoot.webp?v=2",
    bedMiss: "./assets/character-bed-miss.webp?v=2",
    mosquitoUp: "./assets/mosquito-up.webp",
    mosquitoDown: "./assets/mosquito-down.webp",
    blaster: "./assets/blaster.webp",
    splat: "./assets/splat.webp",
  };

  const sprites = {};
  let assetsReady = false;

  function loadAllSprites() {
    const entries = Object.entries(ASSET_PATHS);
    let loaded = 0;
    return new Promise((resolve) => {
      entries.forEach(([key, src]) => {
        const img = new Image();
        img.onload = () => {
          sprites[key] = img;
          loaded++;
          if (loaded === entries.length) {
            assetsReady = true;
            resolve();
          }
        };
        img.onerror = () => {
          loaded++;
          if (loaded === entries.length) {
            assetsReady = true;
            resolve();
          }
        };
        img.src = src;
      });
    });
  }

  // ==================== GAME STATE ====================
  const BEST_KEY = "moh_hunter_best_kills_v1";
  let bestKills = Number(localStorage.getItem(BEST_KEY) || 0);
  startBestScoreEl.textContent = String(bestKills);

  let width = 420;
  let height = 760;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  // Layout metrics computed on resize
  const layout = {
    bedX: 0,
    bedY: 0,
    bedW: 360,
    bedH: 245,
    pivotX: 210,
    pivotY: 560,
  };

  const state = {
    mode: "start", // "start" | "playing" | "paused"
    kills: 0,
    shotsFired: 0,
    streak: 0,
    hasAimedOnce: false,

    // Aiming state
    isAiming: false,
    activePointerId: null,
    aimAngle: -Math.PI / 2, // pointing straight up initially

    // Character reaction state
    characterPose: "idle", // "idle" | "shoot" | "miss"
    poseTimer: 0,
    recoil: 0,
    screenShake: 0,

    // Shot flash beam
    shotBeam: null, // { x1, y1, x2, y2, alpha, hit }

    // Mosquito entity
    mosquito: null,
    respawnTimer: 0,
    nextDirection: 1, // +1 = Left -> Right, -1 = Right -> Left

    // Visual effects
    particles: [],
    popups: [],
    splats: [],
    blastRings: [],
  };

  const CONFETTI_COLORS = [
    "#f43f5e",
    "#f59e0b",
    "#06b6d4",
    "#10b981",
    "#8b5cf6",
    "#fb7185",
    "#fbbf24",
  ];

  // ==================== RESIZE & LAYOUT ====================
  function resizeCanvas() {
    const rect = stageEl.getBoundingClientRect();
    width = Math.max(300, rect.width);
    height = Math.max(480, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Position the full-body character in bed cleanly at bottom-center (matching reference video proportions)
    const bedW = Math.min(width * 0.94, 430);
    const bedH = bedW * (680 / 1000);
    layout.bedW = bedW;
    layout.bedH = bedH;
    layout.bedX = (width - bedW) * 0.5;
    layout.bedY = height - bedH - Math.max(24, height * 0.045);

    // Hands/blaster pivot aligns directly with the illustrated hands in character-bed SVG (x=506/1000, y=322/680)
    layout.pivotX = layout.bedX + bedW * 0.506;
    layout.pivotY = layout.bedY + bedH * 0.474;
  }

  // ==================== MOSQUITO SPAWN & SWEEP FLIGHT ====================
  function spawnMosquito(direction = state.nextDirection) {
    const difficulty = Math.min(1, state.kills / 25);
    const size = Math.max(54, Math.min(72, width * 0.165)) * (1 - difficulty * 0.1);
    const dir = direction >= 0 ? 1 : -1;
    const minY = Math.max(130, height * 0.18);
    const maxY = Math.max(minY + 90, layout.bedY - 105);
    const baseY = minY + Math.random() * (maxY - minY);
    const speed = 138 + difficulty * 85 + Math.random() * 25;

    state.mosquito = {
      x: dir === 1 ? -size * 0.7 : width + size * 0.7,
      y: baseY,
      baseY,
      dir, // +1 moves toward right edge; -1 moves toward left edge
      vx: dir * speed,
      vy: 0,
      size,
      hitRadius: size * 0.58,
      baseSpeed: speed,
      wingPhase: Math.random() * Math.PI * 2,
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleAmp: 22 + Math.random() * 24,
      wobbleFreq: 2.6 + Math.random() * 1.4,
      dodgingTimer: 0,
      fadingOut: false,
      tilt: dir * 0.14,
    };

    if (state.mode === "playing") {
      audio.startBuzz();
    }
  }

  function updateMosquito(dt) {
    const m = state.mosquito;
    if (!m) {
      if (state.respawnTimer > 0) {
        state.respawnTimer -= dt;
        if (state.respawnTimer <= 0) {
          spawnMosquito(state.nextDirection);
        }
      }
      return;
    }

    const minY = Math.max(120, height * 0.16);
    const maxY = Math.max(minY + 95, layout.bedY - 95);

    m.wingPhase += dt * 44;
    m.wobblePhase += dt * m.wobbleFreq;
    if (m.dodgingTimer > 0) m.dodgingTimer -= dt;

    // Steady continuous pass across the screen (never stays stuck in the middle!)
    const boost = m.dodgingTimer > 0 ? 1.38 : 1.0;
    m.vx = m.dir * m.baseSpeed * boost;
    m.x += m.vx * dt;

    // Smooth organic vertical flight wave
    const targetY = m.baseY + Math.sin(m.wobblePhase) * m.wobbleAmp + Math.cos(m.wobblePhase * 0.55) * 14;
    m.y = Math.max(minY, Math.min(maxY, targetY));
    m.tilt = m.dir * 0.16 + Math.cos(m.wobblePhase) * 0.08;

    // Start fading out audio smoothly as mosquito approaches exit edge
    const nearExit =
      (m.dir === 1 && m.x >= width - m.size * 0.35) ||
      (m.dir === -1 && m.x <= m.size * 0.35);

    if (nearExit && !m.fadingOut) {
      m.fadingOut = true;
      audio.stopBuzz(0.45);
    } else if (!m.fadingOut) {
      const normX = (m.x / width) * 2 - 1;
      const normY = Math.max(0, Math.min(1, (m.y - minY) / Math.max(1, maxY - minY)));
      audio.updateBuzz(normX, normY, boost);
    }

    // Exited completely off-screen -> alternate side and re-enter after 1.5 seconds!
    const exited =
      (m.dir === 1 && m.x > width + m.size * 0.8) ||
      (m.dir === -1 && m.x < -m.size * 0.8);

    if (exited) {
      if (!m.fadingOut) audio.stopBuzz(0.35);
      state.mosquito = null;
      state.nextDirection = -m.dir; // exited right -> returns from right going left (and vice versa)
      state.respawnTimer = 1.5;
    }
  }

  // ==================== AIMING & FIRING ====================
  function computeAimAngle(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    let angle = Math.atan2(y - layout.pivotY, x - layout.pivotX);

    // Clamp smoothly to upper firing arc (-172 deg to -8 deg) so aiming below bed doesn't flip awkwardly
    const minAngle = -Math.PI + 0.14;
    const maxAngle = -0.14;
    if (angle > 0) {
      angle = angle < Math.PI * 0.5 ? maxAngle : minAngle;
    } else {
      angle = Math.max(minAngle, Math.min(maxAngle, angle));
    }
    return angle;
  }

  function rayEndPoint(ox, oy, angle) {
    const maxLen = Math.hypot(width, height) * 1.3;
    return {
      x: ox + Math.cos(angle) * maxLen,
      y: oy + Math.sin(angle) * maxLen,
    };
  }

  function distancePointToRay(px, py, ox, oy, angle) {
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    const vx = px - ox;
    const vy = py - oy;
    const proj = vx * dirX + vy * dirY;
    if (proj < 0) return Infinity;
    const closestX = ox + dirX * proj;
    const closestY = oy + dirY * proj;
    return Math.hypot(px - closestX, py - closestY);
  }

  function spawnConfetti(x, y, count = 24) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 80 + Math.random() * 240;
      state.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 60,
        size: 3.5 + Math.random() * 5,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        alpha: 1,
        life: 0.55 + Math.random() * 0.45,
        maxLife: 1,
        shape: Math.random() < 0.5 ? "circle" : "rect",
        rot: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 10,
      });
    }
  }

  function spawnBlastEffect(x, y, big = false) {
    state.blastRings.push({
      x,
      y,
      radius: big ? 14 : 10,
      maxRadius: big ? 82 : 44,
      alpha: 1,
      color: big ? "#f97316" : "#fb923c",
      innerColor: "#fef08a",
    });
    const sparkCount = big ? 18 : 10;
    const blastPalette = ["#fef08a", "#fb923c", "#f97316", "#ef4444", "#ffffff"];
    for (let i = 0; i < sparkCount; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = (big ? 110 : 75) + Math.random() * (big ? 220 : 140);
      state.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 20,
        size: (big ? 5 : 3.5) + Math.random() * 5,
        color: blastPalette[Math.floor(Math.random() * blastPalette.length)],
        alpha: 1,
        life: 0.28 + Math.random() * 0.25,
        maxLife: 0.5,
        shape: "circle",
        rot: 0,
        vRot: 0,
      });
    }
  }

  function fireShot() {
    if (state.mode !== "playing") return;

    state.shotsFired++;
    state.recoil = 1.35;
    state.screenShake = 11;

    // Muzzle blast right at blaster tip
    const muzzleX = layout.pivotX + Math.cos(state.aimAngle) * 30;
    const muzzleY = layout.pivotY + Math.sin(state.aimAngle) * 30;
    spawnBlastEffect(muzzleX, muzzleY, false);

    const end = rayEndPoint(layout.pivotX, layout.pivotY, state.aimAngle);
    let hit = false;

    if (state.mosquito) {
      const m = state.mosquito;
      const dist = distancePointToRay(m.x, m.y, layout.pivotX, layout.pivotY, state.aimAngle);
      if (dist <= m.hitRadius) {
        hit = true;
      }
    }

    // Fire heavy video-style BLAST + custom kill audio on the EXACT same sample clock!
    audio.playBlastShot(hit);

    if (hit && state.mosquito) {
      const hitX = state.mosquito.x;
      const hitY = state.mosquito.y;
      handleKill(state.mosquito);
      state.shotBeam = {
        x1: muzzleX,
        y1: muzzleY,
        x2: hitX,
        y2: hitY,
        alpha: 0.9,
        hit: true,
      };
    } else {
      state.shotBeam = {
        x1: muzzleX,
        y1: muzzleY,
        x2: end.x,
        y2: end.y,
        alpha: 0.65,
        hit: false,
      };
      handleMiss();
    }
  }

  function handleKill(m) {
    state.kills++;
    state.streak++;
    state.characterPose = "shoot";
    state.poseTimer = 0.72;
    state.screenShake = 14;

    if (state.kills > bestKills) {
      bestKills = state.kills;
      localStorage.setItem(BEST_KEY, String(bestKills));
      startBestScoreEl.textContent = String(bestKills);
    }

    // Update HUD with springy pop
    scoreValueEl.textContent = String(state.kills);
    scoreValueEl.classList.remove("pop");
    void scoreValueEl.offsetWidth;
    scoreValueEl.classList.add("pop");
    setTimeout(() => scoreValueEl.classList.remove("pop"), 220);

    if (state.streak >= 2) {
      streakPillEl.textContent = `${state.streak}x STREAK`;
      streakPillEl.hidden = false;
    }

    // Exact video-style blast pop: shockwave + crisp splat burst + colorful confetti + "+1"
    spawnBlastEffect(m.x, m.y, true);
    state.splats.push({ x: m.x, y: m.y, size: m.size * 1.5, alpha: 0.95, scale: 0.5 });
    spawnConfetti(m.x, m.y, 32);

    state.popups.push({
      text: "+1",
      x: m.x,
      y: m.y - 12,
      vy: -56,
      alpha: 1,
      scale: 1.15,
      color: "#0f766e",
    });

    // Subtle "+1" near top counter just like reference video
    state.popups.push({
      text: "+1",
      x: width * 0.5 + 14,
      y: 110,
      vy: -24,
      alpha: 0.9,
      scale: 0.9,
      color: "#64748b",
    });

    // Clear mosquito & fade out buzz; return quickly right after a shot kill!
    state.mosquito = null;
    state.nextDirection = 1;
    state.respawnTimer = 0.55;
    audio.stopBuzz(0.25);
  }

  function handleMiss() {
    state.streak = 0;
    streakPillEl.hidden = true;
    state.characterPose = "miss";
    state.poseTimer = 0.78;

    if (state.mosquito) {
      // Quick dart forward toward exit edge
      state.mosquito.dodgingTimer = 0.65;
    }
  }

  // ==================== POINTER EVENTS (TOUCH & MOUSE) ====================
  canvas.addEventListener("pointerdown", (e) => {
    if (state.mode !== "playing") return;
    if (state.activePointerId !== null) return;

    audio.unlock();
    if (state.mosquito) audio.startBuzz();

    state.activePointerId = e.pointerId;
    state.isAiming = true;
    state.aimAngle = computeAimAngle(e.clientX, e.clientY);

    if (!state.hasAimedOnce) {
      state.hasAimedOnce = true;
      aimHintEl.classList.add("hidden");
    }

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (_) {}
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!state.isAiming || e.pointerId !== state.activePointerId) return;
    state.aimAngle = computeAimAngle(e.clientX, e.clientY);
  });

  function finishAimAndFire(e) {
    if (!state.isAiming || e.pointerId !== state.activePointerId) return;
    state.aimAngle = computeAimAngle(e.clientX, e.clientY);
    state.isAiming = false;
    state.activePointerId = null;
    fireShot();
  }

  canvas.addEventListener("pointerup", finishAimAndFire);
  canvas.addEventListener("pointercancel", () => {
    state.isAiming = false;
    state.activePointerId = null;
  });

  // ==================== GAME FLOW CONTROLS ====================
  function resetSession() {
    state.kills = 0;
    state.shotsFired = 0;
    state.streak = 0;
    state.isAiming = false;
    state.activePointerId = null;
    state.characterPose = "idle";
    state.poseTimer = 0;
    state.particles = [];
    state.popups = [];
    state.splats = [];
    state.blastRings = [];
    state.shotBeam = null;
    state.mosquito = null;
    state.nextDirection = 1;
    state.respawnTimer = 0.2;

    scoreValueEl.textContent = "0";
    streakPillEl.hidden = true;
  }

  function startGame() {
    audio.unlock();
    resetSession();
    state.mode = "playing";
    startOverlayEl.hidden = true;
    pauseOverlayEl.hidden = true;
    aimHintEl.classList.toggle("hidden", state.hasAimedOnce);
    spawnMosquito(1);
  }

  function pauseGame() {
    if (state.mode !== "playing") return;
    state.mode = "paused";
    state.isAiming = false;
    state.activePointerId = null;
    audio.stopBuzz();
    audio.stopKillAudio();

    const acc = state.shotsFired > 0 ? Math.round((state.kills / state.shotsFired) * 100) : 100;
    pauseKillsEl.textContent = String(state.kills);
    pauseAccuracyEl.textContent = `${acc}%`;
    pauseBestEl.textContent = String(bestKills);
    pauseOverlayEl.hidden = false;
  }

  function resumeGame() {
    if (state.mode !== "paused") return;
    audio.unlock();
    state.mode = "playing";
    pauseOverlayEl.hidden = true;
    if (state.mosquito) audio.startBuzz();
  }

  function returnToHome() {
    state.mode = "start";
    state.isAiming = false;
    state.activePointerId = null;
    audio.stopBuzz();
    audio.stopKillAudio();
    pauseOverlayEl.hidden = true;
    startBestScoreEl.textContent = String(bestKills);
    startOverlayEl.hidden = false;
  }

  function syncMuteIcon() {
    const anyAudio = audio.sfxEnabled || audio.voiceEnabled;
    iconSoundOn.hidden = !anyAudio;
    iconSoundOff.hidden = anyAudio;
    toggleSfx.checked = audio.sfxEnabled;
    toggleVoice.checked = audio.voiceEnabled;
  }

  btnStart.addEventListener("click", startGame);
  btnPause.addEventListener("click", pauseGame);
  btnHome.addEventListener("click", returnToHome);
  btnResume.addEventListener("click", resumeGame);
  btnRestart.addEventListener("click", startGame);

  btnQuickMute.addEventListener("click", () => {
    const anyOn = audio.sfxEnabled || audio.voiceEnabled;
    audio.setSfxEnabled(!anyOn);
    audio.setVoiceEnabled(!anyOn);
    if (!anyOn && state.mode === "playing" && state.mosquito) {
      audio.startBuzz();
    }
    syncMuteIcon();
  });

  toggleSfx.addEventListener("change", () => {
    audio.setSfxEnabled(toggleSfx.checked);
    syncMuteIcon();
  });

  toggleVoice.addEventListener("change", () => {
    audio.setVoiceEnabled(toggleVoice.checked);
    syncMuteIcon();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.mode === "playing") {
      pauseGame();
    }
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (state.mode === "playing") pauseGame();
      else if (state.mode === "paused") resumeGame();
    }
  });

  // ==================== UPDATE & RENDER LOOP ====================
  function update(dt) {
    // Character pose recovery & recoil damping
    if (state.poseTimer > 0) {
      state.poseTimer -= dt;
      if (state.poseTimer <= 0) {
        state.characterPose = "idle";
      }
    }
    state.recoil = Math.max(0, state.recoil - dt * 6.5);
    state.screenShake = Math.max(0, state.screenShake - dt * 28);

    if (state.shotBeam) {
      state.shotBeam.alpha -= dt * 7.5;
      if (state.shotBeam.alpha <= 0) state.shotBeam = null;
    }

    if (state.mode === "playing") {
      updateMosquito(dt);
    } else if (state.mode === "start" && state.mosquito) {
      // Gentle idle hover in background behind start card
      state.mosquito.wingPhase += dt * 36;
    }

    // Update particles
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        state.particles.splice(i, 1);
        continue;
      }
      p.vy += 380 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vRot * dt;
      p.alpha = Math.max(0, p.life / 0.8);
    }

    // Update blast shockwave rings
    for (let i = state.blastRings.length - 1; i >= 0; i--) {
      const r = state.blastRings[i];
      r.radius += (r.maxRadius - r.radius) * Math.min(1, dt * 15);
      r.alpha -= dt * 3.8;
      if (r.alpha <= 0) state.blastRings.splice(i, 1);
    }

    // Update splats
    for (let i = state.splats.length - 1; i >= 0; i--) {
      const s = state.splats[i];
      s.scale += (1.15 - s.scale) * Math.min(1, dt * 16);
      s.alpha -= dt * 2.2;
      if (s.alpha <= 0) state.splats.splice(i, 1);
    }

    // Update floating +1 popups
    for (let i = state.popups.length - 1; i >= 0; i--) {
      const pop = state.popups[i];
      pop.y += pop.vy * dt;
      pop.alpha -= dt * 1.15;
      if (pop.alpha <= 0) state.popups.splice(i, 1);
    }
  }

  function render() {
    ctx.clearRect(0, 0, width, height);

    ctx.save();
    if (state.screenShake > 0.2) {
      const sx = (Math.random() - 0.5) * state.screenShake;
      const sy = (Math.random() - 0.5) * state.screenShake;
      ctx.translate(sx, sy);
    }

    // 1. Subtle clean studio floor shadow glow under bed
    const floorGrad = ctx.createRadialGradient(
      width * 0.5,
      layout.bedY + layout.bedH * 0.85,
      10,
      width * 0.5,
      layout.bedY + layout.bedH * 0.85,
      layout.bedW * 0.55
    );
    floorGrad.addColorStop(0, "rgba(15, 23, 42, 0.06)");
    floorGrad.addColorStop(1, "rgba(15, 23, 42, 0)");
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, layout.bedY + layout.bedH * 0.45, width, layout.bedH * 0.7);

    // 2. Dashed Aim Line (High-contrast white outer halo + bold dark inner dash so it's razor-sharp over street art)
    if (state.isAiming && state.mode === "playing") {
      const end = rayEndPoint(layout.pivotX, layout.pivotY, state.aimAngle);
      ctx.save();
      ctx.setLineDash([14, 11]);
      ctx.lineCap = "round";

      ctx.beginPath();
      ctx.lineWidth = 6.8;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
      ctx.moveTo(layout.pivotX, layout.pivotY);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.lineWidth = 3.4;
      ctx.strokeStyle = "#141923";
      ctx.moveTo(layout.pivotX, layout.pivotY);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      ctx.restore();
    }

    // 3. Shot Flash Beam
    if (state.shotBeam) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, state.shotBeam.alpha);
      ctx.beginPath();
      ctx.lineWidth = state.shotBeam.hit ? 6 : 3.5;
      ctx.lineCap = "round";
      ctx.strokeStyle = state.shotBeam.hit ? "#f59e0b" : "#94a3b8";
      ctx.moveTo(state.shotBeam.x1, state.shotBeam.y1);
      ctx.lineTo(state.shotBeam.x2, state.shotBeam.y2);
      ctx.stroke();
      ctx.restore();
    }

    // 4. Full-Body Character in Bed (.webp)
    const bedSprite =
      state.characterPose === "shoot"
        ? sprites.bedShoot
        : state.characterPose === "miss"
          ? sprites.bedMiss
          : sprites.bedIdle;

    if (bedSprite) {
      const recoilY = state.recoil * 5;
      ctx.drawImage(
        bedSprite,
        layout.bedX,
        layout.bedY + recoilY,
        layout.bedW,
        layout.bedH
      );
    }

    // 5. Rotating Aim Blaster Pivot (.webp) right at the character's hands
    if (sprites.blaster && (state.isAiming || state.recoil > 0.05)) {
      const blasterSize = Math.max(46, Math.min(62, layout.bedW * 0.145));
      const kickDist = state.recoil * 9;
      const bx = layout.pivotX - Math.cos(state.aimAngle) * kickDist;
      const by = layout.pivotY - Math.sin(state.aimAngle) * kickDist;

      ctx.save();
      ctx.translate(bx, by);
      // Blaster sprite points straight UP (-PI/2), so rotate by aimAngle + PI/2
      ctx.rotate(state.aimAngle + Math.PI / 2);
      ctx.drawImage(
        sprites.blaster,
        -blasterSize * 0.5,
        -blasterSize * 0.56,
        blasterSize,
        blasterSize
      );
      ctx.restore();
    }

    // 6. Flying Animated Mosquito (.webp wings up / down) with crisp subtle glow for instant spotting
    if (state.mosquito) {
      const m = state.mosquito;
      const wingUp = Math.sin(m.wingPhase) >= 0;
      const mSprite = wingUp ? sprites.mosquitoUp : sprites.mosquitoDown;
      if (mSprite) {
        ctx.save();
        ctx.translate(m.x, m.y);
        ctx.rotate(m.tilt);
        ctx.shadowColor = "rgba(255, 255, 255, 0.85)";
        ctx.shadowBlur = 12;
        ctx.drawImage(mSprite, -m.size * 0.5, -m.size * 0.5, m.size, m.size);
        ctx.restore();
      }
    }

    // 7. Blast Shockwave Rings & Splat Comic Starbursts (.webp)
    for (const r of state.blastRings) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, r.alpha);
      // Warm fiery glow fill
      const g = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, r.radius);
      g.addColorStop(0, "rgba(254, 240, 138, 0.85)");
      g.addColorStop(0.55, "rgba(249, 115, 22, 0.35)");
      g.addColorStop(1, "rgba(239, 68, 68, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.fill();

      // Crisp shockwave ring
      ctx.lineWidth = Math.max(2, 6 * r.alpha);
      ctx.strokeStyle = r.color;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius * 0.92, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    for (const s of state.splats) {
      if (!sprites.splat) continue;
      ctx.save();
      ctx.globalAlpha = Math.max(0, s.alpha);
      ctx.translate(s.x, s.y);
      ctx.scale(s.scale, s.scale);
      ctx.drawImage(sprites.splat, -s.size * 0.5, -s.size * 0.5, s.size, s.size);
      ctx.restore();
    }

    // 8. Confetti Particles
    for (const p of state.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === "circle") {
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.size * 0.5, -p.size * 0.35, p.size, p.size * 0.7);
      }
      ctx.restore();
    }

    // 9. Floating "+1" Popups (crisp white outline for instant legibility over street bg)
    for (const pop of state.popups) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, pop.alpha);
      ctx.font = `900 ${Math.round(26 * pop.scale)}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      ctx.lineWidth = 5;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.96)";
      ctx.strokeText(pop.text, pop.x, pop.y);
      ctx.fillStyle = pop.color;
      ctx.fillText(pop.text, pop.x, pop.y);
      ctx.restore();
    }

    ctx.restore();
  }

  let lastTs = performance.now();
  function loop(ts) {
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  // ==================== ONBOARDING LOADING CONTROLLER ====================
  let spriteLoadProgress = 0;

  function loadAllSpritesTracked() {
    const entries = Object.entries(ASSET_PATHS);
    let loaded = 0;
    return new Promise((resolve) => {
      entries.forEach(([key, src]) => {
        const img = new Image();
        const done = () => {
          loaded++;
          spriteLoadProgress = loaded / entries.length;
          if (loaded === entries.length) {
            assetsReady = true;
            resolve();
          }
        };
        img.onload = () => {
          sprites[key] = img;
          done();
        };
        img.onerror = done;
        img.src = src;
      });
    });
  }

  function runOnboardingLoader() {
    const minDurationMs = 1900;
    const startTs = performance.now();
    let finished = false;

    function tick(now) {
      if (finished) return;
      const elapsed = now - startTs;
      const timeRatio = Math.min(1, elapsed / minDurationMs);
      // Smoothly track both real sprite load progress and minimum readable onboarding beat
      const combined = Math.min(timeRatio, 0.25 + spriteLoadProgress * 0.75);
      const pct = Math.min(100, Math.round(combined * 100));

      if (loadingFillEl) loadingFillEl.style.width = `${pct}%`;
      if (loadingPercentEl) loadingPercentEl.textContent = `${pct}%`;

      if (assetsReady && timeRatio >= 1) {
        finished = true;
        if (loadingFillEl) loadingFillEl.style.width = "100%";
        if (loadingPercentEl) loadingPercentEl.textContent = "100%";
        setTimeout(() => {
          if (onboardingOverlayEl) {
            onboardingOverlayEl.classList.add("fade-out");
            setTimeout(() => {
              onboardingOverlayEl.hidden = true;
            }, 400);
          }
        }, 280);
        return;
      }
      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  // ==================== BOOTSTRAP ====================
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();
  syncMuteIcon();
  runOnboardingLoader();

  loadAllSpritesTracked().then(() => {
    resizeCanvas();
    requestAnimationFrame(loop);
  });
})();
