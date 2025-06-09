import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the Auth context of the function
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the URL and request method
    const url = new URL(req.url)
    
    // GET endpoint - retrieve system defaults
    if (req.method === 'GET') {
      const { data, error } = await supabaseClient
        .from('system_defaults')
        .select('*')
        .eq('id', 1)
        .single()
      
      if (error) throw error

      return new Response(
        JSON.stringify(data),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    } 
    // POST endpoint - update system defaults
    else if (req.method === 'POST') {
      const requestData = await req.json()
      
      // Ensure we only update the system_defaults table values
      const updateData = {}
      const allowedFields = [
        'grace_period', 'grace_fee', 'batch_format', 'course_list',
        'min_payment', 'attendance_threshold'
      ]
      
      // Filter only allowed fields from the request
      for (const field of allowedFields) {
        if (requestData[field] !== undefined) {
          updateData[field] = requestData[field]
        }
      }
      
      // Update the system_defaults table
      const { data, error } = await supabaseClient
        .from('system_defaults')
        .update(updateData)
        .eq('id', 1)
        .select()
        .single()
      
      if (error) throw error
      
      return new Response(
        JSON.stringify(data),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    } else {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 405,
        }
      )
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
}) 