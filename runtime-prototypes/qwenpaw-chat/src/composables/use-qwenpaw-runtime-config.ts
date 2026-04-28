import { computed, reactive, ref } from 'vue';
import type { RuntimeConfigFormState } from '@/types/chat-ui';
import {
  getDefaultQwenPawClientConfig,
  getQwenPawClientConfig,
  resetStoredQwenPawClientConfig,
  setStoredQwenPawClientConfig,
  validateQwenPawApiBaseUrl,
} from '@proto-shared/qwenpaw-client';
import type { QwenPawClientConfig } from '@proto-shared/types';

export function useQwenPawRuntimeConfig(onRefresh: () => Promise<void>) {
  const runtimeConfig = ref<QwenPawClientConfig>(getQwenPawClientConfig());
  const runtimeConfigForm = reactive<RuntimeConfigFormState>(
    createRuntimeConfigForm(runtimeConfig.value),
  );
  const apiBaseUrlErrorMessage = ref('');
  const configFeedbackMessage = ref('');
  const isRuntimeConfigExpanded = ref(false);

  const isConfigDirty = computed(() => {
    const currentConfig = runtimeConfig.value;
    return (
      normalizeText(runtimeConfigForm.apiBaseUrl) !== currentConfig.apiBaseUrl ||
      normalizeText(runtimeConfigForm.channel) !== currentConfig.channel ||
      normalizeText(runtimeConfigForm.model) !== currentConfig.model ||
      normalizeText(runtimeConfigForm.userId) !== currentConfig.userId
    );
  });

  function syncRuntimeConfig(config: QwenPawClientConfig = getQwenPawClientConfig()): void {
    runtimeConfig.value = config;
    runtimeConfigForm.apiBaseUrl = config.apiBaseUrl;
    runtimeConfigForm.channel = config.channel;
    runtimeConfigForm.model = config.model;
    runtimeConfigForm.userId = config.userId;
  }

  function clearConfigMessages(): void {
    apiBaseUrlErrorMessage.value = '';
    configFeedbackMessage.value = '';
  }

  function toggleRuntimeConfig(): void {
    isRuntimeConfigExpanded.value = !isRuntimeConfigExpanded.value;
  }

  function updateRuntimeConfigField(field: keyof RuntimeConfigFormState, value: string): void {
    runtimeConfigForm[field] = value;
    apiBaseUrlErrorMessage.value = '';
    configFeedbackMessage.value = '';
  }

  async function handleSaveConfig(): Promise<void> {
    clearConfigMessages();

    const apiBaseUrl = normalizeText(runtimeConfigForm.apiBaseUrl);
    const apiBaseUrlError = validateQwenPawApiBaseUrl(apiBaseUrl);
    if (apiBaseUrlError) {
      apiBaseUrlErrorMessage.value = apiBaseUrlError;
      return;
    }

    const nextConfig = setStoredQwenPawClientConfig({
      apiBaseUrl,
      channel: normalizeText(runtimeConfigForm.channel) || runtimeConfig.value.channel,
      model: normalizeText(runtimeConfigForm.model),
      userId: normalizeText(runtimeConfigForm.userId) || runtimeConfig.value.userId,
    });

    syncRuntimeConfig(nextConfig);
    await onRefresh();
    configFeedbackMessage.value = '配置已保存并立即生效。';
  }

  async function handleResetConfig(): Promise<void> {
    clearConfigMessages();
    resetStoredQwenPawClientConfig();
    const defaultConfig = getDefaultQwenPawClientConfig();
    syncRuntimeConfig(defaultConfig);
    await onRefresh();
    configFeedbackMessage.value = '已恢复默认配置。';
  }

  return {
    runtimeConfig,
    runtimeConfigForm,
    apiBaseUrlErrorMessage,
    configFeedbackMessage,
    isRuntimeConfigExpanded,
    isConfigDirty,
    toggleRuntimeConfig,
    updateRuntimeConfigField,
    handleSaveConfig,
    handleResetConfig,
  };
}

function createRuntimeConfigForm(config: QwenPawClientConfig): RuntimeConfigFormState {
  return {
    apiBaseUrl: config.apiBaseUrl,
    channel: config.channel,
    model: config.model,
    userId: config.userId,
  };
}

function normalizeText(value: string): string {
  return value.trim();
}
