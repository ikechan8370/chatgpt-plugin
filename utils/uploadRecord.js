// import Contactable, { core } from 'oicq'
import querystring from 'querystring'
import fetch from 'node-fetch'
import fs from 'fs'
import os from 'os'
import util from 'util'
import stream from 'stream'
import crypto from 'crypto'
import child_process from 'child_process'
import { Config } from './config.js'
let module
try {
  module = await import('oicq')
} catch (err) {
  module = await import('icqq')
}
const { core } = module
const Contactable = module.default
// import { pcm2slk } from 'node-silk'
let errors = {}
let pcm2slk
try {
  pcm2slk = (await import('node-silk')).pcm2slk
} catch (e) {
  Config.debug && logger.error(e)
  logger.warn('未安装node-silk，如ffmpeg不支持amr编码请安装node-silk以支持语音模式')
}

async function uploadRecord (recordUrl) {
  const result = await getPttBuffer(recordUrl, Bot.config.ffmpeg_path)
  if (!result.buffer) {
    return false
  }
  let buf = result.buffer
  const hash = md5(buf)
  const codec = String(buf.slice(0, 7)).includes('SILK') ? 1 : 0
  const body = core.pb.encode({
    1: 3,
    2: 3,
    5: {
      1: Contactable.target,
      2: Bot.uin,
      3: 0,
      4: hash,
      5: buf.length,
      6: hash,
      7: 5,
      8: 9,
      9: 4,
      11: 0,
      10: Bot.apk.version,
      12: 1,
      13: 1,
      14: 0,
      15: 1
    }
  })
  const payload = await Bot.sendUni('PttStore.GroupPttUp', body)
  const rsp = core.pb.decode(payload)[5]
  rsp[2] && (0, errors.drop)(rsp[2], rsp[3])
  const ip = rsp[5]?.[0] || rsp[5]; const port = rsp[6]?.[0] || rsp[6]
  const ukey = rsp[7].toHex(); const filekey = rsp[11].toHex()
  const params = {
    ver: 4679,
    ukey,
    filekey,
    filesize: buf.length,
    bmd5: hash.toString('hex'),
    mType: 'pttDu',
    voice_encodec: codec
  }
  const url = `http://${int32ip2str(ip)}:${port}/?` + querystring.stringify(params)
  const headers = {
    'User-Agent': `QQ/${Bot.apk.version} CFNetwork/1126`,
    'Net-Type': 'Wifi'
  }
  await fetch(url, {
    method: 'POST', // post请求
    headers,
    body: buf
  })
  // await axios.post(url, buf, { headers });

  const fid = rsp[11].toBuffer()
  const b = core.pb.encode({
    1: 4,
    2: Bot.uin,
    3: fid,
    4: hash,
    5: hash.toString('hex') + '.amr',
    6: buf.length,
    11: 1,
    18: fid,
    30: Buffer.from([8, 0, 40, 0, 56, 0])
  })
  return {
    type: 'record', file: 'protobuf://' + Buffer.from(b).toString('base64')
  }
}

export default uploadRecord

async function getPttBuffer (file, ffmpeg = 'ffmpeg') {
  let buffer
  let time
  if (file instanceof Buffer || file.startsWith('base64://')) {
    // Buffer或base64
    const buf = file instanceof Buffer ? file : Buffer.from(file.slice(9), 'base64')
    const head = buf.slice(0, 7).toString()
    if (head.includes('SILK') || head.includes('AMR')) {
      return buf
    } else {
      const tmpfile = TMP_DIR + '/' + (0, uuid)()
      await fs.promises.writeFile(tmpfile, buf)
      return audioTrans(tmpfile, ffmpeg)
    }
  } else if (file.startsWith('http://') || file.startsWith('https://')) {
    // 网络文件
    // const readable = (await axios.get(file, { responseType: "stream" })).data;
    try {
      const headers = {
        'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 12; MI 9 Build/SKQ1.211230.001)'
      }
      let response = await fetch(file, {
        method: 'GET', // post请求
        headers
      })
      const buf = Buffer.from(await response.arrayBuffer())
      const tmpfile = TMP_DIR + '/' + (0, uuid)()
      await fs.promises.writeFile(tmpfile, buf)
      // await (0, pipeline)(readable.pipe(new DownloadTransform), fs.createWriteStream(tmpfile));
      const head = await read7Bytes(tmpfile)
      if (head.includes('SILK') || head.includes('AMR')) {
        fs.unlink(tmpfile, NOOP)
        buffer = buf
      } else {
        buffer = await audioTrans(tmpfile, ffmpeg)
      }
    } catch (err) {}
  } else {
    // 本地文件
    file = String(file).replace(/^file:\/{2}/, '')
    IS_WIN && file.startsWith('/') && (file = file.slice(1))
    const head = await read7Bytes(file)
    if (head.includes('SILK') || head.includes('AMR')) {
      buffer = await fs.promises.readFile(file)
    } else {
      buffer = await audioTrans(file, ffmpeg)
    }
  }
  return { buffer, time }
}

async function audioTrans (file, ffmpeg = 'ffmpeg') {
  return new Promise((resolve, reject) => {
    const tmpfile = TMP_DIR + '/' + (0, uuid)();
    (0, child_process.exec)(`${ffmpeg} -i "${file}" -f s16le -ac 1 -ar 24000 "${tmpfile}"`, async (error, stdout, stderr) => {
      try {
        resolve(pcm2slk(fs.readFileSync(tmpfile)))
      } catch {
        reject(new core.ApiRejection(ErrorCode.FFmpegPttTransError, '音频转码到pcm失败，请确认你的ffmpeg可以处理此转换'))
      } finally {
        fs.unlink(tmpfile, NOOP)
      }
    })
  })
}

async function read7Bytes (file) {
  const fd = await fs.promises.open(file, 'r')
  const buf = (await fd.read(Buffer.alloc(7), 0, 7, 0)).buffer
  fd.close()
  return buf
}

function uuid () {
  let hex = crypto.randomBytes(16).toString('hex')
  return hex.substr(0, 8) + '-' + hex.substr(8, 4) + '-' + hex.substr(12, 4) + '-' + hex.substr(16, 4) + '-' + hex.substr(20)
}
function int32ip2str (ip) {
  if (typeof ip === 'string') { return ip }
  ip = ip & 0xffffffff
  return [
    ip & 0xff,
    (ip & 0xff00) >> 8,
    (ip & 0xff0000) >> 16,
    (ip & 0xff000000) >> 24 & 0xff
  ].join('.')
}
const IS_WIN = os.platform() === 'win32'
/** 系统临时目录，用于临时存放下载的图片等内容 */
const TMP_DIR = os.tmpdir()
/** no operation */
const NOOP = () => { }
(0, util.promisify)(stream.pipeline)
/** md5 hash */
const md5 = (data) => (0, crypto.createHash)('md5').update(data).digest()

errors.LoginErrorCode = errors.drop = errors.ErrorCode = void 0
let ErrorCode;
(function (ErrorCode) {
  /** 客户端离线 */
  ErrorCode[ErrorCode.ClientNotOnline = -1] = 'ClientNotOnline'
  /** 发包超时未收到服务器回应 */
  ErrorCode[ErrorCode.PacketTimeout = -2] = 'PacketTimeout'
  /** 用户不存在 */
  ErrorCode[ErrorCode.UserNotExists = -10] = 'UserNotExists'
  /** 群不存在(未加入) */
  ErrorCode[ErrorCode.GroupNotJoined = -20] = 'GroupNotJoined'
  /** 群员不存在 */
  ErrorCode[ErrorCode.MemberNotExists = -30] = 'MemberNotExists'
  /** 发消息时传入的参数不正确 */
  ErrorCode[ErrorCode.MessageBuilderError = -60] = 'MessageBuilderError'
  /** 群消息被风控发送失败 */
  ErrorCode[ErrorCode.RiskMessageError = -70] = 'RiskMessageError'
  /** 群消息有敏感词发送失败 */
  ErrorCode[ErrorCode.SensitiveWordsError = -80] = 'SensitiveWordsError'
  /** 上传图片/文件/视频等数据超时 */
  ErrorCode[ErrorCode.HighwayTimeout = -110] = 'HighwayTimeout'
  /** 上传图片/文件/视频等数据遇到网络错误 */
  ErrorCode[ErrorCode.HighwayNetworkError = -120] = 'HighwayNetworkError'
  /** 没有上传通道 */
  ErrorCode[ErrorCode.NoUploadChannel = -130] = 'NoUploadChannel'
  /** 不支持的file类型(没有流) */
  ErrorCode[ErrorCode.HighwayFileTypeError = -140] = 'HighwayFileTypeError'
  /** 文件安全校验未通过不存在 */
  ErrorCode[ErrorCode.UnsafeFile = -150] = 'UnsafeFile'
  /** 离线(私聊)文件不存在 */
  ErrorCode[ErrorCode.OfflineFileNotExists = -160] = 'OfflineFileNotExists'
  /** 群文件不存在(无法转发) */
  ErrorCode[ErrorCode.GroupFileNotExists = -170] = 'GroupFileNotExists'
  /** 获取视频中的图片失败 */
  ErrorCode[ErrorCode.FFmpegVideoThumbError = -210] = 'FFmpegVideoThumbError'
  /** 音频转换失败 */
  ErrorCode[ErrorCode.FFmpegPttTransError = -220] = 'FFmpegPttTransError'
})(ErrorCode = errors.ErrorCode || (errors.ErrorCode = {}))
const ErrorMessage = {
  [ErrorCode.UserNotExists]: '查无此人',
  [ErrorCode.GroupNotJoined]: '未加入的群',
  [ErrorCode.MemberNotExists]: '幽灵群员',
  [ErrorCode.RiskMessageError]: '群消息发送失败，可能被风控',
  [ErrorCode.SensitiveWordsError]: '群消息发送失败，请检查消息内容',
  10: '消息过长',
  34: '消息过长',
  120: '在该群被禁言',
  121: 'AT全体剩余次数不足'
}
function drop (code, message) {
  if (!message || !message.length) { message = ErrorMessage[code] }
  throw new core.ApiRejection(code, message)
}
errors.drop = drop
/** 登录时可能出现的错误，不在列的都属于未知错误，暂时无法解决 */
let LoginErrorCode;
(function (LoginErrorCode) {
  /** 密码错误 */
  LoginErrorCode[LoginErrorCode.WrongPassword = 1] = 'WrongPassword'
  /** 账号被冻结 */
  LoginErrorCode[LoginErrorCode.AccountFrozen = 40] = 'AccountFrozen'
  /** 发短信太频繁 */
  LoginErrorCode[LoginErrorCode.TooManySms = 162] = 'TooManySms'
  /** 短信验证码错误 */
  LoginErrorCode[LoginErrorCode.WrongSmsCode = 163] = 'WrongSmsCode'
  /** 滑块ticket错误 */
  LoginErrorCode[LoginErrorCode.WrongTicket = 237] = 'WrongTicket'
})(LoginErrorCode = errors.LoginErrorCode || (errors.LoginErrorCode = {}))
