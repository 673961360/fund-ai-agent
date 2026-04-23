<template>
  <div class="message-renderer">
    <pre>{{ content }}</pre>
  </div>
</template>

<script setup lang="ts">
interface Props {
  content?: string
}

withDefaults(defineProps<Props>(), {
  content: '',
})
</script>

<style scoped>
.message-renderer pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>

