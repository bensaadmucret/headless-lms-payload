declare module 'payload/components/elements' {
  import type { FC } from 'react'

  export interface NavLinkProps {
    to: string
    label: string
    icon?: string
  }

  export const NavLink: FC<NavLinkProps>
}
