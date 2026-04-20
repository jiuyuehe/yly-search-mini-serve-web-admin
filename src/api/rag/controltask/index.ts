import request from '@/config/axios'

// 布控任务 VO
export interface ControlTaskVO {
  id: number // 主键ID
  indexId: number // es索引ID
  taskName: string // 布控任务名称
  taskDesc: string // 布控描述
  contentJson: string // 布控内容配置JSON
  totalFiles: number // 布控文件总数
  fileType: string // 文件类型：ALL/OFFICE/IMAGE/VIDEO/CUSTOM
  processTypes: string // 处理类型：TEXT,VOICE,FACE,OBJECT
  storageId: number // 存储位置ID
  knowledgeBaseId: number // 知识库ID
  scheduleType: boolean // 调度类型：0-立即执行 1-定时执行 2-周期执行
  scheduleConf: string // 调度配置(cron表达式或时间配置)
  status: number // 状态：0-未开始 1-进行中 2-暂停 3-已完成
  resultCount: number // 布控结果数量
  lastExecuteTime: Date // 最后执行时间
  faceCount: number // 布控人脸数量
  textCount: number // 布控文本数量
  objectCount: number // 布控物品数量
}

// 布控任务 API
export const ControlTaskApi = {
  // 查询布控任务分页
  getControlTaskPage: async (params: any) => {
    return await request.get({ url: `/rag/control-task/page`, params })
  },

  // 查询布控任务详情
  getControlTask: async (id: number) => {
    return await request.get({ url: `/rag/control-task/get?id=` + id })
  },

  getControlTaskDetail: async (id: number, page: number, pageSize: number) => {
    return await request.get({ url: `/rag/control-task/get-task-detail?id=${id}&page=${page}&pageSize=${pageSize}` })
  },

  getControlTaskStatistics: async (id: number) => {
    return await request.get({ url: `/rag/control-task/statistics?id=${id}` })
  },

  getUnifiedDetailPage: async (params: any) => {
    return await request.get({ url: `/rag/control-task/detail-page`, params })
  },

  backfillFormatGroup: async (params?: any) => {
    return await request.post({ url: `/rag/control-task/backfill-format-group`, params })
  },

  // 新增布控任务
  createControlTask: async (data: ControlTaskVO) => {
    return await request.post({ url: `/rag/control-task/create`, data })
  },

  // 启动布控任务
  startControlTask: async (data: any) => {
    return await request.post({ url: `/rag/control-task/start/`+data.id })
  },

  // 清空布控任务
  resetTask: async (data: any) => {
    return await request.post({ url: `/rag/control-task/re-set/`+data.id })
  },
  // 修改布控任务
  updateControlTask: async (data: ControlTaskVO) => {
    return await request.put({ url: `/rag/control-task/update`, data })
  },

  // 删除布控任务
  deleteControlTask: async (id: number) => {
    return await request.delete({ url: `/rag/control-task/delete?id=` + id })
  },

  // 调整布控任务
  stopControlTask: async (data: any) => {
    return await request.post({ url: `/rag/control-task/operation`, data })
  },

  // 导出布控任务 Excel
  exportControlTask: async (params) => {
    return await request.download({ url: `/rag/control-task/export-excel`, params })
  },
}
