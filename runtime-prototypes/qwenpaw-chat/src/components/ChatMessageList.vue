<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import MessageBubble from '@/components/MessageBubble.vue';
import type { ChatMessage } from '@proto-shared/types';

interface Props {
  messages: ChatMessage[];
  emptyTitle?: string;
  emptyDescription?: string;
}

const props = withDefaults(defineProps<Props>(), {
  emptyTitle: '开始一段新对话',
  emptyDescription: '发送第一条消息。',
});

const containerRef = ref<HTMLElement | null>(null);

watch(
  () => props.messages.map((message) => serializeMessage(message)).join('|'),
  async () => {
    await nextTick();
    if (containerRef.value) {
      containerRef.value.scrollTop = containerRef.value.scrollHeight;
    }
  },
  { immediate: true },
);

function serializeMessage(message: ChatMessage): string {
  const sectionsSignature = (message.sections ?? [])
    .map((section) => `${section.id}:${section.kind}:${section.status}:${section.content.length}`)
    .join(',');

  return `${message.id}:${message.content.length}:${message.status}:${sectionsSignature}`;
}
</script>

<template>
  <section class="chat-message-list" aria-label="聊天消息流">
    <div v-if="messages.length === 0" class="chat-message-list__empty">
      <p>{{ emptyTitle }}</p>
      <span>{{ emptyDescription }}</span>
    </div>

    <div v-else ref="containerRef" class="chat-message-list__items">
      <MessageBubble v-for="message in messages" :key="message.id" :message="message" />
    </div>
  </section>
</template>
