// Local-storage persistence for stage unlocks and best scores. Every call survives a blocked storage.
const KEY_UNLOCKED = 'keynote-unlocked';
const KEY_BEST = 'keynote-best-';
export function loadUnlocked() { try { return Math.max(1, Number(localStorage.getItem(KEY_UNLOCKED)) || 1); } catch { return 1; } }
export function saveUnlocked(count) { try { localStorage.setItem(KEY_UNLOCKED, String(count)); } catch { /* play continues without persistence */ } }
export function loadBest(stageId) { try { return Number(localStorage.getItem(KEY_BEST + stageId)) || 0; } catch { return 0; } }
export function saveBest(stageId, score) { try { const best = Math.max(score, loadBest(stageId)); localStorage.setItem(KEY_BEST + stageId, String(best)); return best; } catch { return score; } }
export function resetProgress() { try { localStorage.removeItem(KEY_UNLOCKED); } catch { /* ignore */ } }
