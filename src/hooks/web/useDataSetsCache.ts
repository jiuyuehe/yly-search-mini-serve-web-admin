import { ThemeLibraryApi } from '@/api/rag/themelibrary'
import { ref } from 'vue'

export function useDataSetsCache() {
  const datasetNameCache = ref<Map<number, string>>(new Map())
  const datasetList = ref<any[]>([])
  let isLoading = false
  let loadPromise: Promise<void> | null = null

  async function ensureDatasetData() {
    if (datasetNameCache.value.size > 0) return
    
    if (isLoading) {
      return loadPromise 
    }

    isLoading = true
    loadPromise = ThemeLibraryApi.getDatasets().then(list => {
      datasetList.value = list 
      list.forEach(item => {
        datasetNameCache.value.set(item.id, item.name)
      })
    }).finally(() => {
      isLoading = false 
      loadPromise = null
    })

    return loadPromise
  }

  ensureDatasetData()

  function getDatasetName(id: number) {
    return datasetNameCache.value.get(id) || id.toString()
  }

  async function getDatasetList() {
    if (datasetList.value.length === 0) {
      await ensureDatasetData()
    }
    return Promise.resolve(datasetList.value)
  }

  async function refreshDatasetCache() {  
    await ensureDatasetData()
  }

  return {
    ensureDatasetData,
    getDatasetName,
    getDatasetList,
    refreshDatasetCache
  }
}