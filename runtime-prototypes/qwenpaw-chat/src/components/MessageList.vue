<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import MessageBubble from '@/components/MessageBubble.vue';
import type { ChatMessage } from '@proto-shared/types';

interface Props {
  messages: ChatMessage[];
  statusLabel: string;
  statusTone: 'idle' | 'busy' | 'error';
}

const props = defineProps<Props>();
const containerRef = ref<HTMLElement | null>(null);

watch(
  () => props.messages.map((message) => `${message.id}:${message.content.length}:${message.status}`).join('|'),
  async () => {
    await nextTick();
    if (containerRef.value) {
      containerRef.value.scrollTop = containerRef.value.scrollHeight;
    }
  },
  { immediate: true },
);
</script>

<template>
  <section class="message-list card-panel">
    <header class="message-list__header">
      <div>
        <h2>聊天记录</h2>
        <p>回复会随着上游流式输出逐步出现。</p>
      </div>
      <span class="message-list__status" :data-tone="statusTone">{{ statusLabel }}</span>
    </header>

    <div v-if="messages.length === 0" class="message-list__empty">
      <p>还没有消息</p>
      <span>选择 Agent 后发送一条消息，验证直连聊天链路。</span>
    </div>

    <div v-else ref="containerRef" class="message-list__items">
      <MessageBubble v-for="message in messages" :key="message.id" :message="message" />
    </div>
  </section>
</template>
