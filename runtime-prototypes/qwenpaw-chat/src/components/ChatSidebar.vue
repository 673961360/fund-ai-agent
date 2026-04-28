<script setup lang="ts">
import { ref, watch } from 'vue';
import type { RuntimeConfigFormState } from '@/types/chat-ui';
import { DEFAULT_CHAT_NAME } from '@proto-shared/qwenpaw-client';
import type { ChatSpec, QwenPawAgentSummary, QwenPawConnectionMode } from '@proto-shared/types';

interface Props {
  agents: QwenPawAgentSummary[];
  selectedAgentId: string | null;
  areAgentsLoading: boolean;
  isSending: boolean;
  requiresLogin: boolean;
  hasUsers: boolean;
  isSubmitting: boolean;
  username: string;
  password: string;
  configExpanded: boolean;
  configBusy: boolean;
  configDirty: boolean;
  runtimeConfig: RuntimeConfigFormState;
  requestEntry: string;
  proxyTarget: string;
  connectionMode: QwenPawConnectionMode;
  apiBaseUrlErrorMessage: string;
  configFeedbackMessage: string;
  chatList: ChatSpec[];
  activeChatId: string | null;
  isLoadingChats: boolean;
  isLoadingHistory: boolean;
  deletingChatId: string | null;
  renamingChatId: string | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'select-agent': [agentId: string];
  'new-chat': [];
  'open-chat': [chatId: string];
  'delete-chat': [chatId: string];
  'rename-chat': [chatId: string, name: string];
  login: [];
  'toggle-config': [];
  'update:username': [value: string];
  'update:password': [value: string];
  'update:apiBaseUrl': [value: string];
  'update:channel': [value: string];
  'update:model': [value: string];
  'update:userId': [value: string];
  'save-config': [];
  'reset-config': [];
}>();

const editingChatId = ref<string | null>(null);
const editingName = ref('');

watch(
  () => props.chatList,
  (chatList) => {
    if (!editingChatId.value) {
      return;
    }

    const editingChat = chatList.find((chat) => chat.id === editingChatId.value);
    if (!editingChat) {
      cancelRename();
      return;
    }

    if (!props.renamingChatId && normalizeChatName(editingChat.name) === editingName.value.trim()) {
      cancelRename();
    }
  },
  { deep: true },
);

function handleAgentChange(event: Event): void {
  const target = event.target as HTMLSelectElement;
  if (!target.value) {
    return;
  }

  emit('select-agent', target.value);
}

function updateUsername(event: Event): void {
  emit('update:username', (event.target as HTMLInputElement).value);
}

function updatePassword(event: Event): void {
  emit('update:password', (event.target as HTMLInputElement).value);
}

function updateApiBaseUrl(event: Event): void {
  emit('update:apiBaseUrl', (event.target as HTMLInputElement).value);
}

function updateChannel(event: Event): void {
  emit('update:channel', (event.target as HTMLInputElement).value);
}

function updateModel(event: Event): void {
  emit('update:model', (event.target as HTMLInputElement).value);
}

function updateUserId(event: Event): void {
  emit('update:userId', (event.target as HTMLInputElement).value);
}

function updateEditingName(event: Event): void {
  editingName.value = (event.target as HTMLInputElement).value;
}

function formatChatTime(value: string): string {
  const date = new Date(value);
  return date.toLocaleString([], {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function normalizeChatName(value: string | null | undefined): string {
  const normalizedValue = value?.trim();
  return normalizedValue || DEFAULT_CHAT_NAME;
}

function startRename(chat: ChatSpec): void {
  if (isHistoryActionDisabled(chat.id)) {
    return;
  }

  editingChatId.value = chat.id;
  editingName.value = normalizeChatName(chat.name);
}

function cancelRename(): void {
  editingChatId.value = null;
  editingName.value = '';
}

function submitRename(chat: ChatSpec): void {
  const nextName = editingName.value.trim();
  if (!nextName) {
    editingName.value = normalizeChatName(chat.name);
    return;
  }

  if (nextName === normalizeChatName(chat.name)) {
    cancelRename();
    return;
  }

  emit('rename-chat', chat.id, nextName);
}

function isHistoryActionDisabled(chatId: string): boolean {
  return Boolean(
    props.isSending ||
      props.isLoadingHistory ||
      props.deletingChatId === chatId ||
      props.renamingChatId === chatId,
  );
}
</script>

<template>
  <aside class="chat-sidebar" aria-label="聊天控制面板">
    <div class="chat-sidebar__block">
      <label class="chat-sidebar__label" for="agent-select">当前 Agent</label>
      <select
        id="agent-select"
        class="chat-sidebar__control"
        :disabled="props.areAgentsLoading || props.isSending || props.agents.length === 0"
        :value="props.selectedAgentId || ''"
        @change="handleAgentChange"
      >
        <option value="" disabled>{{ props.areAgentsLoading ? '加载中...' : '请选择' }}</option>
        <option v-for="agent in props.agents" :key="agent.id" :value="agent.id" :disabled="!agent.enabled">
          {{ agent.name }}{{ agent.enabled ? '' : '（已禁用）' }}
        </option>
      </select>
    </div>

    <div class="chat-sidebar__block">
      <button
        class="secondary-button secondary-button--accent chat-sidebar__wide-button"
        type="button"
        :disabled="props.isSending || !props.selectedAgentId"
        @click="emit('new-chat')"
      >
        新建聊天
      </button>
    </div>

    <div class="chat-sidebar__history">
      <div class="chat-sidebar__history-header">
        <span class="chat-sidebar__label">历史聊天</span>
        <span v-if="props.isLoadingChats" class="chat-sidebar__muted">加载中...</span>
      </div>

      <div v-if="props.chatList.length === 0" class="chat-sidebar__history-empty">
        <p>{{ props.selectedAgentId ? '暂无历史聊天' : '先选择 Agent' }}</p>
        <span>刷新后会自动恢复上次打开的会话。</span>
      </div>

      <ul v-else class="chat-sidebar__history-list">
        <li v-for="chat in props.chatList" :key="chat.id" class="chat-sidebar__history-item">
          <template v-if="editingChatId === chat.id">
            <div
              class="chat-sidebar__history-card chat-sidebar__history-card--editing"
              :class="{ 'chat-sidebar__history-card--active': chat.id === props.activeChatId }"
            >
              <input
                class="chat-sidebar__history-input"
                type="text"
                :value="editingName"
                maxlength="80"
                :disabled="props.renamingChatId === chat.id"
                @input="updateEditingName"
                @keydown.esc.prevent="cancelRename"
                @keyup.enter.prevent="submitRename(chat)"
              />
              <span class="chat-sidebar__history-meta">
                <span>{{ formatChatTime(chat.updated_at) }}</span>
                <span v-if="chat.status === 'running'" class="chat-sidebar__history-status">运行中</span>
              </span>
            </div>

            <div class="chat-sidebar__history-actions">
              <button
                class="chat-sidebar__history-action chat-sidebar__history-action--primary"
                type="button"
                :disabled="props.renamingChatId === chat.id"
                @click="submitRename(chat)"
              >
                {{ props.renamingChatId === chat.id ? '保存中' : '保存' }}
              </button>
              <button
                class="chat-sidebar__history-action"
                type="button"
                :disabled="props.renamingChatId === chat.id"
                @click="cancelRename"
              >
                取消
              </button>
            </div>
          </template>

          <template v-else>
            <button
              class="chat-sidebar__history-card"
              :class="{ 'chat-sidebar__history-card--active': chat.id === props.activeChatId }"
              type="button"
              :disabled="props.isLoadingHistory || props.deletingChatId === chat.id"
              @click="emit('open-chat', chat.id)"
            >
              <span class="chat-sidebar__history-title">{{ normalizeChatName(chat.name) }}</span>
              <span class="chat-sidebar__history-meta">
                <span>{{ formatChatTime(chat.updated_at) }}</span>
                <span v-if="chat.status === 'running'" class="chat-sidebar__history-status">运行中</span>
              </span>
            </button>

            <div class="chat-sidebar__history-actions">
              <button
                class="chat-sidebar__history-action"
                type="button"
                :disabled="isHistoryActionDisabled(chat.id)"
                @click="startRename(chat)"
              >
                改名
              </button>
              <button
                class="chat-sidebar__history-action chat-sidebar__history-action--danger"
                type="button"
                :disabled="props.isSending || props.deletingChatId === chat.id"
                @click="emit('delete-chat', chat.id)"
              >
                {{ props.deletingChatId === chat.id ? '删除中' : '删除' }}
              </button>
            </div>
          </template>
        </li>
      </ul>

      <p class="chat-sidebar__history-note">删除只会移除聊天条目，不承诺清除底层 JSONSession 状态。</p>
    </div>

    <div v-if="props.requiresLogin" class="chat-sidebar__auth">
      <span class="chat-sidebar__section-tag">需要登录</span>
      <input
        class="chat-sidebar__control"
        type="text"
        autocomplete="username"
        :value="props.username"
        placeholder="用户名"
        @input="updateUsername"
      />
      <input
        class="chat-sidebar__control"
        type="password"
        autocomplete="current-password"
        :value="props.password"
        placeholder="密码"
        @input="updatePassword"
        @keyup.enter="emit('login')"
      />
      <p v-if="!props.hasUsers" class="chat-sidebar__note">未检测到已注册账号。</p>
      <button
        class="secondary-button secondary-button--accent chat-sidebar__auth-submit"
        type="button"
        :disabled="props.isSubmitting || !props.username || !props.password"
        @click="emit('login')"
      >
        {{ props.isSubmitting ? '登录中' : '登录' }}
      </button>
    </div>

    <div class="chat-sidebar__config">
      <button
        class="chat-sidebar__toggle"
        type="button"
        :aria-expanded="props.configExpanded"
        @click="emit('toggle-config')"
      >
        <span>运行时配置</span>
        <span>{{ props.configExpanded ? '收起' : '展开' }}</span>
      </button>

      <div v-if="props.configExpanded" class="chat-sidebar__config-body">
        <div class="chat-sidebar__connection">
          <p class="chat-sidebar__note">以下为当前已生效连接信息</p>
          <dl class="chat-sidebar__connection-list">
            <div class="chat-sidebar__connection-row">
              <dt>当前请求入口</dt>
              <dd :title="props.requestEntry">{{ props.requestEntry }}</dd>
            </div>
            <div class="chat-sidebar__connection-row">
              <dt>代理目标地址</dt>
              <dd :title="props.proxyTarget">{{ props.proxyTarget }}</dd>
            </div>
          </dl>
        </div>

        <input
          class="chat-sidebar__control"
          :class="{ 'chat-sidebar__control--invalid': Boolean(props.apiBaseUrlErrorMessage) }"
          type="text"
          autocomplete="url"
          :value="props.runtimeConfig.apiBaseUrl"
          placeholder="API 地址"
          @input="updateApiBaseUrl"
        />
        <p v-if="props.apiBaseUrlErrorMessage" class="chat-sidebar__feedback chat-sidebar__feedback--error">
          {{ props.apiBaseUrlErrorMessage }}
        </p>

        <div class="chat-sidebar__config-grid">
          <input
            class="chat-sidebar__control"
            type="text"
            autocomplete="off"
            :value="props.runtimeConfig.channel"
            placeholder="Channel"
            @input="updateChannel"
          />
          <input
            class="chat-sidebar__control"
            type="text"
            autocomplete="off"
            :value="props.runtimeConfig.userId"
            placeholder="User ID"
            @input="updateUserId"
          />
        </div>

        <input
          class="chat-sidebar__control"
          type="text"
          autocomplete="off"
          :value="props.runtimeConfig.model"
          placeholder="模型（可选）"
          @input="updateModel"
        />

        <p v-if="props.configFeedbackMessage" class="chat-sidebar__feedback">
          {{ props.configFeedbackMessage }}
        </p>

        <div class="chat-sidebar__config-actions">
          <button
            class="secondary-button secondary-button--accent"
            type="button"
            :disabled="props.configBusy || !props.configDirty"
            @click="emit('save-config')"
          >
            保存
          </button>
          <button
            class="secondary-button"
            type="button"
            :disabled="props.configBusy"
            @click="emit('reset-config')"
          >
            重置
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>
