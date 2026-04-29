import request from '@/config/axios'

export interface ThemeVO {
  id?: number
  name?: string
  code?: string
  description?: string
  status?: number
  sort?: number
  tags?: ThemeTagVO[]
}

export interface ThemeTagVO {
  id?: number
  themeId?: number
  keyword?: string
  weight?: number
  synonyms?: string
  aiTagCount?: number
  fileCount?: number
  aiTags?: ThemeAiTagVO[]
}

export interface ThemeAiTagVO {
  tagName?: string
  totalWeight?: number
  fileCount?: number
  fileIds?: string[]
  source?: string
  themeId?: number
  themeName?: string
  themeTagId?: number
  themeTagName?: string
  unclassified?: boolean
}

export interface ThemeTagTreeVO {
  themes: ThemeVO[]
  unclassifiedTags: ThemeAiTagVO[]
  totalAiTagCount: number
  unclassifiedCount: number
}

export const TagSystemApi = {
  getThemeListWithTags: async (status?: number) => {
    return await request.get({ url: '/rag/ai/theme/list-with-tags', params: { status } })
  },

  createTheme: async (data: ThemeVO) => {
    return await request.post({ url: '/rag/ai/theme/create', data })
  },

  updateTheme: async (data: ThemeVO) => {
    return await request.post({ url: '/rag/ai/theme/update', data })
  },

  deleteTheme: async (id: number) => {
    return await request.delete({ url: '/rag/ai/theme/delete', params: { id } })
  },

  createThemeTag: async (data: ThemeTagVO) => {
    return await request.post({ url: '/rag/ai/theme/tag/create', data })
  },

  updateThemeTag: async (data: ThemeTagVO) => {
    return await request.post({ url: '/rag/ai/theme/tag/update', data })
  },

  deleteThemeTag: async (id: number) => {
    return await request.delete({ url: '/rag/ai/theme/tag/delete', params: { id } })
  },

  getTagSystemTree: async () => {
    return await request.get({ url: '/rag/ai/theme/tag-system/tree' })
  },

  getLevel3TagPage: async (params: any) => {
    return await request.get({ url: '/rag/ai/theme/tag-system/level3/page', params })
  },

  getFilesByTags: async (data: any) => {
    return await request.post({ url: '/rag/tag-cloud/files/by-tags', data })
  }
}
