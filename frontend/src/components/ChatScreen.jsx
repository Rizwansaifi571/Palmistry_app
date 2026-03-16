import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Home, Mic, MicOff, Send } from 'lucide-react'

const SUGGESTED_PROMPTS = {
  english: [
    'When will my biggest financial breakthrough happen?',
    'What is the one hidden strength my palm reveals that I am not using?',
    'Who is my ideal life partner according to my palm?',
    'What should I be most careful about in the next 6 months?',
    'Will I find success if I start my own business?',
  ],
  hindi: [
    'मेरे जीवन में सबसे बड़ा आर्थिक बदलाव कब आएगा?',
    'मेरी हथेली में कौन सी छुपी ताकत है जो मैं अभी इस्तेमाल नहीं कर रहा?',
    'मेरे लिए आदर्श जीवनसाथी कैसा होगा?',
    'अगले 6 महीनों में मुझे किस बात का सबसे ज्यादा ध्यान रखना चाहिए?',
  ],
  whatsapp: [
    'Mera biggest financial breakthrough kab aayega?',
    'Kaunsi hidden strength hai meri jo main use nahi kar raha?',
    'Mera ideal partner kaisa hoga according to my palm?',
    'Next 6 months mein sabse zyada kya dhyan rakhna hai?',
  ],
}

const CHAT_UI = {
  english: {
    headerTag: 'Interactive guidance',
    title: 'Ask what the lines still conceal.',
    subtitle:
      'Continue the session with focused questions about love, money, timing, or personal decisions. Responses stay grounded in the palm reading context.',
    askLabel: 'Ask the palmist',
    inputPlaceholder: 'Ask your next question...',
    backLabel: 'Back to Prediction',
  },
  hindi: {
    headerTag: 'इंटरएक्टिव मार्गदर्शन',
    title: 'जो रेखाएं छुपा रही हैं, वह पूछिए।',
    subtitle:
      'प्यार, पैसा, समय या व्यक्तिगत निर्णयों पर स्पष्ट सवाल पूछिए। जवाब आपकी हथेली की रीडिंग पर आधारित रहेंगे।',
    askLabel: 'पामिस्ट से पूछें',
    inputPlaceholder: 'अपना अगला सवाल लिखें...',
    backLabel: 'रीडिंग पेज पर जाएं',
  },
  whatsapp: {
    headerTag: 'Interactive Guidance',
    title: 'Jo lines chhupa rahi hain, woh poochho.',
    subtitle:
      'Love, money, timing ya personal decisions pe focused sawaal poochho. Answers tumhari palm reading context se hi aayenge.',
    askLabel: 'Ask the palmist',
    inputPlaceholder: 'Apna next sawaal likho...',
    backLabel: 'Back to Reading',
  },
}

export function ChatScreen({
  name,
  messages,
  question,
  setQuestion,
  isListening,
  isThinking,
  onAsk,
  onToggleMic,
  language,
  sessionInfo,
  onBackToResults,
  onEndSession,
}) {
  const displayMessages = useMemo(() => messages.filter((item) => item.role !== 'system'), [messages])
  const prompts = SUGGESTED_PROMPTS[language] || SUGGESTED_PROMPTS.english
  const ui = CHAT_UI[language] || CHAT_UI.english

  return (
    <section className="relative min-h-screen overflow-hidden px-4 py-8 md:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,_rgba(14,165,233,0.16),_transparent_28%),radial-gradient(circle_at_80%_20%,_rgba(168,85,247,0.22),_transparent_28%),linear-gradient(180deg,#030712_0%,#020617_100%)]" />
      <div className="grid-pattern absolute inset-0 opacity-20" />

      <div className="relative z-10 mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.76fr_1.24fr]">
        <div className="rounded-[2rem] border border-white/10 bg-white/6 p-6 backdrop-blur-xl">
          <p className="text-sm uppercase tracking-[0.4em] text-fuchsia-200/70">{ui.headerTag}</p>
          <h2 className="mt-4 font-display text-4xl text-white">{ui.title}</h2>
          <p className="mt-4 text-base leading-8 text-slate-300">
            {ui.subtitle}
          </p>

          <button
            type="button"
            onClick={onBackToResults}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200 transition hover:bg-white/10"
          >
            <Home className="h-3.5 w-3.5" />
            {ui.backLabel}
          </button>

          <div className="mt-6 rounded-[1.75rem] border border-cyan-300/15 bg-slate-950/60 p-5">
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/80">{ui.askLabel}</p>
              <div className="mt-4 grid gap-3 text-sm text-slate-300">
                {prompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setQuestion(prompt)}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:bg-white/10 hover:border-cyan-300/20"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
        </div>

        <div className="flex min-h-[78vh] flex-col rounded-[2rem] border border-white/10 bg-slate-950/65 p-4 shadow-[0_0_80px_rgba(34,211,238,0.12)]">
          <div className="flex-1 space-y-4 overflow-y-auto px-2 py-4">
            {displayMessages.map((message, index) => (
              <motion.div
                key={`${message.role}-${index}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className={`max-w-[84%] rounded-[1.5rem] px-5 py-4 text-sm leading-7 ${
                  message.role === 'user'
                    ? 'ml-auto bg-cyan-400/12 text-cyan-50'
                    : 'bg-white/7 text-slate-100'
                }`}
              >
                {message.content}
              </motion.div>
            ))}

            {isThinking && (
              <div className="max-w-[60%] rounded-[1.5rem] bg-white/7 px-5 py-4 text-slate-200">
                <span className="thinking-dots"><span /> <span /> <span /></span>
              </div>
            )}
          </div>

          <div className="border-t border-white/10 p-4">
            <div className="flex gap-3">
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                rows={3}
                placeholder={ui.inputPlaceholder}
                className="flex-1 resize-none rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-4 text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/60"
              />
              <button
                type="button"
                onClick={onToggleMic}
                className="rounded-[1.5rem] border border-white/10 bg-white/5 px-4 text-slate-200 transition hover:bg-white/10"
                aria-label="Toggle microphone"
              >
                {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
              <button
                type="button"
                onClick={onAsk}
                disabled={!question.trim() || isThinking}
                className="rounded-[1.5rem] border border-cyan-300/30 bg-cyan-400/10 px-5 text-white transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
