import { AbstractTool } from './AbstractTool.js'

export class SendPictureTool extends AbstractTool {
  name = 'sendPicture'

  parameters = {
    properties: {
      urlOfPicture: {
        type: 'string',
        description: 'the url of the pictures, not text, split with space if more than one. can be left blank.'
      },
      targetGroupIdOrQQNumber: {
        type: 'string',
        description: 'Fill in the target user\'s qq number or groupId when you need to send picture to specific user or group, otherwise leave blank'
      }
    },
    required: ['urlOfPicture', 'targetGroupIdOrQQNumber']
  }

  func = async function (opt, e) {
    let { urlOfPicture, targetGroupIdOrQQNumber } = opt
    if (typeof urlOfPicture === 'object') {
      urlOfPicture = urlOfPicture.join(' ')
    }
    const defaultTarget = e.isGroup ? e.group_id : e.sender.user_id
    const target = isNaN(targetGroupIdOrQQNumber) || !targetGroupIdOrQQNumber
      ? defaultTarget
      : parseInt(targetGroupIdOrQQNumber) === e.bot.uin ? defaultTarget : parseInt(targetGroupIdOrQQNumber)
    // 处理错误url和picture留空的情况
    const urlRegex = /(?:(?:https?|ftp):\/\/)?(?:\S+(?::\S*)?@)?(?:((?:(?:[a-z0-9\u00a1-\u4dff\u9fd0-\uffff][a-z0-9\u00a1-\u4dff\u9fd0-\uffff_-]{0,62})?[a-z0-9\u00a1-\u4dff\u9fd0-\uffff]\.)+(?:[a-z\u00a1-\u4dff\u9fd0-\uffff]{2,}\.?))(?::\d{2,5})?)(?:\/[\w\u00a1-\u4dff\u9fd0-\uffff$-_.+!*'(),%]+)*(?:\?(?:[\w\u00a1-\u4dff\u9fd0-\uffff$-_.+!*(),%:@&=]|(?:[\[\]])|(?:[\u00a1-\u4dff\u9fd0-\uffff]))*)?(?:#(?:[\w\u00a1-\u4dff\u9fd0-\uffff$-_.+!*'(),;:@&=]|(?:[\[\]]))*)?\/?/i
    if (/https:\/\/example.com/.test(urlOfPicture) || !urlOfPicture || !urlRegex.test(urlOfPicture)) urlOfPicture = ''
    if (!urlOfPicture) {
      return 'Because there is no correct URL for the picture ,tell user the reason and ask user if he want to use SearchImageTool'
    }
    let pictures = urlOfPicture.trim().split(' ')
    logger.mark('pictures to send: ', pictures)
    pictures = pictures.map(img => segment.image(img))
    let groupList
    try {
      groupList = await e.bot.getGroupList()
    } catch (err) {
      groupList = e.bot.gl
    }
    try {
      if (groupList.get(target)) {
        let group = await e.bot.pickGroup(target)
        await group.sendMsg(pictures)
        return 'picture has been sent to group' + target
      } else {
        let user = await e.bot.pickFriend(target)
        await user.sendMsg(pictures)
        return 'picture has been sent to user' + target
      }
    } catch (err) {
      return `failed to send pictures, error: ${JSON.stringify(err)}`
    }
  }

  description = 'Useful when you want to send one or more pictures.'
}
