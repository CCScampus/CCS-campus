import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log('Teacher management function with service role access booting up...');

// Create a Supabase client with the service role key
const getServiceRoleClient = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  
  console.log('SUPABASE_URL:', supabaseUrl ? 'Found (not showing full value)' : 'Not found');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? 'Found (not showing full value)' : 'Not found');
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing required environment variables for Supabase client');
  }
  
  return createClient(
    supabaseUrl,
    serviceRoleKey,
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
    if (key.toLowerCase() === 'authorization' || key.toLowerCase() === 'apikey') {
      console.log(`${key}: ${value.substring(0, 10)}... (truncated)`);
    } else {
      console.log(`${key}: ${value.substring(0, 50)}...`);
    }
  }

  try {
    // Create a Supabase client with the service role
    console.log('Creating Supabase admin client with service role...');
    console.log('SUPABASE_URL env variable exists:', !!Deno.env.get('SUPABASE_URL'));
    console.log('SUPABASE_SERVICE_ROLE_KEY env variable exists:', !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
    
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
      
      try {
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
        console.log('Creating user in auth with email:', email);
        try {
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
          
          console.log('User created successfully in auth with ID:', userData.user.id);
          
          // Then add the teacher record to the teachers table
          try {
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
              console.log('Attempting to delete auth user due to teacher creation failure:', userData.user.id);
              try {
                await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
                console.log('Auth user deleted successfully after teacher creation failure');
              } catch (deleteError) {
                console.error('Failed to delete auth user after teacher creation failure:', deleteError);
              }
              
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
          } catch (insertError) {
            console.error('Unexpected error when inserting teacher:', insertError);
            
            // Try to clean up auth user
            try {
              await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
            } catch (deleteError) {
              console.error('Failed to delete auth user after insert error:', deleteError);
            }
            
            return new Response(JSON.stringify({ error: 'Failed to add teacher record' }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            });
          }
        } catch (authError) {
          console.error('Unexpected error when creating auth user:', authError);
          return new Response(JSON.stringify({ error: 'Failed to create user account' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          });
        }
      } catch (requestError) {
        console.error('Error parsing request body:', requestError);
        return new Response(JSON.stringify({ error: 'Invalid request format' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }
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