<template>
  <Dialog :title="dialogTitle" v-model="dialogVisible">
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="100px"
      v-loading="formLoading"
    >
      <el-form-item label="名称" prop="taskName">
        <el-input v-model="formData.taskName" placeholder="请输入名称" />
      </el-form-item>
      <el-form-item label="索引" prop="indexId">
        <el-input v-model="formData.indexId" placeholder="请输入索引" />
      </el-form-item>
      <el-form-item label="存储介质" prop="storageId">
        <el-input v-model="formData.storageId" placeholder="请输入存储介质" />
      </el-form-item>
      <el-form-item label="调度类型" prop="scheduleType">
        <el-select v-model="formData.scheduleType" placeholder="请选择类型" clearable class="!w-240px">
          <el-option
            v-for="dict in getIntDictOptions(DICT_TYPE.SCHEDULE_TYPE)"
            :key="dict.value"
            :label="dict.label"
            :value="dict.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="调度配置" prop="scheduleConf">
        <el-input v-model="formData.scheduleConf" placeholder="请输入调度配置(cron表达式或时间配置)" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="submitForm" type="primary" :disabled="formLoading">确 定</el-button>
      <el-button @click="dialogVisible = false">取 消</el-button>
    </template>
  </Dialog>
</template>
<script setup lang="ts">
import { ControlTaskApi, ControlTaskVO } from '@/api/rag/controltask'
import { DICT_TYPE, getIntDictOptions } from '@/utils/dict'
// import { useEsIndexCache } from '@/hooks/web/useEsIndexCache'
// import { useStorageMediumCache } from '@/hooks/web/useStorageMediumCache'
/** 布控任务 表单 */
defineOptions({ name: 'ControlTaskForm' })

const { t } = useI18n() // 国际化
const message = useMessage() // 消息弹窗

const dialogVisible = ref(false) // 弹窗的是否展示
const dialogTitle = ref('') // 弹窗的标题
const formLoading = ref(false) // 表单的加载中：1）修改时的数据加载；2）提交的按钮禁用
const formType = ref('') // 表单的类型：create - 新增；update - 修改
const formData = ref({
  id: undefined,
  indexId: undefined,
  taskName: undefined,
  taskDesc: undefined,
  contentJson: undefined,
  totalFiles: undefined,
  fileType: undefined,
  processTypes: undefined,
  storageId: undefined,
  knowledgeBaseId: undefined,
  scheduleType: undefined,
  scheduleConf: undefined,
  status: undefined,
  resultCount: undefined,
  lastExecuteTime: undefined,
  faceCount: undefined,
  textCount: undefined,
  objectCount: undefined,
})
const formRules = reactive({
  indexId: [{ required: true, message: 'es索引ID不能为空', trigger: 'blur' }],
  taskName: [{ required: true, message: '布控任务名称不能为空', trigger: 'blur' }],
  fileType: [{ required: true, message: '文件类型：ALL/OFFICE/IMAGE/VIDEO/CUSTOM不能为空', trigger: 'change' }],
  processTypes: [{ required: true, message: '处理类型：TEXT,VOICE,FACE,OBJECT不能为空', trigger: 'blur' }],
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
      formData.value = await ControlTaskApi.getControlTask(id)
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
    const data = formData.value as unknown as ControlTaskVO
    if (formType.value === 'create') {
      await ControlTaskApi.createControlTask(data)
      message.success(t('common.createSuccess'))
    } else {
      await ControlTaskApi.updateControlTask(data)
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
    id: undefined,
    indexId: undefined,
    taskName: undefined,
    taskDesc: undefined,
    contentJson: undefined,
    totalFiles: undefined,
    fileType: undefined,
    processTypes: undefined,
    storageId: undefined,
    knowledgeBaseId: undefined,
    scheduleType: undefined,
    scheduleConf: undefined,
    status: undefined,
    resultCount: undefined,
    lastExecuteTime: undefined,
    faceCount: undefined,
    textCount: undefined,
    objectCount: undefined,
  }
  formRef.value?.resetFields()
}
</script>