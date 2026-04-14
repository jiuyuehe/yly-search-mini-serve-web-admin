<template>
  <Dialog :title="dialogTitle" v-model="dialogVisible">
    <div>
      <!-- 步骤导航 -->
      <el-steps :active="currentStep" finish-status="success">
        <el-step title="存储信息"/>
        <el-step title="布控范围"/>
        <el-step title="高级配置"/>
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
          <el-checkbox v-model="scanRules.checkAll" :indeterminate="scanRules.indeterminate" @change="onCheckAllRulesChange">
            全选 (扫描范围)
          </el-checkbox>
          <el-divider />
          <el-checkbox-group v-model="scanRules.checkedList" @change="onRulesChange" class="checkbox-horizontal">
            <el-checkbox v-for="item in ruleOptions" :key="item.value" :label="item.value">
              {{ item.title }}
            </el-checkbox>
          </el-checkbox-group>
          
          <div class="mt-4">
            <span>自定义范围</span>
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
          <el-divider />
          <div class="mt-2">
            <span>敏感信息匹配: 
              <el-button link type="primary" @click="nextStep">
                <Icon icon="ep:plus" class="mr-5px" />选择敏感词库
              </el-button>
            </span>
            <el-divider />
            <div style="min-height: 50px;">
              <el-tag
                v-for="rule in selectedSensitiveRules"
                :key="rule" 
                class="mx-1 my-1"
                closable
                @close="removeRule(rule)"
              >
                {{ rule }}
              </el-tag>
            </div>
          </div>
        </div>

        <!-- 步骤3: 高级配置 -->
        <div v-show="currentStep === 2" class="step-tasks">
          <el-checkbox v-model="scanTasks.checkAll" :indeterminate="scanTasks.indeterminate" @change="onCheckAllTasksChange">
            全选
          </el-checkbox>
          <el-divider />
          <el-checkbox-group v-model="scanTasks.checkedList" @change="onTasksChange" class="checkbox-horizontal">
            <el-checkbox v-for="item in taskOptions" :key="item.value" :label="item.value" class="task-checkbox">
              {{ item.title }}
            </el-checkbox>
          </el-checkbox-group>
          
          <!-- 任务描述（可选） -->
          <div class="task-descriptions mt-4">
            <div v-for="item in taskOptions" :key="item.value" class="task-desc">
              <div class="text-gray-500">{{ item.title }}: {{ item.desc }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="steps-action mt-4 flex justify-center">
        <el-button v-if="currentStep > 0" @click="prevStep">
          上一步
        </el-button>
        <el-button v-if="currentStep < 2" type="primary" @click="nextStep">
          下一步
        </el-button>
        <el-button v-if="currentStep === 2" type="primary" @click="submitForm" :loading="formLoading">
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
import { ControlTaskApi, ControlTaskVO } from '@/api/rag/controltask'
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
const fileNamePattern = ref('^(?!\\.deleted|\\.yli\\.part\\.).*')  // 默认过滤掉以.deleted和.yli.part.开头的文件
const contentPattern = ref('')
const fileSuffixExcludePattern = ref('')
const folderNameExcludePattern = ref('')
const selectedSensitiveRules = ref([])

// 扫描规则选项
const ruleOptions = [
  { title: "文档", value: '1' },
  { title: "音视频", value: '2' },
  { title: "其它", value: '6' }
]

// 扫描任务选项
const taskOptions = [
  { title: "元数据提取", value: '1', desc: '从文件中提取基本信息如大小、创建时间等'},
  { title: "内容提取", value: '2', desc: '提取文档的文本内容'},
  { title: "文档摘要", value: '4', desc: '生成文档内容的简要摘要'},
  { title: "语言识别", value: '8', desc: '识别文档的语言类型'},
  { title: "文本翻译", value: '16', desc: '将文档内容翻译成指定语言'},
  { title: "标签提取", value: '32', desc: '从文档内容提取关键标签'},
  { title: "实体提取", value: '64', desc: '识别和提取文档中的实体信息'}
]

// 内容提取相关常量
const CONTENT_DEPENDENCIES = ['4', '8', '16', '32', '64'] // 依赖于内容提取的功能
const CONTENT_EXTRACT_VALUE = '2' // 内容提取值

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

// 复选框状态
const scanRules = reactive({
  indeterminate: false,
  checkAll: true,
  checkedList: ['1', '2', '6'] as string[],
})

const scanTasks = reactive({
  indeterminate: false,
  checkAll: false,
  checkedList: ['2', '32', '4'] as string[],
})

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

// 复选框处理逻辑
const onRulesChange = (checkedValues: string[]) => {
  scanRules.indeterminate = checkedValues.length > 0 && checkedValues.length < ruleOptions.length
  scanRules.checkAll = checkedValues.length === ruleOptions.length
}

const onCheckAllRulesChange = (e: any) => {
  scanRules.checkedList = e ? ruleOptions.map(item => item.value) : []
  scanRules.indeterminate = false
  scanRules.checkAll = e
}

// 修正任务选择逻辑，确保依赖关系正确
const onTasksChange = (checkedValues: string[]) => {
  // 检查是否选中了任何依赖于内容提取的选项
  const hasContentDependency = checkedValues.some(value => CONTENT_DEPENDENCIES.includes(value))
  
  // 如果选中了依赖项，但没有选中内容提取，则自动选中内容提取
  if (hasContentDependency && !checkedValues.includes(CONTENT_EXTRACT_VALUE)) {
    checkedValues.push(CONTENT_EXTRACT_VALUE)
    // 显示选中依赖项的提示消息
    message.info('由于其他功能依赖于内容提取，已自动勾选内容提取')
  }

  // 更新选中列表
  scanTasks.checkedList = checkedValues
  
  // 更新全选和半选状态
  scanTasks.indeterminate = checkedValues.length > 0 && checkedValues.length < taskOptions.length
  scanTasks.checkAll = checkedValues.length === taskOptions.length
}

const onCheckAllTasksChange = (e: any) => {
  scanTasks.checkedList = e ? taskOptions.map(item => item.value) : []
  scanTasks.indeterminate = false
  scanTasks.checkAll = e
}

const removeRule = (rule: string) => {
  selectedSensitiveRules.value = selectedSensitiveRules.value.filter(item => item !== rule)
}

// 选择Cron表达式示例
const selectCronExample = (cronValue: string) => {
  formData.value.scheduleConf = cronValue
  message.success(`已设置调度配置: ${cronValue}`)
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
      
      // 解析scanRulesJson
      if (res.scanRulesJson) {
        const rules = JSON.parse(res.scanRulesJson || '{}')
        scanRules.checkedList = rules.fileTypes || []
        fileNamePattern.value = rules.fileNamePattern || ''
        contentPattern.value = rules.contentPattern || ''
        fileSuffixExcludePattern.value = rules.fileSuffixExcludePattern || ''
        folderNameExcludePattern.value = rules.folderNameExcludePattern || ''
        selectedSensitiveRules.value = rules.sensitiveRules || []
        
        // 更新全选和半选状态
        scanRules.checkAll = scanRules.checkedList.length === ruleOptions.length
        scanRules.indeterminate = scanRules.checkedList.length > 0 && scanRules.checkedList.length < ruleOptions.length
      }
      
      // 解析processTypes字段
      if (res.processTypes) {
        const processTypesValue = parseInt(res.processTypes)
        const types: string[] = []
        
        if (processTypesValue & 1) types.push('1')
        if (processTypesValue & 2) types.push('2')
        if (processTypesValue & 4) types.push('4')
        if (processTypesValue & 8) types.push('8')
        if (processTypesValue & 16) types.push('16')
        if (processTypesValue & 32) types.push('32')
        if (processTypesValue & 64) types.push('64')
        
        scanTasks.checkedList = types
        scanTasks.checkAll = types.length === taskOptions.length
        scanTasks.indeterminate = types.length > 0 && types.length < taskOptions.length
      }
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
    // 构造scanRulesJson
    formData.value.scanRulesJson = JSON.stringify({
      fileTypes: scanRules.checkedList,
      fileNamePattern: fileNamePattern.value,
      contentPattern: contentPattern.value,
      fileSuffixExcludePattern: fileSuffixExcludePattern.value,
      folderNameExcludePattern: folderNameExcludePattern.value,
      sensitiveRules: selectedSensitiveRules.value
    })

    // 计算processTypes的位运算值
    const processTypes = scanTasks.checkedList.reduce((acc, curr) => acc + parseInt(curr), 0)
    formData.value.processTypes = String(processTypes)

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
  }
  
  // 重置扫描规则和任务
  scanRules.indeterminate = false
  scanRules.checkAll = true
  scanRules.checkedList = ['1', '2', '6']
  
  scanTasks.indeterminate = false
  scanTasks.checkAll = false
  scanTasks.checkedList = ['2', '32', '4']
  
  fileNamePattern.value = '^(?!\\.deleted|\\.yli\\.part\\.).*'  // 默认过滤掉以.deleted和.yli.part.开头的文件
  contentPattern.value = ''
  fileSuffixExcludePattern.value = ''
  folderNameExcludePattern.value = ''
  selectedSensitiveRules.value = []
  
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

.step-scope,
.step-tasks {
  text-align: left;
}

.steps-action {
  margin-top: 24px;
}

.form-item-width {
  width: 100%;
  max-width: 560px; /* 统一表单元素宽度 */
}

.checkbox-horizontal {
  display: flex;
  flex-wrap: wrap;
  margin-top: 8px;
}

.checkbox-horizontal .el-checkbox {
  margin-right: 20px;
  margin-bottom: 8px;
}

.task-checkbox {
  width: 33%;
  margin-bottom: 10px;
}

.task-descriptions {
  padding-left: 8px;
  margin-top: 16px;
}

.task-desc {
  margin-bottom: 6px;
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