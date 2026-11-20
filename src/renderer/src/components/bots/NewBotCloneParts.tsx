// New bot as a clone: what it takes from the bot it is cloned from, and what it leaves behind.
import { useTranslate, type Translate } from '@/i18n/use-translate'
import { useBotHostHas } from '@/lib/bot-host-status'
import { BOTS_CLONE_RUNTIME_CAPABILITY } from '../../../../shared/bot-runtime-capabilities'
import type { Bot } from '../../../../shared/bot-types'
import type { ExecutionHostId } from '../../../../shared/execution-host/execution-host'
import { BOT_CLONE_COPIED, BOT_CLONE_NOT_COPIED } from '../../../../shared/bots/bot-clone'

/** The bot a clone is made from. A card may name one this window doesn't list, so only its id, name and
 *  computer are sure. */
export type NewBotCloneSource = Pick<Bot, 'id' | 'name'> &
  Partial<Pick<Bot, 'agent' | 'launch' | 'permissionMode'>> & { hostId: ExecutionHostId }

/** Whether a bot's menus offer Clone bot: its computer must clone, since an older paired Orca ignores
 *  `cloneFrom` and would make an empty bot. This app's own runtime always can. */
export function useBotCanClone(hostId: ExecutionHostId): boolean {
  return useBotHostHas(hostId, BOTS_CLONE_RUNTIME_CAPABILITY)
}

/** The shared English labels, each under its own catalog key by position. */
export function botCloneLists(t: Translate): { copied: string[]; notCopied: string[] } {
  return {
    copied: BOT_CLONE_COPIED.map((label, index) => t(`bots.clone.copied.${index}`, label)),
    notCopied: BOT_CLONE_NOT_COPIED.map((label, index) => t(`bots.clone.notCopied.${index}`, label))
  }
}

export function NewBotCloneParts(): React.JSX.Element {
  const t = useTranslate()
  const { copied, notCopied } = botCloneLists(t)
  const list = (heading: string, items: readonly string[]) => (
    <div className="min-w-0 space-y-1.5">
      <h3 className="text-xs text-muted-foreground">{heading}</h3>
      <ul className="space-y-1 text-sm text-foreground">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
  return (
    <section className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
      {list(t('bots.clone.copiedHeading', 'Copied'), copied)}
      {list(t('bots.clone.notCopiedHeading', 'Not copied'), notCopied)}
    </section>
  )
}
