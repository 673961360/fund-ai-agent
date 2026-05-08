<script setup lang="ts">
import type { HermesConfigFormState } from '@/types/hermes';

interface Props {
  isSending: boolean;
  proxyTarget: string;
  requestEntry: string;
  configExpanded: boolean;
  configBusy: boolean;
  configDirty: boolean;
  form: HermesConfigFormState;
  connectionStatus: 'unknown' | 'connected' | 'error';
  connectionError: string;
  feedbackMessage: string;
  feedbackIsError: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  'new-chat': [];
  'toggle-config': [];
  'update:proxyPrefix': [value: string];
  'update:apiKey': [value: string];
  'save-config': [];
  'reset-config': [];
  'check-health': [];
}>();

function updateProxyPrefix(event: Event): void {
  emit('update:proxyPrefix', (event.target as HTMLInputElement).value);
}

function updateApiKey(event: Event): void {
  emit('update:apiKey', (event.target as HTMLInputElement).value);
}
</script>

<template>
  <aside class="chat-sidebar" aria-label="聊天控制面板">
    <div class="chat-sidebar__block">
      <button
        class="secondary-button secondary-button--accent chat-sidebar__wide-button"
        type="button"
        :disabled="isSending"
        @click="emit('new-chat')"
      >
        新建对话
      </button>
    </div>

    <div class="chat-sidebar__config">
      <button
        class="chat-sidebar__toggle"
        type="button"
        :aria-expanded="configExpanded"
        @click="emit('toggle-config')"
      >
        <span>连接配置</span>
        <span>{{ configExpanded ? '收起' : '展开' }}</span>
      </button>

      <div v-if="configExpanded" class="chat-sidebar__config-body">
        <div class="chat-sidebar__connection">
          <p class="chat-sidebar__note">以下为当前已生效连接信息</p>
          <dl class="chat-sidebar__connection-list">
            <div class="chat-sidebar__connection-row">
              <dt>当前请求入口</dt>
              <dd :title="requestEntry">{{ requestEntry }}</dd>
            </div>
            <div class="chat-sidebar__connection-row">
              <dt>代理目标地址</dt>
              <dd :title="proxyTarget">{{ proxyTarget }}</dd>
            </div>
          </dl>
        </div>

        <div class="chat-sidebar__connection">
          <p class="chat-sidebar__note">
            连接状态：
            <strong v-if="connectionStatus === 'connected'" style="color: #2f6b4d">已连接</strong>
            <strong v-else-if="connectionStatus === 'error'" style="color: var(--danger)">
              {{ connectionError || '连接失败' }}
            </strong>
            <span v-else>未检测</span>
          </p>
          <button
            class="secondary-button chat-sidebar__wide-button"
            type="button"
            :disabled="configBusy"
            @click="emit('check-health')"
          >
            {{ configBusy ? '检测中...' : '检测连接' }}
          </button>
        </div>

        <input
          class="chat-sidebar__control"
          type="text"
          autocomplete="off"
          :value="form.proxyPrefix"
          placeholder="代理前缀 (如 /hermes-api)"
          @input="updateProxyPrefix"
        />

        <input
          class="chat-sidebar__control"
          type="password"
          autocomplete="off"
          :value="form.apiKey"
          placeholder="API Key (本地开发)"
          @input="updateApiKey"
        />

        <p class="chat-sidebar__note">
          API Key 仅限本地开发原型，生产环境须由后端网关注入。
        </p>

        <p
          v-if="feedbackMessage"
          class="chat-sidebar__feedback"
          :class="{ 'chat-sidebar__feedback--error': feedbackIsError }"
        >
          {{ feedbackMessage }}
        </p>

        <div class="chat-sidebar__config-actions">
          <button
            class="secondary-button secondary-button--accent"
            type="button"
            :disabled="configBusy || !configDirty"
            @click="emit('save-config')"
          >
            保存
          </button>
          <button
            class="secondary-button"
            type="button"
            :disabled="configBusy"
            @click="emit('reset-config')"
          >
            重置
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>
