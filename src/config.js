export const VERSION = '1.3.1';
export const EDITION = import.meta.env.VITE_EDITION || 'web';
export const IS_GROK_EDITION = EDITION === 'grok';
export const BASE_PATH = import.meta.env.VITE_BASE_PATH || '/';
export const APP_URL = import.meta.env.VITE_APP_URL || 'https://medicinalsheep.github.io/threshold/';
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';