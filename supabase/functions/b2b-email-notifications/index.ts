import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationPayload {
  to: string | string[]
  subject: string
  html: string
  from?: string
  replyTo?: string
  eventType?: string
  attachments?: Array<{
    filename: string
    content: string
    content_type?: string
    contentType?: string
  }>
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY')

    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: 'Missing RESEND_API_KEY secret' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const payload = (await req.json()) as NotificationPayload

    if (!payload?.to || !payload?.subject || !payload?.html) {
      return new Response(JSON.stringify({ error: 'Missing to/subject/html in payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const recipients = (Array.isArray(payload.to) ? payload.to : [payload.to])
      .map((recipient) => String(recipient || '').trim())
      .filter(Boolean)

    if (!recipients.length) {
      return new Response(JSON.stringify({ error: 'Payload has no valid recipients' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const attachments = (payload.attachments || [])
      .filter((attachment) => attachment && attachment.filename && attachment.content)
      .map((attachment) => ({
        filename: String(attachment.filename),
        content: String(attachment.content),
        ...(attachment.contentType || attachment.content_type
          ? { contentType: String(attachment.contentType || attachment.content_type) }
          : {}),
      }))

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: payload.from || 'GEL.IT.UP Distributors <distributors@gelitup.com>',
        to: recipients,
        subject: payload.subject,
        html: payload.html,
        replyTo: payload.replyTo || 'distribution@gelitup.com',
        ...(attachments.length ? { attachments } : {}),
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      return new Response(JSON.stringify({ error: `Resend failed: ${text}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await response.json()

    return new Response(JSON.stringify({ ok: true, data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
