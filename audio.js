/**
 * Moh Hunter Audio Engine
 * - Mosquito entry/loop audio: assets/mosquito-sound.mp3 (silky fade-in & fade-out)
 * - Shot HIT audio: heavy BLAST + assets/kill-sound.mp3 synced to exact sample clock
 * - Shot MISS audio: heavy BLAST + assets/miss-sound.mp3 synced to exact sample clock
 */

class GameAudioEngine {
  constructor() {
    this.ctx = null;
    this.sfxEnabled = true;
    this.voiceEnabled = true; // controls custom hit/miss audio clips

    // 1. Custom HIT (kill) audio
    this.killAudioUrl = "./assets/kill-sound.mp3?v=2";
    this.killRawArrayBuffer = null;
    this.killBuffer = null;
    this.killStartOffset = 0;
    this.activeKillSource = null;
    this.killFallbackAudio = new Audio(this.killAudioUrl);
    this.killFallbackAudio.preload = "auto";
    this._killDecodePromise = null;

    // 2. Custom MISS audio
    this.missAudioUrl = "./assets/miss-sound.mp3?v=1";
    this.missRawArrayBuffer = null;
    this.missBuffer = null;
    this.missStartOffset = 0;
    this.activeMissSource = null;
    this.missFallbackAudio = new Audio(this.missAudioUrl);
    this.missFallbackAudio.preload = "auto";
    this._missDecodePromise = null;

    // 3. Custom mosquito entry/loop audio (with smooth fade-in & fade-out)
    this.buzzAudioUrl = "./assets/mosquito-sound.mp3?v=1";
    this.buzzRawArrayBuffer = null;
    this.buzzBuffer = null;
    this.buzzSource = null;
    this.buzzGain = null;
    this.buzzPanner = null;
    this.buzzRunning = false;
    this.buzzWantPlay = false;
    this.buzzFallbackAudio = new Audio(this.buzzAudioUrl);
    this.buzzFallbackAudio.preload = "auto";
    this.buzzFallbackAudio.loop = true;
    this._buzzFallbackTimer = null;
    this._buzzDecodePromise = null;

    this._distortionCurve = this._makeDistortionCurve(32);

    // Pre-fetch all 3 MP3s immediately on page load
    this._killFetchPromise = this._fetchBytes(this.killAudioUrl, (buf) => {
      this.killRawArrayBuffer = buf;
      if (this.ctx) this._decodeKillBuffer();
    });
    this._missFetchPromise = this._fetchBytes(this.missAudioUrl, (buf) => {
      this.missRawArrayBuffer = buf;
      if (this.ctx) this._decodeMissBuffer();
    });
    this._buzzFetchPromise = this._fetchBytes(this.buzzAudioUrl, (buf) => {
      this.buzzRawArrayBuffer = buf;
      if (this.ctx) this._decodeBuzzBuffer();
    });
  }

  _fetchBytes(url, onBytes) {
    return fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch ${url}`);
        return res.arrayBuffer();
      })
      .then((buf) => {
        onBytes(buf);
      })
      .catch(() => {});
  }

  _makeDistortionCurve(amount) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
    }
    return curve;
  }

  _detectTrimBounds(audioBuffer, threshold = 0.02) {
    const data = audioBuffer.getChannelData(0);
    const sr = audioBuffer.sampleRate;
    let startIdx = 0;
    for (let i = 0; i < data.length; i++) {
      if (Math.abs(data[i]) >= threshold) {
        startIdx = Math.max(0, i - Math.floor(sr * 0.015));
        break;
      }
    }
    let endIdx = data.length;
    for (let i = data.length - 1; i > startIdx; i--) {
      if (Math.abs(data[i]) >= threshold) {
        endIdx = Math.min(data.length, i + Math.floor(sr * 0.03));
        break;
      }
    }
    return { startIdx, endIdx, startSec: startIdx / sr, endSec: endIdx / sr };
  }

  _buildFadedLoopBuffer(decoded) {
    const sr = decoded.sampleRate;
    const { startIdx, endIdx } = this._detectTrimBounds(decoded, 0.015);
    const frameCount = Math.max(1, endIdx - startIdx);
    const out = this.ctx.createBuffer(decoded.numberOfChannels, frameCount, sr);

    const fadeInSamples = Math.min(Math.floor(sr * 0.55), Math.floor(frameCount * 0.25));
    const fadeOutSamples = Math.min(Math.floor(sr * 0.65), Math.floor(frameCount * 0.25));

    for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
      const src = decoded.getChannelData(ch);
      const dst = out.getChannelData(ch);
      for (let i = 0; i < frameCount; i++) {
        let env = 1.0;
        if (i < fadeInSamples) {
          env = i / Math.max(1, fadeInSamples);
        } else if (i > frameCount - fadeOutSamples) {
          env = (frameCount - i) / Math.max(1, fadeOutSamples);
        }
        env = 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, env)));
        dst[i] = src[startIdx + i] * env;
      }
    }
    return out;
  }

  unlock() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    this._decodeKillBuffer();
    this._decodeMissBuffer();
    this._decodeBuzzBuffer();
  }

  _decodeKillBuffer() {
    if (this.killBuffer || this._killDecodePromise || !this.ctx) return;
    const runDecode = () => {
      if (!this.killRawArrayBuffer) return Promise.resolve();
      const copy = this.killRawArrayBuffer.slice(0);
      return this.ctx
        .decodeAudioData(copy)
        .then((decoded) => {
          this.killBuffer = decoded;
          this.killStartOffset = this._detectTrimBounds(decoded, 0.025).startSec;
        })
        .catch(() => {});
    };
    this._killDecodePromise = this.killRawArrayBuffer
      ? runDecode()
      : this._killFetchPromise.then(runDecode);
  }

  _decodeMissBuffer() {
    if (this.missBuffer || this._missDecodePromise || !this.ctx) return;
    const runDecode = () => {
      if (!this.missRawArrayBuffer) return Promise.resolve();
      const copy = this.missRawArrayBuffer.slice(0);
      return this.ctx
        .decodeAudioData(copy)
        .then((decoded) => {
          this.missBuffer = decoded;
          this.missStartOffset = this._detectTrimBounds(decoded, 0.025).startSec;
        })
        .catch(() => {});
    };
    this._missDecodePromise = this.missRawArrayBuffer
      ? runDecode()
      : this._missFetchPromise.then(runDecode);
  }

  _decodeBuzzBuffer() {
    if (this.buzzBuffer || this._buzzDecodePromise || !this.ctx) return;
    const runDecode = () => {
      if (!this.buzzRawArrayBuffer) return Promise.resolve();
      const copy = this.buzzRawArrayBuffer.slice(0);
      return this.ctx
        .decodeAudioData(copy)
        .then((decoded) => {
          this.buzzBuffer = this._buildFadedLoopBuffer(decoded);
          if (this.buzzWantPlay && !this.buzzRunning && this.sfxEnabled) {
            this._stopBuzzFallback(true);
            this._startBuzzWebAudio();
          }
        })
        .catch(() => {});
    };
    this._buzzDecodePromise = this.buzzRawArrayBuffer
      ? runDecode()
      : this._buzzFetchPromise.then(runDecode);
  }

  setSfxEnabled(enabled) {
    this.sfxEnabled = Boolean(enabled);
    if (!this.sfxEnabled) {
      this.stopBuzz(0.2);
    }
  }

  setVoiceEnabled(enabled) {
    this.voiceEnabled = Boolean(enabled);
    if (!this.voiceEnabled) {
      this.stopKillAudio();
    }
  }

  stopKillAudio() {
    if (this.activeKillSource) {
      try {
        this.activeKillSource.stop();
      } catch (_) {}
      this.activeKillSource = null;
    }
    if (this.activeMissSource) {
      try {
        this.activeMissSource.stop();
      } catch (_) {}
      this.activeMissSource = null;
    }
    if (this.killFallbackAudio) {
      try {
        this.killFallbackAudio.pause();
        this.killFallbackAudio.currentTime = 0;
      } catch (_) {}
    }
    if (this.missFallbackAudio) {
      try {
        this.missFallbackAudio.pause();
        this.missFallbackAudio.currentTime = 0;
      } catch (_) {}
    }
  }

  // ==================== MOSQUITO ENTRY AUDIO (FADE IN & FADE OUT) ====================
  startBuzz() {
    if (!this.sfxEnabled) return;
    this.unlock();
    this.buzzWantPlay = true;
    if (this.buzzRunning) return;

    if (this.ctx && this.buzzBuffer) {
      this._startBuzzWebAudio();
    } else {
      this._startBuzzFallback();
    }
  }

  _startBuzzWebAudio() {
    if (!this.ctx || !this.buzzBuffer || this.buzzRunning) return;
    const now = this.ctx.currentTime;

    const src = this.ctx.createBufferSource();
    src.buffer = this.buzzBuffer;
    src.loop = true;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.85, now + 0.65);

    if (typeof this.ctx.createStereoPanner === "function") {
      const panner = this.ctx.createStereoPanner();
      panner.pan.setValueAtTime(0, now);
      src.connect(gain);
      gain.connect(panner);
      panner.connect(this.ctx.destination);
      this.buzzPanner = panner;
    } else {
      src.connect(gain);
      gain.connect(this.ctx.destination);
      this.buzzPanner = null;
    }

    src.start(now);
    this.buzzSource = src;
    this.buzzGain = gain;
    this.buzzRunning = true;
  }

  _startBuzzFallback() {
    if (!this.buzzFallbackAudio) return;
    if (this._buzzFallbackTimer) clearInterval(this._buzzFallbackTimer);
    try {
      this.buzzFallbackAudio.currentTime = 0;
      this.buzzFallbackAudio.volume = 0.01;
      this.buzzFallbackAudio.play().catch(() => {});
      let vol = 0.01;
      this._buzzFallbackTimer = setInterval(() => {
        if (!this.buzzWantPlay || !this.sfxEnabled) {
          clearInterval(this._buzzFallbackTimer);
          this._buzzFallbackTimer = null;
          return;
        }
        vol = Math.min(0.85, vol + 0.06);
        this.buzzFallbackAudio.volume = vol;
        if (vol >= 0.85) {
          clearInterval(this._buzzFallbackTimer);
          this._buzzFallbackTimer = null;
        }
      }, 45);
    } catch (_) {}
  }

  _stopBuzzFallback(immediate = false) {
    if (this._buzzFallbackTimer) {
      clearInterval(this._buzzFallbackTimer);
      this._buzzFallbackTimer = null;
    }
    if (!this.buzzFallbackAudio) return;
    if (immediate) {
      try {
        this.buzzFallbackAudio.pause();
        this.buzzFallbackAudio.currentTime = 0;
      } catch (_) {}
      return;
    }
    let vol = this.buzzFallbackAudio.volume || 0;
    if (vol <= 0.02 || this.buzzFallbackAudio.paused) {
      try {
        this.buzzFallbackAudio.pause();
        this.buzzFallbackAudio.currentTime = 0;
      } catch (_) {}
      return;
    }
    this._buzzFallbackTimer = setInterval(() => {
      vol = Math.max(0, vol - 0.08);
      try {
        this.buzzFallbackAudio.volume = vol;
      } catch (_) {}
      if (vol <= 0.01) {
        clearInterval(this._buzzFallbackTimer);
        this._buzzFallbackTimer = null;
        try {
          this.buzzFallbackAudio.pause();
          this.buzzFallbackAudio.currentTime = 0;
        } catch (_) {}
      }
    }, 35);
  }

  updateBuzz(normX, _normY, _speedFactor = 1) {
    if (!this.buzzRunning || !this.ctx || !this.buzzPanner) return;
    const now = this.ctx.currentTime;
    const pan = Math.max(-0.55, Math.min(0.55, normX * 0.55));
    this.buzzPanner.pan.setTargetAtTime(pan, now, 0.1);
  }

  stopBuzz(fadeSeconds = 0.45) {
    this.buzzWantPlay = false;
    this._stopBuzzFallback(fadeSeconds <= 0.05);

    if (!this.buzzRunning || !this.ctx) return;
    const now = this.ctx.currentTime;
    const src = this.buzzSource;
    const gain = this.buzzGain;

    this.buzzSource = null;
    this.buzzGain = null;
    this.buzzPanner = null;
    this.buzzRunning = false;

    try {
      if (gain) {
        const currentVal = Math.max(0.0001, gain.gain.value);
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(currentVal, now);
        gain.gain.linearRampToValueAtTime(0.0001, now + fadeSeconds);
      }
      setTimeout(() => {
        try {
          src && src.stop();
        } catch (_) {}
      }, Math.round((fadeSeconds + 0.06) * 1000));
    } catch (_) {}
  }

  // ==================== HEAVY VIDEO-STYLE BLAST + HIT / MISS AUDIO ====================
  _triggerBlastAt(t) {
    if (!this.sfxEnabled || !this.ctx) return;

    const master = this.ctx.createGain();
    master.gain.setValueAtTime(0.85, t);

    const shaper = this.ctx.createWaveShaper();
    shaper.curve = this._distortionCurve;
    shaper.oversample = "2x";

    shaper.connect(master);
    master.connect(this.ctx.destination);

    // Layer 1: Explosive gunshot initial crack
    const crackDur = 0.11;
    const crackLen = Math.floor(this.ctx.sampleRate * crackDur);
    const crackBuf = this.ctx.createBuffer(1, crackLen, this.ctx.sampleRate);
    const cData = crackBuf.getChannelData(0);
    for (let i = 0; i < crackLen; i++) {
      const env = Math.pow(1 - i / crackLen, 2.2);
      cData[i] = (Math.random() * 2 - 1) * env;
    }
    const crackSrc = this.ctx.createBufferSource();
    crackSrc.buffer = crackBuf;
    const crackFilter = this.ctx.createBiquadFilter();
    crackFilter.type = "bandpass";
    crackFilter.frequency.setValueAtTime(1450, t);
    crackFilter.Q.setValueAtTime(0.85, t);
    const crackGain = this.ctx.createGain();
    crackGain.gain.setValueAtTime(0.95, t);
    crackGain.gain.exponentialRampToValueAtTime(0.001, t + crackDur);
    crackSrc.connect(crackFilter);
    crackFilter.connect(crackGain);
    crackGain.connect(shaper);
    crackSrc.start(t);

    // Layer 2: Heavy deep cannon/blast chest thump
    const boomOsc = this.ctx.createOscillator();
    boomOsc.type = "sine";
    boomOsc.frequency.setValueAtTime(155, t);
    boomOsc.frequency.exponentialRampToValueAtTime(30, t + 0.32);
    const boomGain = this.ctx.createGain();
    boomGain.gain.setValueAtTime(0.9, t);
    boomGain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
    boomOsc.connect(boomGain);
    boomGain.connect(shaper);
    boomOsc.start(t);
    boomOsc.stop(t + 0.4);

    // Layer 3: Thunderous roaring blast tail
    const tailDur = 0.52;
    const tailLen = Math.floor(this.ctx.sampleRate * tailDur);
    const tailBuf = this.ctx.createBuffer(1, tailLen, this.ctx.sampleRate);
    const tData = tailBuf.getChannelData(0);
    for (let i = 0; i < tailLen; i++) {
      const env = Math.pow(1 - i / tailLen, 1.8);
      tData[i] = (Math.random() * 2 - 1) * env;
    }
    const tailSrc = this.ctx.createBufferSource();
    tailSrc.buffer = tailBuf;
    const tailLP = this.ctx.createBiquadFilter();
    tailLP.type = "lowpass";
    tailLP.frequency.setValueAtTime(1800, t);
    tailLP.frequency.exponentialRampToValueAtTime(110, t + tailDur);
    tailLP.Q.setValueAtTime(1.2, t);
    const tailGain = this.ctx.createGain();
    tailGain.gain.setValueAtTime(0.75, t);
    tailGain.gain.exponentialRampToValueAtTime(0.001, t + tailDur);
    tailSrc.connect(tailLP);
    tailLP.connect(tailGain);
    tailGain.connect(master);
    tailSrc.start(t);
  }

  _triggerBufferClipAt(t, kind) {
    if (!this.voiceEnabled) return;
    this.stopKillAudio();

    const buffer = kind === "kill" ? this.killBuffer : this.missBuffer;
    const offset = kind === "kill" ? this.killStartOffset : this.missStartOffset;
    const fallback = kind === "kill" ? this.killFallbackAudio : this.missFallbackAudio;

    if (this.ctx && buffer) {
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(1.0, t);
      source.connect(gain);
      gain.connect(this.ctx.destination);
      source.onended = () => {
        if (kind === "kill" && this.activeKillSource === source) {
          this.activeKillSource = null;
        } else if (kind === "miss" && this.activeMissSource === source) {
          this.activeMissSource = null;
        }
      };
      if (kind === "kill") this.activeKillSource = source;
      else this.activeMissSource = source;
      source.start(t, offset);
      return;
    }

    try {
      fallback.currentTime = offset || 0;
      fallback.volume = 1.0;
      fallback.play().catch(() => {});
    } catch (_) {}
  }

  playBlastShot(isHit = false) {
    this.unlock();
    const t = this.ctx ? this.ctx.currentTime : 0;
    this._triggerBlastAt(t);
    this._triggerBufferClipAt(t, isHit ? "kill" : "miss");
  }
}

window.KashmiriAudioEngine = GameAudioEngine;
