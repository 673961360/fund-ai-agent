<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  modelValue: string;
  disabled: boolean;
  busy?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  submit: [];
}>();

const isSubmitDisabled = computed(() => props.disabled || !props.modelValue.trim());

function onInput(event: Event): void {
  const target = event.target as HTMLTextAreaElement;
  emit('update:modelValue', target.value);
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    if (!isSubmitDisabled.value) {
      emit('submit');
    }
  }
}

function submit(): void {
  if (!isSubmitDisabled.value) {
    emit('submit');
  }
}
</script>

<template>
  <section class="chat-input card-panel">
    <label class="chat-input__label" for="chat-prompt">输入消息</label>
    <textarea
      id="chat-prompt"
      class="chat-input__field"
      :disabled="disabled"
      :value="modelValue"
      placeholder="给 QwenPaw 发送一条消息..."
      rows="4"
      @input="onInput"
      @keydown="onKeydown"
    />
    <div class="chat-input__footer">
      <p class="chat-input__hint">Enter 发送，Shift + Enter 换行。</p>
      <button class="chat-input__submit" type="button" :disabled="isSubmitDisabled" @click="submit">
        {{ busy ? '生成中...' : '发送' }}
      </button>
    </div>
  </section>
</template>
