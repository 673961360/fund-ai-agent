<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import ChatHeader from '@/components/ChatHeader.vue';
import ChatInputBar from '@/components/ChatInputBar.vue';
import ChatMessageList from '@/components/ChatMessageList.vue';
import ChatSidebar from '@/components/ChatSidebar.vue';
import { useQwenPawAgents } from '@/composables/use-qwenpaw-agents';
import { useQwenPawAuth } from '@/composables/use-qwenpaw-auth';
import { useQwenPawChatSession } from '@/composables/use-qwenpaw-chat-session';
import { useQwenPawRuntimeConfig } from '@/composables/use-qwenpaw-runtime-config';
import { useQwenPawRuntimeContext } from '@/composables/use-qwenpaw-runtime-context';
import { getQwenPawConnectionInfo } from '@proto-shared/qwenpaw-client';
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
  activeChat,
  activeChatId,
  activeChatStatus,
  addPendingFiles,
  canRecord,
  canSubmit,
  chatList,
  createNewConversation,
  deleteChatById,
  deletingChatId,
  draft,
  errorMessage: chatErrorMessage,
  hasPendingUploadsInFlight,
  isLoadingChats,
  isLoadingHistory,
  isSending,
  messages,
  openChat,
  pendingUploads,
  recordingState,
  renameChatById,
  renamingChatId,
  removePendingUpload,
  retryPendingUpload,
  sendDraft,
  setActiveAgent,
  startRecording,
  stopRecordingCapture,
  stopStreaming,
  cancelRecording,
} = useQwenPawChatSession();

const messageListRef = ref<InstanceType<typeof ChatMessageList> | null>(null);

const loginForm = reactive({
  username: '',
  password: '',
});
const isAuthReady = computed(
  () => !authState.value.isLoading && (!authState.value.enabled || authState.value.valid),
);
const requiresLogin = computed(() => authState.value.enabled && !authState.value.valid);
const { refreshRuntimeContext } = useQwenPawRuntimeContext({
  initialize,
  isAuthReady,
  token,
  loadAgents,
  resetAgents: reset,
  selectedAgentId,
  setActiveAgent,
});
const {
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
} = useQwenPawRuntimeConfig(refreshRuntimeContext);
const isComposerDisabled = computed(
  () =>
    !isAuthReady.value ||
    areAgentsLoading.value ||
    !selectedAgentId.value ||
    isSubmitting.value ||
    isLoadingChats.value ||
    isLoadingHistory.value ||
    recordingState.value.status === 'processing',
);
const isConfigBusy = computed(
  () =>
    authState.value.isLoading || areAgentsLoading.value || isSubmitting.value || isSending.value,
);
const connectionInfo = computed(() => getQwenPawConnectionInfo(runtimeConfig.value));
const combinedErrorMessage = computed(
  () => chatErrorMessage.value ?? agentsErrorMessage.value ?? authErrorMessage.value,
);
const conversationStatusLabel = computed(() => {
  if (combinedErrorMessage.value) {
    return '异常';
  }

  if (isLoadingHistory.value || isLoadingChats.value) {
    return '加载中';
  }

  if (isSending.value || activeChatStatus.value === 'running') {
    return '生成中';
  }

  if (activeChatStatus.value === 'interrupted') {
    return '已中断';
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
  if (combinedErrorMessage.value || activeChatStatus.value === 'interrupted') {
    return 'error' as const;
  }

  if (isSending.value || isLoadingHistory.value || isLoadingChats.value) {
    return 'busy' as const;
  }

  if (requiresLogin.value) {
    return 'warning' as const;
  }

  return 'idle' as const;
});
const conversationTitle = computed(
  () => activeChat.value?.name || (selectedAgentId.value ? '新聊天' : 'QwenPaw Chat'),
);
const currentAgentName = computed(() => selectedAgent.value?.name || '未选择 Agent');
const emptyStateDescription = computed(() => {
  if (requiresLogin.value) {
    return '先登录，再开始聊天。';
  }

  if (areAgentsLoading.value || isLoadingChats.value) {
    return '正在加载 Agent 与历史聊天。';
  }

  if (isLoadingHistory.value) {
    return '正在恢复当前会话。';
  }

  if (!selectedAgentId.value) {
    return '先在右侧选择 Agent。';
  }

  return '新聊天会在首次发送后创建历史条目。';
});
const inputPlaceholder = computed(() => {
  if (requiresLogin.value) {
    return '请先登录';
  }

  if (areAgentsLoading.value || isLoadingChats.value) {
    return '正在加载 Agent 和历史聊天';
  }

  if (!selectedAgentId.value) {
    return '选择 Agent 后开始聊天';
  }

  if (recordingState.value.status === 'recording') {
    return '录音中...';
  }

  return `给 ${selectedAgent.value?.name || 'QwenPaw'} 发送消息`;
});
const inputHelperText = computed(() => {
  if (requiresLogin.value) {
    return '右侧登录后可继续';
  }

  if (hasPendingUploadsInFlight.value) {
    return '正在上传附件，请稍候。';
  }

  if (recordingState.value.status === 'recording') {
    return '点击“结束录音”后会把音频加入待发送区。';
  }

  if (recordingState.value.status === 'processing') {
    return '正在处理录音，请稍候。';
  }

  if (isSending.value) {
    return '再次点击发送按钮即可终止当前流。';
  }

  if (combinedErrorMessage.value) {
    return '上次请求失败；当前输入区已保留可重试内容。';
  }

  return 'Enter 发送，Shift + Enter 换行。';
});

function updateLoginField(field: 'username' | 'password', value: string): void {
  loginForm[field] = value;
}

async function handleSendDraft(): Promise<void> {
  messageListRef.value?.requestScrollToBottom();
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
  await refreshRuntimeContext();
}

function handleAgentSelect(agentId: string): void {
  selectAgent(agentId);
}

function handleNewConversation(): void {
  createNewConversation();
}

function handleOpenChat(chatId: string): void {
  void openChat(chatId, {
    agentId: selectedAgentId.value,
    token: token.value,
    force: true,
  });
}

function handleDeleteChat(chatId: string): void {
  void deleteChatById(chatId, {
    agentId: selectedAgentId.value,
    token: token.value,
  });
}

function handleRenameChat(chatId: string, name: string): void {
  void renameChatById(chatId, name, {
    agentId: selectedAgentId.value,
    token: token.value,
  });
}

function handleAddFiles(files: File[]): void {
  void addPendingFiles({
    agentId: selectedAgentId.value,
    token: token.value,
    files,
  });
}

function handleRetryUpload(uploadId: string): void {
  void retryPendingUpload({
    agentId: selectedAgentId.value,
    token: token.value,
    uploadId,
  });
}

function handleStartRecording(): void {
  void startRecording();
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

        <ChatMessageList
          ref="messageListRef"
          :messages="messages"
          :loading="isLoadingHistory"
          :empty-description="emptyStateDescription"
        />

        <ChatInputBar
          v-model="draft"
          :busy="isSending"
          :disabled="isComposerDisabled"
          :can-submit="canSubmit"
          :can-record="canRecord"
          :pending-uploads="pendingUploads"
          :recording-state="recordingState"
          :placeholder="inputPlaceholder"
          :helper-text="inputHelperText"
          @submit="handleSendDraft"
          @stop="handleStop"
          @add-files="handleAddFiles"
          @retry-upload="handleRetryUpload"
          @remove-upload="removePendingUpload"
          @start-recording="handleStartRecording"
          @stop-recording="stopRecordingCapture"
          @cancel-recording="cancelRecording"
        />
      </section>

      <ChatSidebar
        :agents="agents"
        :selected-agent-id="selectedAgentId"
        :are-agents-loading="areAgentsLoading"
        :is-sending="isSending"
        :requires-login="requiresLogin"
        :has-users="hasUsers"
        :is-submitting="isSubmitting"
        :username="loginForm.username"
        :password="loginForm.password"
        :config-expanded="isRuntimeConfigExpanded"
        :config-busy="isConfigBusy"
        :config-dirty="isConfigDirty"
        :runtime-config="runtimeConfigForm"
        :request-entry="connectionInfo.requestEntry"
        :proxy-target="connectionInfo.proxyTarget"
        :connection-mode="connectionInfo.mode"
        :api-base-url-error-message="apiBaseUrlErrorMessage"
        :config-feedback-message="configFeedbackMessage"
        :chat-list="chatList"
        :active-chat-id="activeChatId"
        :is-loading-chats="isLoadingChats"
        :is-loading-history="isLoadingHistory"
        :deleting-chat-id="deletingChatId"
        :renaming-chat-id="renamingChatId"
        @select-agent="handleAgentSelect"
        @new-chat="handleNewConversation"
        @open-chat="handleOpenChat"
        @delete-chat="handleDeleteChat"
        @rename-chat="handleRenameChat"
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
