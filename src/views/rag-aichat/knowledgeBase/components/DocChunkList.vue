<template>
  <el-drawer
    v-model="drawerVisible"
    size="80%"
    direction="rtl"
    destroy-on-close
    :with-header="false"
    @closed="handleDrawerClosed"
  >
    <div class="doc-chunk-container">
      <div class="doc-chunk-header">
        <div class="doc-chunk-header-copy">
          <div class="doc-chunk-title">{{ documentName || '文档切片管理' }}</div>
          <div class="doc-chunk-subtitle">
            共 {{ pagination.total }} 个解析块
          </div>
        </div>
        <div class="doc-chunk-header-actions">
          <el-button type="primary" plain @click="handleEdit(null)">
            <el-icon class="mr-5px"><Plus /></el-icon>
            新增块
          </el-button>
          <el-popconfirm
            title="确定要批量删除选中的解析块吗？"
            :disabled="!selectedRowKeys.length"
            @confirm="handleBatchDelete"
          >
            <template #reference>
              <el-button type="danger" plain :disabled="!selectedRowKeys.length">
                批量删除
              </el-button>
            </template>
          </el-popconfirm>
        </div>
      </div>

      <el-table
        v-loading="loading"
        :data="chunkList"
        row-key="id"
        stripe
        height="calc(100vh - 220px)"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column label="内容" prop="content" min-width="320" show-overflow-tooltip />
        <el-table-column label="关键词" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            {{ formatTagList(row.important_keywords) }}
          </template>
        </el-table-column>
        <el-table-column label="问题" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            {{ formatTagList(row.questions) }}
          </template>
        </el-table-column>
        <el-table-column label="启用" width="90">
          <template #default="{ row }">
            <el-switch
              v-model="row.available"
              :loading="Boolean(row._switchLoading)"
              @change="onSwitchChange(row)"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-popconfirm title="确定删除该解析块吗？" @confirm="handleDelete(row)">
              <template #reference>
                <el-button link type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <div class="doc-chunk-pagination">
        <el-pagination
          background
          layout="total, prev, pager, next, jumper"
          :current-page="pagination.pageNo"
          :page-size="pagination.pageSize"
          :total="pagination.total"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </div>

    <el-dialog
      v-model="chunkFormVisible"
      :title="isEdit ? '编辑解析块' : '新增解析块'"
      width="640px"
      destroy-on-close
    >
      <el-form
        ref="chunkFormRef"
        :model="chunkForm"
        :rules="chunkFormRules"
        label-width="90px"
      >
        <el-form-item label="解析块" prop="content">
          <el-input
            v-model="chunkForm.content"
            type="textarea"
            :autosize="{ minRows: 5, maxRows: 12 }"
            placeholder="请输入解析块内容"
          />
        </el-form-item>
        <el-form-item label="关键词" prop="important_keywords">
          <el-select
            v-model="chunkForm.important_keywords"
            multiple
            filterable
            allow-create
            default-first-option
            placeholder="请输入关键词并回车"
            class="w-full"
          />
        </el-form-item>
        <el-form-item label="问题" prop="questions">
          <el-select
            v-model="chunkForm.questions"
            multiple
            filterable
            allow-create
            default-first-option
            placeholder="请输入问题并回车"
            class="w-full"
          />
        </el-form-item>
        <el-form-item label="启用" prop="available">
          <el-switch v-model="chunkForm.available" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="chunkFormVisible = false">取消</el-button>
        <el-button type="primary" :loading="formLoading" @click="handleSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'

import { addChunk, deleteChunks, listChunks, updateChunk } from '@/api/rag-aichat/chunk'

defineOptions({ name: 'RagAiDocChunkList' })

type ChunkRecord = {
  id: string | number
  content?: string
  important_keywords?: string[] | string
  questions?: string[] | string
  available?: boolean
  _switchLoading?: boolean
  [key: string]: any
}

const props = defineProps({
  visible: { type: Boolean, default: false },
  datasetId: { type: [String, Number], default: '' },
  documentId: { type: [String, Number], default: '' },
  documentName: { type: String, default: '' }
})

const emit = defineEmits<{
  (e: 'update:visible', visible: boolean): void
}>()

const drawerVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value)
})

const loading = ref(false)
const chunkList = ref<ChunkRecord[]>([])
const selectedRowKeys = ref<string[]>([])
const chunkFormVisible = ref(false)
const isEdit = ref(false)
const formLoading = ref(false)
const chunkFormRef = ref<FormInstance>()
const pagination = reactive({
  pageNo: 1,
  pageSize: 10,
  total: 0
})

const chunkForm = reactive<{
  id?: string | number
  content: string
  important_keywords: string[]
  questions: string[]
  available: boolean
}>({
  content: '',
  important_keywords: [],
  questions: [],
  available: true
})

const chunkFormRules: FormRules = {
  content: [{ required: true, message: '解析块内容不能为空', trigger: 'blur' }]
}

const normalizeArrayField = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? '').trim()).filter(Boolean)
  }
  if (typeof value === 'string') {
    return value
      .split(/[,，\n]/)
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

const formatTagList = (value: unknown) => {
  const list = normalizeArrayField(value)
  return list.length ? list.join('，') : '-'
}

const resetForm = () => {
  chunkForm.id = undefined
  chunkForm.content = ''
  chunkForm.important_keywords = []
  chunkForm.questions = []
  chunkForm.available = true
  chunkFormRef.value?.clearValidate?.()
}

const normalizeChunks = (res: any) => {
  if (Array.isArray(res)) return res
  if (Array.isArray(res?.data?.list)) return res.data.list
  if (Array.isArray(res?.data?.chunks)) return res.data.chunks
  if (Array.isArray(res?.list)) return res.list
  if (Array.isArray(res?.data)) return res.data
  return []
}

const fetchChunkList = async () => {
  if (!props.datasetId || !props.documentId) return
  loading.value = true
  try {
    const res = await listChunks(
      String(props.datasetId),
      String(props.documentId),
      undefined,
      pagination.pageNo,
      pagination.pageSize
    )
    const list = normalizeChunks(res)
    chunkList.value = list.map((item: any) => ({
      ...item,
      important_keywords: normalizeArrayField(item.important_keywords),
      questions: normalizeArrayField(item.questions)
    }))
    pagination.total = res?.data?.total || res?.total || 0
  } catch (error) {
    console.error(error)
    ElMessage.error('获取切片列表失败')
  } finally {
    loading.value = false
  }
}

const handleSelectionChange = (rows: ChunkRecord[]) => {
  selectedRowKeys.value = rows.map((row) => String(row.id))
}

const handlePageChange = (pageNo: number) => {
  pagination.pageNo = pageNo
  fetchChunkList()
}

const handleSizeChange = (pageSize: number) => {
  pagination.pageSize = pageSize
  pagination.pageNo = 1
  fetchChunkList()
}

const handleEdit = async (row: ChunkRecord | null) => {
  isEdit.value = Boolean(row)
  if (row) {
    chunkForm.id = row.id
    chunkForm.content = String(row.content || '')
    chunkForm.important_keywords = normalizeArrayField(row.important_keywords)
    chunkForm.questions = normalizeArrayField(row.questions)
    chunkForm.available = Boolean(row.available)
  } else {
    resetForm()
  }
  chunkFormVisible.value = true
  await nextTick()
  chunkFormRef.value?.clearValidate?.()
}

const handleSubmit = async () => {
  if (formLoading.value) return
  if (!chunkFormRef.value) return

  let valid = false
  try {
    valid = await chunkFormRef.value.validate()
  } catch {
    valid = false
  }
  if (!valid) return
  formLoading.value = true
  try {
    const payload = {
      content: chunkForm.content,
      important_keywords: chunkForm.important_keywords,
      questions: chunkForm.questions,
      available: chunkForm.available
    }
    if (isEdit.value && chunkForm.id != null) {
      await updateChunk(
        String(props.datasetId),
        String(props.documentId),
        String(chunkForm.id),
        payload
      )
      ElMessage.success('编辑成功')
    } else {
      await addChunk(String(props.datasetId), String(props.documentId), payload)
      ElMessage.success('新增成功')
    }
    chunkFormVisible.value = false
    resetForm()
    await fetchChunkList()
  } catch (error) {
    console.error(error)
    ElMessage.error('操作失败')
  } finally {
    formLoading.value = false
  }
}

const handleDelete = async (row: ChunkRecord) => {
  try {
    await deleteChunks(String(props.datasetId), String(props.documentId), String(row.id))
    ElMessage.success('删除成功')
    await fetchChunkList()
  } catch (error) {
    console.error(error)
    ElMessage.error('删除失败')
  }
}

const handleBatchDelete = async () => {
  if (!selectedRowKeys.value.length) return
  try {
    await deleteChunks(
      String(props.datasetId),
      String(props.documentId),
      selectedRowKeys.value.join(',')
    )
    selectedRowKeys.value = []
    ElMessage.success('批量删除成功')
    await fetchChunkList()
  } catch (error) {
    console.error(error)
    ElMessage.error('批量删除失败')
  }
}

const onSwitchChange = async (row: ChunkRecord) => {
  const nextAvailable = Boolean(row.available)
  row._switchLoading = true
  try {
    await updateChunk(String(props.datasetId), String(props.documentId), String(row.id), {
      available: nextAvailable
    })
    ElMessage.success(`切片${nextAvailable ? '已启用' : '已停用'}`)
  } catch (error) {
    row.available = !nextAvailable
    console.error(error)
    ElMessage.error('操作失败')
  } finally {
    row._switchLoading = false
  }
}

const handleDrawerClosed = () => {
  selectedRowKeys.value = []
  pagination.pageNo = 1
  pagination.pageSize = 10
  pagination.total = 0
  chunkList.value = []
  resetForm()
}

watch(
  () => [props.visible, props.datasetId, props.documentId],
  ([visible]) => {
    if (visible) {
      selectedRowKeys.value = []
      pagination.pageNo = 1
      void fetchChunkList()
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.doc-chunk-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.doc-chunk-header {
  display: flex;
  padding-bottom: 14px;
  margin-bottom: 14px;
  border-bottom: 1px solid var(--app-border-color);
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.doc-chunk-header-copy {
  min-width: 0;
}

.doc-chunk-title {
  font-size: 18px;
  font-weight: 600;
}

.doc-chunk-subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: var(--app-text-secondary);
}

.doc-chunk-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.doc-chunk-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
