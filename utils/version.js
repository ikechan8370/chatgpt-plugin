import fs from 'fs'

/**
 * from miao-plugin
 *
 * @type {any}
 */
let packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))

const yunzaiVersion = packageJson.version
const isV3 = yunzaiVersion[0] === '3'
let isMiao = false; let isTrss = false
let name = 'Yunzai-Bot'
if (packageJson.name === 'miao-yunzai') {
  isMiao = true
  name = 'Miao-Yunzai'
} else if (packageJson.name === 'trss-yunzai') {
  isMiao = true
  isTrss = true
  name = 'TRSS-Yunzai'
}

let Version = {
  isV3,
  isMiao,
  isTrss,
  name,
  get yunzai () {
    return yunzaiVersion
  }
}

export default Version
