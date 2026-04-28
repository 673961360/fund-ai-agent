<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import MessageBubble from '@/components/MessageBubble.vue';
import type { ChatMessage } from '@proto-shared/types';

interface Props {
  messages: ChatMessage[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  emptyTitle: '开始一段新对话',
  emptyDescription: '发送第一条消息。',
});

const containerRef = ref<HTMLElement | null>(null);
const isPinnedToBottom = ref(true);

const showScrollToBottom = computed(() => !isPinnedToBottom.value && props.messages.length > 0);

let previousMessageCount = 0;

watch(
  () => props.messages.map((message) => serializeMessage(message)).join('|'),
  async () => {
    await nextTick();
    if (!containerRef.value) return;

    const newCount = props.messages.length;
    const hasNewMessage = newCount > previousMessageCount;
    previousMessageCount = newCount;

    if (hasNewMessage || isPinnedToBottom.value) {
      scrollToBottom();
    }
  },
  { immediate: true },
);

function serializeMessage(message: ChatMessage): string {
  const blockSignature = message.contentBlocks
    .map((block) => {
      if (block.type === 'text') {
        return `${block.type}:${block.text.length}`;
      }

      if (block.type === 'image') {
        return `${block.type}:${block.imageUrl}`;
      }

      if (block.type === 'file') {
        return `${block.type}:${block.fileUrl}`;
      }

      return `${block.type}:${block.data.length}`;
    })
    .join(',');

  const sectionsSignature = (message.sections ?? [])
    .map((section) => `${section.id}:${section.kind}:${section.status}:${section.content.length}`)
    .join(',');

  return `${message.id}:${message.content.length}:${message.status}:${blockSignature}:${sectionsSignature}`;
}

function onScroll(): void {
  if (!containerRef.value) {
    return;
  }

  const { scrollTop, scrollHeight, clientHeight } = containerRef.value;
  isPinnedToBottom.value = scrollHeight - (scrollTop + clientHeight) < 48;
}

function scrollToBottom(): void {
  if (!containerRef.value) {
    return;
  }

  containerRef.value.scrollTop = containerRef.value.scrollHeight;
  isPinnedToBottom.value = true;
}
</script>

<template>
  <section ref="containerRef" class="chat-message-list" aria-label="聊天消息流" @scroll="onScroll">
    <div v-if="loading" class="chat-message-list__loading">
      <span class="chat-message-list__loading-line" />
      <span class="chat-message-list__loading-line chat-message-list__loading-line--wide" />
      <span class="chat-message-list__loading-line" />
    </div>

    <div v-else-if="messages.length === 0" class="chat-message-list__empty">
      <p>{{ emptyTitle }}</p>
      <span>{{ emptyDescription }}</span>
    </div>

    <div v-else class="chat-message-list__items">
      <MessageBubble v-for="message in messages" :key="message.id" :message="message" />
    </div>

    <button v-if="showScrollToBottom" class="chat-message-list__scroll-bottom" type="button" @click="scrollToBottom">
      回到底部
    </button>
  </section>
</template>
