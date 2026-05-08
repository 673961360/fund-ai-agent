<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';

interface Props {
  modelValue: string;
  disabled: boolean;
  busy?: boolean;
  canSubmit?: boolean;
  placeholder?: string;
  helperText?: string;
}

const MAX_TEXTAREA_HEIGHT = 144;
const MAX_INPUT_LENGTH = 10000;

const props = withDefaults(defineProps<Props>(), {
  busy: false,
  canSubmit: false,
  placeholder: '发送消息给 Hermes...',
  helperText: 'Enter 发送，Shift + Enter 换行',
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
  submit: [];
  stop: [];
}>();

const textareaRef = ref<HTMLTextAreaElement | null>(null);
const isComposing = ref(false);

const charCount = computed(() => props.modelValue.length);

const isPrimaryDisabled = computed(() => {
  if (props.busy) return false;
  return props.disabled || !props.canSubmit;
});

function resizeTextarea(element: HTMLTextAreaElement | null): void {
  if (!element) return;
  element.style.height = 'auto';
  const nextHeight = Math.min(element.scrollHeight, MAX_TEXTAREA_HEIGHT);
  element.style.height = `${nextHeight}px`;
  element.style.overflowY = element.scrollHeight > MAX_TEXTAREA_HEIGHT ? 'auto' : 'hidden';
}

function clampInput(value: string): string {
  return value.length > MAX_INPUT_LENGTH ? value.slice(0, MAX_INPUT_LENGTH) : value;
}

function onInput(event: Event): void {
  if (isComposing.value) return;
  const target = event.target as HTMLTextAreaElement;
  const clamped = clampInput(target.value);
  if (clamped !== target.value) {
    target.value = clamped;
  }
  resizeTextarea(target);
  emit('update:modelValue', clamped);
}

function onCompositionEnd(event: CompositionEvent): void {
  isComposing.value = false;
  const target = event.target as HTMLTextAreaElement;
  const clamped = clampInput(target.value);
  if (clamped !== target.value) {
    target.value = clamped;
  }
  resizeTextarea(target);
  emit('update:modelValue', clamped);
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    if (props.busy) {
      emit('stop');
      return;
    }
    if (!isPrimaryDisabled.value) {
      emit('submit');
    }
  }
}

function onPrimaryAction(): void {
  if (props.busy) {
    emit('stop');
    return;
  }
  if (!isPrimaryDisabled.value) {
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
        :disabled="disabled || busy"
        :value="modelValue"
        :placeholder="placeholder"
        :maxlength="MAX_INPUT_LENGTH"
        rows="1"
        @input="onInput"
        @keydown="onKeydown"
        @compositionstart="isComposing = true"
        @compositionend="onCompositionEnd"
      />

      <span
        class="chat-input-bar__char-count"
        :class="{ 'chat-input-bar__char-count--warn': charCount > MAX_INPUT_LENGTH * 0.9 }"
      >
        {{ Math.min(charCount, MAX_INPUT_LENGTH) }}/{{ MAX_INPUT_LENGTH }}
      </span>

      <button
        class="chat-input-bar__icon-button chat-input-bar__send-btn"
        type="button"
        :title="busy ? '停止' : '发送'"
        :disabled="isPrimaryDisabled"
        @click="onPrimaryAction"
      >
        <svg
          v-if="!busy"
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="m5 12 7-7 7 7" />
          <path d="M12 19V5" />
        </svg>
        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <rect x="4" y="4" width="16" height="16" rx="2" />
        </svg>
      </button>
    </div>

    <p class="chat-input-bar__hint">{{ helperText }}</p>
  </section>
</template>
