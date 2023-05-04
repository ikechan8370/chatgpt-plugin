import md5 from 'md5-node'
import axios from 'axios'

// noinspection NonAsciiCharacters
export const transMap = { 中: 'zh', 日: 'jp', 文: 'wyw', 英: 'en', 俄: 'ru', 韩: 'kr' }
const errOr = {
  52001: '请求超时，请重试。',
  52002: '系统错误，请重试。',
  52003: '未授权用户，请检查appid是否正确或者服务是否开通。',
  54000: '必填参数为空，请检查是否少传参数。',
  54001: '签名错误，请检查您的签名生成方法。',
  54003: '访问频率受限，请降低您的调用频率，或进行身份认证后切换为高级版/尊享版。',
  54004: '账户余额不足，请前往管理控制台为账户充值。',
  54005: '长query请求频繁，请降低长query的发送频率，3s后再试。',
  58000: '客户端IP非法，检查个人资料里填写的IP地址是否正确，可前往开发者信息-基本信息修改。',
  58001: '译文语言方向不支持，检查译文语言是否在语言列表里。',
  58002: '服务当前已关闭，请前往管理控制台开启服务。',
  90107: '认证未通过或未生效，请前往我的认证查看认证进度。'
}
function Translate (config) {
  this.requestNumber = 0 // 请求次数
  this.config = {
    showProgress: 1, // 是否显示进度
    requestNumber: 1, // 最大请求次数
    agreement: 'http', // 协议
    ...config
  }
  this.baiduApi = `${this.config.agreement}://api.fanyi.baidu.com/api/trans/vip/translate`

  // 拼接url
  this.createUrl = (domain, form) => {
    let result = domain + '?'
    for (let key in form) {
      result += `${key}=${form[key]}&`
    }
    return result.slice(0, result.length - 1)
  }

  this.translate = async (value, ...params) => {
    let result = ''
    let from = 'auto'
    let to = 'en'

    if (params.length === 1) {
      to = transMap[params[0]] || to
    } else if (params.length === 2) {
      from = transMap[params[0]] || from
      to = transMap[params[1]] || to
    }
    if (typeof value === 'string') {
      const res = await this.requestApi(value, { from, to })
      result = res[0].dst
    }

    if (Array.isArray(value) || Object.prototype.toString.call(value) === '[object Object]') {
      result = await this._createObjValue(value, { from, to })
    }

    return result
  }

  this.requestApi = (value, params) => {
    if (this.requestNumber >= this.config.requestNumber) {
      return new Promise((resolve) => {
        setTimeout(() => {
          this.requestApi(value, params).then((res) => {
            resolve(res)
          })
        }, 1000)
      })
    }

    this.requestNumber++

    const { appid, secret } = this.config
    const q = value
    const salt = Math.random()
    const sign = md5(`${appid}${q}${salt}${secret}`)

    const fromData = {
      q: encodeURIComponent(q),
      sign,
      appid,
      salt,
      from: params.from || 'auto',
      to: params.to || 'en'
    }

    const fanyiApi = this.createUrl(this.baiduApi, fromData)

    return new Promise((resolve, reject) => {
      axios
        .get(fanyiApi)
        .then(({ data: res }) => {
          if (!res.error_code) {
            const resList = res.trans_result
            resolve(resList)
          } else {
            const errCode = res.error_code
            if (errOr[errCode]) {
              reject(new Error('翻译出错了~' + errOr[errCode]))
            } else {
              reject(new Error('翻译出错了~' + errCode))
            }
          }
        })
        .finally(() => {
          setTimeout(() => {
            this.requestNumber--
          }, 1000)
        })
    })
  }
  // 递归翻译数组或对象
  this._createObjValue = async (value, parames) => {
    let index = 0
    const obj = Array.isArray(value) ? [] : {}
    const strDatas = Array.isArray(value) ? value : Object.values(value)
    const reqData = strDatas
      .filter((item) => typeof item === 'string') // 过滤字符串
      .join('\n')
    const res = reqData ? await this.requestApi(reqData, parames) : []
    for (let key in value) {
      if (typeof value[key] === 'string') {
        obj[key] = res[index].dst
        index++
      }
      if (
        Array.isArray(value[key]) ||
          Object.prototype.toString.call(value[key]) === '[object Object]'
      ) {
        obj[key] = await this.translate(value[key], parames) // 递归翻译
      }
    }
    return obj
  }

  return this.translate
}

export default Translate
