import { Config } from '../config.js'

function googleRequestUrlEmojiFilename (combo) {
  return `${googleRequestUrlEmojiPart(
      combo.leftEmoji
  )}_${googleRequestUrlEmojiPart(combo.rightEmoji)}.png`
}

function googleRequestUrlEmojiPart (emoji) {
  return emoji
    .split('-')
    .map((part) => `u${part.toLowerCase()}`)
    .join('-')
}

export function googleRequestUrl (combo) {
  return `${Config.emojiBaseURL}/${combo.date}/${googleRequestUrlEmojiPart(
      combo.leftEmoji
  )}/${googleRequestUrlEmojiFilename(combo)}`
}
