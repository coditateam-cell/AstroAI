'use client'

import Link from 'next/link'

export default function Navbar() {
  return (
    <nav className="border-b">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <Link href="/" className="text-xl font-bold">
            JyotishAI
          </Link>
          <div className="flex space-x-4">
            <Link href="/onboarding" className="hover:text-gray-600">
              Onboarding
            </Link>
            <Link href="/session" className="hover:text-gray-600">
              Session
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
