import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Calendar, Download, Pause, Play, RotateCcw, Sparkles, Star, Volume2, Waves } from 'lucide-react'
import { jsPDF } from 'jspdf'

const SECTION_ORDER = ['personality', 'career', 'finance', 'love', 'health', 'luck']

const SECTION_LABELS = {
  english: {
    personality: 'Personality',
    career: 'Career',
    finance: 'Financial Future',
    love: 'Love Life',
    health: 'Health & Vitality',
    luck: 'Luck & Fortune',
  },
  hindi: {
    personality: 'व्यक्तित्व',
    career: 'करियर',
    finance: 'आर्थिक भविष्य',
    love: 'प्रेम जीवन',
    health: 'स्वास्थ्य',
    luck: 'भाग्य संकेत',
  },
  whatsapp: {
    personality: 'Personality vibes',
    career: 'Career scene',
    finance: 'Money flow',
    love: 'Love zone',
    health: 'Health check',
    luck: 'Luck factor',
  },
}


function StarRating({ value = 0, max = 5 }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${i < value ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-slate-600'}`}
        />
      ))}
    </div>
  )
}

function ReadingSectionCard({ section, index, rating, isCurrent, renderHighlightedText }) {

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.45 }}
      className={`rounded-[1.75rem] border p-5 ${
        isCurrent
          ? 'border-cyan-300/45 bg-cyan-500/10 shadow-[0_0_24px_rgba(34,211,238,0.18)]'
          : 'border-white/10 bg-slate-950/60'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/80">{section.label}</p>
        {rating != null && <StarRating value={rating} />}
      </div>
      <p className="mt-4 leading-7 text-slate-200">{renderHighlightedText(section.text, section.key)}</p>
    </motion.article>
  )
}

const LANGUAGE_LABEL = {
  english: 'English',
  hindi: 'Hindi',
  whatsapp: 'WhatsApp Hinglish',
}

const RESULTS_UI = {
  english: {
    palmLineMap: 'Palm Line Map',
    palmGuide: 'Yellow guides show major palm lines so the user can connect each insight with a visual line reference.',
    openingReading: 'Opening reading',
    revealingInsight: 'Revealing insight',
    cosmicWarning: 'Cosmic Warning',
    yearAhead: 'Year Ahead',
    voiceChannel: 'Voice channel',
    voiceDescription: 'The reading is delivered in a calm, deliberate cadence with dramatic pauses to heighten the reveal.',
  },
  hindi: {
    palmLineMap: 'हथेली रेखा मानचित्र',
    palmGuide: 'पीली रेखाएं मुख्य हथेली रेखाएं दिखाती हैं ताकि हर insight को visual line से जोड़ा जा सके।',
    openingReading: 'प्रारंभिक रीडिंग',
    revealingInsight: 'मुख्य रहस्य',
    cosmicWarning: 'सावधानी संकेत',
    yearAhead: 'आने वाला वर्ष',
    voiceChannel: 'वॉइस चैनल',
    voiceDescription: 'रीडिंग शांत और संतुलित आवाज़ में दी जाती है, ताकि हर संकेत साफ महसूस हो।',
  },
  whatsapp: {
    palmLineMap: 'Palm Line Map',
    palmGuide: 'Yellow lines se major palm lines highlight hoti hain, taaki har insight ka visual connect clear rahe.',
    openingReading: 'Opening Reading',
    revealingInsight: 'Revealing Insight',
    cosmicWarning: 'Cosmic Warning',
    yearAhead: 'Year Ahead',
    voiceChannel: 'Voice Channel',
    voiceDescription: 'Reading calm aur clear tone mein di jati hai, taaki har signal easily samajh aaye.',
  },
}

export function ResultsScreen({
  name,
  reading,
  language,
  lineLabels,
  narrationCursor,
  palmImage,
  isNarrating,
  isVoicePaused,
  narrationSpeed,
  onSpeedChange,
  onNarrate,
  onPause,
  onResume,
  onRestart,
  onContinue,
}) {
  const ui = RESULTS_UI[language] || RESULTS_UI.english

  const speedPresets = [0.85, 1, 1.15, 1.3]

  const sections = useMemo(() => {
    const labels = SECTION_LABELS[language] || SECTION_LABELS.english
    return SECTION_ORDER.map((key) => ({
      key,
      label: labels[key],
      text: reading.sections?.[key] || '',
      rating: reading.starRatings?.[key] ?? null,
    }))
  }, [language, reading])

  function renderHighlightedText(text, key) {
    if (!text) {
      return ''
    }

    const isCurrent = isNarrating && narrationCursor?.key === key
    if (!isCurrent) {
      return text
    }

    const index = Math.max(0, Math.min(text.length, narrationCursor?.localIndex || 0))
    const before = text.slice(0, index)
    const after = text.slice(index)
    const nextWord = after.split(' ')[0] || ''

    return (
      <>
        <span className="text-cyan-100">{before}</span>
        {nextWord && <mark className="rounded bg-cyan-300/35 px-0.5 text-white">{nextWord}</mark>}
        {after.slice(nextWord.length)}
      </>
    )
  }

  function downloadPdf() {
    const pdf = new jsPDF()
    pdf.setFont('times', 'bold')
    pdf.setFontSize(18)
    pdf.text('Premium AI Palm Reading Certificate', 20, 20)
    pdf.setFontSize(12)
    pdf.text(`${name} — Personal Reading`, 20, 30)
    pdf.setFont('times', 'italic')
    pdf.setFontSize(9)
    pdf.text(`Language: ${LANGUAGE_LABEL[language] || 'English'}  |  Powered by Sage Aarav AI`, 20, 38)

    pdf.setDrawColor(100, 100, 180)
    pdf.line(20, 43, 190, 43)

    let y = 52
    pdf.setFont('times', 'normal')
    pdf.setFontSize(10)

    // Lucky profile block
    if (reading.luckyNumbers || reading.luckyColor || reading.luckyMonth) {
      pdf.setFont('times', 'bold')
      pdf.setFontSize(11)
      pdf.text('Lucky Profile', 20, y)
      y += 6
      pdf.setFont('times', 'normal')
      pdf.setFontSize(10)
      const parts = []
      if (reading.luckyNumbers?.length) parts.push(`Numbers: ${reading.luckyNumbers.join(', ')}`)
      if (reading.luckyColor) parts.push(`Color: ${reading.luckyColor}`)
      if (reading.luckyMonth) parts.push(`Month: ${reading.luckyMonth}`)
      pdf.text(parts.join('   |   '), 20, y)
      y += 10
    }

    const blocks = [
      { title: 'Opening Reading', text: reading.intro },
      { title: 'Revealing Insight', text: reading.revealingInsight },
      ...(reading.cosmicWarning ? [{ title: 'Cosmic Warning', text: reading.cosmicWarning }] : []),
      ...(reading.yearsForecast ? [{ title: 'Year Ahead Forecast', text: reading.yearsForecast }] : []),
      ...sections.map((s) => ({ title: s.label, text: s.text })),
    ]

    blocks.forEach(({ title, text }) => {
      if (y > 265) { pdf.addPage(); y = 20 }
      pdf.setFont('times', 'bold')
      pdf.setFontSize(11)
      const titleLines = pdf.splitTextToSize(title + ':', 170)
      pdf.text(titleLines, 20, y)
      y += titleLines.length * 5.5 + 2
      pdf.setFont('times', 'normal')
      pdf.setFontSize(10)
      const textLines = pdf.splitTextToSize(text || '', 170)
      pdf.text(textLines, 20, y)
      y += textLines.length * 5.5 + 8
    })

    pdf.setFont('times', 'italic')
    pdf.setFontSize(8)
    if (y > 275) { pdf.addPage(); y = 20 }
    pdf.text('Generated by Sage Aarav AI Palm Reading  •  Premium Session', 20, y + 6)
    pdf.save(`${name.toLowerCase()}-palm-reading.pdf`)
  }

  return (
    <section className="relative min-h-screen overflow-hidden px-4 py-8 md:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.24),_transparent_30%),radial-gradient(circle_at_80%_10%,_rgba(192,38,211,0.24),_transparent_26%),linear-gradient(180deg,#030712_0%,#020617_100%)]" />
      <div className="grid-pattern absolute inset-0 opacity-20" />

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* ── Header ── */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.4em] text-cyan-200/70">Premium Palm Reading Complete</p>
            <h2 className="mt-2 font-display text-4xl text-white md:text-5xl">{reading.headline}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-300/30 bg-fuchsia-500/10 px-4 py-1 text-xs uppercase tracking-[0.22em] text-fuchsia-100">
                <Sparkles className="h-3 w-3" />
                Voice & Text: {LANGUAGE_LABEL[language] || LANGUAGE_LABEL.english}
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/30 bg-emerald-500/10 px-4 py-1 text-xs uppercase tracking-[0.22em] text-emerald-200">
                ✦ Certified Premium Reading
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onNarrate}
              className="inline-flex items-center gap-2 rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-5 py-3 text-sm font-semibold uppercase tracking-[0.28em] text-white transition hover:bg-cyan-400/20"
            >
              <Volume2 className="h-4 w-4" />
              Narrate Reading
            </button>
            <button
              type="button"
              onClick={isVoicePaused ? onResume : onPause}
              disabled={!isNarrating}
              className="inline-flex items-center gap-2 rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-5 py-3 text-sm font-semibold uppercase tracking-[0.28em] text-white transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isVoicePaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              {isVoicePaused ? 'Resume Voice' : 'Pause Voice'}
            </button>
            <button
              type="button"
              onClick={onRestart}
              className="inline-flex items-center gap-2 rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-5 py-3 text-sm font-semibold uppercase tracking-[0.28em] text-white transition hover:bg-cyan-400/20"
            >
              <RotateCcw className="h-4 w-4" />
              Restart Voice
            </button>
            <button
              type="button"
              onClick={downloadPdf}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold uppercase tracking-[0.28em] text-slate-200 transition hover:bg-white/10"
            >
              <Download className="h-4 w-4" />
              Save Certificate
            </button>

            <div className="w-full rounded-2xl border border-cyan-300/25 bg-cyan-400/8 px-4 py-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-cyan-100">
                  <Waves className="h-3.5 w-3.5" />
                  Voice Speed
                </div>
                <span className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-0.5 text-xs font-semibold text-cyan-100">
                  {Number(narrationSpeed || 1).toFixed(2)}x
                </span>
              </div>

              <input
                type="range"
                min="0.75"
                max="1.35"
                step="0.05"
                value={narrationSpeed || 1}
                onChange={(event) => onSpeedChange?.(Number(event.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/20 accent-cyan-300"
              />

              <div className="mt-2 flex flex-wrap gap-2">
                {speedPresets.map((speed) => {
                  const isActive = Math.abs((narrationSpeed || 1) - speed) < 0.01
                  return (
                    <button
                      key={speed}
                      type="button"
                      onClick={() => onSpeedChange?.(speed)}
                      className={`rounded-xl border px-3 py-1 text-xs font-semibold transition ${
                        isActive
                          ? 'border-cyan-200/70 bg-cyan-300/20 text-cyan-100'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {speed.toFixed(2)}x
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── Demo mode warning ── */}
        {reading._meta?.mode === 'demo' && (
          <div className="mb-5 rounded-[1.5rem] border border-amber-300/25 bg-amber-500/10 px-5 py-4 text-sm leading-7 text-amber-100">
            Live AI reading is unavailable right now, so this result is using the built-in fallback text instead of a generated palm analysis.
          </div>
        )}

        {/* ── Lucky Profile Strip ── */}
        {(reading.luckyNumbers?.length || reading.luckyColor || reading.luckyMonth) && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 flex flex-wrap items-center gap-4 rounded-[1.75rem] border border-amber-300/20 bg-[linear-gradient(120deg,rgba(251,191,36,0.06),rgba(234,179,8,0.1))] px-6 py-4"
          >
            <p className="text-xs uppercase tracking-[0.38em] text-amber-300/80">Lucky Profile</p>
            {reading.luckyNumbers?.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Numbers</span>
                <div className="flex gap-2">
                  {reading.luckyNumbers.map((n) => (
                    <span
                      key={n}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-amber-300/40 bg-amber-400/15 text-xs font-bold text-amber-200 shadow-[0_0_10px_rgba(251,191,36,0.25)]"
                    >
                      {n}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {reading.luckyColor && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Color</span>
                <span className="rounded-full border border-amber-300/30 bg-amber-400/10 px-3 py-0.5 text-xs font-semibold text-amber-200">
                  {reading.luckyColor}
                </span>
              </div>
            )}
            {reading.luckyMonth && (
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-amber-300/70" />
                <span className="text-xs text-slate-400">Month</span>
                <span className="rounded-full border border-amber-300/30 bg-amber-400/10 px-3 py-0.5 text-xs font-semibold text-amber-200">
                  {reading.luckyMonth}
                </span>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Main two-column layout ── */}
        <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          {/* Left column */}
          <div className="flex flex-col gap-5 rounded-[2rem] border border-white/10 bg-white/6 p-6 backdrop-blur-xl">
            {palmImage && (
              <div className="rounded-[1.75rem] border border-cyan-300/20 bg-slate-950/50 p-4">
                <p className="text-xs uppercase tracking-[0.38em] text-cyan-200/80">{ui.palmLineMap}</p>
                <div className="relative mt-4 overflow-hidden rounded-2xl border border-white/10">
                  <img src={palmImage} alt="Captured palm with line guide" className="h-[280px] w-full object-cover" />
                </div>
              </div>
            )}

            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-fuchsia-200/70">{ui.openingReading}</p>
              <p
                className={`mt-5 text-lg leading-8 ${
                  narrationCursor?.key === 'intro' && isNarrating ? 'text-cyan-100' : 'text-slate-200'
                }`}
              >
                {renderHighlightedText(reading.intro, 'intro')}
              </p>
            </div>

            <div
              className={`rounded-[1.75rem] border bg-fuchsia-500/10 p-5 ${
                narrationCursor?.key === 'reveal' && isNarrating
                  ? 'border-cyan-300/45 shadow-[0_0_24px_rgba(34,211,238,0.18)]'
                  : 'border-fuchsia-300/20'
              }`}
            >
              <p className="text-xs uppercase tracking-[0.4em] text-fuchsia-100/80">{ui.revealingInsight}</p>
              <p className="mt-4 font-display text-xl leading-8 text-white">
                {renderHighlightedText(reading.revealingInsight, 'reveal')}
              </p>
            </div>

            {/* Cosmic Warning */}
            {reading.cosmicWarning && (
              <div
                className={`rounded-[1.75rem] border bg-orange-500/8 p-5 ${
                  narrationCursor?.key === 'warning' && isNarrating
                    ? 'border-cyan-300/45 shadow-[0_0_24px_rgba(34,211,238,0.18)]'
                    : 'border-orange-300/20'
                }`}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-300/80" />
                  <p className="text-xs uppercase tracking-[0.38em] text-orange-200/80">{ui.cosmicWarning}</p>
                </div>
                <p className="mt-4 leading-7 text-orange-100/90">{renderHighlightedText(reading.cosmicWarning, 'warning')}</p>
              </div>
            )}

            {/* Year Ahead Forecast */}
            {reading.yearsForecast && (
              <div
                className={`rounded-[1.75rem] border bg-emerald-500/8 p-5 ${
                  narrationCursor?.key === 'forecast' && isNarrating
                    ? 'border-cyan-300/45 shadow-[0_0_24px_rgba(34,211,238,0.18)]'
                    : 'border-emerald-300/20'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-emerald-300/80" />
                  <p className="text-xs uppercase tracking-[0.38em] text-emerald-200/80">{ui.yearAhead}</p>
                </div>
                <p className="mt-4 leading-7 text-emerald-100/90">{renderHighlightedText(reading.yearsForecast, 'forecast')}</p>
              </div>
            )}

            <div className="rounded-[1.75rem] border border-cyan-300/15 bg-slate-950/55 p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/80">{ui.voiceChannel}</p>
                {isNarrating && (
                  <div className="inline-flex items-center gap-2 text-cyan-200">
                    <Waves className="h-4 w-4" />
                    <div className="audio-bars">
                      <span /><span /><span /><span />
                    </div>
                  </div>
                )}
              </div>
              <p className="mt-4 text-slate-400">{ui.voiceDescription}</p>
            </div>
          </div>

          {/* Right column — 6 section cards */}
          <div className="grid gap-4 md:grid-cols-2">
            {sections.map((section, index) => (
              <ReadingSectionCard
                key={section.key}
                section={section}
                index={index}
                rating={section.rating}
                isCurrent={isNarrating && narrationCursor?.key === section.key}
                renderHighlightedText={renderHighlightedText}
              />
            ))}
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={onContinue}
            className="rounded-2xl border border-cyan-300/35 bg-[linear-gradient(120deg,rgba(34,211,238,0.2),rgba(124,58,237,0.32))] px-6 py-4 text-sm font-semibold uppercase tracking-[0.28em] text-white transition hover:opacity-90"
          >
            Ask the Palmist (Q&A)
          </button>
        </div>
      </div>
    </section>
  )
}
