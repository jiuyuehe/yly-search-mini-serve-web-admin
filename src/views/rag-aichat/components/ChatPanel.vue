<template>
  <div class="chat-content">
    <div class="chat-header" :class="{ isMobile }">
      <el-button v-if="isMobile" text circle @click="$emit('show-session-drawer')">
        <el-icon><Menu /></el-icon>
      </el-button>
      <h3>{{ title }}</h3>
      <el-dropdown @command="clickHandler">
        <el-button text circle>
          <el-icon><Setting /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="prompt">提示词设置</el-dropdown-item>
            <el-dropdown-item command="model">模型设置</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <div ref="messageWrapRef" class="chat-box" @scroll="handleChatScroll">
      <div v-if="!messages.length && !loading" class="chat-empty">
        <el-empty description="暂无消息，请开始提问" />
      </div>

      <div v-else class="message-list">
        <div
          v-for="(item, index) in chatList"
          :key="getMessageKey(item, index)"
          class="message-row"
          :class="item.role"
        >
          <div class="avatar">
            <el-avatar :size="34" :src="item.avatar" />
          </div>
          <div class="message-card">
            <div class="message-meta">
              <span>{{ item.role === 'user' ? '用户' : '助手' }}</span>
            </div>
            <div v-if="item.reasoning" class="message-reasoning">
              <el-collapse>
                <el-collapse-item title="思考过程" name="reasoning">
                  <MarkdownView :content="item.reasoning" />
                </el-collapse-item>
              </el-collapse>
            </div>
            <MarkdownView v-if="item.content" :content="item.content" />
            <div v-else-if="streaming && item.role === 'assistant'" class="message-loading">
              <el-icon class="is-loading"><Loading /></el-icon>
              <span class="ml-5px">思考中...</span>
            </div>
          </div>
        </div>
      </div>

      <el-button
        v-show="isShowToBottom"
        class="bottom-btn"
        circle
        @click="backBottom"
      >
        <el-icon><ArrowDown /></el-icon>
      </el-button>
    </div>

    <div class="chat-footer">
      <div v-if="showKnowledgeBaseSelector" class="control-row">
        <el-switch
          v-model="isUseKnowledgeBase"
          :disabled="knowledgeBaseSwitchDisabled || enabledSelectOptions.length === 0"
          @change="onSwitchChange"
        />
        <span class="control-label">知识库</span>
        <el-select
          v-model="selectValue"
          multiple
          collapse-tags
          collapse-tags-tooltip
          :disabled="knowledgeBaseSwitchDisabled"
          placeholder="请选择知识库"
          class="knowledge-select"
          @change="handleKnowledgeBaseSelectChange"
        >
          <el-option
            v-for="item in limitedKnowledgeBaseOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
            :disabled="item.disabled"
          />
        </el-select>
      </div>

      <div class="input-card">
        <el-input
          v-model="inputValue"
          type="textarea"
          :autosize="{ minRows: 4, maxRows: 8 }"
          :placeholder="senderPlaceholder"
          @keydown="handleKeydown"
        />
        <div class="input-actions">
          <div class="action-left">
            <el-tag v-if="currentKnowledgeBaseLabel" type="info" effect="plain">
              {{ currentKnowledgeBaseLabel }}
            </el-tag>
          </div>
          <div class="action-right">
            <el-button v-if="streaming" type="danger" @click="$emit('stop')">停止</el-button>
            <el-button
              v-else
              type="primary"
              :disabled="senderDisabled"
              @click="handleSendClick"
            >
              发送
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch, type PropType } from 'vue'
import { ArrowDown, Loading, Menu, Setting } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

import MarkdownView from '@/components/MarkdownView/index.vue'
import userAvatar from '@/assets/imgs/avatar.jpg'
import aiAvatar from '@/assets/imgs/avatar.gif'

defineOptions({ name: 'RagAiChatPanel' })

type ChatPanelMessage = {
  id?: string
  localId?: string
  role: string
  content: string
  reasoning?: string
  reference?: any[]
}

type KnowledgeBaseOption = {
  label: string
  shortLabel?: string
  value: string
  disabled?: boolean
}

const props = defineProps({
  sessionId: [String, Number],
  chatId: { type: String, required: true },
  title: { type: String, default: 'AI问答' },
  messages: {
    type: Array as PropType<ChatPanelMessage[]>,
    default: () => []
  },
  inputType: { type: String, default: 'sender' },
  showKnowledgeBaseSelector: { type: Boolean, default: true },
  knowledgeBaseOptions: {
    type: Array as PropType<KnowledgeBaseOption[]>,
    default: () => []
  },
  selectedKnowledgeBaseIds: {
    type: Array as PropType<string[]>,
    default: () => []
  },
  assistantScene: { type: String, default: 'GENERAL_CHAT' },
  loading: { type: Boolean, default: false },
  streaming: { type: Boolean, default: false }
})

const emit = defineEmits([
  'send',
  'stop',
  'knowledge-base-change',
  'show-session-drawer'
])

const MAX_KNOWLEDGE_BASE_SELECTION = 3
const messageWrapRef = ref<HTMLElement | null>(null)
const inputValue = ref('')
const isShowToBottom = ref(false)
const isUseKnowledgeBase = ref(false)
const isSyncingKnowledgeBaseControls = ref(false)
const selectValue = ref<string[]>([])
const windowWidth = ref(window.innerWidth)

const normalizeReferenceList = (reference: any) => {
  if (Array.isArray(reference)) return reference
  if (Array.isArray(reference?.chunks)) return reference.chunks
  return []
}

const chatList = computed(() =>
  (props.messages || []).map((message) => ({
    ...message,
    avatar: message.role === 'user' ? userAvatar : aiAvatar,
    reason: message.reasoning || '',
    content: String(message.content || ''),
    reference: normalizeReferenceList(message.reference)
  }))
)

const isMobile = computed(() => windowWidth.value <= 768)
const senderDisabled = computed(() => !props.chatId || !props.sessionId || props.loading)
const enabledSelectOptions = computed(() =>
  props.knowledgeBaseOptions.filter((item) => !item.disabled)
)

const limitedKnowledgeBaseOptions = computed(() => {
  const selectedIds = new Set(selectValue.value.map((item) => String(item)))
  const reachedMax = selectedIds.size >= MAX_KNOWLEDGE_BASE_SELECTION
  return props.knowledgeBaseOptions.map((item) => ({
    ...item,
    disabled: item.disabled || (reachedMax && !selectedIds.has(String(item.value)))
  }))
})

const knowledgeBaseSwitchDisabled = computed(
  () => props.loading || props.streaming
)

const currentKnowledgeBases = computed(() => {
  if (!selectValue.value.length) return []
  return props.knowledgeBaseOptions.filter((item) =>
    selectValue.value.includes(String(item.value))
  )
})

const currentKnowledgeBaseLabel = computed(() => {
  if (!currentKnowledgeBases.value.length) return ''
  if (currentKnowledgeBases.value.length === 1) {
    return (
      currentKnowledgeBases.value[0]?.shortLabel ||
      currentKnowledgeBases.value[0]?.label ||
      ''
    )
  }
  return `已选择 ${currentKnowledgeBases.value.length} 个知识库`
})

const senderPlaceholder = computed(() => {
  if (!props.chatId || !props.sessionId) {
    return '会话初始化中，请稍候...'
  }
  if (props.inputType === 'sender' && isUseKnowledgeBase.value) {
    if (currentKnowledgeBases.value.length === 1) {
      return `请输入问题，将结合“${currentKnowledgeBases.value[0].shortLabel}”回答`
    }
    if (currentKnowledgeBases.value.length > 1) {
      return `请输入问题，将结合已选 ${currentKnowledgeBases.value.length} 个知识库回答`
    }
  }
  return '请输入您想了解的内容，Shift + Enter 换行'
})

const backBottom = () => {
  const wrap = messageWrapRef.value
  if (!wrap) return
  wrap.scrollTop = wrap.scrollHeight
}

const getMessageKey = (item: any, index: number) =>
  [String(props.sessionId || ''), item.localId || item.id || '', item.role, index].join(':')

const handleChatScroll = () => {
  const wrap = messageWrapRef.value
  if (!wrap) return
  isShowToBottom.value = wrap.scrollHeight - wrap.scrollTop - wrap.clientHeight > 120
}

const limitKnowledgeBaseSelection = (ids: any[] = [], showWarning = false) => {
  const normalizedIds = ids.map((item) => String(item || '')).filter(Boolean)
  if (normalizedIds.length <= MAX_KNOWLEDGE_BASE_SELECTION) {
    return normalizedIds
  }

  if (showWarning) {
    ElMessage.warning(`最多只能选择 ${MAX_KNOWLEDGE_BASE_SELECTION} 个知识库`)
  }

  return normalizedIds.slice(0, MAX_KNOWLEDGE_BASE_SELECTION)
}

const syncKnowledgeBaseControls = async () => {
  isSyncingKnowledgeBaseControls.value = true
  const matchedIds = props.selectedKnowledgeBaseIds.filter((id) =>
    enabledSelectOptions.value.some((item) => String(item.value) === id)
  )
  const limitedIds = limitKnowledgeBaseSelection(matchedIds)
  selectValue.value = limitedIds
  isUseKnowledgeBase.value = limitedIds.length > 0
  await nextTick()
  isSyncingKnowledgeBaseControls.value = false
}

const handleKnowledgeBaseSelectChange = (value: any) => {
  const nextValue = limitKnowledgeBaseSelection(Array.isArray(value) ? value : [], true)
  selectValue.value = nextValue
  isUseKnowledgeBase.value = nextValue.length > 0
  emit('knowledge-base-change', nextValue)
}

const onSwitchChange = (value: boolean) => {
  if (value && enabledSelectOptions.value.length === 0) {
    ElMessage.warning('没有可用的知识库')
    isUseKnowledgeBase.value = false
    return
  }

  if (!value) {
    selectValue.value = []
  }
}

const clickHandler = ({ value }: { value: string }) => {
  if (value === 'prompt') {
    window.dispatchEvent(new CustomEvent('rag-aichat-open-prompt-dialog'))
    return
  }
  if (value === 'model') {
    window.dispatchEvent(new CustomEvent('rag-aichat-open-model-dialog'))
  }
}

const handleSendClick = () => {
  const question = String(inputValue.value || '').trim()
  if (!question) return
  emit('send', {
    question,
    datasetIds: isUseKnowledgeBase.value ? selectValue.value.slice() : []
  })
  inputValue.value = ''
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Enter' || event.shiftKey) return
  event.preventDefault()
  handleSendClick()
}

watch(
  () => props.selectedKnowledgeBaseIds.slice(),
  () => {
    syncKnowledgeBaseControls()
  },
  { immediate: true }
)

watch(
  [isUseKnowledgeBase, () => selectValue.value.slice().sort().join(',')],
  ([useKnowledgeBase]) => {
    if (isSyncingKnowledgeBaseControls.value) return
    if (!props.showKnowledgeBaseSelector) return
    emit('knowledge-base-change', useKnowledgeBase ? selectValue.value.slice() : [])
  }
)

const handleResize = () => {
  windowWidth.value = window.innerWidth
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.chat-content {
  min-width: 320px;
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
  background: #fff;
}

.chat-header {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 56px;
  padding: 0 14px;
  border-bottom: 1px solid var(--app-border-color);
}

.chat-header h3 {
  flex: 1;
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-box {
  flex: 1;
  position: relative;
  overflow-y: auto;
  padding: 12px 14px 18px;
  background: #fff;
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message-row {
  display: flex;
  gap: 12px;
}

.message-row.user {
  flex-direction: row-reverse;
}

.message-card {
  max-width: min(820px, calc(100% - 60px));
  padding: 12px 14px;
  border: 1px solid var(--app-border-color);
  border-radius: var(--app-radius-lg);
  background: #fff;
  box-shadow: var(--app-shadow-xs);
}

.message-row.user .message-card {
  background: rgba(0, 82, 217, 0.06);
  border-color: rgba(0, 82, 217, 0.12);
}

.message-meta {
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--app-text-secondary);
}

.message-loading {
  display: flex;
  align-items: center;
  color: var(--app-text-secondary);
}

.bottom-btn {
  position: sticky;
  bottom: 16px;
  left: calc(100% - 44px);
  margin-top: 8px;
}

.chat-footer {
  padding: 12px 14px 14px;
  border-top: 1px solid var(--app-border-color);
  background: #fff;
}

.control-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.control-label {
  color: var(--app-text-secondary);
}

.knowledge-select {
  flex: 1;
}

.input-card {
  border: 1px solid var(--app-border-color);
  border-radius: var(--app-radius-lg);
  padding: 10px;
  background: var(--app-bg-subtle);
}

.input-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
}

.action-right {
  display: flex;
  gap: 10px;
}
</style>
