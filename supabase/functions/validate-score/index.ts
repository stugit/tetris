import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with the Service Role Key for admin privileges
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the user from the Authorization header
    const authHeader = req.headers.get('Authorization')!
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''))

    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    const { score, lines_cleared, level, game_id, checksum, avatar_url } = await req.json()
    const envSalt = Deno.env.get('SCORE_SALT')
    console.log('Environment SCORE_SALT present:', !!envSalt)

    const salt = envSalt ?? 'tetris-super-secret-salt-123'

    // --- CHECKSUM VERIFICATION ---
    const message = `${score}:${lines_cleared}:${level}:${game_id}:${user.id}:${avatar_url}:${salt}`
    const encoder = new TextEncoder()
    const data = encoder.encode(message)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const expectedChecksum = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    if (checksum !== expectedChecksum) {
      throw new Error('Checksum mismatch. Potential tampering detected.')
    }

    // --- RATE LIMITING ---
    const { data: recentEntry } = await supabaseAdmin
      .from('leaderboard')
      .select('created_at')
      .eq('github_id', user.id)
      .eq('game_id', game_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (recentEntry) {
      const lastSubmitTime = new Date(recentEntry.created_at).getTime()
      if (Date.now() - lastSubmitTime < 30000) {
        throw new Error('Please wait at least 30 seconds between submissions.')
      }
    }

    // --- VALIDATION LOGIC ---
    if (typeof score !== 'number' || score < 0) {
      throw new Error('Invalid score value')
    }

    // --- ADVANCED HEURISTICS ---
    const maxPointsPerLine = 2500
    const theoreticalMax = (lines_cleared * maxPointsPerLine * level) + 5000 

    if (score > theoreticalMax) {
      throw new Error(`Unlikely score detected for ${lines_cleared} lines at level ${level}.`)
    }

    // Insert the validated score
    const { error: dbError } = await supabaseAdmin
      .from('leaderboard')
      .insert({
        github_id: user.id,
        username: user.user_metadata.full_name || user.user_metadata.user_name || user.user_metadata.user_name,
        score,
        game_id,
        avatar_url
      })

    if (dbError) throw dbError

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
