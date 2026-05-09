export const generateMetadataPrompt = (schema: any[] = [], sampleContent = '这是示例文本内容') => {
  const fields = schema
    .map((field) => {
      const required = field.required ? '必填' : '可选'
      const description = field.description ? `，说明：${field.description}` : ''
      return `- ${field.label || field.key}（key: ${field.key}，类型: ${field.type}，${required}${description}）`
    })
    .join('\n')

  return `你是一个严谨的信息抽取助手。请从给定文本中抽取结构化元数据，并严格输出 JSON。

字段定义：
${fields}

要求：
1. 只输出 JSON 对象，不要输出解释性文字。
2. JSON key 必须与字段定义中的 key 完全一致。
3. 没有找到的信息填空字符串、空数组或 null，不要编造。
4. 日期、数字、邮箱、手机号等字段需要尽量规范化。

示例文本：
${sampleContent}`
}

export const readFileContent = async (file: File) => {
  return await file.text()
}

export const validateExtractedData = (data: Record<string, any>, schema: any[] = []) => {
  const missingFields = schema
    .filter((field) => field.required && (data[field.key] === undefined || data[field.key] === null || data[field.key] === ''))
    .map((field) => field.label || field.key)

  return {
    valid: missingFields.length === 0,
    message: missingFields.length ? `缺少必填字段：${missingFields.join('、')}` : ''
  }
}
