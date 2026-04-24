<script setup lang="ts">
import { computed, onMounted, reactive, watch } from 'vue';
import ChatInput from '@/components/ChatInput.vue';
import MessageList from '@/components/MessageList.vue';
import { useQwenPawAgents } from '@/composables/use-qwenpaw-agents';
import { useQwenPawAuth } from '@/composables/use-qwenpaw-auth';
import { useQwenPawChatSession } from '@/composables/use-qwenpaw-chat-session';

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
  runtimeConfig,
  sendDraft,
  setActiveAgent,
  stopStreaming,
} = useQwenPawChatSession();

const loginForm = reactive({
  username: '',
  password: '',
});

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
const combinedErrorMessage = computed(
  () => chatErrorMessage.value ?? agentsErrorMessage.value ?? authErrorMessage.value,
);
const authStatusLabel = computed(() => {
  if (authState.value.isLoading) {
    return '检查中';
  }

  if (!authState.value.enabled) {
    return '已关闭';
  }

  if (authState.value.valid) {
    return '已登录';
  }

  return '未登录';
});
const conversationStatusLabel = computed(() => {
  if (combinedErrorMessage.value) {
    return '错误';
  }

  if (isSending.value) {
    return '生成中';
  }

  return '空闲';
});
const conversationStatusTone = computed(() => {
  if (combinedErrorMessage.value) {
    return 'error';
  }

  if (isSending.value) {
    return 'busy';
  }

  return 'idle';
});
const displayConfigItems = computed(() => [
  {
    label: 'QwenPaw 地址',
    value: runtimeConfig.target,
  },
  {
    label: '当前 Agent',
    value: selectedAgent.value?.name || '未选择',
  },
  {
    label: 'Channel',
    value: runtimeConfig.channel || '未指定',
  },
  {
    label: '模型',
    value: runtimeConfig.model?.trim() || '未指定',
  },
  {
    label: '认证状态',
    value: authStatusLabel.value,
  },
]);
const bannerMessage = computed(() => {
  if (!combinedErrorMessage.value) {
    return '';
  }

  if (chatErrorMessage.value) {
    return '请查看聊天区中的错误消息。';
  }

  return combinedErrorMessage.value;
});

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

function handleAgentChange(event: Event): void {
  const target = event.target as HTMLSelectElement;
  if (!target.value) {
    return;
  }

  selectAgent(target.value);
}

onMounted(() => {
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
</script>

<template>
  <main class="chat-view">
    <section class="config-bar card-panel">
      <div
        v-for="item in displayConfigItems"
        :key="item.label"
        class="config-bar__item"
        :title="item.value"
      >
        <span class="config-bar__label">{{ item.label }}</span>
        <strong class="config-bar__value">{{ item.value }}</strong>
      </div>
    </section>

    <section v-if="combinedErrorMessage" class="error-banner">
      <strong>本次请求失败</strong>
      <p>{{ bannerMessage }}</p>
    </section>

    <section class="workspace-grid">
      <div class="conversation-column">
        <MessageList
          :messages="messages"
          :status-label="conversationStatusLabel"
          :status-tone="conversationStatusTone"
        />

        <ChatInput v-model="draft" :busy="isSending" :disabled="isChatDisabled" @submit="handleSendDraft" />
      </div>

      <aside class="workspace-grid__sidebar">
        <section class="card-panel control-panel">
          <header class="control-panel__header">
            <div>
              <h2>会话控制</h2>
              <p>切换 Agent 或控制当前会话。</p>
            </div>
          </header>

          <div class="control-panel__field">
            <label class="control-panel__label" for="agent-select">当前 Agent</label>
            <select
              id="agent-select"
              class="control-panel__select"
              :disabled="areAgentsLoading || isSending || agents.length === 0"
              :value="selectedAgentId || ''"
              @change="handleAgentChange"
            >
              <option value="" disabled>{{ areAgentsLoading ? '加载 Agent 中...' : '请选择 Agent' }}</option>
              <option v-for="agent in agents" :key="agent.id" :value="agent.id" :disabled="!agent.enabled">
                {{ agent.name }}{{ agent.enabled ? '' : '（已禁用）' }}
              </option>
            </select>
          </div>

          <div class="control-panel__actions">
            <button
              class="ghost-button ghost-button--warning"
              type="button"
              :disabled="!isSending || !selectedAgentId"
              @click="handleStop"
            >
              停止
            </button>
            <button class="ghost-button" type="button" :disabled="isSending || !hasMessages" @click="clearConversation">
              清空
            </button>
          </div>
        </section>

        <section v-if="requiresLogin" class="card-panel auth-card">
          <header class="auth-card__header">
            <div>
              <h2>需要登录</h2>
              <p>当前 QwenPaw 已开启认证，请先登录后再继续聊天。</p>
            </div>
          </header>

          <label class="auth-card__label" for="qwenpaw-username">用户名</label>
          <input
            id="qwenpaw-username"
            v-model.trim="loginForm.username"
            class="auth-card__input"
            type="text"
            autocomplete="username"
            placeholder="请输入用户名"
          />

          <label class="auth-card__label" for="qwenpaw-password">密码</label>
          <input
            id="qwenpaw-password"
            v-model="loginForm.password"
            class="auth-card__input"
            type="password"
            autocomplete="current-password"
            placeholder="请输入密码"
            @keyup.enter="handleLogin"
          />

          <p v-if="!hasUsers" class="auth-card__hint auth-card__hint--warning">
            当前服务还没有检测到已注册用户，可能需要先初始化账号。
          </p>

          <button
            class="chat-input__submit auth-card__submit"
            type="button"
            :disabled="isSubmitting || !loginForm.username || !loginForm.password"
            @click="handleLogin"
          >
            {{ isSubmitting ? '登录中...' : '登录' }}
          </button>
        </section>
      </aside>
    </section>
  </main>
</template>
