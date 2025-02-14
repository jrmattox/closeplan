import { PrismaAdapter } from "@auth/prisma-adapter"
import NextAuth from "next-auth"
import { prisma } from "@/lib/prisma"
import CredentialsProvider from "next-auth/providers/credentials"
import { comparePasswords } from "@/lib/auth/password"

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user?.password) {
          return null
        }

        const isValid = await comparePasswords(
          credentials.password,
          user.password
        )

        if (!isValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
        }
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: '/auth/login',
    signUp: '/auth/signup',
  },
  callbacks: {
    session: async ({ session, user }) => {
      if (session?.user) {
        session.user.id = user.id
        // Get the user's tenant
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { tenantId: true }
        })
        session.user.tenantId = dbUser?.tenantId
      }
      return session
    }
  }
}

const handler = NextAuth(authOptions)

// Export both GET and POST handlers
export { handler as GET, handler as POST }
