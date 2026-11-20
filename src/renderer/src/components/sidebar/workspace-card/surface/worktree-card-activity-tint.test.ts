import { describe, expect, it } from 'vitest'
import { activityTint } from './worktree-card-activity-tint'

describe('activityTint', () => {
  it('keeps a working child visible next to a failed one', () => {
    expect(activityTint('active', [{ kind: 'failed' }, { kind: 'working', at: null }], false)).toBe(
      'working'
    )
  })

  it('ranks a collapsed child that needs you above the card working', () => {
    expect(activityTint('working', [{ kind: 'needs', count: 1 }], false)).toBe('waiting')
  })

  it('stays ready when the only news is a failure', () => {
    expect(activityTint('failed', [{ kind: 'failed' }], false)).toBe('ready')
  })

  it('keeps the merged tint for a merged PR only, and under an agent still working', () => {
    expect(activityTint('inactive', [], false)).toBe('ready')
    expect(activityTint('done', [], true)).toBe('merged')
    expect(activityTint('working', [], true)).toBe('working')
  })
})
