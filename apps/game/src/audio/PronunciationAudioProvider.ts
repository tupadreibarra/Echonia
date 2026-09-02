export interface PronounceableItem {
  id: string;
  audioUrl: string;
}

/**
 * Plays a Content Item's pronunciation clip, with a synthesized-tone
 * fallback when the real audio can't load. This is a deliberate resilience
 * feature, not a stopgap to remove later: Phase 0 requires that a child is
 * never stuck on missing or failing audio (unsupported device, no network,
 * or — right now, in every case — a placeholder asset path that has no
 * recorded clip behind it yet). The fallback keeps every "Replay" press
 * audible; once real clips ship, this path simply stops firing.
 */
class PronunciationAudioProvider {
  private audioContext: AudioContext | null = null;

  async play(item: PronounceableItem): Promise<void> {
    try {
      await this.playRealClip(item.audioUrl);
    } catch (cause) {
      console.warn(
        `[PronunciationAudioProvider] Could not play "${item.audioUrl}" for "${item.id}" — ` +
          "falling back to a placeholder tone. This is expected until real audio is recorded " +
          "(see packages/content/assets/README.md).",
        cause,
      );
      this.playFallbackTone(item.id);
    }
  }

  private playRealClip(audioUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = new Audio(audioUrl);
      audio.addEventListener("canplaythrough", () => resolve(), { once: true });
      audio.addEventListener("error", () => reject(new Error(`audio failed to load: ${audioUrl}`)), {
        once: true,
      });
      audio.play().catch(reject);
    });
  }

  private playFallbackTone(seed: string): void {
    const ctx = this.getContext();
    // Vary pitch a little by id so different words don't sound identical —
    // not meaningful phonetic feedback, just enough to avoid a single flat beep.
    const hash = Array.from(seed).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const frequency = 320 + (hash % 6) * 45;

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.3);
  }

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }
}

export const pronunciationAudioProvider = new PronunciationAudioProvider();
