<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import type { PendingUpload, RecordingState, SpeechRecognitionState } from '@proto-shared/types';

interface Props {
  modelValue: string;
  disabled: boolean;
  busy?: boolean;
  canSubmit?: boolean;
  canRecord?: boolean;
  canSpeech?: boolean;
  pendingUploads: PendingUpload[];
  recordingState: RecordingState;
  speechState: SpeechRecognitionState;
  placeholder?: string;
  helperText?: string;
}

const MAX_TEXTAREA_HEIGHT = 144;
const MAX_INPUT_LENGTH = 10000;

const props = withDefaults(defineProps<Props>(), {
  busy: false,
  canSubmit: false,
  canRecord: false,
  canSpeech: false,
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
  'start-speech': [];
  'stop-speech': [];
}>();

const textareaRef = ref<HTMLTextAreaElement | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const isComposing = ref(false);

const charCount = computed(() => props.modelValue.length);

const isPrimaryDisabled = computed(() => {
  if (props.busy) {
    return false;
  }

  return props.disabled || !props.canSubmit;
});

const isAttachmentDisabled = computed(
  () =>
    props.disabled ||
    props.busy ||
    props.recordingState.status === 'recording' ||
    props.recordingState.status === 'processing' ||
    props.speechState.status === 'listening',
);

// 是否有任何语音能力可用
const hasAnyVoiceCapability = computed(() => props.canSpeech || props.canRecord);

function resizeTextarea(element: HTMLTextAreaElement | null): void {
  if (!element) {
    return;
  }

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

function toggleVoiceInput(): void {
  // 优先使用 Web Speech API
  if (props.canSpeech) {
    if (props.speechState.status === 'listening') {
      emit('stop-speech');
    } else {
      emit('start-speech');
    }
    return;
  }

  // 降级到 MediaRecorder 录音（仅实验功能开启时 canRecord 才为 true）
  if (props.canRecord) {
    if (props.recordingState.status === 'recording') {
      emit('stop-recording');
      return;
    }

    if (props.recordingState.status === 'processing') {
      return;
    }

    emit('start-recording');
  }
}

// 麦克风按钮的 tooltip 文本
const micButtonTitle = computed(() => {
  if (props.canSpeech) {
    return props.speechState.status === 'listening' ? '停止语音识别' : '语音输入';
  }
  if (props.canRecord) {
    return props.recordingState.status === 'recording' ? '结束录音' : '语音';
  }
  return '语音';
});

function extractFilesFromClipboard(data: DataTransfer | null): File[] {
  if (!data) return [];
  const files = Array.from(data.files ?? []);
  if (files.length > 0) return files;
  const items = Array.from(data.items ?? []);
  return items
    .filter((item) => item.kind === 'file')
    .map((item) => item.getAsFile())
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
      <article
        v-for="upload in pendingUploads"
        :key="upload.id"
        class="chat-input-bar__upload-card"
      >
        <div
          v-if="upload.kind === 'image' && upload.previewUrl"
          class="chat-input-bar__upload-preview"
        >
          <img :src="upload.previewUrl" :alt="upload.name" />
        </div>
        <div v-else class="chat-input-bar__upload-icon">
          {{ upload.kind === 'audio' ? '音频' : '文件' }}
        </div>

        <div class="chat-input-bar__upload-body">
          <strong class="chat-input-bar__upload-name">{{ upload.name }}</strong>
          <span class="chat-input-bar__upload-meta">
            {{ Math.max(1, Math.round(upload.size / 1024)) }} KB ·
            {{
              upload.status === 'uploading'
                ? '上传中'
                : upload.status === 'error'
                  ? '上传失败'
                  : '已就绪'
            }}
          </span>
          <audio
            v-if="upload.kind === 'audio' && upload.previewUrl"
            class="chat-input-bar__audio-preview"
            controls
            :src="upload.previewUrl"
          />
          <p v-if="upload.errorMessage" class="chat-input-bar__upload-error">
            {{ upload.errorMessage }}
          </p>
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

    <!-- 语音识别状态条（默认模式） -->
    <div
      v-if="speechState.status === 'listening'"
      class="chat-input-bar__recording"
    >
      <span class="chat-input-bar__recording-label">
        语音识别中{{ speechState.interimTranscript ? '：' + speechState.interimTranscript : '...' }}
      </span>
      <div class="chat-input-bar__recording-actions">
        <button class="chat-input-bar__chip" type="button" @click="emit('stop-speech')">
          停止
        </button>
      </div>
    </div>

    <!-- 录音状态条（实验模式，仅 canRecord 且不在语音识别中时显示） -->
    <div
      v-if="canRecord && !canSpeech && (recordingState.status === 'recording' || recordingState.status === 'processing')"
      class="chat-input-bar__recording"
    >
      <span class="chat-input-bar__recording-label">
        {{
          recordingState.status === 'recording' ? '录音中，点击结束录音后发送' : '正在处理录音...'
        }}
      </span>
      <div v-if="recordingState.status === 'recording'" class="chat-input-bar__recording-actions">
        <button class="chat-input-bar__chip" type="button" @click="emit('stop-recording')">
          结束录音
        </button>
        <button class="chat-input-bar__chip" type="button" @click="emit('cancel-recording')">
          取消
        </button>
      </div>
    </div>

    <label class="sr-only" for="chat-prompt">输入消息</label>
    <div class="chat-input-bar__surface" @dragover="onDragOver" @drop="onDrop">
      <div class="chat-input-bar__tools">
        <input ref="fileInputRef" class="sr-only" type="file" multiple @change="onFilesSelected" />
        <button
          class="chat-input-bar__icon-button"
          type="button"
          title="附件"
          :disabled="isAttachmentDisabled"
          @click="triggerFilePicker"
        >
          <svg
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
            <path
              d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"
            />
          </svg>
        </button>
        <button
          class="chat-input-bar__icon-button"
          :class="{
            'chat-input-bar__icon-button--speech': speechState.status === 'listening',
            'chat-input-bar__icon-button--recording': !canSpeech && recordingState.status === 'recording',
            'chat-input-bar__icon-button--unsupported': !hasAnyVoiceCapability,
          }"
          type="button"
          :title="micButtonTitle"
          :disabled="disabled || busy"
          @click="toggleVoiceInput"
        >
          <svg
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
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" x2="12" y1="19" y2="22" />
          </svg>
          <span v-if="!hasAnyVoiceCapability" class="chat-input-bar__tooltip">当前浏览器不支持语音</span>
        </button>
      </div>

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
        @paste="onPaste"
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
