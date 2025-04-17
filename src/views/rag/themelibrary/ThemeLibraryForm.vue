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
        <el-select :disabled="!!formData.id" v-model="formData.datasetId">
          <el-option
            v-for="item in datasetList"
            :key="item.id"
            :label="item.name"
            :value="item.id"
          />
        </el-select>
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
              <el-input v-model="item.content" placeholder="请输入匹配内容" />
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
</template>
<script setup lang="ts">
import { ThemeLibraryApi, ThemeLibraryVO } from '@/api/rag/themelibrary'
import { useDataSetsCache } from '@/hooks/web/useDataSetsCache'
import { DICT_TYPE, getIntDictOptions } from '@/utils/dict'
import { Delete, Plus } from '@element-plus/icons-vue'
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
const formData = ref({
  id: undefined,
  themeName: undefined,
  themeDesc: undefined,
  datasetId: undefined,
  fileCount: undefined,
  status: undefined,
  matchItems: [] as Array<{ id?: number, content: string }> // 匹配项列表
})
const formRules = reactive({
  themeName: [{ required: true, message: '主题名称不能为空', trigger: 'blur' }],
})
const formRef = ref() // 表单 Ref

/** 添加匹配项 */
const addMatchItem = () => {
  formData.value.matchItems.push({ content: '' })
}

/** 删除匹配项 */
const removeMatchItem = (index: number) => {
  formData.value.matchItems.splice(index, 1)
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
      formData.value = {
        ...data,
        // 如果后端没有返回匹配项列表，则初始化为空数组
        matchItems: data.matchItems || []
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
  // 提交请求
  formLoading.value = true
  try {
    const data = formData.value as unknown as ThemeLibraryVO
    if (formType.value === 'create') {
      await ThemeLibraryApi.createThemeLibrary(data)
      message.success(t('common.createSuccess'))
    } else {
      await ThemeLibraryApi.updateThemeLibrary(data)
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
    themeName: undefined,
    themeDesc: undefined,
    datasetId: undefined,
    fileCount: undefined,
    status: undefined,
    matchItems: []
  }
  formRef.value?.resetFields()
}
</script>

<style lang="scss" scoped>
.match-list {
  width: 100%;
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