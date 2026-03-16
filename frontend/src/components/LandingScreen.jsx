import { motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'

const FEATURES = [
  '8-area deep reading — Personality, Career, Finance, Love, Health, Luck + more',
  'Lucky Numbers, Color & Month revealed from your palm',
  'Cosmic Warning — one honest secret only your palm holds',
  'Year Ahead Forecast with specific timing & energy shifts',
  'Voice-narrated reading in your language',
  'Downloadable Premium Certificate (PDF)',
  'Live AI Q&A session with your personal palmist',
]

export function LandingScreen({
  name,
  setName,
  language,
  setLanguage,
  onStart,
  hasActiveSession,
  onResumeSession,
  sessionInfo,
  onEndSession,
}) {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(62,104,255,0.24),_transparent_34%),radial-gradient(circle_at_80%_20%,_rgba(170,44,255,0.24),_transparent_26%),radial-gradient(circle_at_bottom,_rgba(53,215,255,0.18),_transparent_32%)]" />
      <div className="grid-pattern absolute inset-0 opacity-30" />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 w-full max-w-5xl rounded-[2rem] border border-white/12 bg-white/6 p-8 shadow-[0_0_80px_rgba(43,91,255,0.18)] backdrop-blur-2xl md:p-12"
      >
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-sm uppercase tracking-[0.45em] text-cyan-200/70">
            <span className="h-px w-10 bg-cyan-300/60" />
            Quantum Palm Oracle
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-500/10 px-4 py-1 text-xs uppercase tracking-[0.25em] text-amber-200">
            ✦ Premium Session
          </div>
        </div>

        <div className="grid gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-start">
          <div>
            <p className="font-sans text-sm uppercase tracking-[0.4em] text-fuchsia-200/65">
              AI Palm Reading Experience
            </p>
            <h1 className="mt-5 max-w-3xl font-display text-5xl leading-none text-white md:text-6xl">
              Discover your future in 60 seconds.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
              Enter a cinematic palm scan, unlock a voice-guided life reading by Sage Aarav AI,
              and continue the private session with a palmist that remembers every line on your hand.
            </p>

            {/* What's included */}
            <div className="mt-7 rounded-[1.5rem] border border-white/10 bg-slate-950/50 p-5">
              <p className="mb-4 text-xs uppercase tracking-[0.38em] text-cyan-200/70">What&apos;s included in your reading</p>
              <ul className="space-y-2.5">
                {FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm leading-6 text-slate-300">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-cyan-300/20 bg-slate-950/50 p-6">
            <label className="text-xs uppercase tracking-[0.35em] text-slate-400">
              Your Name
            </label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter your first name"
              className="mt-4 w-full rounded-2xl border border-white/10 bg-white/6 px-5 py-4 text-lg text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60 focus:bg-white/10"
            />

            <label className="mt-5 block text-xs uppercase tracking-[0.35em] text-slate-400">
              Reading Language Style
            </label>
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              className="mt-3 w-full rounded-2xl border border-white/10 bg-white/6 px-5 py-4 text-base text-white outline-none transition focus:border-cyan-300/60 focus:bg-white/10"
            >
              <option value="english" className="bg-slate-900">English (Global)</option>
              <option value="hindi" className="bg-slate-900">Hindi (हिंदी)</option>
              <option value="whatsapp" className="bg-slate-900">WhatsApp Style (Hinglish)</option>
            </select>

            <button
              type="button"
              onClick={onStart}
              disabled={!name.trim()}
              className="group relative mt-6 inline-flex w-full items-center justify-center overflow-hidden rounded-2xl border border-cyan-300/40 px-6 py-4 text-sm font-semibold uppercase tracking-[0.3em] text-white transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="absolute inset-0 bg-[linear-gradient(120deg,rgba(63,159,255,0.25),rgba(182,63,255,0.45),rgba(63,159,255,0.25))] transition duration-500 group-hover:scale-110" />
              <span className="absolute inset-[1px] rounded-2xl bg-slate-950/90" />
              <span className="relative">Start Premium Session</span>
            </button>

            {hasActiveSession && (
              <button
                type="button"
                onClick={onResumeSession}
                className="mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-fuchsia-300/30 bg-fuchsia-500/10 px-6 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-fuchsia-100 transition hover:bg-fuchsia-500/20"
              >
                Resume Ask Session
              </button>
            )}

            <p className="mt-4 text-center text-xs text-slate-500">
              Powered by Sage Aarav AI · Deep palm analysis · Private &amp; confidential
            </p>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
