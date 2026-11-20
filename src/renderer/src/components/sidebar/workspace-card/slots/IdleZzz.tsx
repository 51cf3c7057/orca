import React from 'react'

/** Sleeping "zzz" before a row's time, each z rising and growing; it takes the time's size and tone. */
export function IdleZzz({ label }: { label: string }): React.JSX.Element {
  return (
    <span data-idle-zzz="" className="mr-1 inline-flex items-end">
      <span aria-hidden="true" className="inline-block scale-75 translate-y-px">
        z
      </span>
      <span aria-hidden="true" className="inline-block scale-90 -translate-y-px">
        z
      </span>
      <span aria-hidden="true" className="inline-block -translate-y-[3px]">
        z
      </span>
      <span className="sr-only">{label}</span>
    </span>
  )
}
