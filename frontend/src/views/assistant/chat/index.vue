<template>
  <div class="assistant-chat-page">
    <header class="assistant-chat-page__header">
      <h1>资金AI聊天助手 v0</h1>
      <p>阶段 1 仅提供文档对齐后的页面骨架，不包含真实请求与流式逻辑。</p>
    </header>

    <main class="assistant-chat-page__body">
      <aside class="assistant-chat-page__sidebar">
        <SessionListPanel />
      </aside>

      <section class="assistant-chat-page__content">
        <MessageListPanel />
        <MessageInputBox />
      </section>
    </main>

    <ConfirmationDialog />
  </div>
</template>

<script setup lang="ts">
import ConfirmationDialog from './components/confirmation-dialog.vue'
import MessageInputBox from './components/message-input-box.vue'
import MessageListPanel from './components/message-list-panel.vue'
import SessionListPanel from './components/session-list-panel.vue'
</script>

<style scoped>
.assistant-chat-page {
  display: grid;
  gap: 16px;
  padding: 20px;
}

.assistant-chat-page__header {
  display: grid;
  gap: 8px;
}

.assistant-chat-page__body {
  display: grid;
  gap: 16px;
  grid-template-columns: 280px 1fr;
}

.assistant-chat-page__content {
  display: grid;
  gap: 16px;
}
</style>

