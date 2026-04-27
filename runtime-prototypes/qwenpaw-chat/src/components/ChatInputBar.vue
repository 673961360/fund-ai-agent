<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';

interface Props {
  modelValue: string;
  disabled: boolean;
  busy?: boolean;
  placeholder?: string;
  helperText?: string;
}

const MAX_TEXTAREA_HEIGHT = 144;

const props = withDefaults(defineProps<Props>(), {
  placeholder: '输入消息...',
  helperText: 'Enter 发送',
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
  submit: [];
}>();

const textareaRef = ref<HTMLTextAreaElement | null>(null);
const isSubmitDisabled = computed(() => props.disabled || !props.modelValue.trim());

function resizeTextarea(element: HTMLTextAreaElement | null): void {
  if (!element) {
    return;
  }

  element.style.height = 'auto';
  const nextHeight = Math.min(element.scrollHeight, MAX_TEXTAREA_HEIGHT);
  element.style.height = `${nextHeight}px`;
  element.style.overflowY = element.scrollHeight > MAX_TEXTAREA_HEIGHT ? 'auto' : 'hidden';
}

function onInput(event: Event): void {
  const target = event.target as HTMLTextAreaElement;
  resizeTextarea(target);
  emit('update:modelValue', target.value);
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
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

onMounted(() => {
  resizeTextarea(textareaRef.value);
});

watch(
  () => props.modelValue,
  async () => {
    await nextTick();
    resizeTextarea(textareaRef.value);
  },
);
</script>

<template>
  <section class="chat-input-bar">
    <label class="sr-only" for="chat-prompt">输入消息</label>
    <div class="chat-input-bar__surface">
      <textarea
        id="chat-prompt"
        ref="textareaRef"
        class="chat-input-bar__field"
        :disabled="disabled"
        :value="modelValue"
        :placeholder="placeholder"
        rows="1"
        @input="onInput"
        @keydown="onKeydown"
      />
      <button class="primary-button chat-input-bar__submit" type="button" :disabled="isSubmitDisabled" @click="submit">
        {{ busy ? '生成中' : '发送' }}
      </button>
    </div>
    <p class="chat-input-bar__hint">{{ helperText }}</p>
  </section>
</template>
