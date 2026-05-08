import { ref, computed } from 'vue';
import {
  getHermesConfig,
  getHermesConfigForm,
  getHermesTarget,
  saveHermesConfig,
  checkHealth,
} from './hermes-client';
import type { HermesConfigFormState } from '@/types/hermes';

export function useHermesConfig() {
  const form = ref<HermesConfigFormState>({ ...getHermesConfigForm() });
  const savedForm = ref<HermesConfigFormState>({ ...form.value });
  const isConfigExpanded = ref(false);
  const isCheckingHealth = ref(false);

  const connectionStatus = ref<'unknown' | 'connected' | 'error'>('unknown');
  const connectionError = ref('');
  const feedbackMessage = ref('');
  const feedbackIsError = ref(false);

  const isDirty = computed(() => {
    return form.value.proxyPrefix !== savedForm.value.proxyPrefix
      || form.value.apiKey !== savedForm.value.apiKey;
  });

  const config = computed(() => getHermesConfig());

  const proxyTarget = computed(() => getHermesTarget() || '未暴露');

  const requestEntry = computed(() => {
    const prefix = form.value.proxyPrefix || '/hermes-api';
    return `${window.location.origin}${prefix}`;
  });

  function toggleConfig(): void {
    isConfigExpanded.value = !isConfigExpanded.value;
  }

  function updateField<K extends keyof HermesConfigFormState>(
    field: K,
    value: HermesConfigFormState[K],
  ): void {
    form.value[field] = value;
  }

  async function handleSave(): Promise<void> {
    saveHermesConfig(form.value);
    savedForm.value = { ...form.value };
    feedbackMessage.value = '配置已保存';
    feedbackIsError.value = false;

    // 保存后自动验证连接
    await handleCheckHealth();
  }

  function handleReset(): void {
    form.value = { ...savedForm.value };
    feedbackMessage.value = '';
  }

  async function handleCheckHealth(): Promise<void> {
    isCheckingHealth.value = true;
    connectionError.value = '';
    feedbackMessage.value = '';

    try {
      const result = await checkHealth(form.value.proxyPrefix);
      if (result.status === 'ok') {
        connectionStatus.value = 'connected';
        feedbackMessage.value = '连接成功';
        feedbackIsError.value = false;
      } else {
        connectionStatus.value = 'error';
        feedbackMessage.value = `Health check returned: ${result.status}`;
        feedbackIsError.value = true;
      }
    } catch (error) {
      connectionStatus.value = 'error';
      connectionError.value = error instanceof Error ? error.message : '连接失败';
      feedbackMessage.value = '无法连接到 Hermes';
      feedbackIsError.value = true;
    } finally {
      isCheckingHealth.value = false;
    }
  }

  return {
    form,
    config,
    proxyTarget,
    requestEntry,
    isConfigExpanded,
    isDirty,
    isCheckingHealth,
    connectionStatus,
    connectionError,
    feedbackMessage,
    feedbackIsError,
    toggleConfig,
    updateField,
    handleSave,
    handleReset,
    handleCheckHealth,
  };
}
