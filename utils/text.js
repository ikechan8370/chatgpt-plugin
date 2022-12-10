
/**
 * 判断一段markdown文档中是否包含代码
 * @param text
 */
export function codeExists (text = '') {
  let regex = /^[\s\S]*\$.*\$[\s\S]*/
  return regex.test(text)
}
