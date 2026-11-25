import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { useLanguage } from '@/src/i18n/LanguageContext';
import {
  bestDictation,
  NEAR_MIN_PEAK,
  NEAR_RATIO,
  nearAlternatives,
  type DictatedMovement,
  type DictationOptions,
} from '@/src/utils/dictation';
import { listenOptions, pickLocale, speechAvailable, speechModule, type SpeechEvents } from '@/src/utils/speech';

export type DictationPhase = 'idle' | 'starting' | 'listening' | 'denied' | 'notHeard' | 'failed';

type Heard = { text: string; movement: DictatedMovement };

/**
 * Ways to listen, best first. A phone can say it recognizes on-device and
 * still fail at once (language not downloaded), and some audio hardware
 * refuses voice processing. A way that fails right away is skipped for the
 * rest of the app session.
 *
 * On Android voice processing does not apply, so the last way asks Google's
 * recognizer by name: some tablets (Samsung, Lenovo) default to a recognizer
 * that opens and closes at once without hearing anything.
 */
type Rung = 'device' | 'system' | 'plain';
const GOOGLE_RECOGNIZER = 'com.google.android.googlequicksearchbox';
const RUNGS: Record<Rung, { onDevice: boolean; voiceProcessing: boolean; service?: string }> = {
  device: { onDevice: true, voiceProcessing: true },
  system: { onDevice: false, voiceProcessing: true },
  plain: {
    onDevice: false,
    voiceProcessing: false,
    service: Platform.OS === 'android' ? GOOGLE_RECOGNIZER : undefined,
  },
};
const failedRungs = new Set<Rung>();
/** A take that ends this soon with nothing heard did not really start. */
const QUICK_FAIL_MS = 2500;
const RETRY_DELAY_MS = 400;
/**
 * A TV or radio never goes quiet, so the recognizer's own end-of-speech never
 * comes. Once what was said close to the phone reads as a movement (amount and
 * description), the take ends this long after the person's last word…
 */
const SETTLE_MS = 1300;
/** …and no take runs longer than this. */
const MAX_TAKE_MS = 8000;

/**
 * Listen once and read the sentence as a movement. `onHeard` gets the guess
 * that makes most sense (see bestDictation); nothing is saved here.
 */
export function useDictation(
  options: DictationOptions & { vocabulary: string[]; onHeard: (heard: Heard) => void }
) {
  const { language } = useLanguage();
  const [phase, setPhase] = useState<DictationPhase>('idle');
  const [transcript, setTranscript] = useState('');
  /** 0..1, how loud the voice is right now. */
  const [level, setLevel] = useState(0);
  const available = useRef(speechAvailable()).current;

  // Latest values for the native listeners, which are attached once.
  const latest = useRef(options);
  latest.current = options;
  const lastAlternatives = useRef<{ transcript: string; confidence?: number }[]>([]);
  const delivered = useRef(false);
  const active = useRef(false);
  const take = useRef<{ lang: string; rungs: Rung[]; startedAt: number } | null>(null);
  // The failed take's own "end" arrives after the retry starts: skip it.
  const retrying = useRef(false);
  // Volume gate: how loud the mic was while each word of the first guess came in.
  const wordLevels = useRef<number[]>([]);
  const prevWords = useRef<string[]>([]);
  const segmentPeak = useRef(-2);
  const takePeak = useRef(-2);
  const lastRaw = useRef(-2);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
    if (maxTimer.current) clearTimeout(maxTimer.current);
    settleTimer.current = null;
    maxTimer.current = null;
  }, []);

  /** Ends the take with what was heard (same as the person tapping stop). */
  const finishTake = useCallback(() => {
    clearTimers();
    const mod = speechModule();
    if (mod && active.current) mod.stop();
  }, [clearTimers]);

  /** Tags the words of the newest first guess with the loudness they came in at. */
  const trackLevels = useCallback((top: string) => {
    const words = top.trim() ? top.trim().split(/\s+/) : [];
    const prev = prevWords.current;
    let same = 0;
    while (same < words.length && same < prev.length && words[same] === prev[same]) same++;
    const seg = segmentPeak.current;
    const levels = wordLevels.current.slice(0, same);
    for (let i = same; i < words.length; i++) levels.push(Math.max(seg, wordLevels.current[i] ?? -2));
    wordLevels.current = levels;
    prevWords.current = words;
    // The next words start at whatever the mic hears now.
    segmentPeak.current = lastRaw.current;
    return seg;
  }, []);

  const listen = useCallback((lang: string, rung: Rung) => {
    const mod = speechModule();
    if (!mod) return;
    const { onDevice, voiceProcessing, service } = RUNGS[rung];
    mod.start(listenOptions(lang, onDevice, latest.current.vocabulary, voiceProcessing, service));
  }, []);

  /** The take failed before hearing anything: try the next way to listen. */
  const retryNextRung = useCallback((): boolean => {
    const current = take.current;
    if (!current || lastAlternatives.current.length) return false;
    if (Date.now() - current.startedAt > QUICK_FAIL_MS) return false;
    const [failed, ...rest] = current.rungs;
    if (failed) failedRungs.add(failed);
    if (!rest.length) return false;
    retrying.current = true;
    take.current = { lang: current.lang, rungs: rest, startedAt: Date.now() };
    // Let the native side finish closing the failed take; starting again in
    // the same tick gets the new one torn down with it.
    setTimeout(() => {
      if (!active.current || take.current?.rungs[0] !== rest[0]) return;
      try {
        if (take.current) take.current.startedAt = Date.now();
        listen(current.lang, rest[0]);
      } catch {
        retrying.current = false;
        active.current = false;
        setPhase('failed');
      }
    }, RETRY_DELAY_MS);
    return true;
  }, [listen]);

  const deliver = useCallback((alternatives: { transcript: string; confidence?: number }[]) => {
    if (delivered.current) return;
    const { onHeard, vocabulary: _v, ...parseOptions } = latest.current;
    const near = nearAlternatives(alternatives, wordLevels.current);
    const best = bestDictation(near.length ? near : alternatives, { ...parseOptions, now: new Date() });
    if (!best) return;
    delivered.current = true;
    onHeard(best);
  }, []);

  useEffect(() => {
    const mod = speechModule();
    if (!mod) return;
    const subs = [
      mod.addListener('start', () => {
        retrying.current = false;
        if (!active.current) return;
        setPhase('listening');
        if (maxTimer.current) clearTimeout(maxTimer.current);
        maxTimer.current = setTimeout(finishTake, MAX_TAKE_MS);
      }),
      mod.addListener('result', (ev: SpeechEvents['result']) => {
        if (!active.current) return;
        const alternatives = ev.results.map((r) => ({ transcript: r.transcript, confidence: r.confidence }));
        lastAlternatives.current = alternatives;
        const seg = trackLevels(alternatives[0]?.transcript ?? '');
        setTranscript(alternatives[0]?.transcript ?? '');
        if (ev.isFinal) {
          clearTimers();
          deliver(alternatives);
          return;
        }
        // Only words said close to the phone keep the take open.
        if (takePeak.current >= NEAR_MIN_PEAK && seg < takePeak.current * NEAR_RATIO) return;
        const { onHeard: _o, vocabulary: _v, ...parseOptions } = latest.current;
        const near = nearAlternatives(alternatives, wordLevels.current);
        const best = bestDictation(near.length ? near : alternatives, { ...parseOptions, now: new Date() });
        if (best && best.movement.amount !== null && best.movement.note) {
          if (settleTimer.current) clearTimeout(settleTimer.current);
          settleTimer.current = setTimeout(finishTake, SETTLE_MS);
        }
      }),
      mod.addListener('volumechange', (ev: SpeechEvents['volumechange']) => {
        // -2..10 from the recognizer; below 0 is silence.
        lastRaw.current = ev.value;
        segmentPeak.current = Math.max(segmentPeak.current, ev.value);
        takePeak.current = Math.max(takePeak.current, ev.value);
        setLevel(Math.max(0, Math.min(1, ev.value / 10)));
      }),
      mod.addListener('error', (ev: SpeechEvents['error']) => {
        if (!active.current || ev.error === 'aborted') return;
        // Permissions were checked before starting: a "not-allowed" here is the
        // module reporting any failure to start (audio engine, recognizer).
        // A "no-speech" within a moment of starting (no mic level yet) also
        // means the recognizer never listened: some tablets report it that way.
        const silent = ev.error === 'no-speech' || ev.error === 'speech-timeout';
        if ((!silent || takePeak.current <= 0) && retryNextRung()) return;
        clearTimers();
        active.current = false;
        setLevel(0);
        if (ev.error === 'no-speech' || ev.error === 'speech-timeout') setPhase('notHeard');
        else if (lastAlternatives.current.length) {
          deliver(lastAlternatives.current);
          setPhase(delivered.current ? 'idle' : 'notHeard');
        } else setPhase('failed');
      }),
      mod.addListener('end', () => {
        if (!active.current || retrying.current) return;
        if (!delivered.current && retryNextRung()) return;
        clearTimers();
        active.current = false;
        setLevel(0);
        // Stopped by hand before a final result: use what was heard so far.
        if (!delivered.current) deliver(lastAlternatives.current);
        setPhase(delivered.current ? 'idle' : 'notHeard');
      }),
    ];
    return () => {
      subs.forEach((s) => s.remove());
      clearTimers();
      if (active.current) mod.abort();
      active.current = false;
    };
  }, [deliver, retryNextRung, trackLevels, clearTimers, finishTake]);

  const start = useCallback(async () => {
    const mod = speechModule();
    if (!mod || active.current) return;
    setPhase('starting');
    setTranscript('');
    setLevel(0);
    lastAlternatives.current = [];
    wordLevels.current = [];
    prevWords.current = [];
    segmentPeak.current = -2;
    takePeak.current = -2;
    lastRaw.current = -2;
    clearTimers();
    delivered.current = false;
    try {
      const perm = await mod.requestPermissionsAsync();
      if (!perm.granted) {
        setPhase('denied');
        return;
      }
      const picked = await pickLocale(mod, language);
      const rungs = (['device', 'system', 'plain'] as Rung[]).filter(
        (r) => !failedRungs.has(r) && (r !== 'device' || picked.onDevice)
      );
      // Every way failed before: start over from the most basic one.
      if (!rungs.length) rungs.push('plain');
      take.current = { lang: picked.lang, rungs, startedAt: Date.now() };
      retrying.current = false;
      active.current = true;
      listen(picked.lang, rungs[0]);
    } catch {
      active.current = false;
      setPhase('failed');
    }
  }, [language, listen, clearTimers]);

  /** Done talking: finish with what was heard. */
  const stop = finishTake;

  /** Close without using anything. */
  const cancel = useCallback(() => {
    const mod = speechModule();
    active.current = false;
    delivered.current = true;
    clearTimers();
    if (mod) mod.abort();
    setPhase('idle');
    setLevel(0);
    setTranscript('');
  }, [clearTimers]);

  const dismiss = useCallback(() => setPhase('idle'), []);

  return { available, phase, transcript, level, start, stop, cancel, dismiss };
}
