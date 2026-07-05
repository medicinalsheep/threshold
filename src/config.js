export const VERSION = '1.2.0';
export const EDITION = import.meta.env.VITE_EDITION || 'web';
export const IS_GROK_EDITION = EDITION === 'grok';
export const BASE_PATH = import.meta.env.VITE_BASE_PATH || '/';