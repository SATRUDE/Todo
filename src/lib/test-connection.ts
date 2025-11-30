import { supabase } from './supabase'

export async function testConnection() {
  try {
    console.log('Testing Supabase connection...')
    
    // Test connection by fetching from a table
    const { data, error } = await supabase
      .from('todos')
      .select('count')
      .limit(1)
    
    if (error) {
      // If table doesn't exist, that's okay - connection works
      if (error.code === 'PGRST116' || error.message.includes('relation') || error.message.includes('does not exist')) {
        console.log('✅ Connected to Supabase! (Tables not created yet - run the SQL schema)')
        return { success: true, message: 'Connected but tables need to be created' }
      }
      throw error
    }
    
    console.log('✅ Successfully connected to Supabase!')
    return { success: true, message: 'Connected and tables exist' }
  } catch (error: any) {
    console.error('❌ Connection failed:', error.message)
    
    if (error.message.includes('Invalid API key') || error.message.includes('JWT')) {
      return { 
        success: false, 
        message: 'Invalid Supabase credentials. Check your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env file' 
      }
    }
    
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      return { 
        success: false, 
        message: 'Missing environment variables. Create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY' 
      }
    }
    
    return { 
      success: false, 
      message: `Connection error: ${error.message}` 
    }
  }
}

