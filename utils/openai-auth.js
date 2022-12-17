import { Config } from '../config/index.js'
import delay from 'delay'

let hasRecaptchaPlugin = !!Config['2captchaToken']

export async function getOpenAIAuth (opt) {
  let {
    email,
    password,
    browser,
    page,
    timeoutMs = 2 * 60 * 1000,
    isGoogleLogin = false,
    captchaToken = Config['2captchaToken'],
    executablePath = Config.chromePath
  } = opt
  const origBrowser = browser
  const origPage = page

  try {
    const userAgent = await browser.userAgent()
    if (!page) {
      page = (await browser.pages())[0] || (await browser.newPage())
      page.setDefaultTimeout(timeoutMs)
    }
    await page.goto('https://chat.openai.com/auth/login', {
      waitUntil: 'networkidle2'
    })

    // NOTE: this is where you may encounter a CAPTCHA
    if (hasRecaptchaPlugin) {
      await page.solveRecaptchas()
    }

    await checkForChatGPTAtCapacity(page)

    // once we get to this point, the Cloudflare cookies should be available

    // login as well (optional)
    if (email && password) {
      await waitForConditionOrAtCapacity(page, () =>
        page.waitForSelector('#__next .btn-primary', { timeout: timeoutMs })
      )
      await delay(500)

      // click login button and wait for navigation to finish
      await Promise.all([
        page.waitForNavigation({
          waitUntil: 'networkidle2',
          timeout: timeoutMs
        }),

        page.click('#__next .btn-primary')
      ])

      await checkForChatGPTAtCapacity(page)

      let submitP

      if (isGoogleLogin) {
        await page.click('button[data-provider="google"]')
        await page.waitForSelector('input[type="email"]')
        await page.type('input[type="email"]', email, { delay: 10 })
        await Promise.all([
          page.waitForNavigation(),
          await page.keyboard.press('Enter')
        ])
        await page.waitForSelector('input[type="password"]', { visible: true })
        await page.type('input[type="password"]', password, { delay: 10 })
        submitP = () => page.keyboard.press('Enter')
      } else {
        await page.waitForSelector('#username')
        await page.type('#username', email, { delay: 20 })
        await delay(100)

        if (hasRecaptchaPlugin) {
          // console.log('solveRecaptchas()')
          const res = await page.solveRecaptchas()
          // console.log('solveRecaptchas result', res)
        }

        await page.click('button[type="submit"]')
        await page.waitForSelector('#password', { timeout: timeoutMs })
        await page.type('#password', password, { delay: 10 })
        submitP = () => page.click('button[type="submit"]')
      }

      await Promise.all([
        waitForConditionOrAtCapacity(page, () =>
          page.waitForNavigation({
            waitUntil: 'networkidle2',
            timeout: timeoutMs
          })
        ),
        submitP()
      ])
    } else {
      await delay(2000)
      await checkForChatGPTAtCapacity(page)
    }

    const pageCookies = await page.cookies()
    await redis.set('CHATGPT:RAW_COOKIES', JSON.stringify(pageCookies))
    const cookies = pageCookies.reduce(
      (map, cookie) => ({ ...map, [cookie.name]: cookie }),
      {}
    )

    const authInfo = {
      userAgent,
      clearanceToken: cookies.cf_clearance?.value,
      sessionToken: cookies['__Secure-next-auth.session-token']?.value,
      cookies
    }

    return authInfo
  } catch (err) {
    throw err
  } finally {
    if (origBrowser) {
      if (page && page !== origPage) {
        await page.close()
      }
    } else if (browser) {
      await browser.close()
    }

    page = null
    browser = null
  }
}

async function checkForChatGPTAtCapacity (page) {
  // console.log('checkForChatGPTAtCapacity', page.url())
  let res

  try {
    res = await page.$x("//div[contains(., 'ChatGPT is at capacity')]")
    // console.log('capacity1', els)
    // if (els?.length) {
    //   res = await Promise.all(
    //     els.map((a) => a.evaluate((el) => el.textContent))
    //   )
    //   console.log('capacity2', res)
    // }
  } catch (err) {
    // ignore errors likely due to navigation
  }

  if (res?.length) {
    const error = new Error('ChatGPT is at capacity')
    error.statusCode = 503
    throw error
  }
}

async function waitForConditionOrAtCapacity (
  page,
  condition,
  opts = {}
) {
  const { pollingIntervalMs = 500 } = opts

  return new Promise((resolve, reject) => {
    let resolved = false

    async function waitForCapacityText () {
      if (resolved) {
        return
      }

      try {
        await checkForChatGPTAtCapacity(page)

        if (!resolved) {
          setTimeout(waitForCapacityText, pollingIntervalMs)
        }
      } catch (err) {
        if (!resolved) {
          resolved = true
          return reject(err)
        }
      }
    }

    condition()
      .then(() => {
        if (!resolved) {
          resolved = true
          resolve()
        }
      })
      .catch((err) => {
        if (!resolved) {
          resolved = true
          reject(err)
        }
      })

    setTimeout(waitForCapacityText, pollingIntervalMs)
  })
}
