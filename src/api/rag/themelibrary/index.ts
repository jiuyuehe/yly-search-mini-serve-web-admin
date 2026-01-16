import request from '@/config/axios'

// 主题库 VO
export interface ThemeLibraryVO {
  id?: number // 主键ID
  themeName?: string // 主题名称
  themeDesc?: string // 主题描述
  datasetId?: string // Dify知识库ID
  fileCount?: number // 文件数
  status?: boolean // 状态 0:启用 1:禁用
}

// 知识库 VO
export interface DatasetVO {
  name: string // 知识库名称
  description?: string // 知识库描述
  indexing_technique?: string // 索引技术
  permission?: string // 权限
  provider?: string // 提供者
  external_knowledge_api_id?: string // 外部知识库API_ID
  external_knowledge_id?: string // 外部知识库ID
}

// 主题库 API
export const ThemeLibraryApi = {
  // 查询主题库分页
  getThemeLibraryPage: async (params: any) => {
    return await request.get({ url: `/rag/theme-library/page`, params })
  },

  // 查询主题库详情
  getThemeLibrary: async (id: number) => {
    return await request.get({ url: `/rag/theme-library/get?id=` + id })
  },

  // 新增主题库
  createThemeLibrary: async (data: ThemeLibraryVO) => {
    return await request.post({ url: `/rag/theme-library/create`, data })
  },

  // 修改主题库
  updateThemeLibrary: async (data: ThemeLibraryVO) => {
    return await request.put({ url: `/rag/theme-library/update`, data })
  },

  // 删除主题库
  deleteThemeLibrary: async (id: number) => {
    return await request.delete({ url: `/rag/theme-library/delete?id=` + id })
  },

  // 导出主题库 Excel
  exportThemeLibrary: async (params) => {
    return await request.download({ url: `/rag/theme-library/export-excel`, params })
  },

  // 新增知识库
  createDataset: async (data: DatasetVO) => {
    return await request.post({ url: `/rag/theme-library/datasets`, data })
  },

  // 获取知识库列表
  getDatasets: async () => {
    return await request.get({ url: `/rag/theme-library/datasets` })
  },

  // 查询主题库分页
  getThemeLibraryFilePage: async (params: any) => {
    return await request.get({ url: `/rag/theme-library/files/page`, params })
  },

  // 添加文件到主题库
  handleThemeLibraryFile: async (data: ThemeLibraryVO) => {
    return await request.put({ url: `/rag/theme-library/file/handle`, data })
  },

  // 刷新主题库文件
  refreshThemeLibraryFile: async (id: number) => {
    return await request.get({ url: `/rag/theme-library/file/refresh?id=` + id })
  },
  
}
