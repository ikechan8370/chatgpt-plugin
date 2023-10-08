import { AgentActionOutputParser } from 'langchain/agents'
import {
  AIMessagePromptTemplate,
  BaseChatPromptTemplate,
  HumanMessagePromptTemplate,
  renderTemplate
} from 'langchain/prompts'
import {AIChatMessage, HumanChatMessage} from 'langchain/schema'

const PREFIX = 'Answer the following questions as best you can. You have access to the following tools, you can choose one even if you know you cannot execute it:'
const formatInstructions = (toolNames) => `Use the following format:

Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [${toolNames}]
Action Input: the input to the action
Observation: the result of the action, you maybe should wait for the next turn to get the result. You shouldn't fill it in your answer by yourself, only I can give you the result
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question, if the tools doesn't return yet, you don't know the final answer so your answer mustn't contain this part`
const SUFFIX = `Begin!

Question: {input}
Thought:{agent_scratchpad}`

export class BingPrecisePromptTemplate extends BaseChatPromptTemplate {
  tools

  constructor (args) {
    super({ inputVariables: args.inputVariables })
    this.tools = args.tools
  }

  _getPromptType () {
    throw new Error('Not implemented')
  }

  async formatMessages (values) {
    /** Construct the final template */
    const toolStrings = this.tools
      .map((tool) => `${tool.name}: ${tool.description}`)
      .join('\n')
    const toolNames = this.tools.map((tool) => tool.name).join('\n')
    const instructions = formatInstructions(toolNames)
    const template = [PREFIX, toolStrings, instructions, SUFFIX].join('\n\n')
    /** Construct the agent_scratchpad */
    const intermediateSteps = values.intermediate_steps
    const agentScratchpad = intermediateSteps.reduce(
      (thoughts, { action, observation }) =>
        thoughts +
                [action.log, `\nObservation: ${observation}`, 'Thought:'].join('\n'),
      ''
    )
    const newInput = { agent_scratchpad: agentScratchpad, ...values }
    /** Format the template. */
    const formatted = renderTemplate(template, 'f-string', newInput)
    const messages = [
      new HumanChatMessage(values.input),
      new HumanChatMessage(formatted)
    ]
    return messages
  }

  partial (_values) {
    throw new Error('Not implemented')
  }

  serialize () {
    throw new Error('Not implemented')
  }
}

export class BingPreciseOutputParser extends AgentActionOutputParser {
  async parse (text) {
    if (text.includes('Final Answer:')) {
      const parts = text.split('Final Answer:')
      const input = parts[parts.length - 1].trim()
      const finalAnswers = { output: input }
      return { log: text, returnValues: finalAnswers }
    }

    const match = /Action: (.*)\nAction Input: (.*)/s.exec(text)
    if (!match) {
      return { log: text, returnValues: text }
      // throw new Error(`Could not parse LLM output: ${text}`)
    }

    return {
      tool: match[1].trim(),
      toolInput: match[2].trim().replace(/^"+|"+$/g, ''),
      log: text
    }
  }

  getFormatInstructions () {
    throw new Error('Not implemented')
  }
}
