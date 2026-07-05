import { Auth } from '../auth/main.js';

export const API_URL = import.meta.env.VITE_XAI_API_URL || 'https://api.x.ai/v1/chat/completions';
export const MODEL = import.meta.env.VITE_XAI_MODEL || 'grok-build-0.1';

export async function generateScript(systemPrompt, userIdea) {
    if (!Auth.isLoggedIn()) {
        throw new Error('Login required. Enter your xAI API key to use Grok generation.');
    }

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${Auth.apiKey}`
        },
        body: JSON.stringify({
            model: MODEL,
            messages: [
                { role: 'system', content: systemPrompt },
                {
                    role: 'user',
                    content: `Generate a complete Threshold Engine script for: "${userIdea}". Return only executable JavaScript wrapped in an IIFE starting with World.clearWorld().`
                }
            ],
            temperature: 0.4
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        if (response.status === 401) throw new Error('Invalid API key. Please log in again.');
        if (response.status === 0 || errText.includes('Failed to fetch')) {
            throw new Error('Network blocked (CORS). Use dev server or a proxy for Grok API calls.');
        }
        throw new Error(`Grok API error (${response.status}): ${errText.slice(0, 200)}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Grok returned an empty response.');
    return content.trim();
}