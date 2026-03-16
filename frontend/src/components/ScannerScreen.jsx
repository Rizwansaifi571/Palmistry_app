import { motion } from 'framer-motion'
import { Camera, Hand, Sparkles } from 'lucide-react'

export function ScannerScreen({
  videoRef,
  countdown,
  isCameraReady,
  isAnalyzing,
  scanProgress,
  capturedImage,
  onCapture,
  onBack,
}) {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8">
      <div className="scanner-glow absolute inset-0" />
      <div className="grid-pattern absolute inset-0 opacity-25" />

      <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="relative overflow-hidden rounded-[2.25rem] border border-cyan-300/20 bg-slate-950/80 shadow-[0_0_100px_rgba(29,78,216,0.24)]">
          {capturedImage ? (
            <img src={capturedImage} alt="Captured palm" className="h-[72vh] w-full object-cover" />
          ) : (
            <video ref={videoRef} autoPlay playsInline muted className="h-[72vh] w-full object-cover" />
          )}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.08),rgba(2,6,23,0.35))]" />
          <div className="scan-lines absolute inset-0" />

          {!capturedImage && (
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <div className="hand-guide relative h-[68%] w-[44%] rounded-[45%_45%_40%_40%/36%_36%_58%_58%] border border-cyan-300/70">
                <div className="absolute inset-[16%] rounded-[40%] border border-fuchsia-300/40" />
                <div className="scanner-beam absolute left-[8%] right-[8%] top-1/2 h-px bg-cyan-300 shadow-[0_0_24px_rgba(34,211,238,1)]" />
              </div>
            </div>
          )}

          <div className="absolute left-6 top-6 rounded-full border border-cyan-300/20 bg-slate-950/65 px-4 py-2 text-xs uppercase tracking-[0.35em] text-cyan-200">
            {capturedImage ? 'Palm captured — analyzing...' : 'Place your palm under the scanner'}
          </div>

          <div className="absolute bottom-6 left-6 right-6">
            <div className="mb-3 flex items-center justify-between text-sm uppercase tracking-[0.35em] text-slate-300">
              <span>Analyzing your life path...</span>
              <span>{countdown}s</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-[linear-gradient(90deg,#22d3ee,#7c3aed,#38bdf8)]"
                animate={{ width: `${scanProgress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-[2rem] border border-white/10 bg-white/6 p-6 backdrop-blur-xl">
          <div>
            <div className="inline-flex items-center gap-3 rounded-full border border-fuchsia-300/20 bg-fuchsia-500/10 px-4 py-2 text-xs uppercase tracking-[0.35em] text-fuchsia-100">
              <Sparkles className="h-4 w-4" />
              Quantum Reading Ritual
            </div>
            <h2 className="mt-6 font-display text-4xl text-white">Palm scan chamber</h2>
            <p className="mt-4 text-base leading-7 text-slate-300">
              Hold your palm steady inside the luminous guide. The scanner is looking for shape, energy flow, and the subtle intersections that define your next chapter.
            </p>

            <div className="mt-8 grid gap-4 text-sm text-slate-200">
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                <div className="mb-2 flex items-center gap-2 text-cyan-200">
                  <Camera className="h-4 w-4" />
                  Camera feed
                </div>
                <p className="text-slate-400">
                  {isCameraReady ? 'Live palm feed detected.' : 'Requesting webcam access...'}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                <div className="mb-2 flex items-center gap-2 text-cyan-200">
                  <Hand className="h-4 w-4" />
                  Line recognition
                </div>
                <p className="text-slate-400">
                  A dramatic reveal is being prepared while the scan stabilizes.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onCapture}
              disabled={!isCameraReady || isAnalyzing}
              className="rounded-2xl border border-cyan-300/35 bg-cyan-400/10 px-5 py-4 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isAnalyzing ? 'Decoding your destiny...' : 'Capture Palm'}
            </button>
            <button
              type="button"
              onClick={onBack}
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-semibold uppercase tracking-[0.3em] text-slate-300 transition hover:bg-white/10"
            >
              Return
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
