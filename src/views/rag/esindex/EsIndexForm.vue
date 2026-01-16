<template>
  <Dialog :title="dialogTitle" v-model="dialogVisible">
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="100px"
      v-loading="formLoading"
    >
      <el-form-item label="索引名称" prop="indexName">
        <el-input v-model="formData.indexName" placeholder="请输入索引名称" />
      </el-form-item>
      <el-form-item label="映射文件" prop="mappingFile">
        <el-upload
          :auto-upload="false"
          :limit="1"
          accept=".json"
          :on-change="handleFileChange"
          :show-file-list="false"
        >
          <el-button type="primary">选择文件</el-button>
          <template #tip>
            <div class="el-upload__tip">
              {{ formData.mappingFile ? formData.mappingFile.name : '请上传JSON格式的索引映射文件' }}
            </div>
          </template>
        </el-upload>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="submitForm" type="primary" :disabled="formLoading">确 定</el-button>
      <el-button @click="dialogVisible = false">取 消</el-button>
    </template>
  </Dialog>
</template>
<script setup lang="ts">
import { EsIndexApi } from '@/api/rag/esindex'
/** ES索引管理 表单 */
defineOptions({ name: 'EsIndexForm' })

const { t } = useI18n() // 国际化
const message = useMessage() // 消息弹窗

const dialogVisible = ref(false) // 弹窗的是否展示
const dialogTitle = ref('') // 弹窗的标题
const formLoading = ref(false) // 表单的加载中：1）修改时的数据加载；2）提交的按钮禁用
const formType = ref('') // 表单的类型：create - 新增；update - 修改
const formData = ref({
  indexName: undefined,
  mappingFile: undefined as File | undefined
})

const handleFileChange = (file: { raw: File }) => {
  if (file.raw.type !== 'application/json') {
    message.error('请上传JSON格式的文件')
    return false
  }
  formData.value.mappingFile = file.raw
  return true
}
const formRules = reactive({
  indexName: [{ required: true, message: '索引名称不能为空', trigger: 'blur' }]
})
const formRef = ref() // 表单 Ref

/** 打开弹窗 */
const open = async (type: string, id?: number) => {
  dialogVisible.value = true
  dialogTitle.value = t('action.' + type)
  formType.value = type
  resetForm()
  // 修改时，设置数据
  if (id) {
    formLoading.value = true
    try {
      formData.value = await EsIndexApi.getEsIndex(id)
    } finally {
      formLoading.value = false
    }
  }
}
defineExpose({ open }) // 提供 open 方法，用于打开弹窗

/** 提交表单 */
const emit = defineEmits(['success']) // 定义 success 事件，用于操作成功后的回调
const submitForm = async () => {
  // 校验表单
  await formRef.value.validate()
  // 提交请求
  formLoading.value = true
  try {
    const formDataObj = new FormData()
    formDataObj.append('indexName', formData.value.indexName || '')
    if (formData.value.mappingFile) {
      formDataObj.append('mappingFile', formData.value.mappingFile)
    }

    // 设置Content-Type为multipart/form-data
    const config = {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }

    if (formType.value === 'create') {
      await EsIndexApi.createEsIndexFile(formDataObj, config)
      message.success(t('common.createSuccess'))
    } else {
      await EsIndexApi.updateEsIndex(formDataObj, config)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    // 发送操作成功的事件
    emit('success')
  } finally {
    formLoading.value = false
  }
}

/** 重置表单 */
const resetForm = () => {
  formData.value = {
    indexName: undefined,
    mappingFile: undefined
  }
  formRef.value?.resetFields()
}
</script>
