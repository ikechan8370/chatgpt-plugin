import fetch from 'node-fetch'
import { readFileSync, writeFile } from 'fs'

const scrape = async (pbCookie, proxy) => {
  let option = { headers: { cookie: `${pbCookie}` } }
  if (proxy) {
    option.agent = proxy
  }
  const _setting = await fetch(
    'https://poe.com/api/settings',
    option
  )
  if (_setting.status !== 200) throw new Error('Failed to fetch token')
  const appSettings = await _setting.json()
  console.log(appSettings)
  const { tchannelData: { channel: channelName } } = appSettings
  return {
    channelName,
    appSettings,
    formKey: appSettings.formKey
  }
}

const getUpdatedSettings = async (channelName, pbCookie, proxy) => {
  let option = { headers: { cookie: `${pbCookie}` } }
  if (proxy) {
    option.agent = proxy
  }
  const _setting = await fetch(
      `https://poe.com/api/settings?channel=${channelName}`,
      option
  )
  if (_setting.status !== 200) throw new Error('Failed to fetch token')
  const appSettings = await _setting.json()
  const { tchannelData: { minSeq } } = appSettings
  const credentials = JSON.parse(readFileSync('config.json', 'utf8'))
  credentials.app_settings.tchannelData.minSeq = minSeq
  writeFile('config.json', JSON.stringify(credentials, null, 4), function (err) {
    if (err) {
      console.log(err)
    }
  })
  return {
    minSeq
  }
}

export { scrape, getUpdatedSettings }
