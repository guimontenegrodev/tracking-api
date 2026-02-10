import handleEvent from './handle-event.js'

function toCamelDeep(obj) {
  if (Array.isArray(obj)) {
    return obj.map(toCamelDeep)
  }

  if (obj !== null && typeof obj === 'object') {
    const out = {}
    for (const k in obj) {
      out[k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] =
        toCamelDeep(obj[k])
    }
    return out
  }

  return obj
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, referer'
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })

    if (request.method !== 'POST') return new Response('Wrong request method', { status: 405, headers: corsHeaders })

    let body

    try {
      body = await request.json()
    } catch {
      return new Response('Invalid JSON', { status: 400, headers: corsHeaders })
    }

    body = toCamelDeep(body)

    const { fbEventName, gaEventName, gadsConversionLabel, eventId, eventUrl, userId, cookieFbp, cookieFbc, cookieGclid } = body || {}

    if (!eventId) return new Response('Event ID is missing', { status: 400, headers: corsHeaders })

    if (!userId) return new Response('User ID is missing', { status: 400, headers: corsHeaders })

    if (!fbEventName && !gaEventName && !gadsConversionLabel) return new Response('Event/conversion is missing', { status: 400, headers: corsHeaders })

    if (!eventUrl) return new Response('Event URL is missing', { status: 400, headers: corsHeaders })

    const headers = Object.fromEntries(request.headers.entries())

    const clientIp = headers['cf-connecting-ip'] ||
      headers['x-forwarded-for']?.split(',')[0].trim() ||
      null

    const userAgent = headers['user-agent'] || null

    ctx.waitUntil(handleEvent(fbEventName, gaEventName, gadsConversionLabel, eventId, eventUrl, userId, cookieFbp, cookieFbc, cookieGclid, clientIp, userAgent, env))

    return new Response(`Event tracking process started`, { status: 202, headers: corsHeaders })
  }
}