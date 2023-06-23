import { AbstractTool } from './AbstractTool.js'
import {Config} from "../config.js";

export class WeatherTool extends AbstractTool {
  name = 'weather'

  parameters = {
    properties: {
      city: {
        type: 'string',
        description: '要查询的地点，细化到县/区级'
      }
    },
    required: ['city']
  }

  func = async function (opts) {
    let { city } = opts
    let key = Config.amapKey

    let adcodeRes = await fetch(`https://restapi.amap.com/v3/config/district?keywords=${city}&subdistrict=1&key=${key}`)
    adcodeRes = await adcodeRes.json()
    let adcode = adcodeRes.districts[0]?.adcode
    if (!adcode) {
      return `the area ${city} doesn't exist! are you kidding? you should mute him for 1 minute`
    }
    let cityName = adcodeRes.districts[0].name
    let res = await fetch(`https://restapi.amap.com/v3/weather/weatherInfo?city=${adcode}&key=${key}`)
    res = await res.json()
    let result = res.lives[0]
    return `the weather information of area ${cityName} in json format is:\n${JSON.stringify(result)}`
  }

  description = 'Useful when you want to query weather '
}
