export const buildBaseMetasPreviewUrl = (
  baseUrl: string,
  fileUrl: string,
  fileName = '',
  displayName = ''
) => {
  if (!baseUrl || !fileUrl) return ''
  try {
    const previewUrl = new URL(baseUrl)
    const query: string[] = [`url=${encodeURIComponent(fileUrl)}`]
    if (fileName) query.push(`fileName=${encodeURIComponent(fileName)}`)
    if (displayName) query.push(`displayName=${encodeURIComponent(displayName)}`)
    const joiner = previewUrl.search ? '&' : '?'
    return `${previewUrl.toString()}${joiner}${query.join('&')}`
  } catch (error) {
    console.error('构建 BaseMetas 预览地址失败:', error)
    return ''
  }
}
