let primedAudioContext: AudioContext | null = null;
let immersiveTrack: HTMLAudioElement | null = null;
const IMMERSIVE_TRACK_SRC = "/music/immersive-theme.mp3";

function getAudioContextCtor() {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    window.AudioContext ||
    (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ||
    null
  );
}

export function getPrimedImmersiveAudioContext() {
  return primedAudioContext;
}

export function getImmersiveTrack() {
  if (typeof window === "undefined") {
    return null;
  }

  if (!immersiveTrack) {
    immersiveTrack = new Audio(IMMERSIVE_TRACK_SRC);
    immersiveTrack.loop = true;
    immersiveTrack.preload = "auto";
  }

  return immersiveTrack;
}

export async function primeImmersiveAudio() {
  const AudioContextCtor = getAudioContextCtor();

  if (!AudioContextCtor) {
    return null;
  }

  if (!primedAudioContext) {
    primedAudioContext = new AudioContextCtor();
  }

  if (primedAudioContext.state === "suspended") {
    await primedAudioContext.resume();
  }

  const track = getImmersiveTrack();

  if (track) {
    track.muted = true;

    try {
      await track.play();
      track.pause();
      track.currentTime = 0;
    } catch {
      // Ignore browser autoplay rejections here and fall back to later user gestures.
    } finally {
      track.muted = false;
    }
  }

  return primedAudioContext;
}
