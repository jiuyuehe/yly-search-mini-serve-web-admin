import request from '@/config/axios'

export const FaceApi = {
  getStats: async () => {
    return await request.get({ url: '/rag/face/stats' })
  },
  getPersonPage: async (params: any) => {
    return await request.get({ url: '/rag/face/person/page', params })
  },
  updatePerson: async (data: any) => {
    return await request.put({ url: '/rag/face/person/update', data })
  },
  updateInstance: async (data: any) => {
    return await request.put({ url: '/rag/face/instance/update', data })
  },
  deletePerson: async (id: number) => {
    return await request.delete({ url: '/rag/face/person/delete', params: { id } })
  },
  getInstances: async (params: any) => {
    return await request.get({ url: '/rag/face/instances', params })
  },
  search: async (params: any) => {
    return await request.get({ url: '/rag/face/search', params })
  },
  searchByImage: async (data: FormData, params?: any) => {
    return await request.post({
      url: '/rag/face/search/image',
      data,
      params,
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  analyzeImageIndex: async (params: any) => {
    return await request.post({ url: '/rag/images/index/face/analyze', params })
  },
  getImageFaces: async (params: any) => {
    return await request.get({ url: '/rag/images/index/face/list', params })
  }
}
