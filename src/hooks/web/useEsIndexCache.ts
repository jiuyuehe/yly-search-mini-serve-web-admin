import { EsIndexApi } from '@/api/rag/esindex'
import { ref } from 'vue'

export function useEsIndexCache() {
  const indexCache = ref<Map<number, string>>(new Map())
  const indexList = ref<any[]>([])
  let isLoading = false
  let loadPromise: Promise<void> | null = null

  async function ensureIndexData() {
    if (indexCache.value.size > 0) return
    
    if (isLoading) {
      return loadPromise 
    }

    isLoading = true
    loadPromise = EsIndexApi.listEsIndexNames().then(list => {
      indexList.value = list
      list.forEach(item => {
        indexCache.value.set(item.id, item.indexName)
      })
    }).finally(() => {
      isLoading = false 
      loadPromise = null
    })

    return loadPromise
  }

  function getIndexName(id: number) {
    return indexCache.value.get(id) || id.toString()
  }

  function getIndexList() {
    if (indexList.value.length === 0) {
      ensureIndexData()
    }
    return Promise.resolve(indexList.value)
  }

  return {
    ensureIndexData,
    getIndexName,
    getIndexList
  }
}