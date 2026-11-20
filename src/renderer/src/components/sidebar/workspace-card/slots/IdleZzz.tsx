import React from 'react'
import './idle-zzz.css'

/** Sleeping "zzz" before a row's time; the letters appear one by one, rising and growing, in the time's size and tone. */
export function IdleZzz({ label }: { label: string }): React.JSX.Element {
  return (
    <span data-idle-zzz="" className="mr-1 inline-flex items-end">
      <span aria-hidden="true" className="idle-zzz-1 inline-block scale-75 translate-y-px">
        z
      </span>
      <span aria-hidden="true" className="idle-zzz-2 inline-block scale-90 -translate-y-px">
        z
      </span>
      <span aria-hidden="true" className="idle-zzz-3 inline-block -translate-y-[3px]">
        z
      </span>
      <span className="sr-only">{label}</span>
    </span>
  )
}
