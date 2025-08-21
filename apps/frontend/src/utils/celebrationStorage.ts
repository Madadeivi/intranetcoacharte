const CELEBRATION_PREFIX = 'coacharte_celebration_';

export interface CelebrationSession {
  userId: string;
  date: string;
  events: {
    birthday?: boolean;
    anniversary?: boolean;
    importantAnniversary?: boolean;
  };
}

function getCelebrationKey(userId: string): string {
  const today = new Date().toISOString().split('T')[0];
  return `${CELEBRATION_PREFIX}${userId}_${today}`;
}

export function getCelebrationSession(userId: string): CelebrationSession | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const key = getCelebrationKey(userId);
    const stored = localStorage.getItem(key);
    
    if (!stored) return null;
    
    const session: CelebrationSession = JSON.parse(stored);
    
    const today = new Date().toISOString().split('T')[0];
    if (session.date !== today) {
      localStorage.removeItem(key);
      return null;
    }
    
    return session;
  } catch (error) {
    console.warn('Error al leer celebración del localStorage:', error);
    return null;
  }
}

export function markCelebrationShown(userId: string, eventType: 'birthday' | 'anniversary' | 'importantAnniversary'): void {
  if (typeof window === 'undefined') return;
  
  try {
    const key = getCelebrationKey(userId);
    const today = new Date().toISOString().split('T')[0];
    
    const session = getCelebrationSession(userId) || {
      userId,
      date: today,
      events: {}
    };
    
    session.events[eventType] = true;
    localStorage.setItem(key, JSON.stringify(session));
  } catch (error) {
    console.warn('Error al guardar celebración en localStorage:', error);
  }
}

export function wasCelebrationShown(userId: string, eventType: 'birthday' | 'anniversary' | 'importantAnniversary'): boolean {
  const session = getCelebrationSession(userId);
  return session?.events[eventType] === true;
}

export function clearAllCelebrations(): void {
  if (typeof window === 'undefined') return;
  
  try {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CELEBRATION_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.warn('Error al limpiar celebraciones del localStorage:', error);
  }
}

export function cleanupOldCelebrations(): void {
  if (typeof window === 'undefined') return;
  
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);
    const cutoffString = cutoffDate.toISOString().split('T')[0];
    
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CELEBRATION_PREFIX)) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const session: CelebrationSession = JSON.parse(stored);
            if (session.date < cutoffString) {
              keysToRemove.push(key);
            }
          }
        } catch {
          keysToRemove.push(key);
        }
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.warn('Error al limpiar celebraciones antiguas:', error);
  }
}

export function initializeCelebrationSession(): void {
  cleanupOldCelebrations();
}
