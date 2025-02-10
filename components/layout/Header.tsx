import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function Header() {
  return (
    <header className="fixed w-full bg-white/80 backdrop-blur-md z-50 border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl">
          ClosePlan
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <Link href="/solutions" className="hover:text-blue-600 transition-colors">Solutions</Link>
          <Link href="/pricing" className="hover:text-blue-600 transition-colors">Pricing</Link>
          <Link href="/about" className="hover:text-blue-600 transition-colors">About</Link>
        </nav>

        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/login">Sign In</Link>
          </Button>
          <Button asChild>
            <Link href="/request-demo">Request Demo</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
