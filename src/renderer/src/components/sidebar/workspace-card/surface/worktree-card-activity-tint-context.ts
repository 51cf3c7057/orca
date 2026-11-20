import { createContext, useContext } from 'react'

export type ActivityTint = 'waiting' | 'working' | 'merged' | 'ready'

/** The tint the card already computed, so the title row reuses it instead of subscribing again. */
export const ActivityTintContext = createContext<ActivityTint | null>(null)

/** True when no agent works or waits on you; false while "Activity color" is off. */
export function useWorktreeCardIdle(): boolean {
  const tint = useContext(ActivityTintContext)
  return tint === 'ready' || tint === 'merged'
}
