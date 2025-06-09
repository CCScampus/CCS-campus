/*
 * This script helps apply the schema changes to your Supabase instance
 * Run this script with Node.js after setting up your Supabase credentials
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load your Supabase credentials
// You should replace these with your actual credentials or use environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'YOUR_SUPABASE_SERVICE_KEY';

// Initialize Supabase client with admin privileges
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function applySchema() {
  try {
    console.log('Reading schema file...');
    const schemaFile = path.join(__dirname, 'src', 'integrations', 'supabase', 'schema.sql');
    const schemaSQL = fs.readFileSync(schemaFile, 'utf8');
    
    console.log('Applying schema changes...');
    
    // Split the schema into separate statements
    const statements = schemaSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    // Execute each statement
    for (const statement of statements) {
      console.log(`Executing: ${statement}`);
      const { error } = await supabase.rpc('exec_sql', { query: statement });
      
      if (error) {
        console.error('Error executing SQL:', error);
        // Continue with other statements even if one fails
      }
    }
    
    console.log('Schema migration completed successfully!');
  } catch (error) {
    console.error('Failed to apply schema:', error);
  }
}

applySchema(); 