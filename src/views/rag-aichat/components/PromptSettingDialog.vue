<template>
  <Dialog
    v-model="dialogVisible"
    title="提示词设置"
    width="72vw"
    top="3vh"
    :close-on-click-modal="false"
    @closed="onClose"
  >
    <div class="prompt-setting-layout">
      <div class="prompt-setting-main">
        <el-descriptions :column="1" border size="small" class="mb-10px">
          <el-descriptions-item label="知识库">{{ kbName }}</el-descriptions-item>
        </el-descriptions>
        <div class="prompt-setting-top">
          <el-button type="primary" plain size="small" @click="handleUseDefaultPrompt">
            使用默认提示词
          </el-button>
          <el-button size="small" @click="handleSaveCurrentPrompt">保存到当前助手</el-button>
        </div>
        <el-input
          v-model="promptText"
          type="textarea"
          :autosize="{ minRows: 6, maxRows: 10 }"
          maxlength="2048"
          show-word-limit
          placeholder="请输入提示词内容"
        />
      </div>

      <div class="prompt-setting-side">
        <div class="prompt-manage-toolbar">
          <el-input
            v-model="searchPrompt"
            clearable
            placeholder="搜索提示词"
            @keyup.enter="handleSearch"
          />
          <el-button @click="handleSearch">查询</el-button>
          <el-button type="primary" plain @click="handleManageAdd">新增</el-button>
        </div>

        <el-table :data="manageList" height="42vh" v-loading="manageLoading" stripe>
          <el-table-column prop="prompt" label="提示词" min-width="280" show-overflow-tooltip />
          <el-table-column prop="realName" label="创建人" width="120" />
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="handleUsePrompt(row)">使用</el-button>
              <el-button link @click="handleManageEdit(row)">编辑</el-button>
              <el-popconfirm title="确定要删除该提示词吗？" @confirm="handleManageDelete(row)">
                <template #reference>
                  <el-button link type="danger">删除</el-button>
                </template>
              </el-popconfirm>
            </template>
          </el-table-column>
        </el-table>

        <div class="mt-10px flex justify-end">
          <el-pagination
            background
            layout="total, sizes, prev, pager, next, jumper"
            :current-page="managePagination.current"
            :page-size="managePagination.pageSize"
            :page-sizes="[10, 20, 50]"
            :total="managePagination.total"
            @current-change="handleManagePageChange"
            @size-change="handleManageSizeChange"
          />
        </div>
      </div>
    </div>

    <el-dialog
      v-model="manageEditDialogVisible"
      :title="manageEditId ? '编辑提示词' : '新增提示词'"
      width="520px"
      append-to-body
      @closed="handleManageEditCancel"
    >
      <el-form :model="manageEditForm" label-width="70px">
        <el-form-item label="提示词" prop="prompt">
          <el-input
            v-model="manageEditForm.prompt"
            type="textarea"
            :autosize="{ minRows: 4, maxRows: 8 }"
            maxlength="2048"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="handleManageEditCancel">取消</el-button>
        <el-button type="primary" :loading="manageEditLoading" @click="handleManageEditOk"
          >确定</el-button
        >
      </template>
    </el-dialog>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'

import { createPrompt, deletePrompt, listPrompt, updatePrompt } from '@/api/rag-aichat/prompt'
import { updateChatAssistant, listChatAssistants } from '@/api/rag-aichat/chat'

defineOptions({ name: 'RagAiChatPromptSettingDialog' })

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
watch(
  () => props.visible,
  (v) => {
    if (v) {
      loadAssistantPrompt()
      fetchManageList()
    }
  },
  { immediate: true }
)

const knowledgeBaseList = computed(() => {
  if (Array.isArray(props.knowledgeBase)) return props.knowledgeBase
  if (props.knowledgeBase && Object.keys(props.knowledgeBase).length > 0) {
    return [props.knowledgeBase]
  }
  return []
})

const kbName = computed(() => {
  if (!knowledgeBaseList.value.length) return '无'
  return knowledgeBaseList.value
    .map((item: any) => item.shortLabel || item.label || item.name || '未命名')
    .join('、')
})

const defaultPrompt = computed(() => {
  const knowledgeBaseIds = knowledgeBaseList.value.map((item: any) => item.value).filter(Boolean)
  if (!knowledgeBaseIds.length) {
    return '你是一个中文智能助手'
  }
  return '你是一个中文智能助手，请总结知识库的内容来回答问题，请列举知识库中的数据详细回答。当所有知识库内容都与问题无关时，你的回答必须包括“知识库中未找到您要的答案！”这句话。回答需要考虑聊天历史。        以下是知识库：\n{knowledge}\n以上是知识库。'
})

const promptText = ref('')
const manageLoading = ref(false)
const manageList = ref<any[]>([])
const manageEditDialogVisible = ref(false)
const manageEditForm = ref({ prompt: '' })
const manageEditId = ref<number | null>(null)
const manageEditLoading = ref(false)
const managePagination = ref({ current: 1, pageSize: 10, total: 0 })
const searchPrompt = ref('')

async function loadAssistantPrompt() {
  if (!props.chatId) {
    promptText.value = defaultPrompt.value
    return
  }

  try {
    const res = await listChatAssistants({ chat_id: props.chatId })
    const detail = res.data?.[0] || {}
    promptText.value = detail?.prompt || defaultPrompt.value
  } catch {
    promptText.value = defaultPrompt.value
  }
}

async function fetchManageList(
  page = managePagination.value.current,
  pageSize = managePagination.value.pageSize,
  prompt = searchPrompt.value
) {
  manageLoading.value = true
  try {
    const res = await listPrompt({ page, page_size: pageSize, prompt })
    manageList.value = res.data?.list || res.data?.items || []
    managePagination.value.total = res.data?.total || res.data?.count || 0
    managePagination.value.current = page
    managePagination.value.pageSize = pageSize
  } catch (error) {
    console.error(error)
    ElMessage.error('获取提示词失败')
  } finally {
    manageLoading.value = false
  }
}

const handleSearch = () => {
  fetchManageList(1, managePagination.value.pageSize, searchPrompt.value)
}

const handleManagePageChange = (page: number) => {
  fetchManageList(page, managePagination.value.pageSize, searchPrompt.value)
}

const handleManageSizeChange = (pageSize: number) => {
  fetchManageList(1, pageSize, searchPrompt.value)
}

const handleUseDefaultPrompt = () => {
  promptText.value = defaultPrompt.value
}

const handleUsePrompt = (row: any) => {
  promptText.value = row.prompt || ''
}

const handleManageAdd = () => {
  manageEditId.value = null
  manageEditForm.value = { prompt: '' }
  manageEditDialogVisible.value = true
}

const handleManageEdit = (row: any) => {
  manageEditId.value = row.id
  manageEditForm.value = { prompt: row.prompt || '' }
  manageEditDialogVisible.value = true
}

const handleManageEditCancel = () => {
  manageEditDialogVisible.value = false
}

const handleManageEditOk = async () => {
  if (manageEditLoading.value) return
  const prompt = String(manageEditForm.value.prompt || '').trim()
  if (!prompt) {
    ElMessage.warning('请输入提示词内容')
    return
  }

  manageEditLoading.value = true
  try {
    if (manageEditId.value) {
      await updatePrompt(manageEditId.value, prompt)
    } else {
      await createPrompt(prompt)
    }
    ElMessage.success('保存成功')
    manageEditDialogVisible.value = false
    fetchManageList()
  } catch (error) {
    console.error(error)
    ElMessage.error('保存失败')
  } finally {
    manageEditLoading.value = false
  }
}

const handleManageDelete = async (row: any) => {
  try {
    await deletePrompt(row.id)
    ElMessage.success('删除成功')
    fetchManageList()
  } catch (error) {
    console.error(error)
    ElMessage.error('删除失败')
  }
}

const handleSaveCurrentPrompt = async () => {
  if (!props.chatId) {
    ElMessage.warning('聊天助手未初始化')
    return
  }

  try {
    const res = await listChatAssistants({ chat_id: props.chatId })
    const detail = res.data?.[0] || {}
    await updateChatAssistant(props.chatId, {
      scene: props.assistantScene,
      name: detail.name,
      avatar: detail.avatar,
      dataset_ids: detail.datasets?.map((item: any) => item.id) || [],
      prompt: promptText.value,
      llm: detail.llm
    })
    ElMessage.success('保存成功')
  } catch (error) {
    console.error(error)
    ElMessage.error('保存失败')
  }
}

const onClose = () => {
  emit('update:visible', false)
}
</script>

<style scoped>
.prompt-setting-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(360px, 1fr);
  gap: 16px;
}

.prompt-setting-main,
.prompt-setting-side {
  min-width: 0;
}

.prompt-setting-top,
.prompt-manage-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.prompt-manage-toolbar :deep(.el-input) {
  flex: 1;
}
</style>
