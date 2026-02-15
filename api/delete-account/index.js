const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Server configuration missing' });
  }

  try {
    // Use the user's token to identify them
    const userToken = authHeader.replace('Bearer ', '');
    const userClient = createClient(SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || SUPABASE_SERVICE_KEY);
    const { data: { user }, error: authError } = await userClient.auth.getUser(userToken);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Use admin client to delete user data and auth record
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Delete user data from tables
    await adminClient.from('analyses').delete().eq('user_id', user.id);
    await adminClient.from('goals').delete().eq('user_id', user.id);

    // Delete the auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
    if (deleteError) {
      return res.status(500).json({ error: 'Failed to delete account', detail: deleteError.message });
    }

    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to delete account', detail: e.message });
  }
};
