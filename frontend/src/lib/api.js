const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

async function request(path, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    })

    let data = null
    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      data = await response.json()
    } else {
      const text = await response.text()
      data = text ? { error: text } : {}
    }

    if (!response.ok) {
      throw new Error(data.error || `Request failed with status ${response.status}`)
    }
    return data
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Cannot connect to backend API. Start Flask server on port 5000 and retry.')
    }
    throw error
  }
}

export async function analyzePalm(payload) {
  return request('/api/analyze', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function askPalmQuestion(payload) {
  return request('/api/chat', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function synthesizeVoice(text, options = {}) {
  return request('/api/voice', {
    method: 'POST',
    body: JSON.stringify({
      text,
      language: options.language || 'english',
      sessionId: options.sessionId,
      speed: options.speed,
    }),
  })
}

export async function startPaidSession(payload) {
  return request('/api/session/start', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function endPaidSession(sessionId) {
  return request('/api/session/end', {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  })
}
