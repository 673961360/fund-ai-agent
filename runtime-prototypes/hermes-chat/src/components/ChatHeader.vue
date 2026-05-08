<script setup lang="ts">
type ConversationTone = 'idle' | 'busy' | 'error' | 'warning';

interface Props {
  statusLabel: string;
  statusTone: ConversationTone;
  errorMessage?: string;
}

withDefaults(defineProps<Props>(), {
  errorMessage: '',
});
</script>

<template>
  <header class="chat-header">
    <div class="chat-header__main">
      <h1>Hermes Chat</h1>
      <div class="chat-header__meta">
        <span class="chat-header__badge" :data-tone="statusTone">{{ statusLabel }}</span>
      </div>
    </div>

    <p v-if="errorMessage" class="chat-header__error" role="alert">{{ errorMessage }}</p>
  </header>
</template>
