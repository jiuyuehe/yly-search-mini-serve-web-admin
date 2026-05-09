import request from '@/config/axios'

export const GraphApi = {
  getNerGraph: (esId: string) => request.get({ url: '/rag/graph/ner', params: { esId } }),
  getMailGraph: (params: { keyword?: string; personEmail?: string }) =>
    request.get({ url: '/rag/graph/mail', params })
}
