<script setup lang="ts">
import { computed, ref, watch } from 'vue';
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
  if (props.message.role === 'assistant') return 'Hermes';
  if (props.message.role === 'system') return '系统';
  if (props.message.role === 'tool') return '工具';
  return '用户';
});

const timeLabel = computed(() =>
  new Date(props.message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  }),
);

// --- RenderGroup 类型定义 ---

interface ThinkingRenderGroup {
  type: 'thinking';
  section: ChatMessageSection;
}

interface ToolRenderGroup {
  type: 'tool';
  callSection: ChatMessageSection | null;
  resultSection: ChatMessageSection | null;
}

interface AnswerRenderGroup {
  type: 'answer';
  section: ChatMessageSection;
}

type RenderGroup = ThinkingRenderGroup | ToolRenderGroup | AnswerRenderGroup;

const assistantSections = computed(() => props.message.sections ?? []);

// 按 section 原始顺序分组，合并 tool_call + tool_result
const renderGroups = computed<RenderGroup[]>(() => {
  const sections = assistantSections.value;
  const groups: RenderGroup[] = [];
  const consumed = new Set<number>();

  for (let i = 0; i < sections.length; i++) {
    if (consumed.has(i)) continue;
    const section = sections[i];

    if (section.kind === 'answer') {
      if (hasSectionContent(section)) {
        groups.push({ type: 'answer', section });
      }
      continue;
    }

    if (section.kind === 'thinking') {
      if (hasSectionContent(section)) {
        groups.push({ type: 'thinking', section });
      }
      continue;
    }

    if (section.kind === 'tool_call') {
      const callSection = section;
      const callId = section.meta?.callId;
      let resultSection: ChatMessageSection | null = null;

      if (callId) {
        for (let j = i + 1; j < sections.length; j++) {
          if (consumed.has(j)) continue;
          const candidate = sections[j];
          if (
            candidate.kind === 'tool_result' &&
            candidate.meta?.callId === callId
          ) {
            resultSection = candidate;
            consumed.add(j);
            break;
          }
        }
      }

      if (hasSectionContent(callSection) || (resultSection && hasSectionContent(resultSection))) {
        groups.push({ type: 'tool', callSection, resultSection });
      }
      continue;
    }

    if (section.kind === 'tool_result') {
      if (hasSectionContent(section)) {
        groups.push({ type: 'tool', callSection: null, resultSection: section });
      }
      continue;
    }
  }

  return groups;
});

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
    !renderGroups.value.some((g) => g.type === 'answer'),
);

const hasStructuredAssistantContent = computed(
  () =>
    props.message.role === 'assistant' &&
    (renderGroups.value.length > 0 || assistantMediaBlocks.value.length > 0),
);

// --- 卡片展开/折叠状态 ---

const cardOpenState = ref<Record<string, boolean>>({});

watch(
  () => {
    const sig: string[] = [];
    for (const s of props.message.sections ?? []) {
      sig.push(`${s.id}:${s.status}`);
    }
    return sig.join(',');
  },
  () => {
    for (const group of renderGroups.value) {
      if (group.type === 'thinking') {
        if (group.section.status === 'streaming') {
          cardOpenState.value[group.section.id] = true;
        }
      }
      if (group.type === 'tool') {
        const key = toolCardKey(group);
        const anyStreaming =
          (group.callSection?.status === 'streaming') ||
          (group.resultSection?.status === 'streaming');
        if (anyStreaming) {
          cardOpenState.value[key] = true;
          if (group.callSection?.status === 'streaming') {
            cardOpenState.value[`${key}__input`] = true;
          }
          if (group.resultSection?.status === 'streaming') {
            cardOpenState.value[`${key}__output`] = true;
          }
        }
      }
    }
  },
  { immediate: true },
);

watch(
  () => props.message.status,
  (newStatus) => {
    if (newStatus === 'ready' || newStatus === 'error') {
      const newState: Record<string, boolean> = {};
      for (const key of Object.keys(cardOpenState.value)) {
        newState[key] = false;
      }
      cardOpenState.value = newState;
    }
  },
);

function toggleCard(key: string): void {
  cardOpenState.value = { ...cardOpenState.value, [key]: !isCardOpen(key) };
}

function isCardOpen(key: string): boolean {
  return cardOpenState.value[key] ?? false;
}

function toggleSubBlock(key: string): void {
  cardOpenState.value = {
    ...cardOpenState.value,
    [key]: !isSubBlockOpen(key),
  };
}

function isSubBlockOpen(key: string): boolean {
  return cardOpenState.value[key] ?? true;
}

// --- 辅助函数 ---

function hasSectionContent(section: ChatMessageSection): boolean {
  return section.content.trim().length > 0;
}

function toolCardKey(group: ToolRenderGroup): string {
  return group.callSection?.id ?? group.resultSection?.id ?? 'tool';
}

function resolveToolLabel(group: ToolRenderGroup): string {
  const name =
    group.callSection?.meta?.toolName ||
    group.resultSection?.meta?.toolName ||
    group.callSection?.title ||
    group.resultSection?.title ||
    'Tool';
  return name;
}

function isToolStreaming(group: ToolRenderGroup): boolean {
  return (
    (group.callSection?.status === 'streaming') ||
    (group.resultSection?.status === 'streaming')
  );
}

function highlightJson(jsonStr: string): string {
  if (!jsonStr) return '';
  return jsonStr
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"([^"]+)"(?=\s*:)/g, '<span class="json-key">"$1"</span>')
    .replace(
      /:\s*"([^"]*)"/g,
      ': <span class="json-string">"$1"</span>',
    )
    .replace(/:\s*(\d+\.?\d*)/g, ': <span class="json-number">$1</span>')
    .replace(
      /:\s*(true|false)/g,
      ': <span class="json-boolean">$1</span>',
    )
    .replace(/:\s*(null)/g, ': <span class="json-null">$1</span>');
}

function isAnyAnswerStreaming(): boolean {
  return (
    props.message.status === 'streaming' &&
    assistantSections.value.some(
      (s) => s.kind === 'answer' && s.status === 'streaming',
    )
  );
}

async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'absolute';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
}

function renderSectionMarkdown(section: ChatMessageSection): string {
  return renderMarkdown(section.content);
}

function renderFallbackMarkdown(): string {
  return renderMarkdown(props.message.content);
}

function resolveFileLabel(contentBlock: ChatFileContentBlock): string {
  if (contentBlock.filename) return contentBlock.filename;
  try {
    const pathname = new URL(contentBlock.fileUrl, 'http://localhost').pathname;
    return decodeURIComponent(pathname.split('/').filter(Boolean).pop() ?? '') || '下载文件';
  } catch {
    return '下载文件';
  }
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
      <template v-for="group in renderGroups" :key="group.type === 'tool' ? toolCardKey(group) : group.type === 'thinking' ? group.section.id : group.section.id">

        <!-- Thinking 卡片 -->
        <div v-if="group.type === 'thinking'" class="operate-card operate-card--thinking">
          <div class="operate-card__header" @click="toggleCard(group.section.id)">
            <span class="operate-card__icon">
              <svg v-if="group.section.status === 'streaming'" class="operate-card__spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              <svg v-else class="operate-card__icon-bulb" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
              </svg>
            </span>
            <span class="operate-card__title">Thinking</span>
            <svg class="operate-card__chevron" :class="{ 'operate-card__chevron--open': isCardOpen(group.section.id) }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
          <div v-show="isCardOpen(group.section.id)" class="operate-card__body operate-card__body--thinking">
            <div class="thinking-content">{{ group.section.content }}</div>
          </div>
        </div>

        <!-- Tool 卡片 -->
        <div v-else-if="group.type === 'tool'" class="operate-card operate-card--tool">
          <div class="operate-card__header" @click="toggleCard(toolCardKey(group))">
            <span class="operate-card__icon">
              <svg v-if="isToolStreaming(group)" class="operate-card__spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
            </span>
            <span class="operate-card__title">{{ resolveToolLabel(group) }}</span>
            <svg class="operate-card__chevron" :class="{ 'operate-card__chevron--open': isCardOpen(toolCardKey(group)) }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
          <div v-show="isCardOpen(toolCardKey(group))" class="operate-card__body">
            <!-- Chat Completions 无结构化 Input/Output 时，显示 label 预览文本 -->
            <div
              v-if="!group.callSection?.meta?.argumentsText && !group.resultSection?.meta?.outputText && (group.callSection?.content || group.resultSection?.content)"
              class="tool-sub-block"
            >
              <p class="tool-label-preview">{{ group.callSection?.content || group.resultSection?.content }}</p>
            </div>
            <div v-if="group.callSection?.meta?.argumentsText" class="tool-sub-block">
              <div class="tool-sub-block__header" @click="toggleSubBlock(`${toolCardKey(group)}__input`)">
                <span class="tool-sub-block__title">Input</span>
                <button class="tool-sub-block__copy" @click.stop="copyToClipboard(group.callSection!.meta!.argumentsText!)" title="复制">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
              </div>
              <div v-show="isSubBlockOpen(`${toolCardKey(group)}__input`)" class="tool-sub-block__body">
                <pre class="tool-json-display" v-html="highlightJson(group.callSection.meta.argumentsText)"></pre>
              </div>
            </div>
            <div v-if="group.resultSection?.meta?.outputText" class="tool-sub-block">
              <div class="tool-sub-block__header" @click="toggleSubBlock(`${toolCardKey(group)}__output`)">
                <span class="tool-sub-block__title">Output</span>
                <button class="tool-sub-block__copy" @click.stop="copyToClipboard(group.resultSection!.meta!.outputText!)" title="复制">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
              </div>
              <div v-show="isSubBlockOpen(`${toolCardKey(group)}__output`)" class="tool-sub-block__body">
                <pre class="tool-json-display" v-html="highlightJson(group.resultSection.meta.outputText)"></pre>
              </div>
            </div>
          </div>
        </div>

        <!-- Answer 区域 -->
        <section v-else-if="group.type === 'answer'" class="message-bubble__section--answer" :class="{ 'message-bubble__section--streaming': group.section.status === 'streaming' }">
          <div class="message-bubble__markdown" v-html="renderSectionMarkdown(group.section)" />
          <span v-if="group.section.status === 'streaming'" class="streaming-cursor" />
        </section>

      </template>

      <!-- Fallback -->
      <section
        v-if="showAssistantFallback"
        class="message-bubble__section--answer message-bubble__section--fallback"
      >
        <div class="message-bubble__markdown" v-html="renderFallbackMarkdown()" />
      </section>

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
      </template>
      <p v-if="primaryContentBlocks.length === 0" class="message-bubble__content">
        {{ message.content || ' ' }}
      </p>
    </div>

    <span v-if="message.status === 'error'" class="message-bubble__error">请求失败</span>
  </article>
</template>
