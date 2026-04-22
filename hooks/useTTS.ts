"use client";

import { useCallback, useEffect, useRef } from "react";

interface TTSOptions {
    lang?: string;
    rate?: number;
    pitch?: number;
}

/**
 * Hook untuk Text-to-Speech menggunakan Web SpeechSynthesis API.
 */
export function useTTS(options?: TTSOptions) {
    const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
    const lastSpokenRef = useRef<number>(0);
    const { lang = "id-ID", rate = 1.0, pitch = 1.0 } = options || {};

    const loadVoices = useCallback(() => {
        if (typeof window === "undefined" || !window.speechSynthesis) return;
        const voices = speechSynthesis.getVoices();
        if (voices.length === 0) return;

        // Prioritas: Suara Indonesia perempuan
        const idFemale = voices.find(
            (v) => v.lang.startsWith("id") && (v.name.toLowerCase().includes("female") || v.name.toLowerCase().includes("perempuan"))
        );
        const idAny = voices.find((v) => v.lang.startsWith("id"));
        const anyFemale = voices.find(
            (v) => v.name.toLowerCase().includes("female") || v.name.toLowerCase().includes("woman")
        );

        voiceRef.current = idFemale || idAny || anyFemale || voices[0] || null;
    }, []);

    useEffect(() => {
        if (typeof window === "undefined" || !window.speechSynthesis) return;

        loadVoices();
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = loadVoices;
        }

        return () => {
            if (speechSynthesis.onvoiceschanged !== undefined) {
                speechSynthesis.onvoiceschanged = null;
            }
        };
    }, [loadVoices]);

    const speak = useCallback(
        (text: string) => {
            if (typeof window === "undefined" || !window.speechSynthesis) return;

            // Jangan bicara jika jarak < 1 detik untuk menghindari suara tumpuk
            const now = Date.now();
            if (now - lastSpokenRef.current < 1000) return;
            lastSpokenRef.current = now;

            // Pastikan cancel dulu sebelum bicara baru
            speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = lang;
            utterance.rate = rate;
            utterance.pitch = pitch;
            utterance.volume = 1;

            if (voiceRef.current) {
                utterance.voice = voiceRef.current;
            }

            // Patch untuk browser mobile: panggil speak dalam event loop terpisah
            setTimeout(() => {
                speechSynthesis.speak(utterance);
            }, 50);
        },
        [lang, rate, pitch]
    );

    return { speak };
}
