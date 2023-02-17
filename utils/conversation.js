import fetch from 'node-fetch'
import {Config} from "../config/index.js";

export async function getConversations(qq = '') {
    let response = await fetch(`${Config.apiBaseUrl}/conversations?offset=0&limit=20`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + Config.apiKey,
        }
    })
    let json = await response.text()
    let conversations = JSON.parse(json)
    let result = conversations.items?.sort((a, b) => b.create_time - a.create_time)
    let map = {}
    let promises = conversations.items?.map(async item => {
        let cachedConversationLastMessage = await redis.get(`CHATGPT:CONVERSATION_LAST_MESSAGE:${item.id}`)
        if (cachedConversationLastMessage) {
            map[item.id] = cachedConversationLastMessage
        } else {
            let conversationDetailResponse = await fetch(`${Config.apiBaseUrl}/conversation/${item.id}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + Config.apiKey,
                }
            })
            let conversationDetail = await conversationDetailResponse.text()
            conversationDetail = JSON.parse(conversationDetail)
            let messages = Object.values(conversationDetail.mapping)
            messages = messages
                .filter(message => message.message)
                .map(messages => messages.message)
                .filter(messages => messages.role === 'user')
                .sort((a, b) => b.create_time - a.create_time)
            let lastMessage = null
            if (messages.length > 0) {
                lastMessage = messages[0].content.parts[0]
            }
            map[item.id] = lastMessage
        }
    })
    await Promise.all(promises)
    result.forEach(conversation => {
        conversation.lastPrompt = map[conversation.id]
    })
    return result
}