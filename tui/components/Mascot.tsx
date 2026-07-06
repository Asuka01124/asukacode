import { theme } from "../theme"
import { ICONS } from "../icons"

interface MascotProps {
  icon?: string
}

export function Mascot({ icon = "crab" }: MascotProps) {
  const iconDef = ICONS[icon] || ICONS.crab

  return (
    <box
      height={12}
      flexShrink={0}
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      backgroundColor={theme.color.sidebarBg}
      paddingLeft={2}
      paddingRight={2}
    >
      <box flexDirection="column">
        {iconDef.rows.map((row, i) => (
          <box key={i} flexDirection="row">
            {row.map((seg, j) => (
              <text key={j} fg={seg.color}>{seg.text}</text>
            ))}
          </box>
        ))}
      </box>
    </box>
  )
}
