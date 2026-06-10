"use client";

import { useCallback, useEffect, useState, useRef } from "react";

const STORAGE_KEY = "smartwaste_tts_muted";

/**
 * Hook untuk Text-to-Speech menggunakan Google Translate TTS dengan fallback ke Web Speech API.
 */
export function useTTS() {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isMuted, setIsMuted] = useState(true); // Default muted sampai client-side load
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Inisialisasi state mute dari localStorage
    useEffect(() => {
        const savedMute = localStorage.getItem(STORAGE_KEY);
        if (savedMute !== null) {
            setIsMuted(savedMute === "true");
        } else {
            // Default awal jika belum pernah diatur
            setIsMuted(false);
            localStorage.setItem(STORAGE_KEY, "false");
        }
    }, []);

    const toggleMute = useCallback(() => {
        setIsMuted((prev) => {
            const newState = !prev;
            localStorage.setItem(STORAGE_KEY, String(newState));
            return newState;
        });
    }, []);

    const speakViaWebSpeech = useCallback((text: string) => {
        if (typeof window === "undefined" || !window.speechSynthesis) return;
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "id-ID";
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        
        window.speechSynthesis.speak(utterance);
    }, []);

    const speak = useCallback(
        async (text: string) => {
            if (isMuted || isSpeaking) return;

            setIsSpeaking(true);

            try {
                const encoded = encodeURIComponent(text);
                const url = `https://translate.googleapis.com/translate_tts?ie=UTF-8&q=${encoded}&tl=id&client=gtx&ttsspeed=0.9`;
                
                if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current = null;
                }

                const audio = new Audio(url);
                audioRef.current = audio;

                audio.onended = () => {
                    setIsSpeaking(false);
                    audioRef.current = null;
                };

                audio.onerror = () => {
                    console.warn("⚠️ [TTS] Google TTS gagal, mencoba fallback ke Web Speech API.");
                    speakViaWebSpeech(text);
                };

                await audio.play();
            } catch (error) {
                console.warn("⚠️ [TTS] Error saat memutar audio:", error);
                // Fallback terakhir
                speakViaWebSpeech(text);
            }
        },
        [isMuted, isSpeaking, speakViaWebSpeech]
    );

    return { speak, isSpeaking, isMuted, toggleMute };
}
