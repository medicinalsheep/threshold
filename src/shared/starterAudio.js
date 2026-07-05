/**
 * Starter audio bootstrap — staggered loop starts, guest session hydration.
 */

import { seedStarterSounds, wireStarterSounds } from './starterSfx.js';

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startAmbientStaggered() {
    wireStarterSounds();
    const Ambient = window.AmbientAudio;
    if (Ambient?.startStaggered) {
        await Ambient.startStaggered();
    } else {
        Ambient?.start?.();
    }
}

/**
 * After sounds are seeded, start ambient zones with staggered decode/playback
 * so the main thread stays responsive on first load.
 */
export async function bootstrapStarterAmbience({
    weatherDelay = 3200,
    weatherIntensity = 0.48,
} = {}) {
    await startAmbientStaggered();

    setTimeout(() => {
        window.WeatherSystem?.start?.({
            intensity: weatherIntensity,
            stagger: true,
        });
    }, weatherDelay);
}

/**
 * Idempotent — safe for solo bootstrap, engine init, and guest FULL_STATE apply.
 * @param {boolean} deferWeather — when true, caller applies network weather separately.
 */
export async function ensureStarterAudio({
    ambience = true,
    weatherDelay = 3200,
    weatherIntensity = 0.48,
    deferWeather = false,
} = {}) {
    const seed = await seedStarterSounds();

    if (ambience && !window.AmbientAudio?._active) {
        if (deferWeather) {
            await startAmbientStaggered();
        } else {
            await bootstrapStarterAmbience({ weatherDelay, weatherIntensity });
        }
    } else if (!deferWeather && ambience && window.AmbientAudio?._active && !window.WeatherSystem?._active) {
        setTimeout(() => {
            window.WeatherSystem?.start?.({ intensity: weatherIntensity, stagger: true });
        }, Math.min(weatherDelay, 1200));
    }

    return seed;
}

window.StarterAudio = {
    bootstrapStarterAmbience,
    ensureStarterAudio,
    delay,
};