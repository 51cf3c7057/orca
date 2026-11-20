import React from 'react'
import { useTranslate } from '@/i18n/use-translate'
import { shouldShowComposerBaseRefPicker } from '../branch-selection/base-ref-picker-visibility'
import { ComposerBaseRefPicker } from '../branch-selection/ComposerBaseRefPicker'
import type { NewWorkspaceComposerCardProps } from './new-workspace-composer-card-props'

type NewWorkspaceComposerBaseBranchSectionProps = Pick<
  NewWorkspaceComposerCardProps,
  | 'repoId'
  | 'selectedRepoIsGit'
  | 'selectedRepoRequiresConnection'
  | 'branchesEnabled'
  | 'smartNameMode'
  | 'smartNameSelection'
  | 'baseBranch'
  | 'onBaseBranchChange'
  | 'startFromResetHint'
>

export function NewWorkspaceComposerBaseBranchSection({
  repoId,
  selectedRepoIsGit,
  selectedRepoRequiresConnection,
  branchesEnabled = true,
  smartNameMode,
  smartNameSelection,
  baseBranch,
  onBaseBranchChange,
  startFromResetHint
}: NewWorkspaceComposerBaseBranchSectionProps): React.JSX.Element | null {
  const t = useTranslate()
  if (
    !onBaseBranchChange ||
    !shouldShowComposerBaseRefPicker({
      selectedRepoIsGit,
      branchesEnabled,
      smartNameMode: smartNameMode ?? 'smart',
      smartNameSelectionKind: smartNameSelection?.kind ?? null
    })
  ) {
    return null
  }
  return (
    <div className="min-w-0 space-y-1">
      <label className="text-xs font-medium text-muted-foreground">
        {t('auto.components.NewWorkspaceComposerCard.branchCreatedFrom', 'Branch created from')}
      </label>
      <ComposerBaseRefPicker
        repoId={repoId}
        baseBranch={baseBranch}
        onBaseBranchChange={onBaseBranchChange}
        resetHint={startFromResetHint}
        readOnly={selectedRepoRequiresConnection}
      />
    </div>
  )
}
