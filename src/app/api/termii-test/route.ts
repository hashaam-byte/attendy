// src/app/api/termii-test/route.ts
// STANDALONE DEBUG ROUTE — remove before production or add auth guard

import { NextRequest, NextResponse } from 'next/server'

interface TermiiResponse {
  code: string
  message_id?: string
  message?: string
  balance?: number
  user?: string
  [key: string]: unknown
}

export async function POST(req: NextRequest) {
  const { phone, message, channel = 'generic' } = await req.json()

  const apiKey = process.env.TERMII_API_KEY
  const senderId = process.env.TERMII_SENDER_ID ?? 'Attendy'

  const debug: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    env_check: {
      TERMII_API_KEY: apiKey
        ? `SET (${apiKey.length} chars, starts with: ${apiKey.slice(0, 6)}...)`
        : 'NOT SET ❌',
      TERMII_SENDER_ID: senderId,
    },
    request: {
      phone_raw: phone,
      message,
      channel,
    },
  }

  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        stage: 'env_check',
        error: 'TERMII_API_KEY is not set in your environment variables.',
        debug,
      },
      { status: 400 }
    )
  }

  if (!phone || !message) {
    return NextResponse.json(
      {
        success: false,
        stage: 'input_validation',
        error: 'Phone number and message are required.',
        debug,
      },
      { status: 400 }
    )
  }

  // Normalise phone
  let normalised = phone.replace(/[\s\-().+]/g, '')
  if (normalised.startsWith('0') && normalised.length === 11) {
    normalised = '234' + normalised.slice(1)
  } else if (normalised.startsWith('+')) {
    normalised = normalised.slice(1)
  }

  debug.request = { ...debug.request as object, phone_normalised: normalised }

  const payload = {
    to: normalised,
    from: senderId,
    sms: message,
    type: 'plain',
    channel,
    api_key: apiKey,
  }

  debug.termii_payload = { ...payload, api_key: `${apiKey.slice(0, 6)}...` }

  const results: Record<string, unknown> = {}

  // Try requested channel first, then fallback to both if it fails
  const channelsToTry: string[] = channel === 'dnd'
    ? ['dnd', 'generic']
    : channel === 'generic'
    ? ['generic', 'dnd']
    : [channel]

  let lastError: string | null = null
  let succeeded = false
  let successChannel: string | null = null
  let successData: TermiiResponse | null = null

  for (const ch of channelsToTry) {
    try {
      const res = await fetch('https://api.ng.termii.com/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, channel: ch }),
      })

      const rawText = await res.text()
      let data: TermiiResponse

      try {
        data = JSON.parse(rawText)
      } catch {
        results[ch] = {
          http_status: res.status,
          raw_response: rawText,
          parse_error: 'Response was not valid JSON',
        }
        lastError = `Channel ${ch}: HTTP ${res.status} — non-JSON response`
        continue
      }

      results[ch] = {
        http_status: res.status,
        response: data,
      }

      if (res.ok && data.code === 'ok') {
        succeeded = true
        successChannel = ch
        successData = data
        break
      } else {
        lastError = `Channel ${ch}: ${data.message ?? JSON.stringify(data)}`
      }
    } catch (err) {
      results[ch] = { network_error: String(err) }
      lastError = `Channel ${ch}: Network error — ${String(err)}`
    }
  }

  debug.channel_results = results

  if (succeeded) {
    return NextResponse.json({
      success: true,
      message: `SMS sent successfully via channel: ${successChannel}`,
      message_id: successData?.message_id,
      channel_used: successChannel,
      debug,
    })
  }

  // Diagnose the failure
  const diagnosis = diagnose(results, normalised, apiKey)

  return NextResponse.json(
    {
      success: false,
      stage: 'send_failed',
      error: lastError ?? 'All channels failed',
      diagnosis,
      debug,
    },
    { status: 500 }
  )
}

function diagnose(
  results: Record<string, unknown>,
  phone: string,
  apiKey: string
): string[] {
  const hints: string[] = []

  const allResponses = Object.values(results)
    .map((r: any) => JSON.stringify(r).toLowerCase())
    .join(' ')

  if (allResponses.includes('invalid api key') || allResponses.includes('unauthorized')) {
    hints.push('❌ API key rejected — check TERMII_API_KEY in your .env.local')
  }
  if (allResponses.includes('invalid sender') || allResponses.includes('sender id')) {
    hints.push('❌ Sender ID rejected — go to Termii dashboard and register/approve your sender ID')
  }
  if (allResponses.includes('insufficient balance') || allResponses.includes('low balance')) {
    hints.push('❌ Termii account balance is too low — top up at https://termii.com')
  }
  if (allResponses.includes('invalid phone') || allResponses.includes('invalid number')) {
    hints.push(`❌ Phone number ${phone} was rejected — make sure it's a valid Nigerian number in format 2348XXXXXXXXX`)
  }
  if (allResponses.includes('dnd')) {
    hints.push('⚠️ Phone is on DND (Do Not Disturb) — try using "dnd" channel which can bypass DND, or ask the recipient to opt out of DND')
  }
  if (allResponses.includes('network error')) {
    hints.push('❌ Network error reaching Termii servers — check your internet connection or Termii status at https://status.termii.com')
  }
  if (!phone.startsWith('234')) {
    hints.push(`⚠️ Phone "${phone}" may not be a Nigerian number (should start with 234)`)
  }
  if (apiKey.length < 20) {
    hints.push('⚠️ API key looks unusually short — double-check you copied the full key from Termii')
  }
  if (hints.length === 0) {
    hints.push('🔍 No specific cause identified — review the full debug output above')
    hints.push('💡 Try logging into https://termii.com to verify your account status and sender ID approval')
  }

  return hints
}