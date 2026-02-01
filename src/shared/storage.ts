/**
 * Chrome Storage wrapper for extension settings
 */

import { ExtensionSettings, DEFAULT_SETTINGS, STORAGE_KEYS } from './types';

export class StorageManager {
  /**
   * Get extension settings from chrome.storage.sync
   */
  static async getSettings(): Promise<ExtensionSettings> {
    try {
      const result = await chrome.storage.sync.get(STORAGE_KEYS.SETTINGS);
      return { ...DEFAULT_SETTINGS, ...result[STORAGE_KEYS.SETTINGS] };
    } catch (error) {
      console.error('[TokenPeek] Failed to load settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * Save extension settings to chrome.storage.sync
   */
  static async saveSettings(settings: ExtensionSettings): Promise<void> {
    try {
      await chrome.storage.sync.set({ [STORAGE_KEYS.SETTINGS]: settings });
    } catch (error) {
      console.error('[TokenPeek] Failed to save settings:', error);
      throw error;
    }
  }

  /**
   * Update partial settings
   */
  static async updateSettings(
    partial: Partial<ExtensionSettings>
  ): Promise<ExtensionSettings> {
    const current = await this.getSettings();
    const updated = { ...current, ...partial };
    await this.saveSettings(updated);
    return updated;
  }

  /**
   * Reset settings to defaults
   */
  static async resetSettings(): Promise<void> {
    await this.saveSettings(DEFAULT_SETTINGS);
  }
}
