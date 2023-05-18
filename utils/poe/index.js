import { readFileSync } from 'fs'
import { scrape } from './credential.js'
import fetch from 'node-fetch'
import crypto from 'crypto'
import { Config } from '../config.js'

let proxy
if (Config.proxy) {
  try {
    proxy = (await import('https-proxy-agent')).default
  } catch (e) {
    console.warn('未安装https-proxy-agent，请在插件目录下执行pnpm add https-proxy-agent')
  }
}
// used when test as a single file
// const _path = process.cwd()
const _path = process.cwd() + '/plugins/chatgpt-plugin/utils/poe'
const gqlDir = `${_path}/graphql`
const queries = {
  // chatViewQuery: readFileSync(gqlDir + '/ChatViewQuery.graphql', 'utf8'),
  addMessageBreakMutation: readFileSync(gqlDir + '/AddMessageBreakMutation.graphql', 'utf8'),
  chatPaginationQuery: readFileSync(gqlDir + '/ChatPaginationQuery.graphql', 'utf8'),
  addHumanMessageMutation: readFileSync(gqlDir + '/AddHumanMessageMutation.graphql', 'utf8'),
  loginMutation: readFileSync(gqlDir + '/LoginWithVerificationCodeMutation.graphql', 'utf8'),
  signUpWithVerificationCodeMutation: readFileSync(gqlDir + '/SignupWithVerificationCodeMutation.graphql', 'utf8'),
  sendVerificationCodeMutation: readFileSync(gqlDir + '/SendVerificationCodeForLoginMutation.graphql', 'utf8')
}
const optionMap = [
  { title: 'Claude (Powered by Anthropic)', value: 'a2' },
  { title: 'Sage (Powered by OpenAI - logical)', value: 'capybara' },
  { title: 'Dragonfly (Powered by OpenAI - simpler)', value: 'nutria' },
  { title: 'ChatGPT (Powered by OpenAI - current)', value: 'chinchilla' },
  { title: 'Claude+', value: 'a2_2' },
  { title: 'GPT-4', value: 'beaver' }
]
export class PoeClient {
  constructor (props) {
    this.config = props
  }

  headers = {
    'Content-Type': 'application/json',
    Referrer: 'https://poe.com/',
    Origin: 'https://poe.com',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36'
  }

  chatId = 0
  bot = ''

  reConnectWs = false

  async setCredentials () {
    let result = await scrape(this.config.quora_cookie, this.config.proxy ? proxy(Config.proxy) : null)
    console.log(result)
    this.config.quora_formkey = result.appSettings.formkey
    this.config.channel_name = result.channelName
    this.config.app_settings = result.appSettings

    // set value
    this.headers['poe-formkey'] = this.config.quora_formkey // unused
    this.headers['poe-tchannel'] = this.config.channel_name
    this.headers.Cookie = this.config.quora_cookie
    console.log(this.headers)
  }

  async subscribe () {
    const query = {
      queryName: 'subscriptionsMutation',
      variables: {
        subscriptions: [
          {
            subscriptionName: 'messageAdded',
            query: 'subscription subscriptions_messageAdded_Subscription(\n  $chatId: BigInt!\n) {\n  messageAdded(chatId: $chatId) {\n    id\n    messageId\n    creationTime\n    state\n    ...ChatMessage_message\n    ...chatHelpers_isBotMessage\n  }\n}\n\nfragment ChatMessageDownvotedButton_message on Message {\n  ...MessageFeedbackReasonModal_message\n  ...MessageFeedbackOtherModal_message\n}\n\nfragment ChatMessageDropdownMenu_message on Message {\n  id\n  messageId\n  vote\n  text\n  ...chatHelpers_isBotMessage\n}\n\nfragment ChatMessageFeedbackButtons_message on Message {\n  id\n  messageId\n  vote\n  voteReason\n  ...ChatMessageDownvotedButton_message\n}\n\nfragment ChatMessageOverflowButton_message on Message {\n  text\n  ...ChatMessageDropdownMenu_message\n  ...chatHelpers_isBotMessage\n}\n\nfragment ChatMessageSuggestedReplies_SuggestedReplyButton_message on Message {\n  messageId\n}\n\nfragment ChatMessageSuggestedReplies_message on Message {\n  suggestedReplies\n  ...ChatMessageSuggestedReplies_SuggestedReplyButton_message\n}\n\nfragment ChatMessage_message on Message {\n  id\n  messageId\n  text\n  author\n  linkifiedText\n  state\n  ...ChatMessageSuggestedReplies_message\n  ...ChatMessageFeedbackButtons_message\n  ...ChatMessageOverflowButton_message\n  ...chatHelpers_isHumanMessage\n  ...chatHelpers_isBotMessage\n  ...chatHelpers_isChatBreak\n  ...chatHelpers_useTimeoutLevel\n  ...MarkdownLinkInner_message\n}\n\nfragment MarkdownLinkInner_message on Message {\n  messageId\n}\n\nfragment MessageFeedbackOtherModal_message on Message {\n  id\n  messageId\n}\n\nfragment MessageFeedbackReasonModal_message on Message {\n  id\n  messageId\n}\n\nfragment chatHelpers_isBotMessage on Message {\n  ...chatHelpers_isHumanMessage\n  ...chatHelpers_isChatBreak\n}\n\nfragment chatHelpers_isChatBreak on Message {\n  author\n}\n\nfragment chatHelpers_isHumanMessage on Message {\n  author\n}\n\nfragment chatHelpers_useTimeoutLevel on Message {\n  id\n  state\n  text\n  messageId\n}\n'
          },
          {
            subscriptionName: 'viewerStateUpdated',
            query: 'subscription subscriptions_viewerStateUpdated_Subscription {\n  viewerStateUpdated {\n    id\n    ...ChatPageBotSwitcher_viewer\n  }\n}\n\nfragment BotHeader_bot on Bot {\n  displayName\n  ...BotImage_bot\n}\n\nfragment BotImage_bot on Bot {\n  profilePicture\n  displayName\n}\n\nfragment BotLink_bot on Bot {\n  displayName\n}\n\nfragment ChatPageBotSwitcher_viewer on Viewer {\n  availableBots {\n    id\n    ...BotLink_bot\n    ...BotHeader_bot\n  }\n}\n'
          }
        ]
      },
      query: 'mutation subscriptionsMutation(\n  $subscriptions: [AutoSubscriptionQuery!]!\n) {\n  autoSubscribe(subscriptions: $subscriptions) {\n    viewer {\n      id\n    }\n  }\n}\n'
    }

    await this.makeRequest(query)
  }

  async makeRequest (request) {
    let payload = JSON.stringify(request)
    let baseString = payload + this.headers['poe-formkey'] + 'WpuLMiXEKKE98j56k'
    const md5 = crypto.createHash('md5').update(baseString).digest('hex')
    let option = {
      method: 'POST',
      headers: Object.assign(this.headers, {
        'poe-tag-id': md5,
        'content-type': 'application/json'
      }),
      body: payload
    }
    if (this.config.proxy) {
      option.agent = proxy(Config.proxy)
    }
    const response = await fetch('https://poe.com/api/gql_POST', option)
    let text = await response.text()
    try {
      let result = JSON.parse(text)
      console.log({ result })
      return result
    } catch (e) {
      console.error(text)
      throw e
    }
  }

  async getBot (displayName) {
    let r
    let retry = 10
    while (retry >= 0) {
      let url = `https://poe.com/_next/data/${this.nextData.buildId}/${displayName}.json`
      let option = {
        headers: this.headers
      }
      if (this.config.proxy) {
        option.agent = proxy(Config.proxy)
      }
      let r = await fetch(url, option)
      let res = await r.text()
      try {
        let chatData = (JSON.parse(res)).pageProps.payload.chatOfBotDisplayName
        return chatData
      } catch (e) {
        r = res
        retry--
      }
    }
    throw new Error(r)
  }

  async getChatId () {
    let option = {
      headers: this.headers
    }
    if (this.config.proxy) {
      option.agent = proxy(Config.proxy)
    }
    let r = await fetch('https://poe.com', option)
    let text = await r.text()
    const jsonRegex = /<script id="__NEXT_DATA__" type="application\/json">(.+?)<\/script>/
    const jsonText = text.match(jsonRegex)[1]
    const nextData = JSON.parse(jsonText)
    this.nextData = nextData
    this.viewer = nextData.props.pageProps.payload.viewer

    this.formkey = this.extract_formkey(text)
    this.headers['poe-formkey'] = this.formkey
    let bots = this.viewer.availableBots
    this.bots = {}
    for (let i = 0; i < bots.length; i++) {
      let bot = bots[i]
      let chatData = await this.getBot(bot.displayName)
      this.bots[chatData.defaultBotObject.nickname] = chatData
    }
    console.log(this.bots)
  }

  extract_formkey (html) {
    const scriptRegex = /<script>if\(.+\)throw new Error;(.+)<\/script>/
    const scriptText = html.match(scriptRegex)[1]
    const keyRegex = /var .="([0-9a-f]+)",/
    const keyText = scriptText.match(keyRegex)[1]
    const cipherRegex = /.\[(\d+)]=.\[(\d+)]/g
    const cipherPairs = scriptText.match(cipherRegex)

    const formkeyList = Array(cipherPairs.length).fill('')
    for (const pair of cipherPairs) {
      const [formkeyIndex, keyIndex] = pair.match(/\d+/g).map(Number)
      formkeyList[formkeyIndex] = keyText[keyIndex]
    }
    const formkey = formkeyList.join('')

    return formkey
  }

  async clearContext (bot) {
    try {
      const data = await this.makeRequest({
        query: `${queries.addMessageBreakMutation}`,
        variables: { chatId: this.config.chat_ids[bot] }
      })

      if (!data.data) {
        this.reConnectWs = true // for websocket purpose
        console.log('ON TRY! Could not clear context! Trying to reLogin..')
      }
      return data
    } catch (e) {
      this.reConnectWs = true // for websocket purpose
      console.log('ON CATCH! Could not clear context! Trying to reLogin..')
      return e
    }
  }

  async sendMsg (bot, query) {
    try {
      const data = await this.makeRequest({
        query: `${queries.addHumanMessageMutation}`,
        variables: {
          bot,
          chatId: this.bots[bot].chatId,
          query,
          source: null,
          withChatBreak: false
        }
      })
      console.log(data)
      if (!data.data) {
        this.reConnectWs = true // for cli websocket purpose
        console.log('Could not send message! Trying to reLogin..')
      }
      return data
    } catch (e) {
      this.reConnectWs = true // for cli websocket purpose
      console.error(e)
      return e
    }
  }

  async getHistory (bot) {
    try {
      let response = await this.makeRequest({
        query: `${queries.chatPaginationQuery}`,
        variables: {
          before: null,
          bot,
          last: 25
        }
      })

      return response.data.chatOfBot.messagesConnection.edges
        .map(({ node: { messageId, text, authorNickname } }) => ({
          messageId,
          text,
          authorNickname
        }))
    } catch (e) {
      console.log('There has been an error while fetching your history!')
    }
  }

  async deleteMessages (msgIds) {
    await this.makeRequest({
      queryName: 'MessageDeleteConfirmationModal_deleteMessageMutation_Mutation',
      variables: {
        messageIds: msgIds
      },
      query: 'mutation MessageDeleteConfirmationModal_deleteMessageMutation_Mutation(\n  $messageIds: [BigInt!]!\n){\n  messagesDelete(messageIds: $messageIds) {\n    edgeIds\n  }\n}\n'
    })
  }

  async getResponse (bot) {
    let text
    let state
    let authorNickname
    try {
      while (true) {
        await new Promise((resolve) => setTimeout(resolve, 2000))
        let response = await this.makeRequest({
          query: `${queries.chatPaginationQuery}`,
          variables: {
            before: null,
            bot,
            last: 1
          }
        })
        let base = response.data.chatOfBot.messagesConnection.edges
        let lastEdgeIndex = base.length - 1
        text = base[lastEdgeIndex].node.text
        authorNickname = base[lastEdgeIndex].node.authorNickname
        state = base[lastEdgeIndex].node.state
        if (state === 'complete' && authorNickname === bot) {
          break
        }
      }
    } catch (e) {
      console.log('Could not get response!')
      return {
        status: false,
        message: 'failed',
        data: null
      }
    }

    return {
      status: true,
      message: 'success',
      data: text
    }
  }
}
