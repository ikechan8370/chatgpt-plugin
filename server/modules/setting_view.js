import { UserInfo } from './user_data.js'
import { supportGuoba } from '../../guoba.support.js'
import fs from 'fs'
import path from 'path'

function getAttributeValues(obj, attributeName, results = []) {
    if (Array.isArray(obj)) {
      obj.forEach(item => getAttributeValues(item, attributeName, results));
    } else if (typeof obj === 'object' && obj !== null) {
      Object.keys(obj).forEach(key => {
        if (key === attributeName) {
          results.push(obj[key]);
        } else if (typeof obj[key] === 'object') {
            getAttributeValues(obj[key], attributeName, results);
        }
      });
    }
    return results;
}

async function SettingView(fastify, options) {
    // 获取配置视图
    fastify.post('/settingView', async (request, reply) => {
        const token = request.cookies.token || request.body?.token || 'unknown'
        let user = UserInfo(token)
        if (!user) {
            reply.send({ err: '未登录' })
        } else if (user.autho === 'admin') {
            const filepath = path.join('plugins/chatgpt-plugin/resources/view', 'setting_view.json')
            let configView = JSON.parse(fs.readFileSync(filepath, 'utf8'))

            // 从锅巴配置获取额外配置视图
            const guoba = supportGuoba()
            const guobaConfig = guoba.configInfo.schemas
            const viewDataList = getAttributeValues(configView, 'data')
            const guobaDataList = getAttributeValues(guobaConfig, 'field')
            const otherDataList = guobaDataList.filter(item => !viewDataList.includes(item))
            const otherData = guobaConfig.filter(item => otherDataList.includes(item.field))
            // 转换视图
            if (otherData.length > 0) {
                let otherView = []
                for (const data of otherData) {
                    let view = {
                        'label': data.label,
                        'placeholder': data.bottomHelpMessage || undefined,
                        'data': data.field,
                    }
                    switch (data.component) {
                        case 'Input':
                            view.type = 'text'
                            break
                        case 'Switch':
                            view.type = 'check'
                            break
                        case 'InputNumber':
                            view.type = 'number'
                            break
                        case 'InputPassword':
                            view.type = 'password'
                            break
                        case 'InputTextArea':
                            view.type = 'textarea'
                            break
                        case 'Select':
                            view.type = 'textarea'
                            view.items = data.componentProps.options
                            break
                        default:
                            continue
                    }
                    otherView.push(view)
                  }
                  configView.push({
                    "id": "OtherSettings",
                    "title": "其他设置",
                    "view": otherView
                  })
            }

            reply.send(configView)
        } else {
            reply.send({ err: '权限不足' })
        }
        return reply
    })
}

export default SettingView