<template>
  <section class="confirmation-dialog">
    <header class="confirmation-dialog__header">
      <h2>人工确认弹窗占位</h2>
      <p>阶段 1 只固化确认资源位置与展示区块。</p>
    </header>

    <div class="confirmation-dialog__body">
      <p>visible: {{ modelValue ? 'true' : 'false' }}</p>
      <p>status: {{ confirmation?.status ?? 'pending' }}</p>
      <p>risk: {{ confirmation?.risk_level ?? 'medium' }}</p>
      <p>summary: {{ confirmation?.summary ?? '待后续阶段接入真实确认对象。' }}</p>
      <div class="confirmation-dialog__actions">
        <button type="button" disabled>批准占位</button>
        <button type="button" disabled>拒绝占位</button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
/*
 * Stage 1 structural placeholder only.
 * Later frontend work must align with docs/frontend/vue3-ruler-skills-compact.md.
 * Do not introduce real interaction, request, or streaming logic in this stage.
 */

import type { ConfirmationViewModel } from '../../../../types/confirmation'

interface Props {
  modelValue?: boolean
  confirmation?: ConfirmationViewModel | null
}

withDefaults(defineProps<Props>(), {
  modelValue: false,
  confirmation: null,
})
</script>

<style scoped>
.confirmation-dialog {
  border: 1px dashed #d0d7de;
  border-radius: 12px;
  padding: 16px;
}

.confirmation-dialog__header {
  display: grid;
  gap: 6px;
  margin-bottom: 12px;
}

.confirmation-dialog__actions {
  display: flex;
  gap: 12px;
  margin-top: 12px;
}
</style>
