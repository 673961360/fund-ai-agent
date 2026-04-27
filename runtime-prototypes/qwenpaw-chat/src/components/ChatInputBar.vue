<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import type { PendingUpload, RecordingState } from '@proto-shared/types';

interface Props {
  modelValue: string;
  disabled: boolean;
  busy?: boolean;
  canSubmit?: boolean;
  canRecord?: boolean;
  pendingUploads: PendingUpload[];
  recordingState: RecordingState;
  placeholder?: string;
  helperText?: string;
}

const MAX_TEXTAREA_HEIGHT = 144;

const props = withDefaults(defineProps<Props>(), {
  busy: false,
  canSubmit: false,
  canRecord: false,
  placeholder: '输入消息...',
  helperText: 'Enter 发送，Shift + Enter 换行',
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
  submit: [];
  stop: [];
  'add-files': [files: File[]];
  'retry-upload': [uploadId: string];
  'remove-upload': [uploadId: string];
  'start-recording': [];
  'stop-recording': [];
  'cancel-recording': [];
}>();

const textareaRef = ref<HTMLTextAreaElement | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

const isPrimaryDisabled = computed(() => {
  if (props.busy) {
    return false;
  }

  return props.disabled || !props.canSubmit;
});

const isAttachmentDisabled = computed(
  () => props.disabled || props.busy || props.recordingState.status === 'recording' || props.recordingState.status === 'processing',
);

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

function triggerFilePicker(): void {
  if (!isAttachmentDisabled.value) {
    fileInputRef.value?.click();
  }
}

function onFilesSelected(event: Event): void {
  const target = event.target as HTMLInputElement;
  const files = Array.from(target.files ?? []);
  if (files.length > 0) {
    emit('add-files', files);
  }
  target.value = '';
}

function toggleRecording(): void {
  if (props.recordingState.status === 'recording') {
    emit('stop-recording');
    return;
  }

  if (props.recordingState.status === 'processing') {
    return;
  }

  emit('start-recording');
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
    <div v-if="pendingUploads.length > 0" class="chat-input-bar__uploads">
      <article v-for="upload in pendingUploads" :key="upload.id" class="chat-input-bar__upload-card">
        <div v-if="upload.kind === 'image' && upload.previewUrl" class="chat-input-bar__upload-preview">
          <img :src="upload.previewUrl" :alt="upload.name" />
        </div>
        <div v-else class="chat-input-bar__upload-icon">{{ upload.kind === 'audio' ? '音频' : '文件' }}</div>

        <div class="chat-input-bar__upload-body">
          <strong class="chat-input-bar__upload-name">{{ upload.name }}</strong>
          <span class="chat-input-bar__upload-meta">
            {{ Math.max(1, Math.round(upload.size / 1024)) }} KB ·
            {{ upload.status === 'uploading' ? '上传中' : upload.status === 'error' ? '上传失败' : '已就绪' }}
          </span>
          <audio v-if="upload.kind === 'audio' && upload.previewUrl" class="chat-input-bar__audio-preview" controls :src="upload.previewUrl" />
          <p v-if="upload.errorMessage" class="chat-input-bar__upload-error">{{ upload.errorMessage }}</p>
        </div>

        <div class="chat-input-bar__upload-actions">
          <button
            v-if="upload.status === 'error' && upload.kind !== 'audio'"
            class="chat-input-bar__chip"
            type="button"
            :disabled="disabled || busy"
            @click="emit('retry-upload', upload.id)"
          >
            重试
          </button>
          <button
            class="chat-input-bar__chip"
            type="button"
            :disabled="busy"
            @click="emit('remove-upload', upload.id)"
          >
            移除
          </button>
        </div>
      </article>
    </div>

    <div
      v-if="recordingState.status === 'recording' || recordingState.status === 'processing' || recordingState.errorMessage"
      class="chat-input-bar__recording"
    >
      <span class="chat-input-bar__recording-label">
        {{
          recordingState.status === 'recording'
            ? '录音中，点击结束录音后发送'
            : recordingState.status === 'processing'
              ? '正在处理录音...'
              : recordingState.errorMessage
        }}
      </span>
      <div v-if="recordingState.status === 'recording'" class="chat-input-bar__recording-actions">
        <button class="chat-input-bar__chip" type="button" @click="emit('stop-recording')">结束录音</button>
        <button class="chat-input-bar__chip" type="button" @click="emit('cancel-recording')">取消</button>
      </div>
    </div>

    <label class="sr-only" for="chat-prompt">输入消息</label>
    <div class="chat-input-bar__surface">
      <div class="chat-input-bar__tools">
        <input ref="fileInputRef" class="sr-only" type="file" multiple @change="onFilesSelected" />
        <button class="chat-input-bar__icon-button" type="button" :disabled="isAttachmentDisabled" @click="triggerFilePicker">
          附件
        </button>
        <button
          class="chat-input-bar__icon-button"
          type="button"
          :disabled="disabled || busy || !canRecord"
          @click="toggleRecording"
        >
          {{ recordingState.status === 'recording' ? '结束录音' : '语音' }}
        </button>
      </div>

      <textarea
        id="chat-prompt"
        ref="textareaRef"
        class="chat-input-bar__field"
        :disabled="disabled || busy"
        :value="modelValue"
        :placeholder="placeholder"
        rows="1"
        @input="onInput"
        @keydown="onKeydown"
      />

      <button class="primary-button chat-input-bar__submit" type="button" :disabled="isPrimaryDisabled" @click="onPrimaryAction">
        {{ busy ? '停止' : '发送' }}
      </button>
    </div>

    <p class="chat-input-bar__hint">{{ helperText }}</p>
  </section>
</template>
