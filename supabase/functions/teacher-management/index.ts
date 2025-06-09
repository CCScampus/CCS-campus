import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log('Teacher management function with service role access booting up...');

// Create a Supabase client with the service role key
const getServiceRoleClient = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
};

serve(async (req: Request) => {
  const { method } = req;

  // Handle CORS preflight requests
  if (method === 'OPTIONS') {
    return new Response('ok', { 
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      } 
    });
  }

  // Debug request headers
  console.log('Request headers:');
  for (const [key, value] of req.headers.entries()) {
    console.log(`${key}: ${value.substring(0, 50)}...`);
  }

  try {
    // Create a Supabase client with the service role
    const supabaseAdmin = getServiceRoleClient();
    
    // For GET requests, fetch real teachers from the database
    if (method === 'GET') {
      console.log('Fetching real teachers with service role...');
      
      const { data: teachers, error } = await supabaseAdmin
        .from('teachers')
        .select('*');
      
      if (error) {
        console.error('Error fetching teachers:', error);
        throw error;
      }
      
      console.log('Successfully fetched teachers:', teachers);
      return new Response(JSON.stringify(teachers), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }
    
    // Handle POST request to add a new teacher
    if (method === 'POST') {
      console.log('Adding a new teacher...');
      
      // Parse request body
      const requestData = await req.json();
      const { name, email, password } = requestData;
      
      console.log('Received teacher data:', { name, email, password: '***' });
      
      if (!name || !email || !password) {
        return new Response(JSON.stringify({ 
          error: 'Missing required fields: name, email, and password are required' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }
      
      // First create the user in auth
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm the email
      });
      
      if (userError) {
        console.error('Error creating user in auth:', userError);
        return new Response(JSON.stringify({ error: userError.message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }
      
      // Then add the teacher record to the teachers table
      const { data: teacherData, error: teacherError } = await supabaseAdmin
        .from('teachers')
        .insert([
          { 
            id: userData.user.id,
            name,
            email
          }
        ])
        .select();
      
      if (teacherError) {
        console.error('Error adding teacher to database:', teacherError);
        
        // If we fail to add the teacher record, we should delete the auth user to maintain consistency
        await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
        
        return new Response(JSON.stringify({ error: teacherError.message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }
      
      console.log('Successfully added teacher:', teacherData);
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Teacher added successfully',
        teacher: teacherData[0]
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Handle DELETE with dummy success responses for now
    return new Response(JSON.stringify({ success: true, message: 'Operation completed successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('An error occurred:', error);
    return new Response(JSON.stringify({ error: error.message || 'An unknown error occurred' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}); 