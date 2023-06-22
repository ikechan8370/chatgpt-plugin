import {AbstractTool} from "./AbstractTool.js";


export class SendPictureTool extends AbstractTool {
  name = 'sendPicture'

  parameters = {
    picture: {
      type: 'string',
      description: '图片的url,多个用空格隔开'
    },
    groupId: {
      type: 'string',
      description: '群号或qq号，发送目标'
    },
    required: ['picture', 'groupId']
  }

  func = async function (picture, groupId) {
    let pictures = picture.trim().split(' ')
    pictures = pictures.map(img => segment.image(img))
    let groupList = await Bot.getGroupList()
    if (groupList.get(groupId)) {
      let group = await Bot.pickGroup(groupId)
      await group.sendMsg(pictures)
    } else {
      let user = await Bot.pickFriend(groupId)
      await user.sendMsg(pictures)
    }
  }

  description = 'Useful when you want to send some pictures. The input to this tool should be the url of the pictures and the group number or the user\'s qq number, each url and the group number or qq number should be concated with a space, and the group number or qq number should be the last. 如果是在群聊中，优先选择群号发送。'
}