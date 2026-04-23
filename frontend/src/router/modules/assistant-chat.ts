import type { RouteRecordRaw } from 'vue-router'

export const assistantChatRoute: RouteRecordRaw = {
  path: '/assistant/chat',
  name: 'AssistantChat',
  component: () => import('../../views/assistant/chat/index.vue'),
  meta: {
    title: '资金AI聊天助手',
    stage: 'stage-1',
  },
}

export default assistantChatRoute

