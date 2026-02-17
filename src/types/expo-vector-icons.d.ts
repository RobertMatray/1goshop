declare module '@expo/vector-icons' {
  export { default as Ionicons } from '@expo/vector-icons/build/Ionicons'
}

declare module '@expo/vector-icons/build/Ionicons' {
  import type { ComponentType } from 'react'

  interface IconProps {
    name: string
    size?: number
    color?: string
    style?: unknown
  }

  const Ionicons: ComponentType<IconProps>
  export default Ionicons
}
