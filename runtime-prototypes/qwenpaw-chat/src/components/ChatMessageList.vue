<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
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
const showScrollBtn = ref(false);

watch(
  () => props.messages.map((message) => serializeMessage(message)).join('|'),
  async () => {
    await nextTick();
    if (!containerRef.value) return;

    if (isPinnedToBottom.value) {
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

function isNearBottom(): boolean {
  if (!containerRef.value) return true;
  const { scrollTop, scrollHeight, clientHeight } = containerRef.value;
  return scrollHeight - clientHeight - scrollTop <= 2;
}

function shouldShowBtn(): boolean {
  if (!containerRef.value) return false;
  const { scrollTop, scrollHeight, clientHeight } = containerRef.value;
  return scrollHeight - clientHeight > 2 && scrollHeight - clientHeight - scrollTop > 2;
}

function onScroll(): void {
  isPinnedToBottom.value = isNearBottom();
  showScrollBtn.value = shouldShowBtn();
}

function scrollToBottom(): void {
  if (!containerRef.value) return;

  containerRef.value.scrollTo({ top: containerRef.value.scrollHeight, behavior: 'auto' });
  isPinnedToBottom.value = true;
  showScrollBtn.value = false;
}
</script>

<template>
  <div class="chat-message-list-wrapper">
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
    </section>

    <div class="chat-message-list__scroll-bottom" :class="showScrollBtn ? 'chat-message-list__scroll-bottom--show' : 'chat-message-list__scroll-bottom--hide'">
      <button type="button" aria-label="回到底部" @click="scrollToBottom">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>
    </div>
  </div>
</template>
