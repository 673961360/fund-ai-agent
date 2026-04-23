<template>
  <section class="message-list-panel">
    <header class="message-list-panel__header">
      <h2>消息区域</h2>
      <p>这里未来会承接 Gateway 流式事件映射后的消息展示。</p>
    </header>

    <div class="message-list-panel__body">
      <p v-if="messages.length === 0">暂无消息，占位等待后续阶段接线。</p>
      <ul v-else>
        <li v-for="message in messages" :key="message.id">
          {{ message.role }}: {{ message.content }}
        </li>
      </ul>
      <p v-if="requestStatus">当前请求状态：{{ requestStatus }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
/*
 * Stage 1 structural placeholder only.
 * Later frontend work must align with docs/frontend/vue3-ruler-skills-compact.md.
 * Do not introduce real interaction, request, or streaming logic in this stage.
 */

import type { ChatMessageItem } from '../../../../types/chat'
import type { RequestStatus } from '../../../../types/gateway'

interface Props {
  messages?: ChatMessageItem[]
  requestStatus?: RequestStatus | null
}

withDefaults(defineProps<Props>(), {
  messages: () => [],
  requestStatus: null,
})
</script>

<style scoped>
.message-list-panel {
  border: 1px dashed #d0d7de;
  border-radius: 12px;
  min-height: 320px;
  padding: 16px;
}

.message-list-panel__header {
  display: grid;
  gap: 6px;
  margin-bottom: 12px;
}
</style>
