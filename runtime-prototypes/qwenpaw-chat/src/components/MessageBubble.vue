<script setup lang="ts">
import { computed } from 'vue';
import type { ChatMessage, ChatMessageSection } from '@proto-shared/types';

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
  assistantSections.value.filter((section) => section.kind === 'answer' && hasSectionContent(section)),
);

const detailSections = computed(() =>
  assistantSections.value.filter((section) => section.kind !== 'answer' && hasSectionContent(section)),
);

const showAssistantFallback = computed(
  () => props.message.role === 'assistant' && props.message.content.trim().length > 0 && answerSections.value.length === 0,
);

const hasStructuredAssistantContent = computed(
  () => props.message.role === 'assistant' && (answerSections.value.length > 0 || detailSections.value.length > 0),
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
        <pre class="message-bubble__section-content">{{ section.content }}</pre>
      </section>

      <section
        v-if="showAssistantFallback"
        class="message-bubble__section message-bubble__section--answer message-bubble__section--fallback"
      >
        <div class="message-bubble__section-label">正式应答</div>
        <pre class="message-bubble__section-content">{{ message.content }}</pre>
      </section>

      <details v-for="section in detailSections" :key="section.id" class="message-bubble__details">
        <summary class="message-bubble__summary">
          <span class="message-bubble__summary-title">{{ buildSectionSummary(section) }}</span>
          <span v-if="section.status === 'streaming'" class="message-bubble__summary-meta">更新中</span>
        </summary>
        <div class="message-bubble__details-body">
          <pre class="message-bubble__section-content">{{ section.content }}</pre>
        </div>
      </details>

      <p v-if="!hasStructuredAssistantContent && !showAssistantFallback" class="message-bubble__content">
        {{ message.content || ' ' }}
      </p>
    </div>

    <p v-else class="message-bubble__content">{{ message.content || ' ' }}</p>

    <span v-if="message.status === 'streaming'" class="message-bubble__streaming">生成中</span>
    <span v-else-if="message.status === 'error'" class="message-bubble__error">请求失败</span>
  </article>
</template>
