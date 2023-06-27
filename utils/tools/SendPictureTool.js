import { AbstractTool } from './AbstractTool.js'

export class SendPictureTool extends AbstractTool {
  name = 'sendPicture'

  parameters = {
    properties: {
      urlOfPicture: {
        type: 'string',
        description: 'the url of the pictures, not text, split with space if more than one. can be left blank.'
      },
      qq: {
        type: 'string',
        description: 'determine whether user allows you to send avatar or not. if you need to send avatar of a user, input his qq, otherwise leave blank.'
      },
      targetGroupIdOrUserQQNumber: {
        type: 'string',
        description: 'Fill in the target user_id or groupId when you need to send picture to specific group or user, otherwise leave blank'
      }
    },
    required: ['urlOfPicture', 'qq', 'targetGroupIdOrUserQQNumber']
  }

  func = async function (opt, e) {
    let { urlOfPicture, qq, targetGroupIdOrUserQQNumber } = opt
    // 处理错误url和picture留空的情况
    const urlRegex = /(?:(?:https?|ftp):\/\/)?(?:\S+(?::\S*)?@)?(?:((?:(?:[a-z0-9\u00a1-\u4dff\u9fd0-\uffff][a-z0-9\u00a1-\u4dff\u9fd0-\uffff_-]{0,62})?[a-z0-9\u00a1-\u4dff\u9fd0-\uffff]\.)+(?:[a-z\u00a1-\u4dff\u9fd0-\uffff]{2,}\.?))(?::\d{2,5})?)(?:\/[\w\u00a1-\u4dff\u9fd0-\uffff$-_.+!*'(),%]+)*(?:\?(?:[\w\u00a1-\u4dff\u9fd0-\uffff$-_.+!*(),%:@&=]|(?:[\[\]])|(?:[\u00a1-\u4dff\u9fd0-\uffff]))*)?(?:#(?:[\w\u00a1-\u4dff\u9fd0-\uffff$-_.+!*'(),;:@&=]|(?:[\[\]]))*)?\/?/i
    if (/https:\/\/example.com/.test(urlOfPicture) || !urlOfPicture || !urlRegex.test(urlOfPicture)) urlOfPicture = ''
    // 处理targetGroupIdOrUserQQNumber为空的情况
    if (!targetGroupIdOrUserQQNumber) {
      targetGroupIdOrUserQQNumber = e.isGroup ? e.group_id : e.sender.user_id
    }
    if (qq) {
      let avatar = `https://q1.qlogo.cn/g?b=qq&s=0&nk=${qq}`
      urlOfPicture += (' ' + avatar)
    }
    let flag = false
    if (!urlOfPicture && !qq) {
      let avatar = `https://q1.qlogo.cn/g?b=qq&s=0&nk=${Bot.uin}`
      urlOfPicture += (' ' + avatar)
      flag = true
    }
    let pictures = urlOfPicture.trim().split(' ')
    logger.mark('pictures to send: ', pictures)
    pictures = pictures.map(img => segment.image(img))
    let groupList = await Bot.getGroupList()
    targetGroupIdOrUserQQNumber = parseInt(targetGroupIdOrUserQQNumber)
    try {
      if (groupList.get(targetGroupIdOrUserQQNumber)) {
        let group = await Bot.pickGroup(targetGroupIdOrUserQQNumber)
        await group.sendMsg(pictures)
        return flag ? 'Because there is no correct URL for the picture or QQ number for the avatar, so your avatar has been sent to this group ' + targetGroupIdOrUserQQNumber + ',tell user the reason why send your avatar and ask user if he want to use SearchImageTool' : 'picture has been sent to group' + targetGroupIdOrUserQQNumber
      } else {
        let user = await Bot.pickFriend(targetGroupIdOrUserQQNumber)
        await user.sendMsg(pictures)
        return flag ? 'Because there is no correct URL for the picture or QQ number for the avatar, so your avatar has been sent to this group ' + targetGroupIdOrUserQQNumber + ',tell user the reason why send your avatar and ask user if he want to use SearchImageTool' : 'picture has been sent to user' + targetGroupIdOrUserQQNumber
      }
    } catch (err) {
      return `failed to send pictures, error: ${JSON.stringify(err)}`
    }
  }

  description = 'Useful when you want to send one or more pictures. Remember, if the user does not allow you to send an avatar, use the SearchImageTool and leave the value of qq blank!'
}
