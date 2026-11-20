import React from 'react'
import { cn } from '@/lib/class-names'
import { overlapCutoutMask } from '@/lib/overlap-cutout-mask'
import type { Bot } from '../../../../shared/bot-types'
import {
  BOT_GROUP_FACE_GAP,
  BOT_GROUP_FACE_SLOT,
  BOT_GROUP_FACE_WIDTH,
  botGroupFaceLinks,
  type BotGroupFace
} from '../../../../shared/bots/bot-group-face-layout'
import { BotAvatar, BotAvatarTile } from './BotAvatar'

/** A group's member circles, laid out by one of the face layouts, with a link across each gap. */
export function BotGroupFaces({
  faces: layout,
  className,
  slot
}: {
  faces: readonly BotGroupFace<Bot>[]
  /** Sizes the box when there is no `slot`, as a tab icon's does. */
  className?: string
  /** The group picture's height in px: the layout is scaled to it and the box sized from the face
   *  constants, square while there are no faces. */
  slot?: number
}): React.JSX.Element {
  const faces = scaleBotGroupFaces(layout, (slot ?? BOT_GROUP_FACE_SLOT) / BOT_GROUP_FACE_SLOT)
  return (
    <span
      className={cn('relative block shrink-0', className)}
      style={
        slot === undefined
          ? undefined
          : {
              width: faces.length > 0 ? (slot * BOT_GROUP_FACE_WIDTH) / BOT_GROUP_FACE_SLOT : slot,
              height: slot
            }
      }
      data-testid="bot-group-faces"
    >
      {/* Drawn first, so the faces cover the bars' ends and only the gaps show them. */}
      {botGroupFaceLinks(faces).map((link) => (
        <span
          key={link.key}
          className="absolute rounded-full bg-muted-foreground"
          style={{ left: link.x, top: link.y, width: link.length, height: link.thickness }}
        />
      ))}
      {faces.map((face, index) => {
        const style = botGroupFaceStyle(face, faces.slice(index + 1))
        return 'member' in face.face ? (
          <BotAvatar
            key={face.key}
            bot={face.face.member}
            className="absolute rounded-full"
            style={style}
          />
        ) : (
          <BotAvatarTile
            key={face.key}
            src={null}
            fallback={`+${face.face.more}`}
            className="absolute rounded-full font-medium text-muted-foreground"
            style={style}
          />
        )
      })}
    </span>
  )
}

function scaleBotGroupFaces(
  faces: readonly BotGroupFace<Bot>[],
  scale: number
): readonly BotGroupFace<Bot>[] {
  if (scale === 1) {
    return faces
  }
  return faces.map((face) => ({
    ...face,
    x: face.x * scale,
    y: face.y * scale,
    size: face.size * scale,
    font: face.font * scale
  }))
}

/** Places a circle and cuts a clear gap where a later one overlaps it, so it matches any background. */
function botGroupFaceStyle(
  face: BotGroupFace<Bot>,
  above: readonly BotGroupFace<Bot>[]
): React.CSSProperties {
  return {
    left: face.x,
    top: face.y,
    width: face.size,
    height: face.size,
    fontSize: face.font,
    ...overlapCutoutMask(face, above, BOT_GROUP_FACE_GAP)
  }
}
