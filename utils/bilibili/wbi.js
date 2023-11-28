import md5 from 'md5'
import fetch from 'node-fetch'

const mixinKeyEncTab = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
  33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
  61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
  36, 20, 34, 44, 52
]

// 对 imgKey 和 subKey 进行字符顺序打乱编码
function getMixinKey (orig) {
  let temp = ''
  mixinKeyEncTab.forEach((n) => {
    temp += orig[n]
  })
  return temp.slice(0, 32)
}

// 为请求参数进行 wbi 签名
function encWbi (params, imgKey, subKey) {
  const mixinKey = getMixinKey(imgKey + subKey)
  const currTime = Math.round(Date.now() / 1000)
  const chrFilter = /[!'()*]/g
  let query = []
  Object.assign(params, { wts: currTime }) // 添加 wts 字段
  // 按照 key 重排参数
  Object.keys(params).sort().forEach((key) => {
    query.push(
        `${encodeURIComponent(key)}=${encodeURIComponent(
            // 过滤 value 中的 "!'()*" 字符
            params[key].toString().replace(chrFilter, '')
        )}`
    )
  })
  query = query.join('&')
  const wbiSign = md5(query + mixinKey) // 计算 w_rid
  return query + '&w_rid=' + wbiSign
}

// 获取最新的 img_key 和 sub_key
async function getWbiKeys () {
  const resp = await fetch('https://api.bilibili.com/x/web-interface/nav')
  const jsonContent = resp.data
  const imgUrl = jsonContent.data.wbi_img.img_url
  const subUrl = jsonContent.data.wbi_img.sub_url

  return {
    img_key: imgUrl.slice(
      imgUrl.lastIndexOf('/') + 1,
      imgUrl.lastIndexOf('.')
    ),
    sub_key: subUrl.slice(
      subUrl.lastIndexOf('/') + 1,
      subUrl.lastIndexOf('.')
    )
  }
}

// getWbiKeys().then((wbi_keys) => {
//   const query = encWbi(
//     {
//       foo: '114',
//       bar: '514',
//       baz: 1919810
//     },
//     wbi_keys.img_key,
//     wbi_keys.sub_key
//   )
//   console.log(query)
// })
