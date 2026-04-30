<template>
  <Dialog :title="dialogTitle" v-model="dialogVisible">
    <div>
      <!-- 步骤导航 -->
      <el-steps :active="currentStep" finish-status="success">
        <el-step title="存储信息"/>
        <el-step title="布控范围"/>
      </el-steps>

      <div class="steps-content mt-4">
        <!-- 步骤1: 存储信息 -->
        <el-form
          v-show="currentStep === 0"
          ref="formRef"
          :model="formData"
          :rules="formRules"
          label-width="100px"
          v-loading="formLoading"
        >
          <el-form-item label="布控名称" prop="taskName">
            <el-input v-model="formData.taskName" placeholder="请输入名称" class="form-item-width" />
          </el-form-item>
          <el-form-item label="ES索引" prop="indexId">
            <el-select :disabled="!!formData.id" v-model="formData.indexId" placeholder="请选择索引" clearable class="form-item-width">
              <el-option
                v-for="item in indexList"
                :key="item.id"
                :label="item.indexName"
                :value="item.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="存储介质" prop="storageId">
            <el-select :disabled="!!formData.id" v-model="formData.storageId" placeholder="请选择存储介质" clearable class="form-item-width">
              <el-option
                v-for="item in storageList"
                :key="item.id"
                :label="getStorageOptionLabel(item)"
                :value="item.id"
                :disabled="item.mediumType === '2' && item.mountStatus !== 1"
              />
            </el-select>
          </el-form-item>
          <el-form-item v-if="hasUnmountedNasStorage">
            <el-alert
              title="未挂载的 NAS 数据源不可用于布控任务，请先到“数据源接入”完成挂载。"
              type="warning"
              :closable="false"
              show-icon
            />
          </el-form-item>
          <el-form-item label="调度类型" prop="scheduleType">
            <el-select 
              v-model="formData.scheduleType" 
              placeholder="请选择类型" 
              clearable 
              class="form-item-width"
              :disabled="isScheduleTypeDisabled"
            >
              <el-option
                v-for="dict in getIntDictOptions(DICT_TYPE.SCHEDULE_TYPE)"
                :key="dict.value"
                :label="dict.label"
                :value="dict.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="调度配置" prop="scheduleConf" v-if="formData.scheduleType === 1">
            <el-input v-model="formData.scheduleConf" placeholder="请输入调度配置(cron表达式或时间配置)" class="form-item-width" />
            <div class="cron-examples mt-2">
              <div class="flex flex-wrap gap-2">
                <el-button 
                  v-for="item in cronExamples" 
                  :key="item.value"
                  size="small" 
                  type="primary" 
                  plain
                  @click="selectCronExample(item.value)"
                  class="cron-example-btn"
                >
                  {{ item.label }}
                </el-button>
              </div>
            </div>
          </el-form-item>
        </el-form>

        <!-- 步骤2: 布控范围 -->
        <div v-show="currentStep === 1" class="step-scope">
          <div>
            <span>自定义</span>
          </div>
          <div class="mt-2 ml-6 flex items-center">
            <span class="w-32 text-right mr-2">文件名匹配: </span>
            <el-input v-model="fileNamePattern" placeholder="正则表达式" class="form-item-width" />
          </div>
          <div class="mt-2 ml-6 flex items-center">
            <span class="w-32 text-right mr-2">文件内容匹配: </span>
            <el-input v-model="contentPattern" placeholder="正则表达式" class="form-item-width" />
          </div>
          <div class="mt-2 ml-6 flex items-center">
            <span class="w-32 text-right mr-2">文件后缀名排除: </span>
            <el-input v-model="fileSuffixExcludePattern" placeholder="支持多个后缀名，用英文逗号 , 分隔，例如：.txt,.doc,.docx" class="form-item-width" />
          </div>
          <div class="mt-2 ml-6 flex items-center">
            <span class="w-32 text-right mr-2">文件夹名排除: </span>
            <el-input v-model="folderNameExcludePattern" placeholder="支持多个文件夹名，用英文逗号 , 分隔，例如：/tmp,/data" class="form-item-width" />
          </div>
          <div class="mt-2 ml-6 flex items-center">
            <span class="w-32 text-right mr-2">索引文件夹: </span>
            <el-switch v-model="folderIndexEnabled" active-text="开启" inactive-text="关闭" />
          </div>
        </div>
      </div>

      <div class="steps-action mt-4 flex justify-center">
        <el-button v-if="currentStep > 0" @click="prevStep">
          上一步
        </el-button>
        <el-button v-if="currentStep < 1" type="primary" @click="nextStep">
          下一步
        </el-button>
        <el-button v-if="currentStep === 1" type="primary" @click="submitForm" :loading="formLoading">
          确定
        </el-button>
      </div>
    </div>
    <template #footer>
      <div></div> <!-- 由于使用自定义步骤按钮，清空默认底部按钮 -->
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ControlTaskApi } from '@/api/rag/controltask'
import type { ControlTaskVO, ScanRules } from '@/api/rag/controltask'
import { useEsIndexCache } from '@/hooks/web/useEsIndexCache'
import { useStorageMediumCache } from '@/hooks/web/useStorageMediumCache'
import { DICT_TYPE, getIntDictOptions } from '@/utils/dict'
import { watch } from 'vue'

/** 布控任务 表单 */
defineOptions({ name: 'ControlTaskForm' })

const { t } = useI18n() // 国际化
const message = useMessage() // 消息弹窗

// 获取索引和存储介质数据
const { getIndexList } = useEsIndexCache()
const { getStorageList } = useStorageMediumCache()
const indexList = ref<any[]>([])
const storageList = ref<any[]>([])

const dialogVisible = ref(false) // 弹窗的是否展示
const dialogTitle = ref('') // 弹窗的标题
const formLoading = ref(false) // 表单的加载中：1）修改时的数据加载；2）提交的按钮禁用
const formType = ref('') // 表单的类型：create - 新增；update - 修改

// 步骤相关
const currentStep = ref(0)
const DEFAULT_FILE_TYPES = ['1', '2', '6']
const DEFAULT_PROCESS_TYPES = '3'
// 默认过滤掉以 .deleted、.yli.part.、._ 开头的文件，避免索引系统临时文件和 macOS 元数据文件。
const DEFAULT_FILE_NAME_PATTERN = '^(?!\\.deleted|\\.yli\\.part\\.|\\._).*'
const fileNamePattern = ref(DEFAULT_FILE_NAME_PATTERN)
const contentPattern = ref('')
const fileSuffixExcludePattern = ref('')
const folderNameExcludePattern = ref('')
const folderIndexEnabled = ref(true)

// Cron表达式示例配置
const cronExamples = [
  { label: '每5分钟', value: '0 */5 * * * ?' },
  { label: '每30分钟', value: '0 */30 * * * ?' },
  { label: '每小时', value: '0 0 0/1 * * ?' },
  { label: '每6小时', value: '0 0 0/6 * * ?' },
  { label: '每天', value: '0 0 0 * * ?' },
  { label: '每周一', value: '0 0 0 ? * MON' },
  { label: '每月', value: '0 0 0 1 * ?' },
]

const formData = ref({
  id: undefined,
  indexId: undefined,
  taskName: undefined,
  taskDesc: undefined,
  contentJson: undefined,
  totalFiles: undefined,
  fileType: undefined,
  processTypes: '',
  storageId: undefined,
  knowledgeBaseId: undefined,
  scheduleType: 0 as number | undefined, // 默认为手动执行
  scheduleConf: undefined as string | undefined,
  status: undefined,
  resultCount: undefined,
  lastExecuteTime: undefined,
  faceCount: undefined,
  textCount: undefined,
  objectCount: undefined,
  scanRulesJson: '',
  scanRules: undefined as ScanRules | undefined,
})

const formRules = reactive({
  indexId: [{ required: true, message: 'ES索引不能为空', trigger: 'blur' }],
  taskName: [{ required: true, message: '布控任务名称不能为空', trigger: 'blur' }],
  storageId: [{ required: true, message: '存储介质不能为空', trigger: 'change' }],
  scheduleType: [{ required: true, message: '调度类型不能为空', trigger: 'change' }],
  scheduleConf: [{ required: true, message: '调度配置不能为空', trigger: 'blur' }],
})

const formRef = ref() // 表单 Ref

// Computed property to disable scheduleType select - 始终禁用
const isScheduleTypeDisabled = computed(() => {
  return true; // 始终禁用调度类型选择
});

const hasUnmountedNasStorage = computed(() => {
  return storageList.value.some((item) => item.mediumType === '2' && item.mountStatus !== 1)
})

const getStorageOptionLabel = (item: any) => {
  if (item.mediumType === '2') {
    return `${item.mediumName}（${item.mountStatus === 1 ? 'NAS已挂载' : 'NAS未挂载'}）`
  }
  return item.mediumName
}

// 简化watch逻辑，移除自动设置scheduleType的部分
watch(() => formData.value.storageId, (newStorageId) => {
  // 保持scheduleType为手动执行，不再根据存储介质类型自动设置
  if (!newStorageId) {
    // If storageId is cleared, keep scheduleType as manual
    formData.value.scheduleType = 0;
  }
}, { deep: true, immediate: true });

// 步骤切换功能
const nextStep = async () => {
  if (currentStep.value === 0) {
    try {
      await formRef.value.validate()
      currentStep.value++
    } catch (error) {
      message.warning('请先填写完当前必填项后，再进行下一步')
      return
    }
  } else {
    currentStep.value++
  }
}

const prevStep = () => {
  currentStep.value--
}

// 选择Cron表达式示例
const selectCronExample = (cronValue: string) => {
  formData.value.scheduleConf = cronValue
  message.success(`已设置调度配置: ${cronValue}`)
}

const buildScanRules = (): ScanRules => ({
  fileTypes: DEFAULT_FILE_TYPES,
  fileNamePattern: fileNamePattern.value,
  contentPattern: contentPattern.value,
  fileSuffixExcludePattern: fileSuffixExcludePattern.value,
  folderNameExcludePattern: folderNameExcludePattern.value,
  folderIndexEnabled: folderIndexEnabled.value,
  sensitiveRules: []
})

const parseScanRulesJson = (scanRulesJson?: string): ScanRules | undefined => {
  if (!scanRulesJson) {
    return undefined
  }
  try {
    return JSON.parse(scanRulesJson || '{}')
  } catch (error) {
    console.error('解析扫描规则失败', error)
    return undefined
  }
}

const applyScanRules = (rules?: ScanRules, defaultFolderIndexEnabled = false) => {
  const safeRules = rules || {}
  fileNamePattern.value = safeRules.fileNamePattern || DEFAULT_FILE_NAME_PATTERN
  contentPattern.value = safeRules.contentPattern || ''
  fileSuffixExcludePattern.value = safeRules.fileSuffixExcludePattern || ''
  folderNameExcludePattern.value = safeRules.folderNameExcludePattern || ''
  folderIndexEnabled.value =
    typeof safeRules.folderIndexEnabled === 'boolean'
      ? safeRules.folderIndexEnabled
      : defaultFolderIndexEnabled
}

// 初始化加载选项数据
const loadOptions = async () => {
  indexList.value = await getIndexList()
  // console.log('indexList.value', indexList)
  storageList.value = await getStorageList()
  console.log('storageList.value', storageList.value)
}

/** 打开弹窗 */
const open = async (type: string, id?: number) => {
  dialogVisible.value = true
  dialogTitle.value = t('action.' + type)
  formType.value = type
  resetForm()

  // 重置到第一步
  currentStep.value = 0

  // 加载选项数据
  await loadOptions()

  // 修改时，设置数据
  if (id) {
    formLoading.value = true
    try {
      const res = await ControlTaskApi.getControlTask(id)
      formData.value = res
      
      // 优先使用后端返回的类型化扫描规则，兼容旧接口的scanRulesJson
      applyScanRules(res.scanRules || parseScanRulesJson(res.scanRulesJson), false)
    } finally {
      formLoading.value = false
    }
  }
}
defineExpose({ open }) // 提供 open 方法，用于打开弹窗

/** 提交表单 */
const emit = defineEmits(['success']) // 定义 success 事件，用于操作成功后的回调
const submitForm = async () => {
  try {
    formData.value.scanRules = buildScanRules()
    // 当前扫描链路只展示并执行基础信息与内容提取，固定写入 1 + 2 的位标识。
    formData.value.processTypes = DEFAULT_PROCESS_TYPES

    // 提交请求
    formLoading.value = true
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
  } catch (error) {
    console.error('提交表单失败', error)
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
    processTypes: '',
    storageId: undefined,
    knowledgeBaseId: undefined,
    scheduleType: 0 as number | undefined, // 重置时也设置为手动执行
    scheduleConf: undefined as string | undefined,
    status: undefined,
    resultCount: undefined,
    lastExecuteTime: undefined,
    faceCount: undefined,
    textCount: undefined,
    objectCount: undefined,
    scanRulesJson: '',
    scanRules: undefined,
  }
  
  fileNamePattern.value = DEFAULT_FILE_NAME_PATTERN
  contentPattern.value = ''
  fileSuffixExcludePattern.value = ''
  folderNameExcludePattern.value = ''
  folderIndexEnabled.value = true
  
  formRef.value?.resetFields()
}
</script>

<style scoped>
.steps-content {
  min-height: 200px;
  padding: 20px;
  margin-top: 16px;
  background-color: #fafafa;
  border: 1px dashed #e9e9e9;
  border-radius: 6px;
}

.step-scope {
  text-align: left;
}

.steps-action {
  margin-top: 24px;
}

.form-item-width {
  width: 100%;
  max-width: 560px; /* 统一表单元素宽度 */
}

.cron-examples {
  margin-top: 8px;
}

.cron-example-btn {
  margin-bottom: 4px;
  font-size: 12px;
}

.cron-example-btn:hover {
  color: white;
  background-color: #409eff;
}
</style>
