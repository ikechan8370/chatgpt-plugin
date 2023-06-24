export class AbstractTool {
  name = ''

  parameters = {}

  description = ''

  func = async function () {}

  function () {
    if (!this.parameters.type) {
      this.parameters.type = 'object'
    }
    return {
      name: this.name,
      description: this.description,
      parameters: this.parameters
    }
  }
}
