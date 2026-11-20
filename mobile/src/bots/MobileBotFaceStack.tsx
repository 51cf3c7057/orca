import { Text, View } from 'react-native'
import {
  BOT_GROUP_FACE_SLOT,
  BOT_GROUP_FACE_WIDTH,
  botGroupFaceLinks,
  botGroupFaces
} from '../../../src/shared/bots/bot-group-face-layout'
import { colors } from '../theme/mobile-theme'
import { themedStyleSheet } from '../theme/themed-styles'
import { useMobileColorScheme } from '../theme/use-mobile-color-scheme'
import type { MobileBotAvatarSource } from './host-bot-row-facts'
import { MobileBotAvatar } from './MobileBotAvatar'

/** A group's members side by side with a link across each gap, laid out as on desktop. */
export function MobileBotFaceStack({
  faces,
  slot = 32
}: {
  faces: readonly { id: string; avatar: MobileBotAvatarSource }[]
  /** The picture's height, in pt; the row's avatar size by default. */
  slot?: number
}) {
  useMobileColorScheme()
  const layout = botGroupFaces(faces, (face) => face.id, slot / BOT_GROUP_FACE_SLOT)
  return (
    <View
      style={{
        width: layout.length > 0 ? (slot * BOT_GROUP_FACE_WIDTH) / BOT_GROUP_FACE_SLOT : slot,
        height: slot
      }}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      {/* Drawn first, so the faces cover the bars' ends and only the gaps show them. */}
      {botGroupFaceLinks(layout).map((link) => (
        <View
          key={link.key}
          style={[
            styles.link,
            {
              left: link.x,
              top: link.y,
              width: link.length,
              height: link.thickness,
              borderRadius: link.thickness / 2
            }
          ]}
        />
      ))}
      {layout.map((face) => (
        <View key={face.key} style={[styles.face, { left: face.x, top: face.y }]}>
          {'member' in face.face ? (
            <MobileBotAvatar avatar={face.face.member.avatar} size={face.size} circular />
          ) : (
            <View
              style={[
                styles.more,
                { width: face.size, height: face.size, borderRadius: face.size / 2 }
              ]}
            >
              <Text style={[styles.moreText, { fontSize: Math.round(face.font) }]}>
                +{face.face.more}
              </Text>
            </View>
          )}
        </View>
      ))}
    </View>
  )
}

const styles = themedStyleSheet(() => ({
  // Desktop's --muted-foreground, which reads on the screen, panels and sheets in both schemes.
  link: { position: 'absolute', backgroundColor: colors.textSecondary },
  face: { position: 'absolute' },
  more: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.bgRaised
  },
  moreText: { fontWeight: '500', color: colors.textMuted }
}))
