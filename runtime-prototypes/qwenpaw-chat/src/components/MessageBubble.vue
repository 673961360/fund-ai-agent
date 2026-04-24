<script setup lang="ts">
import { computed } from 'vue';
import type { ChatMessage } from '@proto-shared/types';

interface Props {
  message: ChatMessage;
}

const props = defineProps<Props>();

const bubbleClass = computed(() => [
  'message-bubble',
  `message-bubble--${props.message.role}`,
  props.message.status === 'error' ? 'message-bubble--error' : '',
]);

const roleLabel = computed(() => {
  if (props.message.role === 'assistant') {
    return '助手';
  }

  if (props.message.role === 'system') {
    return '系统';
  }

  return '用户';
});

const timeLabel = computed(() =>
  new Date(props.message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  }),
);
</script>

<template>
  <article :class="bubbleClass">
    <header class="message-bubble__meta">
      <strong>{{ roleLabel }}</strong>
      <span>{{ timeLabel }}</span>
    </header>
    <p class="message-bubble__content">{{ message.content || ' ' }}</p>
    <span v-if="message.status === 'streaming'" class="message-bubble__streaming">生成中</span>
    <span v-else-if="message.status === 'error'" class="message-bubble__error">请求失败</span>
  </article>
</template>
