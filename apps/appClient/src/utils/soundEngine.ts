import type { SkillId, WeaponId } from "@block-shooter/shared";
import { useSettingsStore } from "../stores/useSettingsStore";
import { soundBank } from "./assetPaths";

class TacticalSoundEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private decodedBuffers: Map<string, AudioBuffer> = new Map();
  private preloadStarted = false;

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    if (this.ctx && !this.preloadStarted) {
      this.preloadStarted = true;
      void this.preloadBank();
    }
    return this.ctx;
  }

  private async preloadBank() {
    if (!this.ctx) return;
    const entries = Object.entries(soundBank);
    await Promise.all(
      entries.map(async ([key, url]) => {
        try {
          const res = await fetch(url);
          if (!res.ok) return;
          const arr = await res.arrayBuffer();
          if (this.ctx) {
            const decoded = await this.ctx.decodeAudioData(arr);
            this.decodedBuffers.set(key, decoded);
          }
        } catch {
          // fallback seamlessly to procedural synthesis
        }
      }),
    );
  }

  private playBuffer(
    key: string,
    vol: number,
    playbackRate = 1.0,
    when = 0,
  ): boolean {
    const ctx = this.ctx;
    const buf = this.decodedBuffers.get(key);
    if (!ctx || !buf) return false;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = playbackRate;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(g);
    g.connect(ctx.destination);
    src.start(when || ctx.currentTime);
    return true;
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === ctx.sampleRate) {
      return this.noiseBuffer;
    }
    const len = ctx.sampleRate * 1.2;
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  private getVolume(mult = 1): number {
    return Math.max(0, Math.min(1, useSettingsStore.getState().masterVolume * mult));
  }

  public unlock() {
    this.getContext();
  }

  public playWeaponFire(weaponId: WeaponId, isSuppressed = false) {
    const settings = useSettingsStore.getState();
    const custom = settings.customWeaponSounds[weaponId];

    if (custom?.dataUrl) {
      try {
        const audio = new Audio(custom.dataUrl);
        audio.volume = this.getVolume(isSuppressed ? 0.55 : 0.9);
        audio.play().catch(() => {});
        return;
      } catch {
        // fallback to engine
      }
    }

    const ctx = this.getContext();
    if (!ctx) return;

    const pack = settings.soundPack;
    const vol = this.getVolume(0.88);
    if (vol <= 0.001) return;

    const now = ctx.currentTime;

    if (isSuppressed) {
      this.playSuppressedShot(ctx, now, weaponId, vol);
    } else if (pack === "scifi") {
      this.playSciFiShot(ctx, now, weaponId, vol);
    } else if (pack === "classic") {
      this.playClassicShot(ctx, now, weaponId, vol);
    } else {
      this.playRealisticShot(ctx, now, weaponId, vol);
    }
  }

  private playSuppressedShot(
    ctx: AudioContext,
    now: number,
    weaponId: WeaponId,
    vol: number,
  ) {
    // Authentic suppressed pneumatic "psst-thump" + crisp metallic bolt cycle
    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 1.4;
    filter.frequency.setValueAtTime(
      weaponId === "sniper" || weaponId === "kar98" ? 1400 : 2100,
      now,
    );
    filter.frequency.exponentialRampToValueAtTime(340, now + 0.09);

    const g = ctx.createGain();
    g.gain.setValueAtTime(vol * 0.52, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    noise.connect(filter);
    filter.connect(g);
    g.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.12);

    const osc = ctx.createOscillator();
    const og = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(165, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.075);
    og.gain.setValueAtTime(vol * 0.48, now);
    og.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
    osc.connect(og);
    og.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);

    // Crisp mechanical bolt click
    this.scheduleClick(ctx, now + 0.025, 2900, 0.02, vol * 0.24);
  }

  public playSpatialWeaponFire(weaponId: WeaponId, distance: number, maxRange = 130) {
    if (distance > maxRange) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const norm = Math.max(0, 1 - distance / maxRange);
    const attenuation = Math.pow(norm, 1.45) * 0.78;
    const vol = this.getVolume(attenuation);
    if (vol <= 0.015) return;

    const settings = useSettingsStore.getState();
    const now = ctx.currentTime;

    if (settings.soundPack === "scifi") {
      this.playSciFiShot(ctx, now, weaponId, vol);
    } else if (settings.soundPack === "classic") {
      this.playClassicShot(ctx, now, weaponId, vol);
    } else {
      const jitter = 0.94 + Math.random() * 0.12;
      if (
        weaponId === "assaultRifle" ||
        weaponId === "ak74m" ||
        weaponId === "scarH" ||
        weaponId === "smg" ||
        weaponId === "p90" ||
        weaponId === "lmg"
      ) {
        const rate =
          weaponId === "smg" || weaponId === "p90"
            ? 1.34
            : weaponId === "scarH" || weaponId === "ak74m"
              ? 0.84
              : weaponId === "lmg"
                ? 0.8
                : 1.0;
        this.playBuffer("assaultRifleFire", vol * 0.82, rate * jitter, now);
      } else if (weaponId === "vector") {
        this.playBuffer("assaultRifleFire", vol * 0.56, 1.56 * jitter, now);
      } else if (weaponId === "burstRifle" || weaponId === "dmr") {
        this.playBuffer(
          "burstRifleFire",
          vol * (weaponId === "dmr" ? 0.9 : 0.78),
          (weaponId === "dmr" ? 0.74 : 1.0) * jitter,
          now,
        );
      } else if (weaponId === "sniper" || weaponId === "kar98") {
        this.playBuffer("thunder", vol * 0.54, weaponId === "kar98" ? 1.7 : 1.48, now);
        this.playBuffer("pistolFire", vol * 0.85, weaponId === "kar98" ? 0.56 : 0.48, now);
      } else if (weaponId === "shotgun" || weaponId === "revolver") {
        this.playBuffer(
          "pistolFire",
          vol * 0.88,
          (weaponId === "revolver" ? 0.66 : 0.58) * jitter,
          now,
        );
      } else {
        this.playBuffer("pistolFire", vol * 0.82, jitter, now);
      }

      const noise = ctx.createBufferSource();
      noise.buffer = this.getNoiseBuffer(ctx);
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      const cutoff = 1100 + norm * 3200;
      filter.frequency.setValueAtTime(cutoff, now);
      filter.frequency.exponentialRampToValueAtTime(220, now + 0.18);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol * 0.52, now);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        now + (weaponId === "sniper" || weaponId === "kar98" ? 0.36 : 0.19),
      );
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + 0.38);
    }
  }

  private playRealisticShot(
    ctx: AudioContext,
    now: number,
    weaponId: WeaponId,
    vol: number,
  ) {
    const jitter = 0.96 + Math.random() * 0.08;

    if (weaponId === "assaultRifle") {
      this.playBuffer("assaultRifleFire", vol * 0.82, jitter, now);
    } else if (weaponId === "ak74m") {
      this.playBuffer("assaultRifleFire", vol * 0.92, 0.84 * jitter, now);
    } else if (weaponId === "scarH") {
      this.playBuffer("burstRifleFire", vol * 0.94, 0.78 * jitter, now);
    } else if (weaponId === "lmg") {
      this.playBuffer("assaultRifleFire", vol * 0.92, 0.8 * jitter, now);
    } else if (weaponId === "smg" || weaponId === "p90") {
      this.playBuffer("assaultRifleFire", vol * 0.65, (weaponId === "p90" ? 1.46 : 1.38) * jitter, now);
    } else if (weaponId === "vector") {
      this.playBuffer("assaultRifleFire", vol * 0.45, 1.58 * jitter, now);
    } else if (weaponId === "burstRifle") {
      this.playBuffer("burstRifleFire", vol * 0.78, jitter, now);
    } else if (weaponId === "dmr") {
      this.playBuffer("burstRifleFire", vol * 0.92, 0.72 * jitter, now);
    } else if (weaponId === "pistol") {
      this.playBuffer("pistolFire", vol * 0.85, jitter, now);
    } else if (weaponId === "revolver") {
      this.playBuffer("pistolFire", vol * 0.94, 0.65 * jitter, now);
      this.scheduleClick(ctx, now + 0.18, 2400, 0.035, vol * 0.24);
    } else if (weaponId === "shotgun") {
      this.playBuffer("pistolFire", vol * 0.9, 0.58 * jitter, now);
      this.scheduleClick(ctx, now + 0.25, 1400, 0.05, vol * 0.28);
    } else if (weaponId === "sniper" || weaponId === "kar98") {
      this.playBuffer("thunder", vol * 0.58, weaponId === "kar98" ? 1.72 : 1.55, now);
      this.playBuffer("pistolFire", vol * 0.88, weaponId === "kar98" ? 0.56 : 0.48, now);
      this.scheduleClick(ctx, now + 0.36, 2200, 0.045, vol * 0.32);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();

    if (weaponId === "sniper" || weaponId === "kar98" || weaponId === "dmr") {
      const isHeavyBolt = weaponId === "sniper" || weaponId === "kar98";
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(isHeavyBolt ? 1900 : 1650, now);
      filter.frequency.exponentialRampToValueAtTime(160, now + (isHeavyBolt ? 0.52 : 0.32));
      gain.gain.setValueAtTime(vol * (isHeavyBolt ? 0.95 : 0.75), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (isHeavyBolt ? 0.56 : 0.36));

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(isHeavyBolt ? 195 : 210, now);
      osc.frequency.exponentialRampToValueAtTime(38, now + (isHeavyBolt ? 0.28 : 0.18));
      oscGain.gain.setValueAtTime(vol * (isHeavyBolt ? 0.75 : 0.55), now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + (isHeavyBolt ? 0.3 : 0.2));
      noise.start(now);
      noise.stop(now + (isHeavyBolt ? 0.58 : 0.38));
      osc.start(now);
      osc.stop(now + (isHeavyBolt ? 0.32 : 0.22));
    } else if (weaponId === "shotgun" || weaponId === "revolver") {
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(weaponId === "revolver" ? 2900 : 2600, now);
      filter.frequency.exponentialRampToValueAtTime(190, now + 0.32);
      gain.gain.setValueAtTime(vol * 0.9, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);

      osc.type = "triangle";
      osc.frequency.setValueAtTime(weaponId === "revolver" ? 175 : 140, now);
      osc.frequency.exponentialRampToValueAtTime(34, now + 0.2);
      oscGain.gain.setValueAtTime(vol * 0.76, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      noise.start(now);
      noise.stop(now + 0.36);
      osc.start(now);
      osc.stop(now + 0.23);
    } else {
      const dur =
        weaponId === "smg" || weaponId === "p90" || weaponId === "vector"
          ? 0.08
          : weaponId === "scarH" || weaponId === "ak74m" || weaponId === "lmg"
            ? 0.17
            : 0.14;
      filter.type = weaponId === "vector" ? "lowpass" : "bandpass";
      filter.frequency.setValueAtTime(
        weaponId === "vector"
          ? 1350
          : weaponId === "smg" || weaponId === "p90"
            ? 2400
            : weaponId === "scarH" || weaponId === "ak74m"
              ? 1450
              : 1850,
        now,
      );
      filter.frequency.exponentialRampToValueAtTime(300, now + dur);
      gain.gain.setValueAtTime(vol * (weaponId === "vector" ? 0.26 : 0.45), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      osc.type = "triangle";
      osc.frequency.setValueAtTime(
        weaponId === "scarH" || weaponId === "ak74m" ? 170 : 220,
        now,
      );
      osc.frequency.exponentialRampToValueAtTime(44, now + 0.095);
      oscGain.gain.setValueAtTime(vol * 0.44, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
      noise.start(now);
      noise.stop(now + dur + 0.02);
      osc.start(now);
      osc.stop(now + 0.12);
    }

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    // Metallic brass shell casing clink
    this.scheduleClick(
      ctx,
      now + 0.17 + Math.random() * 0.08,
      3700 + Math.random() * 650,
      0.025,
      vol * 0.09,
    );
  }

  private playSciFiShot(
    ctx: AudioContext,
    now: number,
    weaponId: WeaponId,
    vol: number,
  ) {
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    const pitchMap: Record<WeaponId, [number, number, number]> = {
      assaultRifle: [780, 140, 0.14],
      ak74m: [680, 115, 0.16],
      scarH: [590, 95, 0.19],
      smg: [960, 220, 0.08],
      p90: [1080, 240, 0.08],
      shotgun: [380, 55, 0.28],
      burstRifle: [1150, 260, 0.12],
      sniper: [1480, 75, 0.42],
      kar98: [1350, 88, 0.34],
      pistol: [680, 130, 0.16],
      dmr: [1220, 110, 0.24],
      lmg: [640, 115, 0.15],
      vector: [1320, 320, 0.07],
      revolver: [520, 82, 0.24],
    };

    const [startF, endF, dur] = pitchMap[weaponId] || [780, 140, 0.14];
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(startF, now);
    osc.frequency.exponentialRampToValueAtTime(endF, now + dur);

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(startF * 0.5, now);
    osc2.frequency.exponentialRampToValueAtTime(endF * 0.5, now + dur);

    gain.gain.setValueAtTime(vol * 0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + dur + 0.01);
    osc2.stop(now + dur + 0.01);
  }

  private playClassicShot(
    ctx: AudioContext,
    now: number,
    weaponId: WeaponId,
    vol: number,
  ) {
    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value =
      weaponId === "sniper" || weaponId === "kar98" || weaponId === "dmr" ? 1200 : 1800;

    const gain = ctx.createGain();
    const dur =
      weaponId === "sniper" || weaponId === "kar98"
        ? 0.35
        : weaponId === "shotgun" || weaponId === "revolver"
          ? 0.28
          : 0.12;
    gain.gain.setValueAtTime(vol * 0.75, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + dur + 0.02);
  }

  private scheduleClick(
    ctx: AudioContext,
    when: number,
    freq: number,
    dur: number,
    vol: number,
  ) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, when);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.4, when + dur);
    g.gain.setValueAtTime(vol, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(when);
    osc.stop(when + dur + 0.01);
  }

  public playSlide() {
    const ctx = this.getContext();
    if (!ctx) return;
    const vol = this.getVolume(0.42);
    if (vol <= 0.001) return;
    const now = ctx.currentTime;
    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(920, now);
    filter.frequency.exponentialRampToValueAtTime(240, now + 0.52);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    noise.connect(filter);
    filter.connect(g);
    g.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.56);
  }

  public playArmorCrack() {
    const ctx = this.getContext();
    if (!ctx) return;
    const vol = this.getVolume(0.75);
    if (vol <= 0.001) return;
    const now = ctx.currentTime;
    this.scheduleClick(ctx, now, 3400, 0.06, vol);
    this.scheduleClick(ctx, now + 0.03, 2100, 0.09, vol * 0.85);
    this.scheduleClick(ctx, now + 0.065, 4200, 0.07, vol * 0.65);
  }

  public playArmorPlateInsert() {
    const ctx = this.getContext();
    if (!ctx) return;
    const vol = this.getVolume(0.55);
    if (vol <= 0.001) return;
    const now = ctx.currentTime;
    this.scheduleClick(ctx, now, 520, 0.08, vol * 0.8);
    this.scheduleClick(ctx, now + 0.16, 1380, 0.06, vol);
    this.scheduleClick(ctx, now + 0.26, 2100, 0.05, vol * 0.9);
  }

  public playMedkitUse() {
    const ctx = this.getContext();
    if (!ctx) return;
    const vol = this.getVolume(0.5);
    if (vol <= 0.001) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(840, now + 0.28);
    g.gain.setValueAtTime(vol * 0.6, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.34);
  }

  public playLootPickup(rarity: string = "common") {
    const ctx = this.getContext();
    if (!ctx) return;
    const vol = this.getVolume(0.45);
    if (vol <= 0.001) return;
    const now = ctx.currentTime;
    const base =
      rarity === "legendary"
        ? 880
        : rarity === "epic"
          ? 740
          : rarity === "rare"
            ? 620
            : 520;
    this.scheduleClick(ctx, now, base, 0.06, vol);
    this.scheduleClick(ctx, now + 0.06, base * 1.35, 0.09, vol * 0.9);
  }

  public playScopeZoom() {
    const ctx = this.getContext();
    if (!ctx) return;
    const vol = this.getVolume(0.32);
    if (vol <= 0.001) return;
    this.scheduleClick(ctx, ctx.currentTime, 1950, 0.03, vol);
  }

  public playOverdriveSurge() {
    const ctx = this.getContext();
    if (!ctx) return;
    const vol = this.getVolume(0.62);
    if (vol <= 0.001) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(760, now + 0.42);
    g.gain.setValueAtTime(vol * 0.45, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.5);
  }

  public playFootstep(sprinting = false) {
    const ctx = this.getContext();
    if (!ctx) return;
    const vol = this.getVolume(sprinting ? 0.22 : 0.13);
    if (vol <= 0.001) return;

    const now = ctx.currentTime;
    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(sprinting ? 620 : 420, now);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    noise.connect(filter);
    filter.connect(g);
    g.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.1);
  }

  public playReload() {
    const ctx = this.getContext();
    if (!ctx) return;
    const vol = this.getVolume(0.55);
    const now = ctx.currentTime;
    if (!this.playBuffer("assaultRifleReload", vol, 1.0, now)) {
      this.scheduleClick(ctx, now + 0.02, 1100, 0.04, vol);
      this.scheduleClick(ctx, now + 0.35, 780, 0.05, vol * 0.8);
      this.scheduleClick(ctx, now + 0.85, 1650, 0.05, vol * 1.1);
    }
  }

  public playHitMarker(isHeadshot = false) {
    const ctx = this.getContext();
    if (!ctx) return;
    const vol = this.getVolume(isHeadshot ? 0.85 : 0.65);
    const now = ctx.currentTime;
    this.playBuffer("hit", vol * 0.8, isHeadshot ? 1.32 : 1.0, now);

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(isHeadshot ? 2350 : 1200, now);
    osc.frequency.exponentialRampToValueAtTime(isHeadshot ? 3200 : 700, now + 0.08);
    g.gain.setValueAtTime(vol * 0.55, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);

    if (isHeadshot) {
      const crack = ctx.createOscillator();
      const cg = ctx.createGain();
      crack.type = "sine";
      crack.frequency.setValueAtTime(340, now);
      crack.frequency.exponentialRampToValueAtTime(95, now + 0.11);
      cg.gain.setValueAtTime(vol * 0.65, now);
      cg.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      crack.connect(cg);
      cg.connect(ctx.destination);
      crack.start(now);
      crack.stop(now + 0.13);
    }
  }

  public playKillConfirm() {
    const ctx = this.getContext();
    if (!ctx) return;
    const vol = this.getVolume(0.75);
    const now = ctx.currentTime;
    if (!this.playBuffer("kill", vol, 1.0, now)) {
      this.scheduleClick(ctx, now, 880, 0.09, vol);
      this.scheduleClick(ctx, now + 0.07, 1320, 0.14, vol);
    }
  }

  public playSkill(skillId: SkillId) {
    const ctx = this.getContext();
    if (!ctx) return;
    const vol = this.getVolume(0.7);
    const now = ctx.currentTime;

    if (skillId === "dash") {
      const noise = ctx.createBufferSource();
      noise.buffer = this.getNoiseBuffer(ctx);
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(300, now);
      filter.frequency.exponentialRampToValueAtTime(2400, now + 0.22);
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      noise.connect(filter);
      filter.connect(g);
      g.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + 0.26);
    } else if (skillId === "shield") {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(660, now + 0.32);
      g.gain.setValueAtTime(vol * 0.6, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    } else {
      this.scheduleClick(ctx, now, 280, 0.12, vol);
    }
  }

  public playExplosion() {
    const ctx = this.getContext();
    if (!ctx) return;
    const vol = this.getVolume(1.0);
    const now = ctx.currentTime;

    this.playBuffer("thunder", vol * 0.85, 0.85, now);

    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = "sine";
    sub.frequency.setValueAtTime(110, now);
    sub.frequency.exponentialRampToValueAtTime(26, now + 0.65);
    subGain.gain.setValueAtTime(vol * 1.1, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.72);
    sub.connect(subGain);
    subGain.connect(ctx.destination);
    sub.start(now);
    sub.stop(now + 0.75);

    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(75, now + 0.95);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol * 1.2, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

    noise.connect(filter);
    filter.connect(g);
    g.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 1.02);
  }

  public playJumpPad() {
    const ctx = this.getContext();
    if (!ctx) return;
    const vol = this.getVolume(0.5);
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.25);
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playJump(isDouble = false) {
    const ctx = this.getContext();
    if (!ctx) return;
    const vol = this.getVolume(isDouble ? 0.34 : 0.2);
    if (vol <= 0.001) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = isDouble ? "triangle" : "sine";
    osc.frequency.setValueAtTime(isDouble ? 320 : 180, now);
    osc.frequency.exponentialRampToValueAtTime(isDouble ? 640 : 320, now + 0.14);
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);

    if (isDouble) {
      const noise = ctx.createBufferSource();
      noise.buffer = this.getNoiseBuffer(ctx);
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(950, now);
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(vol * 0.65, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
      noise.connect(filter);
      filter.connect(ng);
      ng.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + 0.14);
    }
  }

  public playClick() {
    const ctx = this.getContext();
    if (!ctx) return;
    const vol = this.getVolume(0.35);
    if (!this.playBuffer("click", vol, 1.0, ctx.currentTime)) {
      this.scheduleClick(ctx, ctx.currentTime, 1100, 0.035, vol);
    }
  }
}

export const soundEngine = new TacticalSoundEngine();
