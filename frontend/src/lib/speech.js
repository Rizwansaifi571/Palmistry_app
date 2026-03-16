export function speakWithBrowser(text, options = {}, onStart, onEnd, onBoundary) {
  if (!('speechSynthesis' in window)) {
    onEnd?.()
    return null
  }

  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  const defaultRate = options.language === 'hi-IN' ? 0.96 : 1.04
  const requestedRate = Number(options.rate)
  utterance.rate = Number.isFinite(requestedRate) ? Math.min(1.35, Math.max(0.75, requestedRate)) : defaultRate
  utterance.pitch = 0.76
  utterance.volume = 1
  utterance.lang = options.language || 'en-US'

  const voices = window.speechSynthesis.getVoices()
  const preferred =
    voices.find(
      (voice) =>
        voice.lang.toLowerCase().includes((options.language || 'en-US').slice(0, 2).toLowerCase()) &&
        /male|neural|enhanced|premium|david|mark|ravi|hemant|aditya/i.test(voice.name),
    ) ||
    voices.find((voice) => voice.lang.toLowerCase().includes((options.language || 'en-US').slice(0, 2).toLowerCase()))
  if (preferred) {
    utterance.voice = preferred
  }

  utterance.onstart = () => onStart?.('browser')
  utterance.onend = () => onEnd?.()
  utterance.onerror = () => onEnd?.()
  utterance.onboundary = (event) => onBoundary?.(event)
  window.speechSynthesis.speak(utterance)
  return utterance
}

export function stopBrowserSpeech() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
}
