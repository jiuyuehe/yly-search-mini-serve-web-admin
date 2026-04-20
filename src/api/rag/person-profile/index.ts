import request from '@/config/axios'

export interface PersonProfileVO {
  id?: number
  personName: string
  aliasNames?: string
  gender?: string
  age?: number
  summary?: string
  status?: number
}

export const PersonProfileApi = {
  getPage: async (params: any) => {
    return await request.get({ url: '/rag/person-profile/page', params })
  },
  get: async (id: number) => {
    return await request.get({ url: '/rag/person-profile/get', params: { id } })
  },
  create: async (data: PersonProfileVO) => {
    return await request.post({ url: '/rag/person-profile/create', data })
  },
  update: async (data: PersonProfileVO) => {
    return await request.put({ url: '/rag/person-profile/update', data })
  },
  delete: async (id: number) => {
    return await request.delete({ url: '/rag/person-profile/delete', params: { id } })
  },
  getEvidencePage: async (params: any) => {
    return await request.get({ url: '/rag/person-profile/evidence-page', params })
  },
  getGraph: async (keyword?: string) => {
    return await request.get({ url: '/rag/person-profile/graph', params: { keyword } })
  },
  backfillNer: async (limit?: number) => {
    return await request.post({ url: '/rag/person-profile/backfill-ner', params: { limit } })
  },
  getMergeCandidatePage: async (params: any) => {
    return await request.get({ url: '/rag/person-profile/merge-candidate-page', params })
  },
  scanMergeCandidates: async () => {
    return await request.post({ url: '/rag/person-profile/scan-merge-candidates' })
  },
  approveMergeCandidate: async (id: number) => {
    return await request.post({ url: '/rag/person-profile/approve-merge-candidate', params: { id } })
  },
  rejectMergeCandidate: async (id: number) => {
    return await request.post({ url: '/rag/person-profile/reject-merge-candidate', params: { id } })
  }
}
