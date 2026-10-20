import { I18nManager } from 'react-native';

/**
 * Fallback for the expo-localization `forcesRTL` plugin option (ADR 003): forces RTL at runtime.
 * Returns true when the app must reload for the change to take effect.
 */
export function ensureRTL(): boolean {
  if (I18nManager.isRTL) return false;
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
  return true;
}

/** Transform for icons that imply direction (arrows, chevrons) so they flip in RTL. */
export function directionalTransform(): { scaleX: number }[] {
  return I18nManager.isRTL ? [{ scaleX: -1 }] : [];
}
