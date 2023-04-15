import fetch from 'node-fetch'
import { readFileSync, writeFile } from 'fs'

const scrape = async (pbCookie) => {
  const _setting = await fetch(
    'https://poe.com/api/settings',
    { headers: { cookie: `${pbCookie}` } }
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

const getUpdatedSettings = async (channelName, pbCookie) => {
  const _setting = await fetch(
      `https://poe.com/api/settings?channel=${channelName}`,
      { headers: { cookie: `${pbCookie}` } }
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
