<template>
  <Dialog
    v-model="dialogVisible"
    :title="dialogTitle"
    width="540px"
    :close-on-click-modal="false"
    @closed="handleClosed"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="90px"
      @submit.prevent="submitForm"
    >
      <el-form-item label="名称" prop="name">
        <el-input v-model="formData.name" placeholder="请输入知识库名称" />
      </el-form-item>
      <el-form-item label="描述">
        <el-input
          v-model="formData.description"
          type="textarea"
          :autosize="{ minRows: 4, maxRows: 8 }"
          placeholder="请输入知识库描述"
        />
      </el-form-item>
      <div class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" native-type="submit">
          确定
        </el-button>
      </div>
    </el-form>
  </Dialog>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

import {
  createKnowledgeBase,
  updateKnowledgeBase
} from '@/api/rag-aichat/knowledgeBase'

defineOptions({ name: 'RagAiKnowledgeBaseFormDialog' })

type KnowledgeBaseForm = {
  name: string
  description: string
}

const emit = defineEmits<{
  (e: 'success'): void
}>()

const dialogVisible = ref(false)
const dialogTitle = ref('新建知识库')
const saving = ref(false)
const formMode = ref<'create' | 'update'>('create')
const datasetId = ref('')
const formRef = ref<FormInstance>()
const formData = reactive<KnowledgeBaseForm>({
  name: '',
  description: ''
})

const formRules: FormRules<KnowledgeBaseForm> = {
  name: [{ required: true, message: '请输入知识库名称', trigger: 'blur' }]
}

const open = (mode: 'create' | 'update', dataset?: Record<string, any> | null) => {
  formMode.value = mode
  dialogTitle.value = mode === 'create' ? '新建知识库' : '编辑知识库'
  datasetId.value = String(dataset?.dataset_id || dataset?.id || '')
  formData.name = dataset?.dataset_name || dataset?.name || ''
  formData.description = dataset?.description || ''
  dialogVisible.value = true
}

defineExpose({ open })

const submitForm = async () => {
  if (saving.value) return

  await formRef.value?.validate()

  const name = String(formData.name || '').trim()
  if (!name) {
    ElMessage.warning('请输入知识库名称')
    return
  }

  saving.value = true
  try {
    const payload = {
      name,
      description: String(formData.description || '').trim()
    }

    if (formMode.value === 'create') {
      await createKnowledgeBase(payload)
      ElMessage.success('创建成功')
    } else {
      await updateKnowledgeBase(datasetId.value, payload)
      ElMessage.success('保存成功')
    }

    dialogVisible.value = false
    emit('success')
  } catch (error) {
    console.error(error)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

const resetForm = () => {
  formRef.value?.resetFields()
  formData.name = ''
  formData.description = ''
  formMode.value = 'create'
  datasetId.value = ''
}

const handleClosed = () => {
  resetForm()
}
</script>

<style scoped>
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
}
</style>
