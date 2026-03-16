import { useEffect, useMemo, useRef, useState } from 'react'
import { LandingScreen } from './components/LandingScreen'
import { ScannerScreen } from './components/ScannerScreen'
import { ResultsScreen } from './components/ResultsScreen'
import { ChatScreen } from './components/ChatScreen'
import {
  analyzePalm,
  askPalmQuestion,
  endPaidSession,
  startPaidSession,
  synthesizeVoice,
} from './lib/api'
import { speakWithBrowser, stopBrowserSpeech } from './lib/speech'

const SCREEN = {
  LANDING: 'landing',
  SCANNER: 'scanner',
  RESULTS: 'results',
  CHAT: 'chat',
}

function getInitialAssistantMessage(language) {
  const lang = (language || 'english').toLowerCase()
  if (lang === 'hindi') {
    return {
      role: 'assistant',
      content:
        'आपकी रीडिंग तैयार है। प्यार, करियर, पैसा या अगले फैसले के बारे में सवाल पूछिए — मैं आपकी हथेली के संकेतों के आधार पर जवाब दूंगा।',
    }
  }
  if (lang === 'whatsapp') {
    return {
      role: 'assistant',
      content:
        'Reading ready hai. Love, career, money ya next decision pe jo poochna hai poochho — main tumhari palm signals se direct answer dunga.',
    }
  }
  return {
    role: 'assistant',
    content:
      'Your reading chamber is open. Ask about timing, love, work, or the quiet decision your palm is pointing toward.',
  }
}

function getChatErrorMessage(language, errorMessage) {
  const lang = (language || 'english').toLowerCase()
  if (lang === 'hindi') {
    return `अभी चैनल थोड़ा अस्थिर है। ${errorMessage}`
  }
  if (lang === 'whatsapp') {
    return `Abhi channel thoda unstable hai. ${errorMessage}`
  }
  return `The channel is unstable right now. ${errorMessage}`
}

const LANGUAGE_META = {
  english: {
    labelPersonality: 'Personality',
    labelCareer: 'Career',
    labelFinance: 'Financial Future',
    labelLove: 'Love Life',
    labelHealth: 'Health and Vitality',
    labelLuck: 'Luck and Fortune',
    labelWarning: 'Cosmic Warning',
    labelForecast: 'Year Ahead',
    speechLang: 'en-US',
  },
  hindi: {
    labelPersonality: 'व्यक्तित्व',
    labelCareer: 'करियर',
    labelFinance: 'आर्थिक भविष्य',
    labelLove: 'प्रेम जीवन',
    labelHealth: 'स्वास्थ्य',
    labelLuck: 'भाग्य संकेत',
    labelWarning: 'सावधानी',
    labelForecast: 'आने वाला वर्ष',
    speechLang: 'hi-IN',
  },
  whatsapp: {
    labelPersonality: 'Personality vibes',
    labelCareer: 'Career scene',
    labelFinance: 'Money flow',
    labelLove: 'Love zone',
    labelHealth: 'Health check',
    labelLuck: 'Luck factor',
    labelWarning: 'Warning',
    labelForecast: 'Year ahead',
    speechLang: 'hi-IN',
  },
}

function App() {
  const [screen, setScreen] = useState(SCREEN.LANDING)
  const [name, setName] = useState('')
  const [language, setLanguage] = useState('english')
  const [reading, setReading] = useState(null)
  const [messages, setMessages] = useState([getInitialAssistantMessage('english')])
  const [question, setQuestion] = useState('')
  const [isCameraReady, setIsCameraReady] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isNarrating, setIsNarrating] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const [scanProgress, setScanProgress] = useState(12)
  const [error, setError] = useState('')
  const [voiceMode, setVoiceMode] = useState(null)
  const [isVoicePaused, setIsVoicePaused] = useState(false)
  const [capturedImage, setCapturedImage] = useState(null)
  const [analysisImage, setAnalysisImage] = useState(null)
  const [narrationCursor, setNarrationCursor] = useState({ key: null, localIndex: 0 })
  const [sessionInfo, setSessionInfo] = useState(null)
  const [narrationSpeed, setNarrationSpeed] = useState(1)

  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const recognitionRef = useRef(null)
  const audioRef = useRef(null)
  const narrationTextRef = useRef('')
  const narrationTimelineRef = useRef([])

  async function pickLaptopCameraId() {
    const getVideoInputs = async () => {
      const devices = await navigator.mediaDevices.enumerateDevices()
      return devices.filter((device) => device.kind === 'videoinput')
    }

    let videoInputs = await getVideoInputs()
    if (!videoInputs.length) {
      return null
    }

    if (videoInputs.every((device) => !device.label)) {
      try {
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        tempStream.getTracks().forEach((track) => track.stop())
        videoInputs = await getVideoInputs()
      } catch {
        return null
      }
    }

    const blockedPattern = /android|iphone|realme|continuity|droid|phone|link to windows/i
    const preferredPattern = /integrated|webcam|hd camera|usb|builtin|built-in|laptop/i

    const preferred = videoInputs.find(
      (device) => preferredPattern.test(device.label) && !blockedPattern.test(device.label),
    )
    if (preferred) {
      return preferred.deviceId
    }

    const nonPhone = videoInputs.find((device) => !blockedPattern.test(device.label))
    if (nonPhone) {
      return nonPhone.deviceId
    }

    return videoInputs[0].deviceId
  }

  useEffect(() => {
    if (screen !== SCREEN.SCANNER) {
      return undefined
    }

    let scanTimer
    let progressTimer
    let disposed = false

    const stopCurrentStream = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
    }

    const waitForVideoReady = (videoElement) =>
      new Promise((resolve) => {
        if (videoElement.readyState >= 2 && videoElement.videoWidth > 0) {
          resolve()
          return
        }

        const onLoaded = () => {
          videoElement.removeEventListener('loadedmetadata', onLoaded)
          resolve()
        }

        videoElement.addEventListener('loadedmetadata', onLoaded, { once: true })
      })

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera is not supported in this browser.')
        return
      }

      try {
        setError('')
        stopCurrentStream()

        const cameraId = await pickLaptopCameraId()

        let stream
        if (cameraId) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: { exact: cameraId },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          })
        } else {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: 'user' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          })
        }

        if (disposed) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = stream

        if (!videoRef.current) {
          return
        }

        videoRef.current.srcObject = stream
        await waitForVideoReady(videoRef.current)
        await videoRef.current.play()

        if (disposed) {
          stopCurrentStream()
          return
        }

        setIsCameraReady(true)
      } catch (cameraError) {
        setError(`Camera access failed: ${cameraError.message}`)
        setIsCameraReady(false)
      }
    }

    setCountdown(60)
    setScanProgress(12)
    startCamera()

    scanTimer = window.setInterval(() => {
      setCountdown((current) => (current > 0 ? current - 1 : 0))
    }, 1000)

    progressTimer = window.setInterval(() => {
      setScanProgress((current) => (current >= 96 ? 96 : current + 2))
    }, 850)

    return () => {
      disposed = true
      window.clearInterval(scanTimer)
      window.clearInterval(progressTimer)
      stopCurrentStream()
      setIsCameraReady(false)
    }
  }, [screen])

  useEffect(() => {
    return () => {
      stopBrowserSpeech()
      if (audioRef.current) {
        audioRef.current.pause()
      }
    }
  }, [])

  useEffect(() => {
    if (voiceMode === 'audio' && audioRef.current) {
      audioRef.current.playbackRate = narrationSpeed
    }
  }, [narrationSpeed, voiceMode])

  function stopNarration() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }

    stopBrowserSpeech()
    setIsNarrating(false)
    setIsVoicePaused(false)
    setVoiceMode(null)
    setNarrationCursor({ key: null, localIndex: 0 })
  }

  async function activatePaidSession() {
    if (!name.trim()) {
      setError('Please enter customer name before activating paid session.')
      return
    }

    try {
      setError('')
      const result = await startPaidSession({ name: name.trim(), language })
      setSessionInfo(result.session)
      setMessages([getInitialAssistantMessage(language)])
      setQuestion('')
      setScreen(SCREEN.SCANNER)
    } catch (sessionError) {
      setError(sessionError.message)
    }
  }

  async function closePaidSession() {
    try {
      if (sessionInfo?.sessionId) {
        await endPaidSession(sessionInfo.sessionId)
      }
    } catch {
      // Session might already be expired/ended server-side.
    } finally {
      stopNarration()
      setSessionInfo(null)
      setReading(null)
      setMessages([getInitialAssistantMessage(language)])
      setQuestion('')
      setCapturedImage(null)
      setAnalysisImage(null)
      setScreen(SCREEN.LANDING)
    }
  }

  const lineLabels = useMemo(() => {
    if ((language || 'english') === 'hindi') {
      return {
        heart: 'हृदय रेखा',
        head: 'मस्तिष्क रेखा',
        life: 'जीवन रेखा',
        fate: 'भाग्य रेखा',
      }
    }
    if ((language || 'english') === 'whatsapp') {
      return {
        heart: 'Heart line',
        head: 'Head line',
        life: 'Life line',
        fate: 'Fate line',
      }
    }
    return {
      heart: 'Heart Line',
      head: 'Head Line',
      life: 'Life Line',
      fate: 'Fate Line',
    }
  }, [language])

  function buildNarrationPayload(currentReading) {
    const s = currentReading.sections || {}

    const segments = [
      { key: 'intro', text: currentReading.intro || '' },
      { key: 'reveal', text: currentReading.revealingInsight || '' },
      { key: 'personality', text: s.personality || '' },
      { key: 'career', text: s.career || '' },
      { key: 'finance', text: s.finance || '' },
      { key: 'love', text: s.love || '' },
      { key: 'health', text: s.health || '' },
      { key: 'luck', text: s.luck || '' },
      {
        key: 'warning',
        text: currentReading.cosmicWarning || '',
      },
      {
        key: 'forecast',
        text: currentReading.yearsForecast || '',
      },
    ].filter((item) => item.text)

    const separator = ' ... '
    let cursor = 0
    const timeline = segments.map((segment, index) => {
      const start = cursor
      const end = start + segment.text.length
      cursor = end + (index < segments.length - 1 ? separator.length : 0)
      return { ...segment, start, end }
    })

    const fullText = segments.map((segment) => segment.text).join(separator)
    return { fullText, timeline }
  }

  function updateNarrationCursor(globalCharIndex) {
    const timeline = narrationTimelineRef.current
    if (!timeline.length) {
      return
    }

    const segment =
      timeline.find((item) => globalCharIndex >= item.start && globalCharIndex <= item.end) ||
      timeline[timeline.length - 1]

    const localIndex = Math.max(0, Math.min(segment.text.length, globalCharIndex - segment.start))
    setNarrationCursor({ key: segment.key, localIndex })
  }

  async function capturePalm() {
    if (!videoRef.current || !isCameraReady) {
      return
    }

    if (videoRef.current.readyState < 2 || videoRef.current.videoWidth === 0) {
      setError('Camera stream is not ready yet. Please wait a moment and try again.')
      return
    }

    setError('')
    setScanProgress(100)

    // Snap the photo immediately so the user can lower their hand
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth || 1280
    canvas.height = videoRef.current.videoHeight || 720
    const context = canvas.getContext('2d')
    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
    const image = canvas.toDataURL('image/jpeg', 0.92)
    setCapturedImage(image)
    setAnalysisImage(image)
    setIsAnalyzing(true)

    try {

      const result = await analyzePalm({
        image,
        name,
        language,
        sessionId: sessionInfo?.sessionId,
      })
      setReading(result)
      setMessages([getInitialAssistantMessage(language)])
      setCapturedImage(null)
      setScreen(SCREEN.RESULTS)
      window.setTimeout(() => narrateReading(result), 400)
    } catch (captureError) {
      setError(captureError.message)
      setCapturedImage(null)
    } finally {
      setIsAnalyzing(false)
    }
  }

  async function narrateReading(currentReading = reading) {
    if (!currentReading) {
      return
    }

    stopNarration()

    const { fullText, timeline } = buildNarrationPayload(currentReading)
    narrationTextRef.current = fullText
    narrationTimelineRef.current = timeline
    if (timeline.length) {
      setNarrationCursor({ key: timeline[0].key, localIndex: 0 })
    }

    setIsNarrating(true)
    setIsVoicePaused(false)

    try {
      const voiceResponse = await synthesizeVoice(fullText, {
        language,
        sessionId: sessionInfo?.sessionId,
        speed: narrationSpeed,
      })
      if (voiceResponse.audio) {
        const audio = new Audio(`data:${voiceResponse.mimeType};base64,${voiceResponse.audio}`)
        audioRef.current = audio
        audio.playbackRate = narrationSpeed
        setVoiceMode('audio')
        audio.ontimeupdate = () => {
          if (!audio.duration || !Number.isFinite(audio.duration)) {
            return
          }
          const globalChar = Math.floor((audio.currentTime / audio.duration) * fullText.length)
          updateNarrationCursor(globalChar)
        }
        audio.onended = () => {
          setIsNarrating(false)
          setIsVoicePaused(false)
          setVoiceMode(null)
          setNarrationCursor({ key: null, localIndex: 0 })
        }
        await audio.play()
        return
      }
    } catch (voiceError) {
      console.warn('Voice synthesis fallback:', voiceError)
    }

    speakWithBrowser(
      fullText,
      {
        language: (LANGUAGE_META[language] || LANGUAGE_META.english).speechLang,
        rate: narrationSpeed,
      },
      () => {
        setVoiceMode('browser')
        setIsNarrating(true)
        setIsVoicePaused(false)
      },
      () => {
        setIsNarrating(false)
        setIsVoicePaused(false)
        setVoiceMode(null)
        setNarrationCursor({ key: null, localIndex: 0 })
      },
      (event) => {
        updateNarrationCursor(event.charIndex || 0)
      },
    )
  }

  function pauseNarration() {
    if (!isNarrating) {
      return
    }

    if (voiceMode === 'audio' && audioRef.current) {
      audioRef.current.pause()
      setIsVoicePaused(true)
      return
    }

    if (voiceMode === 'browser' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause()
      setIsVoicePaused(true)
    }
  }

  function resumeNarration() {
    if (!isVoicePaused) {
      return
    }

    if (voiceMode === 'audio' && audioRef.current) {
      audioRef.current.play().catch(() => undefined)
      setIsVoicePaused(false)
      return
    }

    if (voiceMode === 'browser' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume()
      setIsVoicePaused(false)
    }
  }

  function restartNarration() {
    if (!reading) {
      return
    }
    narrateReading(reading)
  }

  function toggleMic() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser.')
      return
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = (LANGUAGE_META[language] || LANGUAGE_META.english).speechLang
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || ''
      setQuestion(transcript)
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  async function askQuestion() {
    if (!question.trim() || !reading) {
      return
    }

    const userMessage = { role: 'user', content: question.trim() }
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setQuestion('')
    setIsThinking(true)

    try {
      const response = await askPalmQuestion({
        question: userMessage.content,
        reading,
        history: nextMessages,
        name,
        language,
        sessionId: sessionInfo?.sessionId,
      })

      if (response._session) {
        setSessionInfo((current) => {
          if (!current) {
            return current
          }
          return {
            ...current,
            remainingQuestions: response._session.remainingQuestions,
            maxQuestions: response._session.maxQuestions,
            expiresAt: response._session.expiresAt,
          }
        })
      }

      const assistantMessage = { role: 'assistant', content: response.answer }
      setMessages((current) => [...current, assistantMessage])
      speakWithBrowser(
        response.answer,
        {
          language: (LANGUAGE_META[language] || LANGUAGE_META.english).speechLang,
        },
        undefined,
        undefined,
      )
    } catch (chatError) {
      setMessages((current) => [
        ...current,
        { role: 'assistant', content: getChatErrorMessage(language, chatError.message) },
      ])
    } finally {
      setIsThinking(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {error && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-2xl border border-rose-300/30 bg-rose-500/10 px-5 py-3 text-sm text-rose-100 backdrop-blur-xl">
          {error}
        </div>
      )}

      {screen === SCREEN.LANDING && (
        <LandingScreen
          name={name}
          setName={setName}
          language={language}
          setLanguage={setLanguage}
          onStart={activatePaidSession}
          hasActiveSession={Boolean(reading)}
          onResumeSession={() => setScreen(SCREEN.CHAT)}
          sessionInfo={sessionInfo}
          onEndSession={closePaidSession}
        />
      )}

      {screen === SCREEN.SCANNER && (
        <ScannerScreen
          videoRef={videoRef}
          countdown={countdown}
          isCameraReady={isCameraReady}
          isAnalyzing={isAnalyzing}
          scanProgress={scanProgress}
          capturedImage={capturedImage}
          onCapture={capturePalm}
          onBack={() => { setCapturedImage(null); setScreen(SCREEN.LANDING) }}
        />
      )}

      {screen === SCREEN.RESULTS && reading && (
        <ResultsScreen
          name={name}
          reading={reading}
          language={language}
          lineLabels={lineLabels}
          narrationCursor={narrationCursor}
          palmImage={analysisImage}
          isNarrating={isNarrating}
          isVoicePaused={isVoicePaused}
          narrationSpeed={narrationSpeed}
          onSpeedChange={setNarrationSpeed}
          onNarrate={() => narrateReading()}
          onPause={pauseNarration}
          onResume={resumeNarration}
          onRestart={restartNarration}
          onContinue={() => {
            pauseNarration()
            setScreen(SCREEN.CHAT)
          }}
        />
      )}

      {screen === SCREEN.CHAT && reading && (
        <ChatScreen
          name={name}
          language={language}
          sessionInfo={sessionInfo}
          messages={messages}
          question={question}
          setQuestion={setQuestion}
          isListening={isListening}
          isThinking={isThinking}
          onAsk={askQuestion}
          onToggleMic={toggleMic}
          onBackToResults={() => setScreen(SCREEN.RESULTS)}
          onEndSession={closePaidSession}
        />
      )}
    </main>
  )
}

export default App
