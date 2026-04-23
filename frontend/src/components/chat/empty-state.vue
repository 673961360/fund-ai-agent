<template>
  <section class="empty-state">
    <h3>{{ title }}</h3>
    <p>{{ description }}</p>
  </section>
</template>

<script setup lang="ts">
interface Props {
  title?: string
  description?: string
}

withDefaults(defineProps<Props>(), {
  title: '暂无内容',
  description: '阶段 1 仅提供空状态占位。',
})
</script>

<style scoped>
.empty-state {
  border: 1px dashed #d0d7de;
  border-radius: 12px;
  padding: 16px;
  text-align: center;
}
</style>

