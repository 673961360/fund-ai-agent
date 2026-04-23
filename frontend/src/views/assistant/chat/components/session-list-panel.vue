<template>
  <section class="session-list-panel">
    <header class="session-list-panel__header">
      <h2>会话列表</h2>
      <p>阶段 1 仅保留列表结构与状态占位。</p>
    </header>

    <div class="session-list-panel__body">
      <p v-if="isLoading">会话列表占位加载中...</p>
      <p v-else-if="sessions.length === 0">暂无会话数据，占位等待后续联调。</p>
      <ul v-else>
        <li
          v-for="session in sessions"
          :key="session.id"
          :data-active="session.id === activeSessionId"
        >
          {{ session.title ?? '未命名会话' }}
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { ChatSessionListItem } from '../../../../types/chat'

interface Props {
  sessions?: ChatSessionListItem[]
  activeSessionId?: string | null
  isLoading?: boolean
}

withDefaults(defineProps<Props>(), {
  sessions: () => [],
  activeSessionId: null,
  isLoading: false,
})
</script>

<style scoped>
.session-list-panel {
  border: 1px dashed #d0d7de;
  border-radius: 12px;
  padding: 16px;
}

.session-list-panel__header {
  display: grid;
  gap: 6px;
  margin-bottom: 12px;
}
</style>

