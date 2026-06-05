<template>
  <Dialog
    v-model="dialogVisible"
    title="模型设置"
    width="520px"
    :close-on-click-modal="false"
    @closed="onClose"
  >
    <el-form label-width="auto">
      <el-form-item label="选择模型">
        <el-select v-model="selectedModel" placeholder="请选择模型" class="w-full">
          <el-option-group
            v-for="group in groupedModelOptions"
            :key="group.label"
            :label="group.label"
          >
            <el-option
              v-for="item in group.options"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-option-group>
        </el-select>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="onClose">取消</el-button>
      <el-button type="primary" :loading="confirmLoading" @click="handleSave">确定</el-button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'

import {
  listChatAssistantModels,
  listChatAssistants,
  updateChatAssistant,
  type ChatAssistantModelOptionVO
} from '@/api/rag-aichat/chat'

defineOptions({ name: 'RagAiChatModelSettingDialog' })

const props = defineProps({
  visible: Boolean,
  knowledgeBase: { type: [Array, Object], default: () => [] },
  chatId: { type: String, default: '' },
  assistantScene: { type: String, default: 'GENERAL_CHAT' }
})

const emit = defineEmits(['update:visible'])
const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value)
})
const modelOptions = ref<ChatAssistantModelOptionVO[]>([])
const groupedModelOptions = computed(() => {
  const groupMap = new Map<string, ChatAssistantModelOptionVO[]>()
  modelOptions.value.forEach((item) => {
    const groupLabel = item.providerName?.trim() || '其他'
    const groupItems = groupMap.get(groupLabel) || []
    groupItems.push(item)
    groupMap.set(groupLabel, groupItems)
  })
  return Array.from(groupMap.entries()).map(([label, options]) => ({
    label,
    options
  }))
})
const chatAssistant = ref<any>({})
const selectedModel = ref('')
const confirmLoading = ref(false)

watch(
  () => props.visible,
  async (v) => {
    if (v) {
      await loadModelData()
    }
  },
  { immediate: true }
)

async function loadModelData() {
  let detailModel = ''
  if (props.chatId) {
    try {
      const res = await listChatAssistants({ chat_id: props.chatId })
      const detail = res?.[0] || res?.data?.[0] || {}
      chatAssistant.value = detail
      detailModel = detail?.llm?.model_name || ''
    } catch {
      chatAssistant.value = {}
    }
  }

  try {
    const res = await listChatAssistantModels()
    modelOptions.value = Array.isArray(res) ? res : []
    if (modelOptions.value.length > 0) {
      const matchedModel = modelOptions.value.find(
        (opt) => opt.value === detailModel || opt.modelName === detailModel
      )
      selectedModel.value = matchedModel?.value || modelOptions.value[0].value
    } else {
      selectedModel.value = ''
    }
  } catch {
    modelOptions.value = []
    selectedModel.value = ''
  }
}

async function handleSave() {
  if (confirmLoading.value) return
  if (!props.chatId || !selectedModel.value) {
    ElMessage.warning('请选择模型')
    return
  }
  confirmLoading.value = true
  try {
    await updateChatAssistant(props.chatId, {
      scene: props.assistantScene,
      name: chatAssistant.value.name,
      avatar: chatAssistant.value.avatar,
      dataset_ids: chatAssistant.value.datasets?.map((item: any) => item.id) || [],
      prompt: chatAssistant.value.prompt,
      llm: { model_name: selectedModel.value }
    })
    ElMessage.success('保存成功')
    emit('update:visible', false)
  } catch (error) {
    console.error(error)
    ElMessage.error('保存失败')
  } finally {
    confirmLoading.value = false
  }
}

function onClose() {
  emit('update:visible', false)
}
</script>
