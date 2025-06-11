<template>
  <Dialog :title="dialogTitle" v-model="dialogVisible">
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="100px"
      v-loading="formLoading"
    >
      <el-form-item label="名称" prop="themeName">
        <el-input v-model="formData.themeName" placeholder="请输入名称" />
      </el-form-item>
      <el-form-item label="描述" prop="themeDesc">
        <el-input v-model="formData.themeDesc" placeholder="请输入描述" />
      </el-form-item>
      <el-form-item label="知识库" prop="datasetId">
        <div class="dataset-select-container">
          <el-select 
            :disabled="!!formData.id && formData._datasetExists" 
            v-model="formData.datasetId" 
            style="flex-grow: 1; margin-right: 8px;" 
            placeholder="请选择知识库"
            @change="handleDatasetChange"
          >
            <el-option
              v-for="item in datasetList"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
          <!-- 添加新的知识库按钮 -->
          <el-button 
            type="primary" 
            plain 
            size="small" 
            @click="openCreateDatasetDialog"
            v-if="!formData.id || !formData._datasetExists"
          >
            <el-icon><Plus /></el-icon>
          </el-button>
        </div>
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="formData.status" placeholder="请选择状态" clearable>
          <el-option
            v-for="dict in getIntDictOptions(DICT_TYPE.COMMON_STATUS)"
            :key="dict.value"
            :label="dict.label"
            :value="dict.value"
          />
        </el-select>
      </el-form-item>
      
      <!-- 匹配部分 -->
      <el-divider />

      <el-form-item label="匹配">
        <div class="match-list">
          <!-- 匹配项列表 -->
          <template v-if="formData.matchItems && formData.matchItems.length > 0">
            <div v-for="(item, index) in formData.matchItems" :key="index" class="match-item">
              <el-input v-model="item.content" placeholder="请输入匹配内容" class="content-input" />
              
              <div class="match-item-settings">
                <el-tooltip content="匹配数" placement="top">
                  <el-input-number v-model="item.matchCount" :min="1" :max="20" :step="1" size="small" controls-position="right" />
                </el-tooltip>
                
                <el-tooltip :content="`匹配度：${(item.matchScore * 100).toFixed(0)}%`" placement="top">
                  <el-slider v-model="item.matchScore" :min="0" :max="1" :step="0.05" size="small" class="score-slider" />
                </el-tooltip>
              </div>
              
              <el-button type="danger" plain size="small" class="delete-btn" @click="removeMatchItem(index)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </template>
          
          <!-- 添加按钮，始终显示 -->
          <div class="match-add">
            <el-button type="primary" plain size="small" @click="addMatchItem">
              <el-icon><Plus /></el-icon>
            </el-button>
          </div>
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="submitForm" type="primary" :disabled="formLoading">确 定</el-button>
      <el-button @click="dialogVisible = false">取 消</el-button>
    </template>
  </Dialog>

  <!-- 创建知识库弹窗 -->
  <el-dialog
    v-model="createDatasetDialogVisible"
    title="创建知识库"
    width="30%"
    append-to-body
    destroy-on-close
  >
    <el-form
      ref="datasetFormRef"
      :model="datasetForm"
      :rules="datasetFormRules"
      label-width="80px"
      v-loading="datasetFormLoading"
    >
    <el-form-item label="名称" prop="name">
        <el-input v-model="datasetForm.name" placeholder="请输入知识库名称" />
      </el-form-item>
      <el-form-item label="描述" prop="description">
        <el-input v-model="datasetForm.description" type="textarea" placeholder="请输入知识库描述" />
      </el-form-item>
      <el-form-item label="索引模式" prop="indexing_technique">
        <el-select v-model="datasetForm.indexing_technique" placeholder="请选择索引模式" class="w-full">
          <el-option label="高质量" value="high_quality" />
          <el-option label="经济" value="economy" />
        </el-select>
      </el-form-item>
      <el-form-item label="权限" prop="permission">
        <el-select v-model="datasetForm.permission" placeholder="请选择权限" class="w-full">
          <el-option label="仅自己" value="only_me" />
          <el-option label="所有团队成员" value="all_team_members" />
          <el-option label="部分团队成员" value="partial_members" />
        </el-select>
      </el-form-item>
      <el-form-item label="提供者" prop="provider">
        <el-select v-model="datasetForm.provider" placeholder="请选择提供者" class="w-full" @change="handleProviderChange">
          <el-option label="上传文件" value="vendor" />
          <el-option label="外部知识库" value="external" />
        </el-select>
      </el-form-item>
      
      <!-- 仅当提供者为"外部知识库"时显示 -->
      <template v-if="datasetForm.provider === 'external'">
        <el-form-item label="API ID" prop="external_knowledge_api_id">
          <el-input v-model="datasetForm.external_knowledge_api_id" placeholder="请输入外部知识库API_ID" />
        </el-form-item>
        <el-form-item label="知识库 ID" prop="external_knowledge_id">
          <el-input v-model="datasetForm.external_knowledge_id" placeholder="请输入外部知识库ID" />
        </el-form-item>
      </template>
    </el-form>
    <template #footer>
      <el-button @click="createDatasetDialogVisible = false">取 消</el-button>
      <el-button type="primary" @click="submitDatasetForm" :loading="datasetFormLoading">确 定</el-button>
    </template>
  </el-dialog>
</template>
<script setup lang="ts">
import { DatasetVO, ThemeLibraryApi, ThemeLibraryVO } from '@/api/rag/themelibrary';
import { useDataSetsCache } from '@/hooks/web/useDataSetsCache';
import { DICT_TYPE, getIntDictOptions } from '@/utils/dict';
import { Delete, Plus } from '@element-plus/icons-vue'; // 导入 Plus 和 Delete 图标
/** 主题库 表单 */
defineOptions({ name: 'ThemeLibraryForm' })

const { t } = useI18n() // 国际化
const message = useMessage() // 消息弹窗
const { getDatasetList } = useDataSetsCache()
const datasetList = ref<any[]>([])

const dialogVisible = ref(false) // 弹窗的是否展示
const dialogTitle = ref('') // 弹窗的标题
const formLoading = ref(false) // 表单的加载中：1）修改时的数据加载；2）提交的按钮禁用
const formType = ref('') // 表单的类型：create - 新增；update - 修改
const formData = ref<{
  id?: number
  themeName?: string
  themeDesc?: string
  datasetId?: number
  fileCount?: number
  status?: number
  matchItems: Array<{ id?: number, content: string, matchCount: number, matchScore: number }>
  _datasetExists?: boolean
}>({
  id: undefined,
  themeName: undefined,
  themeDesc: undefined,
  datasetId: undefined,
  fileCount: undefined,
  status: undefined,
  matchItems: [],
  _datasetExists: true // 新增：知识库是否存在的状态，存储在表单数据中
})
const formRules = reactive({
  themeName: [{ required: true, message: '主题名称不能为空', trigger: 'blur' }], 
  datasetId: [{ required: true, message: '知识库不能为空', trigger: 'blur' }]
})
const formRef = ref() // 表单 Ref

// 创建知识库相关变量
const createDatasetDialogVisible = ref(false)
const datasetFormLoading = ref(false)
const datasetForm = ref({
  name: '',
  description: '',
  indexing_technique: 'high_quality', // 默认高质量
  permission: 'only_me',              // 默认仅自己
  provider: 'vendor',                 // 默认上传文件
  external_knowledge_api_id: '',
  external_knowledge_id: ''
})
const datasetFormRules = reactive({
  name: [{ required: true, message: '知识库名称不能为空', trigger: 'blur' }]
})
const datasetFormRef = ref()

/** 处理知识库选择变更 */
const handleDatasetChange = async (value) => {
  if (!value) return
  
  // 验证新选择的知识库是否存在
  formLoading.value = true
  try {
    const exists = await validateDatasetExists(value)
    // 不立即更新_datasetExists状态，而是在提交表单成功后更新
    
    if (!exists) {
      message.warning('所选知识库不存在，请重新选择')
    }
  } finally {
    formLoading.value = false
  }
}

/** 打开创建知识库弹窗 */
const openCreateDatasetDialog = () => {
  createDatasetDialogVisible.value = true
  datasetForm.value = {
    name: '',
    description: '',
    indexing_technique: 'high_quality', // 默认高质量
    permission: 'only_me',              // 默认仅自己
    provider: 'vendor',                 // 默认上传文件
    external_knowledge_api_id: '',
    external_knowledge_id: ''
  }
}

/** 处理提供者变更 */
const handleProviderChange = (value) => {
  if (value !== 'external') {
    // 如果不是外部知识库，清空相关字段
    datasetForm.value.external_knowledge_api_id = ''
    datasetForm.value.external_knowledge_id = ''
  }
}

/** 提交创建知识库表单 */
const submitDatasetForm = async () => {
  // 校验表单
  await datasetFormRef.value.validate()
  // 提交请求
  datasetFormLoading.value = true
  try {
    const result = await ThemeLibraryApi.createDataset(datasetForm.value as DatasetVO)
    message.success('创建知识库成功')
    createDatasetDialogVisible.value = false
    
    // 刷新知识库列表
    datasetList.value = await getDatasetList()
    
    // 如果创建成功，添加到知识库列表中
    if (result && result.id) {
      // 将新创建的知识库添加到列表中
      const newDataset = {
        id: result.id,
        name: datasetForm.value.name,
        description: datasetForm.value.description
      }
      
      // 避免重复添加
      const existingIndex = datasetList.value.findIndex(item => item.id === result.id)
      if (existingIndex === -1) {
        datasetList.value.push(newDataset)
      }
      
      // 自动选择新创建的知识库
      formData.value.datasetId = result.id
      // 设置知识库存在状态为true
      formData.value._datasetExists = true
    }
  } catch (error) {
    console.error('创建知识库失败', error)
    message.error('创建知识库失败')
  } finally {
    datasetFormLoading.value = false
  }
}

/** 添加匹配项 */
const addMatchItem = () => {
  // 查找现有项中的最大id
  const maxId = formData.value.matchItems.reduce((max, item) => 
    (item.id && item.id > max) ? item.id : max, 0);
  
  // 使用最大id + 1作为新项的id，并添加匹配数量和匹配分数默认值
  formData.value.matchItems.push({ 
    id: maxId + 1, 
    content: '',
    matchCount: 5,    // 默认匹配数量为5
    matchScore: 0.5   // 默认匹配分数为0.5 (50%)
  });
}

/** 删除匹配项 */
const removeMatchItem = (index: number) => {
  formData.value.matchItems.splice(index, 1)
}

/** 验证知识库是否存在 */
const validateDatasetExists = async (datasetId) => {
  if (!datasetId) return false
  
  try {
    // 获取所有知识库
    const datasets = await ThemeLibraryApi.getDatasets()
    
    // 检查指定的知识库ID是否存在
    const exists = datasets.some(dataset => dataset.id === datasetId)
    return exists
  } catch (error) {
    console.error('验证知识库出错', error)
    return false
  }
}

/** 打开弹窗 */
const open = async (type: string, id?: number) => {
  datasetList.value = await getDatasetList()
  dialogVisible.value = true
  dialogTitle.value = t('action.' + type)
  formType.value = type
  resetForm()
  
  // 修改时，设置数据
  if (id) {
    formLoading.value = true
    try {
      const data = await ThemeLibraryApi.getThemeLibrary(id)
      
      // 处理匹配项，将JSON字符串转换为对象数组
      let matchItemsArray: Array<{ id?: number, content: string, matchCount: number, matchScore: number }> = []
      if (data.matchItems) {
        try {
          // 尝试解析JSON字符串
          const parsedItems = JSON.parse(data.matchItems)
          
          // 确保每个匹配项都有matchCount和matchScore字段
          matchItemsArray = parsedItems.map((item: any) => ({
            ...item,
            matchCount: item.matchCount || 5,    // 如果不存在，设置默认值5
            matchScore: item.matchScore || 0.5   // 如果不存在，设置默认值0.5
          }))
        } catch (e) {
          console.error('解析matchItems失败:', e)
          matchItemsArray = []
        }
      }

      // 如果有关联的知识库ID，验证知识库是否存在
      let datasetExists = true
      if (data.datasetId) {
        datasetExists = await validateDatasetExists(data.datasetId)
        if (!datasetExists) {
          // 如果知识库不存在，给出警告
          message.warning('关联的知识库不存在，请重新选择知识库')
        }
      }
      
      formData.value = {
        ...data,
        // 使用解析后的匹配项数组
        matchItems: matchItemsArray || [],
        // 设置知识库存在状态
        _datasetExists: datasetExists
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
  // 校验表单
  await formRef.value.validate()

  // 如果是创建或修改操作，先验证知识库是否存在
  if (formData.value.datasetId) {
    formLoading.value = true
    const exists = await validateDatasetExists(formData.value.datasetId)
    
    if (!exists) {
      message.error('所选知识库不存在，请联系管理员或者重新选择')
      formLoading.value = false
      return
    }
  }

  // 提交请求
  formLoading.value = true
  try {
    // 深拷贝表单数据，排除内部状态属性
    const submitData = { ...formData.value }
    // 删除内部状态属性，避免提交到后端
    delete submitData._datasetExists
    
    // 将 matchItems 转换为 JSON 字符串，以便后端处理
    if (submitData.matchItems && Array.isArray(submitData.matchItems)) {
      submitData.matchItems = JSON.stringify(submitData.matchItems) as unknown as Array<{ id?: number, content: string, matchCount: number, matchScore: number }>
    }
    
    if (formType.value === 'create') {
      await ThemeLibraryApi.createThemeLibrary(submitData as unknown as ThemeLibraryVO)
      message.success(t('common.createSuccess'))
    } else {
      await ThemeLibraryApi.updateThemeLibrary(submitData as unknown as ThemeLibraryVO)
      message.success(t('common.updateSuccess'))
    }
    
    // 提交成功后，更新知识库存在状态为true
    // 这样下次打开编辑弹窗时知识库选择框会恢复禁用状态
    formData.value._datasetExists = true
    
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
    themeName: undefined,
    themeDesc: undefined,
    datasetId: undefined,
    fileCount: undefined,
    status: 0, // 默认设置为开启状态
    matchItems: [],
    _datasetExists: true
  }
  formRef.value?.resetFields()
}
</script>

<style lang="scss" scoped>
.dataset-select-container {
  display: flex;
  align-items: center;
  width: 100%;
}

.match-container {
  display: flex;
  width: 100%;
}

.match-list {
  flex: 1;
  margin-right: 20px;
}

.match-settings {
  width: 250px;
  padding-left: 20px;
  border-left: 1px solid #eee;
}

.match-item {
  display: flex;
  margin-bottom: 15px;
  align-items: center;
  flex-wrap: wrap;
}

.content-input {
  flex: 1;
  min-width: 200px;
  margin-right: 10px;
}

.match-item-settings {
  display: flex;
  align-items: center;
  margin: 0 10px;
}

.score-slider {
  width: 150px;
  margin: 0 10px;
}

.setting-item {
  margin-bottom: 20px;
}

.match-item {
  display: flex;
  margin-bottom: 10px;
  align-items: center;
  
  .el-input {
    flex: 1;
    margin-right: 8px;
  }
  
  .delete-btn {
    flex-shrink: 0;
  }
}

.match-add {
  display: flex;
  justify-content: center;
  margin-top: 10px;
}
</style>