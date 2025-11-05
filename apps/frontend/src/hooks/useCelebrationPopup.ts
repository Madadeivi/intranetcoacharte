/**
 * HOOK PARA GESTIÓN DE POPUPS DE CELEBRACIÓN
 * ===========================================
 * 
 * Centraliza toda la lógica de verificación y mostrado de popups
 * para cumpleaños y aniversarios.
 */

import { useState, useEffect } from 'react';
import { User } from '../config/api';
import { 
  getUserSpecialEvent,
  calculateUserYearsOfService 
} from '../utils/celebrationUtils';
import { 
  wasCelebrationShown, 
  markCelebrationShown 
} from '../utils/celebrationStorage';
import { debugLog } from '../utils/logger';

export type CelebrationEventType = 'birthday' | 'anniversary';
export type CelebrationStorageType = 'birthday' | 'anniversary' | 'importantAnniversary';

export interface CelebrationPopupState {
  user: User;
  eventType: CelebrationEventType;
  storageType: CelebrationStorageType;
  yearsOfService?: number;
}

/**
 * Mapea el tipo de evento especial al tipo de storage y popup
 */
const mapEventTypes = (
  specialEvent: 'birthday' | 'anniversary' | 'important-anniversary'
): { storage: CelebrationStorageType; popup: CelebrationEventType } => {
  switch (specialEvent) {
    case 'birthday':
      return { storage: 'birthday', popup: 'birthday' };
    case 'important-anniversary':
      return { storage: 'importantAnniversary', popup: 'anniversary' };
    case 'anniversary':
      return { storage: 'anniversary', popup: 'anniversary' };
  }
};

/**
 * Obtiene los datos de celebración para un usuario
 */
const getCelebrationForUser = (user: User): CelebrationPopupState | null => {
  const specialEvent = getUserSpecialEvent(user);
  
  if (!specialEvent) {
    return null;
  }

  const { storage, popup } = mapEventTypes(specialEvent);

  // Verificar si ya se mostró hoy
  if (wasCelebrationShown(user.id, storage)) {
    debugLog(`Celebración ${storage} ya fue mostrada hoy para usuario ${user.id}`);
    return null;
  }

  return {
    user,
    eventType: popup,
    storageType: storage,
    yearsOfService: popup === 'anniversary' ? calculateUserYearsOfService(user) : undefined
  };
};

/**
 * Hook principal para gestionar popups de celebración
 */
export const useCelebrationPopup = (
  user: User | null,
  options?: {
    enabled?: boolean;
    delay?: number;
  }
) => {
  const { enabled = true, delay = 1500 } = options || {};
  
  const [popup, setPopup] = useState<CelebrationPopupState | null>(null);

  useEffect(() => {
    // Si está deshabilitado o no hay usuario, no hacer nada
    if (!enabled || !user) {
      return;
    }

    debugLog('Verificando celebraciones para usuario:', user);

    // Obtener los datos de celebración
    const celebration = getCelebrationForUser(user);

    if (!celebration) {
      debugLog('No hay celebraciones pendientes');
      return;
    }

    debugLog('Celebración encontrada:', celebration);

    // Mostrar popup después del delay
    const timer = setTimeout(() => {
      setPopup(celebration);
      markCelebrationShown(user.id, celebration.storageType);
      debugLog(`Celebración ${celebration.storageType} marcada como mostrada`);
    }, delay);

    return () => clearTimeout(timer);
  }, [user, enabled, delay]);

  const closePopup = () => {
    setPopup(null);
  };

  return {
    popup,
    closePopup,
    isShowing: popup !== null
  };
};

/**
 * Hook para obtener el tipo de celebración sin mostrar popup
 * Útil para badges o indicadores en el avatar
 */
export const useCelebrationType = (user: User | null) => {
  const [celebrationType, setCelebrationType] = useState<
    'birthday' | 'anniversary' | 'important-anniversary' | null
  >(null);

  useEffect(() => {
    if (!user) {
      setCelebrationType(null);
      return;
    }

    const specialEvent = getUserSpecialEvent(user);
    setCelebrationType(specialEvent);
  }, [user]);

  return celebrationType;
};

