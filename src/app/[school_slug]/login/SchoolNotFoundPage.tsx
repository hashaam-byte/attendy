'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Reason = 'not_found' | 'invalid' | 'suspended' | 'db_error'

interface Props {
  slug: string
  reason: Reason
  schoolName?: string
  dbError?: string
}

export default function SchoolNotFoundPage({ slug, reason, schoolName, dbError }: Props) {
  const router = useRouter()
  const [input, setInput] = useState('')

  function handleGo(e: React.FormEvent) {
    e.preventDefault()
    const clean = input.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    if (clean) router.push(`/${clean}/login`)
  }

  const config = {
    not_found: {
      icon: (
        <svg className="w-7 h-7 text-zinc-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
        </svg>
      ),
      iconBg: 'bg-zinc-900 border-zinc-800',
      title: 'School Not Found',
      message: (
        <>
          No school found at{' '}
          <code className="text-green-400 font-mono text-xs bg-green-400/10 px-1.5 py-0.5 rounded-md">
            /{slug}
          </code>
          . Check the spelling of your school link and try again.
        </>
      ),
      showSearch: true,
      showRetry: false,
    },
    invalid: {
      icon: (
        <svg className="w-7 h-7 text-zinc-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      ),
      iconBg: 'bg-zinc-900 border-zinc-800',
      title: 'Invalid School Link',
      message: (
        <>
          <code className="text-red-400 font-mono text-xs bg-red-400/10 px-1.5 py-0.5 rounded-md">
            /{slug}
          </code>{' '}
          isn't a valid school link. Links use only lowercase letters, numbers, and hyphens (e.g.{' '}
          <code className="text-zinc-400 font-mono text-xs">greenfield-academy</code>).
        </>
      ),
      showSearch: true,
      showRetry: false,
    },
    suspended: {
      icon: (
        <svg className="w-7 h-7 text-amber-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      ),
      iconBg: 'bg-amber-500/10 border-amber-500/20',
      title: 'Account Suspended',
      message: (
        <>
          <span className="text-white font-medium">{schoolName ?? 'This school'}</span> has been
          temporarily suspended. Please contact your school admin or reach out to Attendy support
          to resolve this.
        </>
      ),
      showSearch: false,
      showRetry: false,
    },
    db_error: {
      icon: (
        <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      ),
      iconBg: 'bg-red-500/10 border-red-500/20',
      title: 'Connection Error',
      message: (
        <>
          We couldn't load the school data right now. This is usually temporary — please try again
          in a moment.
        </>
      ),
      showSearch: false,
      showRetry: true,
    },
  }

  const c = config[reason]

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">

      {/* Background grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-2.5">
            <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-900/30">
              <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                <path d="M12 3L1 9l4 2.18V17l7 4 7-4v-5.82L23 9 12 3zm0 2.3L20.06 9 12 12.7 3.94 9 12 5.3zM7 14.13V17l5 2.86V14.7L7 12.5v1.63zm10 0V12.5l-5 2.2v5.16L17 17v-2.87z"/>
              </svg>
            </div>
            <span className="text-white font-bold text-lg">Attendy</span>
          </a>
        </div>

        {/* Main card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">

          {/* Top accent line */}
          <div className="h-0.5 bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />

          <div className="p-8 text-center">

            {/* Icon */}
            <div className={`w-16 h-16 ${c.iconBg} border rounded-2xl flex items-center justify-center mx-auto mb-5`}>
              {c.icon}
            </div>

            {/* Title */}
            <h1 className="text-white text-xl font-bold mb-3 tracking-tight">
              {c.title}
            </h1>

            {/* Message */}
            <p className="text-zinc-400 text-sm leading-relaxed max-w-xs mx-auto mb-6">
              {c.message}
            </p>

            {/* DB error details */}
            {reason === 'db_error' && dbError && (
              <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-2 mb-5">
                <p className="text-zinc-500 text-xs font-mono break-all">{dbError}</p>
              </div>
            )}

            {/* Retry button */}
            {c.showRetry && (
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors mb-3"
              >
                Try again
              </button>
            )}

            {/* Search for school */}
            {c.showSearch && (
              <form onSubmit={handleGo} className="text-left mb-2">
                <p className="text-zinc-500 text-xs mb-2 uppercase tracking-wider font-medium">
                  Try a different school link
                </p>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 focus-within:border-green-600 transition-colors">
                    <span className="text-zinc-600 text-xs font-mono whitespace-nowrap hidden sm:block">
                      attendy-edu.vercel.app/
                    </span>
                    <input
                      type="text"
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      placeholder="your-school-name"
                      className="flex-1 bg-transparent text-white text-sm focus:outline-none min-w-0 placeholder:text-zinc-600"
                      spellCheck={false}
                      autoComplete="off"
                      autoCapitalize="none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 rounded-xl transition-colors shrink-0"
                  >
                    Go
                  </button>
                </div>
              </form>
            )}

          </div>

          {/* Footer strip */}
          <div className="border-t border-zinc-800 px-8 py-4 flex items-center justify-between">
            <a
              href="/"
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Back to home
            </a>
            <a
              href="mailto:attendyofficial@gmail.com"
              className="text-xs text-zinc-600 hover:text-green-400 transition-colors"
            >
              Contact support
            </a>
          </div>
        </div>

        {/* Status check link */}
        <p className="text-center mt-4 text-zinc-600 text-xs">
          Check if your school is registered →{' '}
          <a href="/status" className="text-zinc-500 hover:text-zinc-300 underline underline-offset-2">
            School Status
          </a>
        </p>
      </div>
    </div>
  )
}
