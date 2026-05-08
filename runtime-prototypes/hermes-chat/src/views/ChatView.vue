<script setup lang="ts">
import { computed } from 'vue';
import ChatHeader from '@/components/ChatHeader.vue';
import ChatMessageList from '@/components/ChatMessageList.vue';
import ChatInputBar from '@/components/ChatInputBar.vue';
import ChatSidebar from '@/components/ChatSidebar.vue';
import { useHermesChatSession } from '@/composables/use-hermes-chat-session';
import { useHermesConfig } from '@/composables/use-hermes-config';

const {
  messages,
  draft,
  isSending,
  errorMessage,
  canSubmit,
  sendDraft,
  stopStreaming,
  clearConversation,
} = useHermesChatSession();

const {
  form: configForm,
  isConfigExpanded,
  isDirty: isConfigDirty,
  isCheckingHealth: isConfigBusy,
  connectionStatus,
  connectionError,
  feedbackMessage,
  feedbackIsError,
  proxyTarget,
  requestEntry,
  toggleConfig,
  updateField,
  handleSave,
  handleReset,
  handleCheckHealth: checkHealthFromConfig,
} = useHermesConfig();

const conversationStatusLabel = computed(() => {
  if (isSending.value) return '生成中';
  if (errorMessage.value) return '错误';
  return '空闲';
});

const conversationStatusTone = computed(() => {
  if (isSending.value) return 'busy' as const;
  if (errorMessage.value) return 'error' as const;
  return 'idle' as const;
});

const inputPlaceholder = '发送消息给 Hermes...';
const inputHelperText = 'Enter 发送，Shift + Enter 换行';

function handleSendDraft(): void {
  sendDraft();
}

function handleStop(): void {
  stopStreaming();
}

function handleNewChat(): void {
  clearConversation();
}

function handleUpdateProxyPrefix(value: string): void {
  updateField('proxyPrefix', value);
}

function handleUpdateApiKey(value: string): void {
  updateField('apiKey', value);
}

function handleSaveConfig(): void {
  handleSave();
}

function handleResetConfig(): void {
  handleReset();
}

function handleCheckHealth(): void {
  checkHealthFromConfig();
}
</script>

<template>
  <div class="chat-view">
    <div class="chat-layout">
      <div class="card-panel chat-shell">
        <ChatHeader
          :status-label="conversationStatusLabel"
          :status-tone="conversationStatusTone"
          :error-message="errorMessage ?? ''"
        />

        <ChatMessageList
          :messages="messages"
          :empty-title="'开始一段新对话'"
          :empty-description="'发送第一条消息给 Hermes。'"
        />

        <ChatInputBar
          v-model="draft"
          :disabled="false"
          :busy="isSending"
          :can-submit="canSubmit"
          :placeholder="inputPlaceholder"
          :helper-text="inputHelperText"
          @submit="handleSendDraft"
          @stop="handleStop"
        />
      </div>

      <ChatSidebar
        :is-sending="isSending"
        :proxy-target="proxyTarget"
        :request-entry="requestEntry"
        :config-expanded="isConfigExpanded"
        :config-busy="isConfigBusy"
        :config-dirty="isConfigDirty"
        :form="configForm"
        :connection-status="connectionStatus"
        :connection-error="connectionError"
        :feedback-message="feedbackMessage"
        :feedback-is-error="feedbackIsError"
        @new-chat="handleNewChat"
        @toggle-config="toggleConfig"
        @update:proxy-prefix="handleUpdateProxyPrefix"
        @update:api-key="handleUpdateApiKey"
        @save-config="handleSaveConfig"
        @reset-config="handleResetConfig"
        @check-health="handleCheckHealth"
      />
    </div>
  </div>
</template>
