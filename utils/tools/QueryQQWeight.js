import { Tool } from 'langchain/agents'

export class QueryQQWeightTool extends Tool {
  name = 'qqweight'

  async _call (input) {
    const baseUrl = 'http://tc.tfkapi.top/API/qqqz.php?qq='
    try {
      let qq = input.match(/^\d+/)[0]
      let res = await fetch(`${baseUrl}${qq}`)
      res = await res.text()
      let weight = res.replace('查询成功，权重：', '')
      return `这个qq号的权重是${weight}`
    } catch (error) {
      logger.error(error)
      return "I don't know how to do that."
    }
  }

  description = 'Useful when you want to query the weight of a qq number. The input to this tool should be the qq number, it will return a single number as the weight of the qq number'
}
