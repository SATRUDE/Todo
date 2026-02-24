const { google } = require('googleapis');

const REFRESH_BUFFER_MS = 5 * 60 * 1000; // Refresh 5 minutes before expiry
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

function isAuthError(error) {
  const msg = (error.message || '').toLowerCase();
  const code = error.code || error.response?.data?.error || '';
  return (
    msg.includes('invalid_grant') ||
    msg.includes('token has been expired or revoked') ||
    msg.includes('token has been revoked') ||
    code === 'invalid_grant' ||
    code === 401
  );
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Refresh the access token if it is expired or about to expire.
 * Retries transient failures up to MAX_RETRIES times.
 * Only disables the connection on permanent auth errors (revoked/invalid grant).
 * Saves rotated refresh tokens when Google issues new ones.
 *
 * Returns the (possibly updated) connection object.
 */
async function refreshTokenIfNeeded(connection, userId, supabase) {
  const now = new Date();
  const expiresAt = new Date(connection.token_expires_at);

  if (expiresAt.getTime() - now.getTime() > REFRESH_BUFFER_MS) {
    return connection;
  }

  console.log(`[token-refresh] Token for user ${userId} expires at ${expiresAt.toISOString()}, refreshing proactively`);

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    refresh_token: connection.refresh_token
  });

  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();

      const updateFields = {
        access_token: credentials.access_token,
        token_expires_at: credentials.expiry_date
          ? new Date(credentials.expiry_date).toISOString()
          : new Date(Date.now() + 3600 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Save rotated refresh token if Google issued a new one
      if (credentials.refresh_token) {
        updateFields.refresh_token = credentials.refresh_token;
        connection.refresh_token = credentials.refresh_token;
      }

      await supabase
        .from('calendar_connections')
        .update(updateFields)
        .eq('user_id', userId);

      connection.access_token = credentials.access_token;
      connection.token_expires_at = updateFields.token_expires_at;

      console.log(`[token-refresh] Token refreshed successfully for user ${userId}`);
      return connection;
    } catch (err) {
      lastError = err;
      console.error(`[token-refresh] Attempt ${attempt}/${MAX_RETRIES} failed for user ${userId}:`, err.message);

      if (isAuthError(err)) {
        console.error(`[token-refresh] Permanent auth error for user ${userId}, disabling connection`);
        await supabase
          .from('calendar_connections')
          .update({ enabled: false, updated_at: new Date().toISOString() })
          .eq('user_id', userId);
        throw new Error('Calendar authorization revoked. Please reconnect your calendar.');
      }

      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(`[token-refresh] Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  console.error(`[token-refresh] All ${MAX_RETRIES} refresh attempts failed for user ${userId}, but NOT disabling connection (transient error)`);
  throw new Error(`Token refresh failed after ${MAX_RETRIES} attempts: ${lastError?.message}. Please try again.`);
}

module.exports = { refreshTokenIfNeeded };
