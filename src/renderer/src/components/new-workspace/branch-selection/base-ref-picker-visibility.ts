import type { SmartWorkspaceNameSelection } from '@/components/new-workspace/name-field/smart-workspace-name-field-model'

/** Naming source and base ref are independent, except PR/MR/branch selections already carry their own base. */
export function shouldShowComposerBaseRefPicker(args: {
  selectedRepoIsGit: boolean
  branchesEnabled: boolean
  smartNameSelectionKind: SmartWorkspaceNameSelection['kind'] | null
}): boolean {
  if (!args.selectedRepoIsGit || !args.branchesEnabled) {
    return false
  }
  // PR/MR heads and branch picks define the checkout; overriding would silently create a different branch.
  return (
    args.smartNameSelectionKind !== 'github-pr' &&
    args.smartNameSelectionKind !== 'gitlab-mr' &&
    args.smartNameSelectionKind !== 'branch'
  )
}
