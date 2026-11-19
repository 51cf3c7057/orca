import React from 'react'
import { Archive, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/class-names'
import { useTranslate } from '@/i18n/use-translate'
import { PROJECT_GROUP_HEADER_INDENT } from './indentation'

type ArchivedSectionLineProps = {
  count: number
  open: boolean
  /** Names the project for screen readers, since every project has its own line. */
  repoDisplayName?: string
  groupDepth?: number
  onToggle: () => void
}

/** The fold line above a project's archived workspaces. */
export function ArchivedSectionLine({
  count,
  open,
  repoDisplayName,
  groupDepth = 0,
  onToggle
}: ArchivedSectionLineProps): React.JSX.Element {
  const t = useTranslate()
  const label = t('auto.components.sidebar.ArchivedSectionLine.label', 'Archived')
  return (
    <div
      className="mx-1 my-0.5 ml-3 text-worktree-sidebar-foreground"
      style={groupDepth > 0 ? { paddingLeft: groupDepth * PROJECT_GROUP_HEADER_INDENT } : undefined}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-label={
          repoDisplayName
            ? t(
                'auto.components.sidebar.ArchivedSectionLine.ariaLabel',
                'Archived workspaces in {{repo}}: {{count}}',
                { repo: repoDisplayName, count }
              )
            : undefined
        }
        onClick={onToggle}
        className={cn(
          'flex min-h-7 w-full min-w-0 items-center gap-1.5 rounded-md px-1.5 text-left text-2xs leading-none text-muted-foreground transition-colors',
          'hover:bg-worktree-sidebar-accent hover:text-worktree-sidebar-accent-foreground',
          'outline-none focus-visible:ring-2 focus-visible:ring-ring'
        )}
      >
        <ChevronDown
          className={cn(
            'size-3 shrink-0 transition-transform motion-reduce:transition-none',
            !open && '-rotate-90'
          )}
          aria-hidden="true"
        />
        <Archive className="size-3 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <span className="shrink-0 rounded-full border border-worktree-sidebar-border px-1.5 py-0.5 text-3xs leading-none tabular-nums">
          {count}
        </span>
      </button>
    </div>
  )
}
