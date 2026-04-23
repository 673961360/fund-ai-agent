<template>
  <article class="message-bubble" :data-role="message.role">
    <header class="message-bubble__header">{{ message.role }}</header>
    <div class="message-bubble__content">
      <MessageRenderer :content="message.content" />
    </div>
  </article>
</template>

<script setup lang="ts">
import MessageRenderer from './message-renderer.vue'
import type { ChatMessageItem } from '../../types/chat'

interface Props {
  message: ChatMessageItem
}

defineProps<Props>()
</script>

<style scoped>
.message-bubble {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 12px;
}

.message-bubble__header {
  font-size: 12px;
  margin-bottom: 8px;
  text-transform: uppercase;
}
</style>

