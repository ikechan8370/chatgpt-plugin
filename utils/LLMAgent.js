import { BaseChain } from 'langchain/chains'

export class AgentExecutor extends BaseChain {
  constructor (input) {
    super(input.memory, input.verbose, input.callbackManager)
    this.agent = input.agent
    this.tools = input.tools
    this.e = input.e
    this.returnIntermediateSteps =
            input.returnIntermediateSteps ?? this.returnIntermediateSteps
    this.maxIterations = input.maxIterations ?? this.maxIterations
    this.earlyStoppingMethod =
            input.earlyStoppingMethod ?? this.earlyStoppingMethod
  }

  static fromAgentAndTools (fields) {
    return new AgentExecutor(fields)
  }

  shouldContinue (iterations) {
    return this.maxIterations === undefined || iterations < this.maxIterations
  }

  async _call (inputs) {
    const toolsByName = Object.fromEntries(
      this.tools.map((t) => [t.name.toLowerCase(), t])
    )
    const steps = []
    let verbose = this.verbose
    const getOutput = async (finishStep) => {
      const { returnValues } = finishStep
      const additional = await this.agent.prepareForOutput(returnValues, steps)

      if (this.returnIntermediateSteps) {
        return { output: returnValues, intermediateSteps: steps, ...additional }
      }
      await this.callbackManager.handleAgentEnd(finishStep, verbose)
      return { output: returnValues, ...additional }
    }

    const action = await this.agent.plan(steps, inputs)
    // if ('returnValues' in action) {
    //   return getOutput(action)
    // }
    await this.callbackManager.handleAgentAction(action, verbose)
    let output = await getOutput(action)
    for (const a of action.actions) {
      let toolName = a.action?.toLowerCase()
      const lastSpaceIndex = a.action_input.lastIndexOf(' ')
      console.log(lastSpaceIndex)
      const text = a.action_input.substring(0, lastSpaceIndex)
      if (toolName === 'send' && text === output.output) {
        console.log('ignore send tool because it\'s the same as the final answer')
      } else {
        const tool = toolsByName[toolName]
        const observation = tool
          ? await tool.call({
            input: a.action_input,
            e: this.e
          }, verbose)
          : `${action.action} is not a valid tool, try another one.`
        console.log(observation)
      }
    }

    if (action.actions.filter(a => a.action === 'send').length > 0 && !output.output) {
      return { output: 'message has been sent by langchain tools' }
    }
    return output
  }

  _chainType () {
    return 'agent_executor'
  }

  serialize () {
    throw new Error('Cannot serialize an AgentExecutor')
  }
}
