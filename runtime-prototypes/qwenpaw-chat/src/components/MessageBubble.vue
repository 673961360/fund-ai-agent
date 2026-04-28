<script setup lang="ts">
import { computed } from 'vue';
import { renderMarkdown } from '@/utils/render-markdown';
import type {
  ChatFileContentBlock,
  ChatMessage,
  ChatMessageContentBlock,
  ChatMessageSection,
} from '@proto-shared/types';

interface Props {
  message: ChatMessage;
}

const props = defineProps<Props>();

const bubbleClass = computed(() => [
  'message-bubble',
  `message-bubble--${props.message.role}`,
  props.message.status === 'error' ? 'message-bubble--error' : '',
]);

const roleLabel = computed(() => {
  if (props.message.role === 'assistant') {
    return '助手';
  }

  if (props.message.role === 'system') {
    return '系统';
  }

  if (props.message.role === 'tool') {
    return '工具';
  }

  return '用户';
});

const timeLabel = computed(() =>
  new Date(props.message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  }),
);

const assistantSections = computed(() => props.message.sections ?? []);
const answerSections = computed(() =>
  assistantSections.value.filter(
    (section) => section.kind === 'answer' && hasSectionContent(section),
  ),
);
const detailSections = computed(() =>
  assistantSections.value.filter(
    (section) => section.kind !== 'answer' && hasSectionContent(section),
  ),
);
const assistantMediaBlocks = computed(() =>
  props.message.contentBlocks.filter((block) => block.type !== 'text'),
);
const primaryContentBlocks = computed(() =>
  props.message.role === 'assistant'
    ? props.message.contentBlocks.filter((block) => block.type !== 'text')
    : props.message.contentBlocks,
);
const showAssistantFallback = computed(
  () =>
    props.message.role === 'assistant' &&
    props.message.content.trim().length > 0 &&
    answerSections.value.length === 0,
);
const hasStructuredAssistantContent = computed(
  () =>
    props.message.role === 'assistant' &&
    (answerSections.value.length > 0 ||
      detailSections.value.length > 0 ||
      assistantMediaBlocks.value.length > 0),
);

function hasSectionContent(section: ChatMessageSection): boolean {
  return section.content.trim().length > 0;
}

function buildSectionSummary(section: ChatMessageSection): string {
  if (section.meta?.toolName) {
    return `${section.title} · ${section.meta.toolName}`;
  }

  return section.title;
}

function renderSectionMarkdown(section: ChatMessageSection): string {
  return renderMarkdown(section.content);
}

function renderFallbackMarkdown(): string {
  return renderMarkdown(props.message.content);
}

function resolveFileLabel(contentBlock: ChatFileContentBlock): string {
  const directFilename = normalizeUploadedFilename(contentBlock.filename);
  if (directFilename) {
    return directFilename;
  }

  try {
    const pathname = new URL(contentBlock.fileUrl, 'http://localhost').pathname;
    const basename = decodeURIComponent(pathname.split('/').filter(Boolean).pop() ?? '');
    return normalizeUploadedFilename(basename) || '下载文件';
  } catch {
    return '下载文件';
  }
}

function normalizeUploadedFilename(value: string | undefined): string {
  if (!value) {
    return '';
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return '';
  }

  return trimmedValue.replace(/^[0-9a-f]{32}[_-]/i, '');
}

function asFileBlock(contentBlock: ChatMessageContentBlock): ChatFileContentBlock {
  return contentBlock as ChatFileContentBlock;
}
</script>

<template>
  <article :class="bubbleClass">
    <header class="message-bubble__meta">
      <strong class="message-bubble__role">{{ roleLabel }}</strong>
      <span>{{ timeLabel }}</span>
    </header>

    <div v-if="message.role === 'assistant'" class="message-bubble__assistant">
      <section
        v-for="section in answerSections"
        :key="section.id"
        class="message-bubble__section message-bubble__section--answer"
      >
        <div class="message-bubble__section-label">{{ section.title }}</div>
        <div class="message-bubble__markdown" v-html="renderSectionMarkdown(section)" />
      </section>

      <section
        v-if="showAssistantFallback"
        class="message-bubble__section message-bubble__section--answer message-bubble__section--fallback"
      >
        <div class="message-bubble__section-label">正式应答</div>
        <div class="message-bubble__markdown" v-html="renderFallbackMarkdown()" />
      </section>

      <div v-if="assistantMediaBlocks.length > 0" class="message-bubble__content-stack">
        <template v-for="contentBlock in assistantMediaBlocks" :key="contentBlock.id">
          <img
            v-if="contentBlock.type === 'image'"
            class="message-bubble__image"
            :src="contentBlock.imageUrl"
            :alt="contentBlock.filename || 'assistant image'"
          />
          <a
            v-else-if="contentBlock.type === 'file'"
            class="message-bubble__file"
            :href="contentBlock.fileUrl"
            target="_blank"
            rel="noopener noreferrer"
            :title="resolveFileLabel(asFileBlock(contentBlock))"
          >
            <span class="message-bubble__file-icon">文件</span>
            <span class="message-bubble__file-body">
              <strong class="message-bubble__file-name">{{
                resolveFileLabel(asFileBlock(contentBlock))
              }}</strong>
              <span class="message-bubble__file-meta">打开附件</span>
            </span>
          </a>
          <audio
            v-else-if="contentBlock.type === 'audio'"
            class="message-bubble__audio"
            controls
            :src="contentBlock.dataUrl"
          />
        </template>
      </div>

      <details v-for="section in detailSections" :key="section.id" class="message-bubble__details">
        <summary class="message-bubble__summary">
          <span class="message-bubble__summary-title">{{ buildSectionSummary(section) }}</span>
          <span v-if="section.status === 'streaming'" class="message-bubble__summary-meta"
            >更新中</span
          >
        </summary>
        <div class="message-bubble__details-body">
          <pre class="message-bubble__section-content">{{ section.content }}</pre>
        </div>
      </details>

      <p
        v-if="!hasStructuredAssistantContent && !showAssistantFallback"
        class="message-bubble__content"
      >
        {{ message.content || ' ' }}
      </p>
    </div>

    <div v-else class="message-bubble__content-stack">
      <template v-for="contentBlock in primaryContentBlocks" :key="contentBlock.id">
        <p v-if="contentBlock.type === 'text'" class="message-bubble__content">
          {{ contentBlock.text }}
        </p>
        <img
          v-else-if="contentBlock.type === 'image'"
          class="message-bubble__image"
          :src="contentBlock.imageUrl"
          :alt="contentBlock.filename || 'uploaded image'"
        />
        <a
          v-else-if="contentBlock.type === 'file'"
          class="message-bubble__file"
          :href="contentBlock.fileUrl"
          target="_blank"
          rel="noopener noreferrer"
          :title="resolveFileLabel(asFileBlock(contentBlock))"
        >
          <span class="message-bubble__file-icon">文件</span>
          <span class="message-bubble__file-body">
            <strong class="message-bubble__file-name">{{
              resolveFileLabel(asFileBlock(contentBlock))
            }}</strong>
            <span class="message-bubble__file-meta">打开附件</span>
          </span>
        </a>
        <audio
          v-else-if="contentBlock.type === 'audio'"
          class="message-bubble__audio"
          controls
          :src="contentBlock.dataUrl"
        />
      </template>
      <p v-if="primaryContentBlocks.length === 0" class="message-bubble__content">
        {{ message.content || ' ' }}
      </p>
    </div>

    <span v-if="message.status === 'streaming'" class="message-bubble__streaming">生成中</span>
    <span v-else-if="message.status === 'error'" class="message-bubble__error">请求失败</span>
  </article>
</template>
