/**
 * FoulPlay ships as an installable PWA without a service worker.
 * Caching HTML, Clerk cookies, or /api/* gameplay responses would desync
 * votes, scores, and sessions across clients.
 */
export const PWA_SERVICE_WORKER_ENABLED = false;
