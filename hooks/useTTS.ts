"use client";

import { useCallback, useEffect, useRef } from "react";

interface TTSOptions {
    lang?: string;
    rate?: number;
    pitch?: number;
}

/**
 * Hook untuk Text-to-Speech menggunakan Web SpeechSynthesis API.
 * Otomatis memilih suara perempuan Indonesia jika tersedia.
 */
export function useTTS(options?: TTSOptions) {
    const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
    const lastSpokenRef = useRef<number>(0);

    const { lang = "id-ID", rate = 1.0, pitch = 1.0 } = options || {};

    // Cari dan simpan suara perempuan Indonesia
    useEffect(() => {
        if (typeof window === "undefined" || !window.speechSynthesis) return;

        const loadVoices = () => {
            const voices = speechSynthesis.getVoices();
            
            // Prioritas: Suara Indonesia perempuan
            const idFemale = voices.find(
                (v) => v.lang.startsWith("id") && v.name.toLowerCase().includes("female")
            );
            // Fallback: Suara Indonesia apapun
            const idAny = voices.find((v) => v.lang.startsWith("id"));
            // Fallback: Suara perempuan bahasa apapun
            const anyFemale = voices.find(
                (v) => v.name.toLowerCase().includes("female") || v.name.toLowerCase().includes("woman")
            );

            voiceRef.current = idFemale || idAny || anyFemale || voices[0] || null;
        };

        loadVoices();
        // Beberapa browser memuat voices secara async
        speechSynthesis.onvoiceschanged = loadVoices;

        return () => {
            speechSynthesis.onvoiceschanged = null;
        };
    }, []);

    const speak = useCallback(
        (text: string) => {
            if (typeof window === "undefined" || !window.speechSynthesis) return;

            // Debounce: jangan bicara jika jarak < 1.5 detik dari ucapan sebelumnya
            const now = Date.now();
            if (now - lastSpokenRef.current < 1500) return;
            lastSpokenRef.current = now;

            // Cancel ucapan yang sedang berjalan agar tidak tumpuk
            speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = lang;
            utterance.rate = rate;
            utterance.pitch = pitch;
            utterance.volume = 1;

            if (voiceRef.current) {
                utterance.voice = voiceRef.current;
            }

            speechSynthesis.speak(utterance);
        },
        [lang, rate, pitch]
    );

    return { speak };
}
