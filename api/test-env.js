module.exports = async function handler(req, res) {
  res.status(200).json({
    hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    hasSupabaseUrl: !!process.env.VITE_SUPABASE_URL,
    hasSupabaseKey: !!process.env.VITE_SUPABASE_ANON_KEY,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'not set'
  });
};
