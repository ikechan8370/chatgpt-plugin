import plugin from '../../../lib/plugins/plugin.js'
import { createRequire } from 'module'
import _ from 'lodash'
import { Restart } from '../../other/restart.js'
import fs from 'fs'
import {} from "../utils/common.js";

const _path = process.cwd()
const require = createRequire(import.meta.url)
const { exec, execSync } = require('child_process')

const checkAuth = async function (e) {
  if (!e.isMaster) {
    e.reply(`ֻ�����˲�������ChatGPTŶ~(*/�أ�*)`)
    return false
  }
  return true
}

// �Ƿ��ڸ�����
let uping = false

/**
 * ����������
 */
export class Update extends plugin {
  constructor () {
    super({
      name: 'chatgpt���²��',
      event: 'message',
      priority: 1000,
      rule: [
        {
          reg: '^#?(chat|chatgpt)(���)?(ǿ��)?����$',
          fnc: 'update'
        }
      ]
    })
  }

 


  /**
   * rule - ����chatgpt���
   * @returns
   */
  async update () {
    if (!this.e.isMaster) return false

    /** ����Ƿ����ڸ����� */
    if (uping) {
      await this.reply('�������������..�����ظ�����')
      return
    }

    /** ���git��װ */
    if (!(await this.checkGit())) return

    const isForce = this.e.msg.includes('ǿ��')

    /** ִ�и��� */
    await this.runUpdate(isForce)

    /** �Ƿ���Ҫ���� */
    if (this.isUp) {
      // await this.reply("������ϣ����������̺���Ч")
      setTimeout(() => this.restart(), 2000)
    }
  }

  restart () {
    new Restart(this.e).restart()
  }

  /**
   * chatgpt������º���
   * @param {boolean} isForce �Ƿ�Ϊǿ�Ƹ���
   * @returns
   */
  async runUpdate (isForce) {
    let command = 'git -C ./plugins/chatgpt-plugin/ pull --no-rebase'
    if (isForce) {
      command = `git -C ./plugins/chatgpt-plugin/ checkout . && ${command}`
      this.e.reply('����ִ��ǿ�Ƹ��²��������Ե�')
    } else {
      this.e.reply('����ִ�и��²��������Ե�')
    }
    /** ��ȡ�ϴ��ύ��commitId�����ڻ�ȡ��־ʱ�ж������ĸ�����־ */
    this.oldCommitId = await this.getcommitId('chatgpt-plugin')
    uping = true
    let ret = await this.execSync(command)
    uping = false

    if (ret.error) {
      logger.mark(`${this.e.logFnc} ����ʧ�ܣ�chatgpt-plugin`)
      this.gitErr(ret.error, ret.stdout)
      return false
    }

    /** ��ȡ����ύ������ʱ�� */
    let time = await this.getTime('chatgpt-plugin')

    if (/(Already up[ -]to[ -]date|�Ѿ������µ�)/.test(ret.stdout)) {
      await this.reply(`chatgpt-plugin�Ѿ������°汾\n������ʱ�䣺${time}`)
    } else {
      await this.reply(`chatgpt-plugin\n������ʱ�䣺${time}`)
      this.isUp = true
      /** ��ȡchatgpt����ĸ�����־ */
      let log = await this.getLog('chatgpt-plugin')
      await this.reply(log)
    }

    logger.mark(`${this.e.logFnc} ������ʱ�䣺${time}`)

    return true
  }

  /**
   * ��ȡchatgpt����ĸ�����־
   * @param {string} plugin �������
   * @returns
   */
  async getLog (plugin = '') {
    let cm = `cd ./plugins/${plugin}/ && git log  -20 --oneline --pretty=format:"%h||[%cd]  %s" --date=format:"%m-%d %H:%M"`

    let logAll
    try {
      logAll = await execSync(cm, { encoding: 'utf-8' })
    } catch (error) {
      logger.error(error.toString())
      this.reply(error.toString())
    }

    if (!logAll) return false

    logAll = logAll.split('\n')

    let log = []
    for (let str of logAll) {
      str = str.split('||')
      if (str[0] == this.oldCommitId) break
      if (str[1].includes('Merge branch')) continue
      log.push(str[1])
    }
    let line = log.length
    log = log.join('\n\n')

    if (log.length <= 0) return ''

    let end = ''
    end =
      '������ϸ��Ϣ����ǰ��github�鿴\nhttps://github.com/ikechan8370/chatgpt-plugin'

    log = await this.makeForwardMsg(`chatgpt-plugin������־����${line}��`, log, end)

    return log
  }

  /**
   * ��ȡ�ϴ��ύ��commitId
   * @param {string} plugin �������
   * @returns
   */
  async getcommitId (plugin = '') {
    let cm = `git -C ./plugins/${plugin}/ rev-parse --short HEAD`

    let commitId = await execSync(cm, { encoding: 'utf-8' })
    commitId = _.trim(commitId)

    return commitId
  }

  /**
   * ��ȡ���θ��²�������һ���ύʱ��
   * @param {string} plugin �������
   * @returns
   */
  async getTime (plugin = '') {
    let cm = `cd ./plugins/${plugin}/ && git log -1 --oneline --pretty=format:"%cd" --date=format:"%m-%d %H:%M"`

    let time = ''
    try {
      time = await execSync(cm, { encoding: 'utf-8' })
      time = _.trim(time)
    } catch (error) {
      logger.error(error.toString())
      time = '��ȡʱ��ʧ��'
    }
    return time
  }

  /**
   * ����ת����Ϣ
   * @param {string} title ���� - ������Ϣ
   * @param {string} msg ��־��Ϣ
   * @param {string} end ���һ����Ϣ
   * @returns
   */
  async makeForwardMsg (title, msg, end) {
    let nickname = (this.e.bot ?? Bot).nickname
    if (this.e.isGroup) {
      let info = await (this.e.bot ?? Bot).getGroupMemberInfo(this.e.group_id, (this.e.bot ?? Bot).uin)
      nickname = info.card || info.nickname
    }
    let userInfo = {
      user_id: (this.e.bot ?? Bot).uin,
      nickname
    }

    let forwardMsg = [
      {
        ...userInfo,
        message: title
      },
      {
        ...userInfo,
        message: msg
      }
    ]

    if (end) {
      forwardMsg.push({
        ...userInfo,
        message: end
      })
    }

    /** ����ת������ */
    if (this.e.isGroup) {
      forwardMsg = await this.e.group.makeForwardMsg(forwardMsg)
    } else {
      forwardMsg = await this.e.friend.makeForwardMsg(forwardMsg)
    }

    /** �������� */
    forwardMsg.data = forwardMsg.data
      .replace(/\n/g, '')
      .replace(/<title color="#777777" size="26">(.+?)<\/title>/g, '___')
      .replace(/___+/, `<title color="#777777" size="26">${title}</title>`)

    return forwardMsg
  }

  /**
   * �������ʧ�ܵ���غ���
   * @param {string} err
   * @param {string} stdout
   * @returns
   */
  async gitErr (err, stdout) {
    let msg = '����ʧ�ܣ�'
    let errMsg = err.toString()
    stdout = stdout.toString()

    if (errMsg.includes('Timed out')) {
      let remote = errMsg.match(/'(.+?)'/g)[0].replace(/'/g, '')
      await this.reply(msg + `\n���ӳ�ʱ��${remote}`)
      return
    }

    if (/Failed to connect|unable to access/g.test(errMsg)) {
      let remote = errMsg.match(/'(.+?)'/g)[0].replace(/'/g, '')
      await this.reply(msg + `\n����ʧ�ܣ�${remote}`)
      return
    }

    if (errMsg.includes('be overwritten by merge')) {
      await this.reply(
        msg +
        `���ڳ�ͻ��\n${errMsg}\n` +
        '������ͻ���ٸ��£�����ִ��#ǿ�Ƹ��£����������޸�'
      )
      return
    }

    if (stdout.includes('CONFLICT')) {
      await this.reply([
        msg + '���ڳ�ͻ\n',
        errMsg,
        stdout,
        '\n������ͻ���ٸ��£�����ִ��#ǿ�Ƹ��£����������޸�'
      ])
      return
    }

    await this.reply([errMsg, stdout])
  }

  /**
   * �첽ִ��git�������
   * @param {string} cmd git����
   * @returns
   */
  async execSync (cmd) {
    return new Promise((resolve, reject) => {
      exec(cmd, { windowsHide: true }, (error, stdout, stderr) => {
        resolve({ error, stdout, stderr })
      })
    })
  }

  /**
   * ���git�Ƿ�װ
   * @returns
   */
  async checkGit () {
    let ret = await execSync('git --version', { encoding: 'utf-8' })
    if (!ret || !ret.includes('git version')) {
      await this.reply('���Ȱ�װgit')
      return false
    }
    return true
  }
}