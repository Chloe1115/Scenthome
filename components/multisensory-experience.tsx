"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { getImmersiveTrack, getPrimedImmersiveAudioContext } from "@/lib/immersive-audio";
import { deriveExperiencePlan } from "@/lib/multisensory";
import type { GeneratedScentProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

type MultisensoryExperienceProps = {
  profile: GeneratedScentProfile;
  narrative: string;
  emotions: string[];
  isPlaying: boolean;
  experienceCompleted: boolean;
  intensity: number;
  onClose: () => void;
  onSave: () => void;
  onPurchase: () => void;
  onIntensityChange: (value: number) => void;
  onPlayingChange: (value: boolean) => void;
  onCompletedChange: (value: boolean) => void;
};

type AudioRig = {
  context: AudioContext;
  master: GainNode;
  padGain: GainNode;
  melodyGain: GainNode;
  rootFilter: BiquadFilterNode;
  rootOsc: OscillatorNode;
  harmonyOsc: OscillatorNode;
  pageNoiseBuffer: AudioBuffer;
  sharedContext: boolean;
};

const VISUAL_STYLES = {
  mist: {
    background:
      "radial-gradient(circle at 18% 22%, rgba(215,236,233,0.16), transparent 22%), radial-gradient(circle at 82% 16%, rgba(185,236,238,0.24), transparent 26%), linear-gradient(145deg, rgba(15,24,25,0.96), rgba(28,45,46,0.94) 46%, rgba(65,101,99,0.88) 100%)",
    accent: "rgba(121, 164, 160, 0.18)",
    glow: "rgba(185, 236, 238, 0.22)",
  },
  amber: {
    background:
      "radial-gradient(circle at 24% 18%, rgba(233,191,124,0.18), transparent 24%), radial-gradient(circle at 78% 18%, rgba(255,255,255,0.08), transparent 22%), linear-gradient(145deg, rgba(18,16,14,0.96), rgba(64,47,33,0.94) 48%, rgba(121,88,52,0.88) 100%)",
    accent: "rgba(216, 172, 116, 0.16)",
    glow: "rgba(233, 191, 124, 0.22)",
  },
  breeze: {
    background:
      "radial-gradient(circle at 18% 18%, rgba(247,216,149,0.18), transparent 22%), radial-gradient(circle at 76% 22%, rgba(255,255,255,0.1), transparent 24%), linear-gradient(140deg, rgba(19,19,16,0.96), rgba(54,47,35,0.94) 42%, rgba(97,116,98,0.88) 100%)",
    accent: "rgba(180, 151, 104, 0.14)",
    glow: "rgba(247, 216, 149, 0.2)",
  },
  ember: {
    background:
      "radial-gradient(circle at 22% 18%, rgba(255,206,145,0.18), transparent 24%), radial-gradient(circle at 78% 18%, rgba(255,255,255,0.08), transparent 22%), linear-gradient(145deg, rgba(28,16,12,0.96), rgba(88,51,31,0.94) 48%, rgba(147,92,58,0.88) 100%)",
    accent: "rgba(188, 123, 84, 0.16)",
    glow: "rgba(255, 206, 145, 0.22)",
  },
  coast: {
    background:
      "radial-gradient(circle at 18% 20%, rgba(185,236,238,0.16), transparent 24%), radial-gradient(circle at 80% 18%, rgba(255,255,255,0.08), transparent 24%), linear-gradient(145deg, rgba(14,20,24,0.96), rgba(32,55,64,0.94) 48%, rgba(71,103,112,0.88) 100%)",
    accent: "rgba(120, 167, 179, 0.16)",
    glow: "rgba(185, 236, 238, 0.2)",
  },
} as const;

const MUSIC_PRESET_MAP = {
  garden: { root: 220, harmonyRatio: 1.333, filterFrequency: 980, notes: [0, 4, 7, 9, 7, 4], waveform: "sine" as const },
  rain: { root: 196, harmonyRatio: 1.333, filterFrequency: 760, notes: [0, 3, 7, 10, 7, 3], waveform: "sine" as const },
  kitchen: { root: 246.94, harmonyRatio: 1.25, filterFrequency: 1040, notes: [0, 4, 5, 9, 5, 4], waveform: "triangle" as const },
  sea: { root: 207.65, harmonyRatio: 1.333, filterFrequency: 820, notes: [0, 2, 7, 9, 7, 2], waveform: "sine" as const },
  night: { root: 174.61, harmonyRatio: 1.333, filterFrequency: 700, notes: [0, 3, 7, 8, 7, 3], waveform: "sine" as const },
} as const;

function createNoiseBuffer(context: AudioContext) {
  const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
  const channel = buffer.getChannelData(0);

  for (let index = 0; index < channel.length; index += 1) {
    channel[index] = Math.random() * 2 - 1;
  }

  return buffer;
}

function createAudioRig() {
  const primedContext = getPrimedImmersiveAudioContext();

  if (!primedContext && typeof window === "undefined") {
    return null;
  }

  const AudioContextCtor = primedContext
    ? null
    : (
        window.AudioContext ||
        (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      );

  if (!primedContext && !AudioContextCtor) {
    return null;
  }

  let context: AudioContext;

  if (primedContext) {
    context = primedContext;
  } else {
    const AudioContextCtorNonNull = AudioContextCtor;

    if (!AudioContextCtorNonNull) {
      return null;
    }

    context = new AudioContextCtorNonNull();
  }

  const master = context.createGain();
  const rootFilter = context.createBiquadFilter();
  const padGain = context.createGain();
  const melodyGain = context.createGain();
  const rootOsc = context.createOscillator();
  const harmonyOsc = context.createOscillator();
  const pageNoiseBuffer = createNoiseBuffer(context);

  rootFilter.type = "lowpass";
  rootOsc.type = "triangle";
  harmonyOsc.type = "sine";

  rootOsc.connect(rootFilter);
  harmonyOsc.connect(rootFilter);
  rootFilter.connect(padGain);
  padGain.connect(master);
  melodyGain.connect(master);

  master.connect(context.destination);
  master.gain.value = 0;
  padGain.gain.value = 0;
  melodyGain.gain.value = 0.16;

  rootOsc.start();
  harmonyOsc.start();

  return {
    context,
    master,
    padGain,
    melodyGain,
    rootFilter,
    rootOsc,
    harmonyOsc,
    pageNoiseBuffer,
    sharedContext: Boolean(primedContext),
  };
}

export function MultisensoryExperience({
  profile,
  narrative,
  emotions,
  isPlaying,
  experienceCompleted,
  intensity,
  onClose,
  onSave,
  onPurchase,
  onIntensityChange,
  onPlayingChange,
  onCompletedChange,
}: MultisensoryExperienceProps) {
  const [elapsed, setElapsed] = useState(0);
  const [externalTrackReady, setExternalTrackReady] = useState(false);
  const audioRigRef = useRef<AudioRig | null>(null);
  const backgroundTrackRef = useRef<HTMLAudioElement | null>(null);
  const melodyTimerRef = useRef<number | null>(null);
  const melodyStepRef = useRef(0);
  const previousStageIndexRef = useRef(0);
  const plan = useMemo(() => deriveExperiencePlan(profile, narrative, emotions), [emotions, narrative, profile]);
  const totalDuration = useMemo(
    () => plan.scenes.reduce((sum, scene) => sum + scene.duration, 0),
    [plan.scenes],
  );
  const stageStarts = useMemo(() => {
    let total = 0;
    return plan.scenes.map((scene) => {
      const start = total;
      total += scene.duration;
      return start;
    });
  }, [plan.scenes]);
  const musicPreset = useMemo(() => MUSIC_PRESET_MAP[plan.scenes[0].soundPreset], [plan.scenes]);

  const stageIndex = useMemo(() => {
    let threshold = 0;

    for (let index = 0; index < plan.scenes.length; index += 1) {
      threshold += plan.scenes[index].duration;

      if (elapsed < threshold) {
        return index;
      }
    }

    return plan.scenes.length - 1;
  }, [elapsed, plan.scenes]);

  const currentScene = plan.scenes[stageIndex];
  const stageProgress = useMemo(() => {
    const stageStart = plan.scenes.slice(0, stageIndex).reduce((sum, scene) => sum + scene.duration, 0);
    const currentDuration = plan.scenes[stageIndex]?.duration ?? 1;
    return Math.min(1, Math.max(0, (elapsed - stageStart) / currentDuration));
  }, [elapsed, plan.scenes, stageIndex]);

  useEffect(() => {
    setElapsed(0);
    melodyStepRef.current = 0;
    previousStageIndexRef.current = 0;
    onPlayingChange(false);
    onCompletedChange(false);
  }, [onCompletedChange, onPlayingChange, profile]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const audio = getImmersiveTrack();

    if (!audio) {
      return;
    }

    audio.volume = 0;

    const markReady = () => {
      setExternalTrackReady(true);
    };

    const markError = () => {
      setExternalTrackReady(false);
    };

    if (audio.readyState >= 3) {
      setExternalTrackReady(true);
    }

    audio.addEventListener("canplaythrough", markReady);
    audio.addEventListener("canplay", markReady);
    audio.addEventListener("error", markError);
    audio.load();
    backgroundTrackRef.current = audio;

    return () => {
      audio.pause();
      audio.currentTime = 0;
      audio.removeEventListener("canplaythrough", markReady);
      audio.removeEventListener("canplay", markReady);
      audio.removeEventListener("error", markError);
      backgroundTrackRef.current = null;
      setExternalTrackReady(false);
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onPlayingChange(false);
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, onPlayingChange]);

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    const timer = window.setInterval(() => {
      setElapsed((previous) => Math.min(previous + 0.2, totalDuration));
    }, 200);

    return () => window.clearInterval(timer);
  }, [isPlaying, totalDuration]);

  useEffect(() => {
    if (!isPlaying || totalDuration <= 0 || elapsed < totalDuration) {
      return;
    }

    onPlayingChange(false);
    onCompletedChange(true);
  }, [elapsed, isPlaying, onCompletedChange, onPlayingChange, totalDuration]);

  useEffect(() => {
    void ensureAudioReady();
    onPlayingChange(true);
  }, [onPlayingChange]);

  useEffect(() => {
    return () => {
      const rig = audioRigRef.current;

      if (!rig) {
        return;
      }

      if (melodyTimerRef.current) {
        window.clearInterval(melodyTimerRef.current);
        melodyTimerRef.current = null;
      }

      rig.rootOsc.stop();
      rig.harmonyOsc.stop();
      if (!rig.sharedContext) {
        void rig.context.close();
      }
      audioRigRef.current = null;
    };
  }, []);

  useEffect(() => {
    const rig = audioRigRef.current;

    if (!rig) {
      return;
    }

    const contextTime = rig.context.currentTime;
    const stageLift = 0.78 + stageIndex * 0.16 + stageProgress * 0.12;
    const intensityFactor = intensity / 10;
    const playingFactor = isPlaying ? 1 : 0;
    const useExternalTrack = externalTrackReady;

    rig.master.gain.cancelScheduledValues(contextTime);
    rig.master.gain.linearRampToValueAtTime(0.08 + 0.14 * intensityFactor * playingFactor, contextTime + 0.25);

    rig.rootOsc.type = "sine";
    rig.harmonyOsc.type = "triangle";

    rig.rootFilter.frequency.cancelScheduledValues(contextTime);
    rig.rootFilter.frequency.linearRampToValueAtTime(
      musicPreset.filterFrequency + intensityFactor * 120 + stageIndex * 40,
      contextTime + 0.3,
    );

    rig.padGain.gain.cancelScheduledValues(contextTime);
    rig.padGain.gain.linearRampToValueAtTime(
      useExternalTrack ? 0 : (0.05 + stageLift * 0.012) * intensityFactor * playingFactor,
      contextTime + 0.3,
    );

    rig.melodyGain.gain.cancelScheduledValues(contextTime);
    rig.melodyGain.gain.linearRampToValueAtTime(
      useExternalTrack ? 0 : (0.085 + stageProgress * 0.028) * intensityFactor * playingFactor,
      contextTime + 0.3,
    );

    rig.rootOsc.frequency.cancelScheduledValues(contextTime);
    rig.rootOsc.frequency.linearRampToValueAtTime(musicPreset.root, contextTime + 0.25);

    rig.harmonyOsc.frequency.cancelScheduledValues(contextTime);
    rig.harmonyOsc.frequency.linearRampToValueAtTime(
      musicPreset.root * musicPreset.harmonyRatio,
      contextTime + 0.25,
    );
  }, [externalTrackReady, intensity, isPlaying, musicPreset, stageIndex, stageProgress]);

  useEffect(() => {
    const audio = backgroundTrackRef.current;

    if (!audio || !externalTrackReady) {
      return;
    }

    audio.volume = Math.min(0.24, 0.05 + intensity * 0.014);

    if (isPlaying) {
      void audio.play().catch(() => {
        setExternalTrackReady(false);
      });
      return;
    }

    audio.pause();
  }, [externalTrackReady, intensity, isPlaying]);

  useEffect(() => {
    const rig = audioRigRef.current;

    if (!rig || !isPlaying || externalTrackReady) {
      if (melodyTimerRef.current) {
        window.clearInterval(melodyTimerRef.current);
        melodyTimerRef.current = null;
      }
      return;
    }

    function playMelodyNote() {
      const activeRig = audioRigRef.current;

      if (!activeRig) {
        return;
      }

      const noteInterval = musicPreset.notes[melodyStepRef.current % musicPreset.notes.length];
      const frequency = musicPreset.root * Math.pow(2, noteInterval / 12);
      const oscillator = activeRig.context.createOscillator();
      const gain = activeRig.context.createGain();
      const filter = activeRig.context.createBiquadFilter();
      const now = activeRig.context.currentTime;

      oscillator.type = musicPreset.waveform;
      oscillator.frequency.setValueAtTime(frequency, now);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1200 + intensity * 36, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.22, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.45);

      oscillator.connect(filter);
      filter.connect(gain);
      gain.connect(activeRig.melodyGain);

      oscillator.start(now);
      oscillator.stop(now + 1.3);
      melodyStepRef.current += 1;
    }

    playMelodyNote();
    melodyTimerRef.current = window.setInterval(playMelodyNote, 2200);

    return () => {
      if (melodyTimerRef.current) {
        window.clearInterval(melodyTimerRef.current);
        melodyTimerRef.current = null;
      }
    };
  }, [externalTrackReady, intensity, isPlaying, musicPreset]);

  useEffect(() => {
    const rig = audioRigRef.current;

    if (!rig || previousStageIndexRef.current === stageIndex) {
      return;
    }

    const now = rig.context.currentTime;
    const source = rig.context.createBufferSource();
    const filter = rig.context.createBiquadFilter();
    const gain = rig.context.createGain();
    const clickOsc = rig.context.createOscillator();
    const clickGain = rig.context.createGain();

    source.buffer = rig.pageNoiseBuffer;
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(2100, now);
    filter.frequency.exponentialRampToValueAtTime(640, now + 0.22);
    source.playbackRate.setValueAtTime(1.8, now);
    source.playbackRate.exponentialRampToValueAtTime(0.85, now + 0.24);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.24 + intensity * 0.012, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

    clickOsc.type = "triangle";
    clickOsc.frequency.setValueAtTime(1250, now);
    clickOsc.frequency.exponentialRampToValueAtTime(320, now + 0.16);
    clickGain.gain.setValueAtTime(0.0001, now);
    clickGain.gain.exponentialRampToValueAtTime(0.05, now + 0.012);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(rig.master);
    clickOsc.connect(clickGain);
    clickGain.connect(rig.master);

    source.start(now);
    source.stop(now + 0.32);
    clickOsc.start(now);
    clickOsc.stop(now + 0.18);
    previousStageIndexRef.current = stageIndex;
  }, [intensity, stageIndex]);

  const visualStyle = VISUAL_STYLES[currentScene.visualPreset];
  const totalProgress = Math.min(1, totalDuration === 0 ? 0 : elapsed / totalDuration);

  async function ensureAudioReady() {
    if (!audioRigRef.current) {
      audioRigRef.current = createAudioRig();
    }

    if (!audioRigRef.current) {
      return;
    }

    if (audioRigRef.current.context.state === "suspended") {
      await audioRigRef.current.context.resume();
    }
  }

  async function handleStart() {
    await ensureAudioReady();

    if (experienceCompleted || elapsed >= totalDuration) {
      setElapsed(0);
      onCompletedChange(false);
    }

    onPlayingChange(true);
  }

  async function handleReplay() {
    await ensureAudioReady();
    setElapsed(0);
    onCompletedChange(false);
    onPlayingChange(true);
  }

  async function handleStageJump(targetIndex: number) {
    await ensureAudioReady();
    const clampedIndex = Math.max(0, Math.min(targetIndex, plan.scenes.length - 1));
    setElapsed(stageStarts[clampedIndex] ?? 0);
    onCompletedChange(false);
    onPlayingChange(false);
  }

  const sensoryParticles = Array.from({ length: 5 }, (_, index) => ({
    id: `particle-${index}`,
    left: `${14 + index * 18}%`,
    top: `${18 + (index % 3) * 24}%`,
    delay: `${index * 0.7}s`,
    scale: 0.9 + index * 0.08,
  }));

  return (
    <section
      className="experience-overlay fade-up-enter fixed inset-0 z-[90] overflow-y-auto overscroll-contain touch-pan-y text-white"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <button type="button" aria-label="关闭体验" className="absolute inset-0 z-0" onClick={onClose} />

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `${visualStyle.background}, radial-gradient(circle at center, rgba(7, 10, 11, 0.1), rgba(7, 10, 11, 0.55))`,
        }}
      />
      <div className="experience-vignette pointer-events-none absolute inset-0" />
      <div className="experience-sweep pointer-events-none absolute inset-0" />
      <div
        className="experience-fog pointer-events-none absolute inset-0"
        style={{
          opacity: 0.26 + intensity * 0.05,
          background: `radial-gradient(circle at ${18 + stageIndex * 24}% ${24 + stageIndex * 10}%, ${visualStyle.glow}, transparent 30%), radial-gradient(circle at 78% 76%, ${visualStyle.accent}, transparent 38%)`,
        }}
      />
      {sensoryParticles.map((particle) => (
        <span
          key={particle.id}
          className="experience-particle pointer-events-none absolute rounded-full"
          style={{
            left: particle.left,
            top: particle.top,
            animationDelay: particle.delay,
            transform: `scale(${particle.scale})`,
            opacity: 0.34 + intensity * 0.04,
          }}
        />
      ))}
      <div className="experience-ring pointer-events-none absolute left-1/2 top-1/2 h-[72vmin] w-[72vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/12" />
      <div className="experience-ring pointer-events-none absolute left-1/2 top-1/2 h-[54vmin] w-[54vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />

      <div className="relative z-10 flex min-h-screen flex-col pointer-events-none">
        <div className="flex items-center justify-between px-5 py-5 md:px-8">
          <div className="rounded-full border border-white/14 bg-white/8 px-4 py-2 text-[11px] uppercase tracking-[0.34em] text-white/72">
            {plan.themeLabel}
          </div>
          <button
            type="button"
            onClick={() => {
              onPlayingChange(false);
              onClose();
            }}
            className="pointer-events-auto rounded-full border border-white/14 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.24em] text-white/82 transition hover:bg-white/16"
          >
            退出
          </button>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 py-6 sm:px-6">
          <div className="pointer-events-none w-full max-w-5xl text-center">
            <div className="mx-auto max-w-3xl space-y-5">
              <p className="text-[11px] uppercase tracking-[0.5em] text-white/58">
                {currentScene.stepLabel}
              </p>
              <h2 className="font-headline text-4xl leading-[1.02] text-white sm:text-5xl md:text-7xl">
                {currentScene.title}
              </h2>
              <p className="experience-narration mx-auto max-w-2xl text-base leading-7 text-white/86 sm:text-lg sm:leading-8 md:text-2xl md:leading-10">
                {currentScene.narration}
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 px-4 pb-5 sm:px-5 md:px-8 md:pb-8">
          <div className="pointer-events-auto mx-auto max-w-6xl rounded-[1.5rem] border border-white/12 bg-black/18 p-4 backdrop-blur-2xl sm:rounded-[2rem] md:p-6">
            <div className="flex flex-col gap-5">
              <div className="grid gap-3 md:grid-cols-3">
                {plan.notePyramid.map((layer, index) => (
                  <div
                    key={layer.key}
                    className={cn(
                      "rounded-[1.4rem] border px-4 py-4 text-left transition",
                      stageIndex === index ? "border-white/26 bg-white/14" : "border-white/12 bg-white/8",
                    )}
                  >
                    <p className="text-[11px] uppercase tracking-[0.28em] text-white/56">{layer.stageLabel}</p>
                    <p className="mt-2 font-headline text-2xl text-white">{layer.noteLabel}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {layer.notes.map((note) => (
                        <span key={`${layer.key}-${note}`} className="rounded-full bg-white/10 px-3 py-2 text-xs text-white/84">
                          {note}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {plan.scenes.map((scene, index) => (
                      <span
                      key={scene.id}
                      className={cn(
                        "rounded-full px-3 py-2 text-[11px] uppercase tracking-[0.24em] transition",
                        index === stageIndex ? "bg-white text-[#1b1c1a]" : "bg-white/10 text-white/64",
                      )}
                    >
                      {scene.stepLabel}
                    </span>
                      ))}
                  </div>
                  <div className="h-1.5 w-full max-w-xl overflow-hidden rounded-full bg-white/12">
                    <div className="experience-progress h-full rounded-full bg-white/90" style={{ width: `${totalProgress * 100}%` }} />
                  </div>
                </div>

                <div className="flex flex-col gap-4 md:min-w-[420px]">
                  <div className="flex items-center justify-between gap-4 text-[11px] uppercase tracking-[0.3em] text-white/58">
                    <span>柔和</span>
                    <span>浓郁</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={intensity}
                    onChange={(event) => onIntensityChange(Number(event.target.value))}
                    className="w-full"
                  />
                  <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
                    <button
                      type="button"
                      onClick={() => void handleStageJump(stageIndex - 1)}
                      disabled={stageIndex === 0}
                      className="rounded-full border border-white/16 bg-white/10 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      上一步
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (isPlaying) {
                          onPlayingChange(false);
                          return;
                        }

                        void handleStart();
                      }}
                      className="rounded-full bg-white px-4 py-3 text-sm font-semibold text-[#1b1c1a]"
                    >
                      {isPlaying ? "暂停" : "继续"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleReplay()}
                      className="rounded-full border border-white/16 bg-white/10 px-4 py-3 text-sm font-semibold text-white"
                    >
                      再来一次
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleStageJump(stageIndex + 1)}
                      disabled={stageIndex === plan.scenes.length - 1}
                      className="rounded-full border border-white/16 bg-white/10 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      下一步
                    </button>
                    <button
                      type="button"
                      onClick={onSave}
                      className="rounded-full border border-white/16 bg-white/10 px-4 py-3 text-sm font-semibold text-white"
                    >
                      保存方案
                    </button>
                    <button
                      type="button"
                      onClick={onPurchase}
                      className="rounded-full bg-gradient-to-br from-[#f3e0b2] to-[#d0edf0] px-4 py-3 text-sm font-semibold text-[#1b1c1a]"
                    >
                      购买方案
                    </button>
                    {experienceCompleted ? (
                      <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full border border-white/16 bg-white/10 px-4 py-3 text-sm font-semibold text-white"
                      >
                        返回方案
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
