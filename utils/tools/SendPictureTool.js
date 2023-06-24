import { AbstractTool } from './AbstractTool.js'

export class SendPictureTool extends AbstractTool {
  name = 'sendPicture'

  parameters = {
    properties: {
      picture: {
        type: 'string',
        description: 'the url of the pictures, split with space if more than one '
      },
      groupId: {
        type: 'string',
        description: '群号或qq号，发送目标'
      }
    },
    required: ['picture', 'groupId']
  }

  func = async function (opt) {
    let { picture, groupId } = opt
    let pictures = picture.trim().split(' ')
    pictures = pictures.map(img => segment.image(img))
    let groupList = await Bot.getGroupList()
    groupId = parseInt(groupId)
    try {
      if (groupList.get(groupId)) {
        let group = await Bot.pickGroup(groupId)
        await group.sendMsg(pictures)
        return `picture has been sent to group ${groupId}`
      } else {
        let user = await Bot.pickFriend(groupId)
        await user.sendMsg(pictures)
        return `picture has been sent to user ${groupId}`
      }
    } catch (err) {
      return `failed to send pictures, error: ${JSON.stringify(err)}`
    }
  }

  description = 'Useful when you want to send one or more pictures. '
}
