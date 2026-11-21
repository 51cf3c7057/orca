import React from 'react'
import './idle-zzz.css'

const IDLE_ZZZ_ANIMATION_PREFIX = 'idle-zzz-'

// Anchor each letter to the document timeline on animationstart so every mark shares one phase, without mount-time queries.
function handleIdleZzzAnimationStart(event: React.AnimationEvent<HTMLSpanElement>): void {
  const { animationName, target } = event
  if (
    !animationName.startsWith(IDLE_ZZZ_ANIMATION_PREFIX) ||
    !(target instanceof Element) ||
    typeof target.getAnimations !== 'function'
  ) {
    return
  }
  const animation = target
    .getAnimations()
    .find((candidate) => 'animationName' in candidate && candidate.animationName === animationName)
  if (animation !== undefined) {
    animation.startTime = 0
  }
}

/** Sleeping "zzz" before a row's time; the letters appear one by one, rising and growing, in the time's size and tone. */
export function IdleZzz({ label }: { label: string }): React.JSX.Element {
  return (
    <span
      data-idle-zzz=""
      className="mr-1 inline-flex items-end"
      onAnimationStart={handleIdleZzzAnimationStart}
    >
      <span
        aria-hidden="true"
        data-idle-zzz-letter="1"
        className="inline-block scale-75 translate-y-px"
      >
        z
      </span>
      <span
        aria-hidden="true"
        data-idle-zzz-letter="2"
        className="inline-block scale-90 -translate-y-px"
      >
        z
      </span>
      <span aria-hidden="true" data-idle-zzz-letter="3" className="inline-block -translate-y-[3px]">
        z
      </span>
      <span className="sr-only">{label}</span>
    </span>
  )
}
