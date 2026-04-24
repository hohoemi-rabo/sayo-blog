import { createAdminClient } from './supabase'
import type {
  IgAccountConfig,
  IgAutoGenerateConfig,
  IgCaptionConfig,
} from './types'

export interface IgSettingsMap {
  caption_config: IgCaptionConfig
  auto_generate: IgAutoGenerateConfig
  instagram_account: IgAccountConfig
}

export const DEFAULT_AUTO_GENERATE: IgAutoGenerateConfig = {
  enabled: true,
  count_on_publish: 1,
}

export async function getIgSetting<K extends keyof IgSettingsMap>(
  key: K
): Promise<IgSettingsMap[K] | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('ig_settings')
    .select('setting_value')
    .eq('setting_key', key)
    .maybeSingle()

  if (error) {
    console.error(`[ig-settings] Failed to read ${key}:`, error)
    return null
  }
  if (!data) return null
  return data.setting_value as IgSettingsMap[K]
}

export async function updateIgSetting<K extends keyof IgSettingsMap>(
  key: K,
  value: IgSettingsMap[K]
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('ig_settings')
    .upsert(
      {
        setting_key: key,
        setting_value: value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'setting_key' }
    )

  if (error) {
    console.error(`[ig-settings] Failed to write ${key}:`, error)
    throw new Error(`Failed to update setting "${key}": ${error.message}`)
  }
}

export async function getAutoGenerateConfigOrDefault(): Promise<IgAutoGenerateConfig> {
  const value = await getIgSetting('auto_generate')
  if (!value) return DEFAULT_AUTO_GENERATE
  return {
    enabled: typeof value.enabled === 'boolean' ? value.enabled : DEFAULT_AUTO_GENERATE.enabled,
    count_on_publish:
      typeof value.count_on_publish === 'number'
        ? value.count_on_publish
        : DEFAULT_AUTO_GENERATE.count_on_publish,
  }
}
