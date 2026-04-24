<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import ChatInputBar from '@/components/ChatInputBar.vue';
import ChatMessageList from '@/components/ChatMessageList.vue';
import ChatSidebar from '@/components/ChatSidebar.vue';
import ChatHeader from '@/components/ChatHeader.vue';
import { useQwenPawAgents } from '@/composables/use-qwenpaw-agents';
import { useQwenPawAuth } from '@/composables/use-qwenpaw-auth';
import { useQwenPawChatSession } from '@/composables/use-qwenpaw-chat-session';
import type { RuntimeConfigFormState } from '@/types/chat-ui';
import {
  getDefaultQwenPawClientConfig,
  getQwenPawClientConfig,
  resetStoredQwenPawClientConfig,
  setStoredQwenPawClientConfig,
  validateQwenPawApiBaseUrl,
} from '@proto-shared/qwenpaw-client';
import type { QwenPawClientConfig } from '@proto-shared/types';

const {
  authState,
  errorMessage: authErrorMessage,
  hasUsers,
  initialize,
  isSubmitting,
  login,
  token,
} = useQwenPawAuth();
const {
  agents,
  errorMessage: agentsErrorMessage,
  isLoading: areAgentsLoading,
  loadAgents,
  reset,
  selectedAgent,
  selectedAgentId,
  selectAgent,
} = useQwenPawAgents();
const {
  clearConversation,
  draft,
  errorMessage: chatErrorMessage,
  hasMessages,
  isSending,
  messages,
  sendDraft,
  setActiveAgent,
  stopStreaming,
} = useQwenPawChatSession();

const loginForm = reactive({
  username: '',
  password: '',
});
const runtimeConfig = ref<QwenPawClientConfig>(getQwenPawClientConfig());
const runtimeConfigForm = reactive<RuntimeConfigFormState>(createRuntimeConfigForm(runtimeConfig.value));
const apiBaseUrlErrorMessage = ref('');
const configFeedbackMessage = ref('');
const isRuntimeConfigExpanded = ref(false);

const isAuthReady = computed(
  () => !authState.value.isLoading && (!authState.value.enabled || authState.value.valid),
);
const requiresLogin = computed(() => authState.value.enabled && !authState.value.valid);
const isChatDisabled = computed(
  () =>
    !isAuthReady.value ||
    areAgentsLoading.value ||
    !selectedAgentId.value ||
    isSubmitting.value ||
    isSending.value,
);
const isConfigBusy = computed(
  () => authState.value.isLoading || areAgentsLoading.value || isSubmitting.value || isSending.value,
);
const isConfigDirty = computed(() => {
  const currentConfig = runtimeConfig.value;
  return (
    normalizeText(runtimeConfigForm.apiBaseUrl) !== currentConfig.apiBaseUrl ||
    normalizeText(runtimeConfigForm.channel) !== currentConfig.channel ||
    normalizeText(runtimeConfigForm.model) !== currentConfig.model ||
    normalizeText(runtimeConfigForm.userId) !== currentConfig.userId
  );
});
const combinedErrorMessage = computed(
  () => chatErrorMessage.value ?? agentsErrorMessage.value ?? authErrorMessage.value,
);
const conversationStatusLabel = computed(() => {
  if (combinedErrorMessage.value) {
    return '异常';
  }

  if (isSending.value) {
    return '生成中';
  }

  if (requiresLogin.value) {
    return '需登录';
  }

  if (!selectedAgentId.value) {
    return '待命';
  }

  return '就绪';
});
const conversationStatusTone = computed(() => {
  if (combinedErrorMessage.value) {
    return 'error' as const;
  }

  if (isSending.value) {
    return 'busy' as const;
  }

  if (requiresLogin.value) {
    return 'warning' as const;
  }

  return 'idle' as const;
});
const conversationTitle = 'QwenPaw Chat';
const currentAgentName = computed(() => selectedAgent.value?.name || '未选择 Agent');
const emptyStateDescription = computed(() => {
  if (requiresLogin.value) {
    return '先登录，再开始聊天。';
  }

  if (areAgentsLoading.value) {
    return '正在加载 Agent。';
  }

  if (!selectedAgentId.value) {
    return '先在右侧选择 Agent。';
  }

  return '发送第一条消息。';
});
const inputPlaceholder = computed(() => {
  if (requiresLogin.value) {
    return '请先登录';
  }

  if (areAgentsLoading.value) {
    return '正在加载 Agent';
  }

  if (!selectedAgentId.value) {
    return '选择 Agent 后开始聊天';
  }

  if (isSending.value) {
    return '等待当前回复完成';
  }

  return `给 ${selectedAgent.value?.name || 'QwenPaw'} 发送消息`;
});
const inputHelperText = computed(() => {
  if (requiresLogin.value) {
    return '右侧登录后可继续';
  }

  if (areAgentsLoading.value) {
    return '加载 Agent 中';
  }

  if (!selectedAgentId.value) {
    return '先选择 Agent';
  }

  if (isSending.value) {
    return '正在生成回复';
  }

  if (combinedErrorMessage.value) {
    return '上次请求失败，可直接重试';
  }

  return 'Enter 发送，Shift + Enter 换行';
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

function updateLoginField(field: 'username' | 'password', value: string): void {
  loginForm[field] = value;
}

function updateRuntimeConfigField(field: keyof RuntimeConfigFormState, value: string): void {
  runtimeConfigForm[field] = value;
  apiBaseUrlErrorMessage.value = '';
  configFeedbackMessage.value = '';
}

async function refreshRuntimeContext(): Promise<void> {
  clearConversation();
  await initialize();
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
  await refreshRuntimeContext();
  configFeedbackMessage.value = '配置已保存并立即生效。';
}

async function handleResetConfig(): Promise<void> {
  clearConfigMessages();
  resetStoredQwenPawClientConfig();
  const defaultConfig = getDefaultQwenPawClientConfig();
  syncRuntimeConfig(defaultConfig);
  await refreshRuntimeContext();
  configFeedbackMessage.value = '已恢复默认配置。';
}

async function handleSendDraft(): Promise<void> {
  await sendDraft({
    agentId: selectedAgentId.value,
    token: token.value,
  });
}

async function handleStop(): Promise<void> {
  await stopStreaming({
    agentId: selectedAgentId.value,
    token: token.value,
  });
}

async function handleLogin(): Promise<void> {
  const username = loginForm.username.trim();
  const password = loginForm.password;
  if (!username || !password) {
    return;
  }

  const isLoggedIn = await login({
    username,
    password,
    expires_in: 604800,
  });

  if (!isLoggedIn) {
    return;
  }

  loginForm.password = '';
}

function handleAgentSelect(agentId: string): void {
  selectAgent(agentId);
}

onMounted(() => {
  syncRuntimeConfig();
  void initialize();
});

watch(
  isAuthReady,
  (ready) => {
    if (ready) {
      void loadAgents(token.value);
      return;
    }

    reset();
  },
  { immediate: true },
);

watch(
  selectedAgentId,
  (agentId) => {
    setActiveAgent(agentId);
  },
  { immediate: true },
);

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
</script>

<template>
  <main class="chat-view">
    <section class="chat-layout">
      <section class="chat-shell card-panel">
        <ChatHeader
          :title="conversationTitle"
          :agent-name="currentAgentName"
          :status-label="conversationStatusLabel"
          :status-tone="conversationStatusTone"
          :error-message="combinedErrorMessage || ''"
        />

        <ChatMessageList :messages="messages" :empty-description="emptyStateDescription" />

        <ChatInputBar
          v-model="draft"
          :busy="isSending"
          :disabled="isChatDisabled"
          :placeholder="inputPlaceholder"
          :helper-text="inputHelperText"
          @submit="handleSendDraft"
        />
      </section>

      <ChatSidebar
        :agents="agents"
        :selected-agent-id="selectedAgentId"
        :are-agents-loading="areAgentsLoading"
        :is-sending="isSending"
        :has-messages="hasMessages"
        :requires-login="requiresLogin"
        :has-users="hasUsers"
        :is-submitting="isSubmitting"
        :username="loginForm.username"
        :password="loginForm.password"
        :config-expanded="isRuntimeConfigExpanded"
        :config-busy="isConfigBusy"
        :config-dirty="isConfigDirty"
        :runtime-config="runtimeConfigForm"
        :api-base-url-error-message="apiBaseUrlErrorMessage"
        :config-feedback-message="configFeedbackMessage"
        @select-agent="handleAgentSelect"
        @stop="handleStop"
        @clear="clearConversation"
        @login="handleLogin"
        @toggle-config="toggleRuntimeConfig"
        @update:username="updateLoginField('username', $event)"
        @update:password="updateLoginField('password', $event)"
        @update:api-base-url="updateRuntimeConfigField('apiBaseUrl', $event)"
        @update:channel="updateRuntimeConfigField('channel', $event)"
        @update:model="updateRuntimeConfigField('model', $event)"
        @update:user-id="updateRuntimeConfigField('userId', $event)"
        @save-config="handleSaveConfig"
        @reset-config="handleResetConfig"
      />
    </section>
  </main>
</template>
