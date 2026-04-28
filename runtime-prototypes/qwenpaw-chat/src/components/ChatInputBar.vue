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
  placeholder: '输入消息，可粘贴截图...',
  helperText: 'Enter 发送，Shift + Enter 换行 · 支持粘贴/拖拽图片',
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

function extractFilesFromClipboard(data: DataTransfer | null): File[] {
  if (!data) return [];
  const files = Array.from(data.files ?? []);
  if (files.length > 0) return files;
  const items = Array.from(data.items ?? []);
  return items
    .filter(item => item.kind === 'file')
    .map(item => item.getAsFile())
    .filter((file): file is File => file !== null);
}

function onPaste(event: ClipboardEvent): void {
  const files = extractFilesFromClipboard(event.clipboardData);
  if (files.length > 0) {
    event.preventDefault();
    emit('add-files', files);
  }
}

function onDragOver(event: DragEvent): void {
  if (!event.dataTransfer?.types.includes('Files')) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';
}

function onDrop(event: DragEvent): void {
  event.preventDefault();
  const files = Array.from(event.dataTransfer?.files ?? []);
  if (files.length > 0) {
    emit('add-files', files);
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
    <div class="chat-input-bar__surface" @dragover="onDragOver" @drop="onDrop">
      <div class="chat-input-bar__tools">
        <input ref="fileInputRef" class="sr-only" type="file" multiple @change="onFilesSelected" />
        <button class="chat-input-bar__icon-button" type="button" title="附件" :disabled="isAttachmentDisabled" @click="triggerFilePicker">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
        </button>
        <button
          class="chat-input-bar__icon-button"
          :class="{ 'chat-input-bar__icon-button--recording': recordingState.status === 'recording' }"
          type="button"
          :title="recordingState.status === 'recording' ? '结束录音' : '语音'"
          :disabled="disabled || busy || !canRecord"
          @click="toggleRecording"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
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
        @paste="onPaste"
      />

      <button class="primary-button chat-input-bar__submit" type="button" :disabled="isPrimaryDisabled" @click="onPrimaryAction">
        {{ busy ? '停止' : '发送' }}
      </button>
    </div>

    <p class="chat-input-bar__hint">{{ helperText }}</p>
  </section>
</template>
