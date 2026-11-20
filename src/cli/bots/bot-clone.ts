// `orca bot clone --offer`: shows the owner a card proposing a clone of a bot, with its traits and none of
// its work. Nothing is created until they press Create bot.
import type { CommandHandler } from '../dispatch/dispatch'
import { getOptionalStringFlag, getRequiredStringFlag } from '../arguments/flags'
import { printResult } from '../output/command-result-output'
import { RuntimeClientError } from '../runtime/connection/types'
import { callBots, type BotsListResult } from './bot'
import { BOT_CREATE_REFUSAL, offeringChat, readSoulFileFlag } from './bot-create'

export const BOT_CLONE_HANDLERS: Record<string, CommandHandler> = {
  'bot clone': async (context) => {
    const { flags, client, json } = context
    // Only the owner creates a bot, in Orca; from the CLI a bot can only propose one.
    if (!flags.has('offer')) {
      throw new RuntimeClientError('invalid_argument', BOT_CREATE_REFUSAL)
    }
    const callerSessionId = offeringChat()
    const from = getRequiredStringFlag(flags, 'from')
    const name = getRequiredStringFlag(flags, 'name')
    const soul = await readSoulFileFlag(context)
    const { result } = await callBots<BotsListResult>(client, 'bots.list')
    const key = from.toLowerCase()
    const source =
      result.bots.find((bot) => bot.id === from) ??
      result.bots.find((bot) => bot.name.toLowerCase() === key)
    if (!source) {
      const names = result.bots.map((bot) => bot.name)
      throw new RuntimeClientError(
        'invalid_argument',
        names.length
          ? `No bot named ${from}. The bots here are: ${names.join(', ')}.`
          : `No bot named ${from}. There are no bots here.`
      )
    }
    const offered = await callBots<{ offered: boolean; message: string }>(
      client,
      'bots.createOffer',
      {
        callerSessionId,
        name,
        purpose:
          getOptionalStringFlag(flags, 'purpose') ??
          `A clone of ${source.name}: its traits, none of its work.`,
        cloneFrom: { botId: source.id, name: source.name },
        ...(soul ? { soul } : {})
      }
    )
    printResult(offered, json, (value) => value.message)
  }
}
