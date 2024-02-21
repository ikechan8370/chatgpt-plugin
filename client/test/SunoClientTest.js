import { SunoClient } from '../SunoClient.js'

async function test () {
  const options = {
  }
  let client = new SunoClient(options)
  let res = await client.createSong('guacamole')
  console.log(res)
}

test()
