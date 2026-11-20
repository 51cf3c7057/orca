import { toast } from 'sonner'
import { translate } from '@/i18n/i18n'
import { botTarget, callBotRpc, type BotOnHost } from '@/lib/bot-hosts'
import { supportsStructuredAgentSessionRename } from '@/runtime/native-chat/host-capabilities/structured-agent-session-host-support'
import { normalizeAgentSessionConversationName } from '../../../../shared/agent-session/conversation-naming/agent-session-conversation-name'
import type { BotChatTreeChat } from '../../../../shared/bots/bot-chat-tree'

/** Names one of a bot's chats on the bot's host. Resolves when done; never throws. */
export async function renameBotChat(
  bot: BotOnHost,
  chat: Pick<BotChatTreeChat, 'chatId' | 'sessionId'>,
  name: string
): Promise<void> {
  const normalized = normalizeAgentSessionConversationName(name)
  if (normalized === null) {
    return
  }
  try {
    if (!(await supportsStructuredAgentSessionRename(botTarget(bot)))) {
      throw new Error('agent_session_rename_unsupported')
    }
    await callBotRpc(bot, 'agentSession.rename', {
      // After /clear the name lives on the session the chat runs in now.
      sessionId: chat.sessionId ?? chat.chatId,
      name: normalized
    })
  } catch (error) {
    console.warn('[bot-chat-rename] rename failed', error)
    toast.error(translate('components.tab.bar.chatRename.failed', "Couldn't rename this chat"))
  }
}
