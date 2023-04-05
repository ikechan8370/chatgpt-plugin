import { BaseChain } from 'langchain/chains'

export class AgentExecutor extends BaseChain {
  constructor (input) {
    super(input.memory, input.verbose, input.callbackManager)
    this.agent = input.agent
    this.tools = input.tools
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

    action.actions.forEach(async a => {
      const tool = toolsByName[a.action?.toLowerCase()]
      const observation = tool
        ? await tool.call(a.action_input, verbose)
        : `${action.action} is not a valid tool, try another one.`
      console.log(observation)
    })
    let output = await getOutput(action)
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
