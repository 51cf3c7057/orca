import { describe, expect, it } from 'vitest'
import { activityTint } from './worktree-card-activity-tint'

describe('activityTint', () => {
  it('keeps a working child visible next to a failed one', () => {
    expect(activityTint('active', [{ kind: 'failed' }, { kind: 'working', at: null }])).toBe(
      'working'
    )
  })

  it('ranks a collapsed child that needs you above the card working', () => {
    expect(activityTint('working', [{ kind: 'needs', count: 1 }])).toBe('waiting')
  })

  it('stays quiet when the only news is a failure', () => {
    expect(activityTint('failed', [{ kind: 'failed' }])).toBe('idle')
  })
})
