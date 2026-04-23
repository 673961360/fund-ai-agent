<template>
  <section class="message-input-box">
    <header class="message-input-box__header">
      <h2>消息输入</h2>
      <p>阶段 1 仅保留输入框、附件入口和发送按钮占位。</p>
    </header>

    <textarea
      class="message-input-box__textarea"
      :value="modelValue"
      :disabled="isDisabled"
      readonly
      placeholder="阶段 1 不实现真实输入提交流程"
    />

    <div class="message-input-box__actions">
      <button type="button" disabled>附件入口占位</button>
      <button type="button" disabled>发送占位</button>
    </div>
  </section>
</template>

<script setup lang="ts">
/*
 * Stage 1 structural placeholder only.
 * Later frontend work must align with docs/frontend/vue3-ruler-skills-compact.md.
 * Do not introduce real interaction, request, or streaming logic in this stage.
 */

interface Props {
  modelValue?: string
  isDisabled?: boolean
}

withDefaults(defineProps<Props>(), {
  modelValue: '',
  isDisabled: true,
})
</script>

<style scoped>
.message-input-box {
  border: 1px dashed #d0d7de;
  border-radius: 12px;
  padding: 16px;
}

.message-input-box__header {
  display: grid;
  gap: 6px;
  margin-bottom: 12px;
}

.message-input-box__textarea {
  min-height: 120px;
  resize: vertical;
  width: 100%;
}

.message-input-box__actions {
  display: flex;
  gap: 12px;
  margin-top: 12px;
}
</style>
