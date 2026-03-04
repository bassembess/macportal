import { createClient } from 'npm:@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  try {
    const body = await req.json()
    const { session_id, url, speed, use_proxy, proxy_url } = body

    if (!session_id || !url) {
      return new Response(JSON.stringify({ error: 'Missing required fields: session_id and url' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    )

    const results = []
    const baseDelay = 1000 / Math.max(speed || 50, 1)

    for (let i = 0; i < 10; i++) {
      const mac = Array.from({ length: 6 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join(':').toUpperCase()
      const startTime = Date.now()

      try {
        const testUrl = `${url}?mac=${mac}`
        const response = await Promise.race([
          fetch(testUrl, { method: 'GET' }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
        ])

        const responseTime = Date.now() - startTime
        const isValid = response?.status === 200 || response?.status === 302

        results.push({
          mac,
          valid: isValid,
          time: responseTime,
        })

        await supabase.from('test_results').insert({
          session_id,
          mac_address: mac,
          is_valid: isValid,
          response_time: responseTime,
        })
      } catch (err) {
        const responseTime = Date.now() - startTime
        results.push({
          mac,
          valid: false,
          time: responseTime,
        })

        await supabase.from('test_results').insert({
          session_id,
          mac_address: mac,
          is_valid: false,
          response_time: responseTime,
          error_message: err.message,
        })
      }

      await new Promise(resolve => setTimeout(resolve, baseDelay))
    }

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
