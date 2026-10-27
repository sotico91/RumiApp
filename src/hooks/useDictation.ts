import { useCallback, useEffect, useRef, useState } from 'react';

import { useLanguage } from '@/src/i18n/LanguageContext';
import { bestDictation, type DictatedMovement, type DictationOptions } from '@/src/utils/dictation';
import { listenOptions, pickLocale, speechAvailable, speechModule, type SpeechEvents } from '@/src/utils/speech';

export type DictationPhase = 'idle' | 'starting' | 'listening' | 'denied' | 'notHeard' | 'failed';

type Heard = { text: string; movement: DictatedMovement };

/**
 * A phone can say it recognizes on-device and still fail at once (language
 * not downloaded). After that, this app session listens with the system
 * recognizer straight away.
 */
let onDeviceFailed = false;
/** A take that ends this soon with nothing heard did not really start. */
const QUICK_FAIL_MS = 2500;

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
  const take = useRef<{ lang: string; onDevice: boolean; startedAt: number } | null>(null);
  // The failed take's own "end" arrives after the retry starts: skip it.
  const retrying = useRef(false);

  /** On-device failed right away: listen again with the system recognizer. */
  const retryOnNetwork = useCallback((): boolean => {
    const mod = speechModule();
    const current = take.current;
    if (!mod || !current?.onDevice || lastAlternatives.current.length) return false;
    if (Date.now() - current.startedAt > QUICK_FAIL_MS) return false;
    onDeviceFailed = true;
    retrying.current = true;
    take.current = { lang: current.lang, onDevice: false, startedAt: Date.now() };
    try {
      mod.start(listenOptions(current.lang, false, latest.current.vocabulary));
      return true;
    } catch {
      retrying.current = false;
      return false;
    }
  }, []);

  const deliver = useCallback((alternatives: { transcript: string; confidence?: number }[]) => {
    if (delivered.current) return;
    const { onHeard, vocabulary: _v, ...parseOptions } = latest.current;
    const best = bestDictation(alternatives, { ...parseOptions, now: new Date() });
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
        if (active.current) setPhase('listening');
      }),
      mod.addListener('result', (ev: SpeechEvents['result']) => {
        if (!active.current) return;
        const alternatives = ev.results.map((r) => ({ transcript: r.transcript, confidence: r.confidence }));
        lastAlternatives.current = alternatives;
        setTranscript(alternatives[0]?.transcript ?? '');
        if (ev.isFinal) deliver(alternatives);
      }),
      mod.addListener('volumechange', (ev: SpeechEvents['volumechange']) => {
        // -2..10 from the recognizer; below 0 is silence.
        setLevel(Math.max(0, Math.min(1, ev.value / 10)));
      }),
      mod.addListener('error', (ev: SpeechEvents['error']) => {
        if (!active.current || ev.error === 'aborted') return;
        if (ev.error !== 'not-allowed' && ev.error !== 'service-not-allowed' && retryOnNetwork()) return;
        active.current = false;
        setLevel(0);
        if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') setPhase('denied');
        else if (ev.error === 'no-speech' || ev.error === 'speech-timeout') setPhase('notHeard');
        else if (lastAlternatives.current.length) {
          deliver(lastAlternatives.current);
          setPhase(delivered.current ? 'idle' : 'notHeard');
        } else setPhase('failed');
      }),
      mod.addListener('end', () => {
        if (!active.current || retrying.current) return;
        if (!delivered.current && retryOnNetwork()) return;
        active.current = false;
        setLevel(0);
        // Stopped by hand before a final result: use what was heard so far.
        if (!delivered.current) deliver(lastAlternatives.current);
        setPhase(delivered.current ? 'idle' : 'notHeard');
      }),
    ];
    return () => {
      subs.forEach((s) => s.remove());
      if (active.current) mod.abort();
      active.current = false;
    };
  }, [deliver, retryOnNetwork]);

  const start = useCallback(async () => {
    const mod = speechModule();
    if (!mod || active.current) return;
    setPhase('starting');
    setTranscript('');
    setLevel(0);
    lastAlternatives.current = [];
    delivered.current = false;
    try {
      const perm = await mod.requestPermissionsAsync();
      if (!perm.granted) {
        setPhase('denied');
        return;
      }
      const picked = await pickLocale(mod, language);
      const onDevice = picked.onDevice && !onDeviceFailed;
      take.current = { lang: picked.lang, onDevice, startedAt: Date.now() };
      retrying.current = false;
      active.current = true;
      mod.start(listenOptions(picked.lang, onDevice, latest.current.vocabulary));
    } catch {
      active.current = false;
      setPhase('failed');
    }
  }, [language]);

  /** Done talking: finish with what was heard. */
  const stop = useCallback(() => {
    const mod = speechModule();
    if (mod && active.current) mod.stop();
  }, []);

  /** Close without using anything. */
  const cancel = useCallback(() => {
    const mod = speechModule();
    active.current = false;
    delivered.current = true;
    if (mod) mod.abort();
    setPhase('idle');
    setLevel(0);
    setTranscript('');
  }, []);

  const dismiss = useCallback(() => setPhase('idle'), []);

  return { available, phase, transcript, level, start, stop, cancel, dismiss };
}
