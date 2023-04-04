import SydneyAIClient from './SydneyAIClient.js'
import { Config } from './config.js'
import { BaseChatModel, ChatOpenAI } from 'langchain/chat_models'
import { KeyvFile } from 'keyv-file'
import { LLMChain } from 'langchain'
import { BasePromptValue } from 'langchain/schema'
import { Agent, AgentExecutor, ChatAgent, initializeAgentExecutor, Tool } from 'langchain/agents'
import { ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate } from 'langchain/prompts'

export class SydneyAIModel extends BaseChatModel {
  constructor (props) {
    super(props)
    const { userToken, cookies, cache, user, proxy } = props
    this.client = props.client || new SydneyAIClient({
      userToken, // "_U" cookie from bing.com
      cookies,
      debug: Config.debug,
      cache,
      user,
      proxy
    })
    this.props = props
  }

  async _generate (messages, stop) {
    const messagesMapped = messages.map(
      (message) => ({
        role: messageTypeToOpenAIRole(message._getType()),
        content: message.text
      })
    )
    let currentPrompt = messagesMapped[messagesMapped.length - 1]
    let result = await this.client.sendMessage(currentPrompt.content, this.props, messagesMapped)
    console.log(result.response)
    const generations = []
    generations.push({
      text: result.response
    })
    return {
      generations,
      llmOutput: result
    }
  }

  _llmType () {
    return 'sydney'
  }
}

const PREFIX = 'I want you to  choose a tool from the following tools to complete the task or answer the question, but you needn\'t actually execute it, just tell me your choice, and I\'ll let the system execute it according to your choice and told you the result:'
const SUFFIX = `The way you use the tools is by specifying a json blob, denoted below by $JSON_BLOB
Specifically, this $JSON_BLOB should have a "action" key (with the name of the tool to use) and a "action_input" key (with the input to the tool going here).
The $JSON_BLOB should only contain a SINGLE action, do NOT return a list of multiple actions. 
Next time, I'll told you the result of your choice. You are not allowed to make up anything of the line of 'Observation' by yourself. 
If you are waiting for some result, don't give me the final answer, please.
Here is an example of a valid $JSON_BLOB:
\`\`\`
{{
  "action": "calculator",
  "action_input": "1 + 2"
}}
\`\`\`
ALWAYS use the following format:
Question: the input question you must answer
Thought: you should always think about what to do
Action: 
\`\`\`
$JSON_BLOB
\`\`\`
Observation: (DO NOT EDIT) the result of the tool (do not generate anything or fill in it by yourself here, because I'll told you the result)
... (this Thought/Action/Observation can repeat N times)
Thought: I think I should choose another tool or the same tool again to get more information
Final Answer: the final answer to the original input question. If you are waiting for some result, don't give me final answer. If you don't get the result yet, don't make Final Answer occur in your response because it would interfere with my work, remember it!`
const FORMAT_INSTRUCTIONS = 'Remember that you cannot actually execute anything, so if the tools such as jinyan need to wait for the execution result, don\'t use Observation or Final Answer until I told you the result. Otherwise, Reminder to always use the exact characters \\`Final Answer\\` when responding. Begin! '
const FINAL_ANSWER_ACTION = 'Final Answer:'
export class SydneyAgent extends Agent {
  constructor (input) {
    super(input)
  }

  _agentType () {
    return 'sydney-zero-shot-react-description'
  }

  observationPrefix () {
    return 'Observation: '
  }

  llmPrefix () {
    return 'Thought:'
  }

  _stop () {
    return ['Observation:']
  }

  static validateTools (tools) {
    const invalidTool = tools.find((tool) => !tool.description)
    if (invalidTool) {
      const msg =
          `Got a tool ${invalidTool.name} without a description.` +
          ' This agent requires descriptions for all tools.'
      throw new Error(msg)
    }
  }

  static createPrompt (tools, args) {
    const { prefix = PREFIX, suffix = SUFFIX } = args ?? {}
    const toolStrings = tools
      .map((tool) => `${tool.name}: ${tool.description}`)
      .join('\n')
    const template = [prefix, toolStrings, FORMAT_INSTRUCTIONS, suffix].join(
      '\n\n'
    )
    const messages = [
      SystemMessagePromptTemplate.fromTemplate(template),
      HumanMessagePromptTemplate.fromTemplate('{input}\n\n{agent_scratchpad}')
    ]
    return ChatPromptTemplate.fromPromptMessages(messages)
  }

  static fromLLMAndTools (
    llm,
    tools,
    args
  ) {
    SydneyAgent.validateTools(tools)
    const prompt = ChatAgent.createPrompt(tools, args)
    const chain = new LLMChain({ prompt, llm })
    return new ChatAgent({
      llmChain: chain,
      allowedTools: tools.map((t) => t.name)
    })
  }

  constructScratchPad (steps) {
    const agentScratchpad = super.constructScratchPad(steps)
    if (agentScratchpad) {
      return `This was your previous work (but I haven't seen any of it! I only see what you return as final answer):\n${agentScratchpad}`
    }
    return agentScratchpad
  }

  async extractToolAndInput (text) {
    if (text.includes(FINAL_ANSWER_ACTION)) {
      const parts = text.split(FINAL_ANSWER_ACTION)
      const input = parts[parts.length - 1].trim()
      return { tool: 'Final Answer', input }
    }

    const [_, action, __] = text.split('```')
    try {
      const response = JSON.parse(action.trim())
      return { tool: response.action, input: response.action_input }
    } catch {
      throw new Error(`Unable to parse JSON response from chat agent.\n\n${text}`)
    }
  }
}

function messageTypeToOpenAIRole (type) {
  switch (type) {
    case 'human': {
      return 'user'
    }
    case 'ai': {
      return 'bot'
    }
    default: {
      return 'ai'
    }
  }
}

export class JinyanTool extends Tool {
  name = 'jinyan'

  async _call (input) {
    console.log(input)
    try {
      let [groupId, qq] = input.split(' ')
      groupId = parseInt(groupId)
      qq = parseInt(qq)
      console.log('ban')
      console.log(groupId, groupId)
      let group = await Bot.pickGroup(groupId)
      await group.muteMember(qq)
      return new Date().getTime() + ''
    } catch (error) {
      return "I don't know how to do that."
    }
  }

  description = 'Useful when you want to ban someone. The input to this tool should be the group number and the qq number of the one who should be banned, these two number should be concated with a space. ' +
      'If success, it will return the timestamp, you should tell the time in final answer. Because this action can only be executed by me but not you, you should wait until it return success, and you need to wait for at least 2 turns to complete this request.' +
      'You shouldn\'t give me the Final Answer int the first turn, because you don\'t know the execution result. If it succeeds I will told you int the next turn'
}

async function test () {
  const cacheOptions = {
    namespace: 'Sydney',
    store: new KeyvFile({ filename: 'cache_langchain.json' })
  }
  let model = new SydneyAIModel({
    userToken: '1UrPqkT5VZjaRGw7mTgY4jkgwmQ8Z-q9l1KzBGCFVjBVpdda3q2yXWTilmOjFZFgiVy-ATlf2c-dUIyh90dJXL2B4c7rO_ThTPHM8WNJzVKuWvP-Suxm2A2_9-x2e5dbNr-FG-vQc1cZcGC-umoD7C7dkaqNM-pTIRE0bHQTKvYiX7lbVEGk1PAtFKlX2mQHgWV7NlYcYxqjf4G4v2hrdqA',
    debug: true,
    cache: cacheOptions,
    proxy: 'http://127.0.0.1:7890',
    user: 450960006,
    toneStyle: 'Sydney'
  })
  const tools = [new JinyanTool()]

  const executor = AgentExecutor.fromAgentAndTools({
    agent: SydneyAgent.fromLLMAndTools(model, tools),
    tools,
    returnIntermediateSteps: true
  })

  const result = await executor.call({
    input: 'please ban the user who has qq 1921024571 in group 559567232'
  })
  console.log(`Got output ${result.output}`)

  console.log(
      `Got intermediate steps ${JSON.stringify(
          result.intermediateSteps,
          null,
          2
      )}`
  )
  return result
}

// test().then(res => {
//   console.log(res)
// }).catch(err => {
//   console.error(err)
// })
