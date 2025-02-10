import { DefaultSession } from 'next-auth'

export type NavItem = {
  name: string
  href: string
  icon?: React.ComponentType
  children?: NavItem[]
}

export type UserRole = 
  | 'SALES_REP'
  | 'SALES_ENGINEER'
  | 'EXECUTIVE_SPONSOR'
  | 'ECONOMIC_BUYER'
  | 'USER_REP'
  | 'LAWYER'
  | 'OPSEC'
  | 'IT'
  | 'PROCUREMENT'

// Extend next-auth session type
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: UserRole
    } & DefaultSession['user']
  }
} 