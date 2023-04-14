import _ from 'lodash'
import fs from 'fs'
import { mkdirs } from './common.js'
export function readPrompts () {
  const _path = process.cwd()
  let prompts = []
  if (fs.existsSync(`${_path}/plugins/chatgpt-plugin/prompts`)) {
    if (fs.existsSync(`${_path}/plugins/chatgpt-plugin/prompts`)) {
      const files = fs.readdirSync(`${_path}/plugins/chatgpt-plugin/prompts`)
      const txtFiles = files.filter(file => file.endsWith('.txt'))
      txtFiles.forEach(txtFile => {
        let name = _.trimEnd(txtFile, '.txt')
        const content = fs.readFileSync(`${_path}/plugins/chatgpt-plugin/prompts/${txtFile}`, 'utf8')
        prompts.push({
          name,
          content
        })
      })
    }
  }
  return prompts
}

export function getPromptByName (name) {
  if (!name) {
    return null
  }
  let prompts = readPrompts()
  let hits = prompts.filter(p => p.name.trim() === name.trim())
  if (hits && hits.length > 0) {
    return hits[0]
  } else {
    return null
  }
}

export function saveOnePrompt (name, content) {
  const _path = process.cwd()
  mkdirs(`${_path}/plugins/chatgpt-plugin/prompts`)
  let filePath = `${_path}/plugins/chatgpt-plugin/prompts/${name}.txt`
  fs.writeFileSync(filePath, content)
}

export function deleteOnePrompt (name) {
  const _path = process.cwd()
  mkdirs(`${_path}/plugins/chatgpt-plugin/prompts`)
  let filePath = `${_path}/plugins/chatgpt-plugin/prompts/${name}.txt`
  fs.unlinkSync(filePath)
}
