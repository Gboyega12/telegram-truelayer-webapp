// TrueLayer OAuth helpers
// Uses the existing Vercel serverless function for token exchange

const TRUELAYER_AUTH_URL = 'https://auth.truelayer.com';
const TRUELAYER_CLIENT_ID = 'bocymoneypersonality-a01ae4';
const REDIRECT_URI = 'https://telegram-truelayer-webapp.vercel.app/api/truelayer/callback';

export function getTrueLayerAuthUrl(): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: TRUELAYER_CLIENT_ID,
    scope: 'accounts balance transactions cards',
    redirect_uri: REDIRECT_URI,
    providers: 'uk-ob-all uk-cs-mock',
  });
  return `${TRUELAYER_AUTH_URL}/?${params.toString()}`;
}

// The callback returns CSV data from the Vercel function
// We intercept it in the WebView and pass it to the engine
export function extractCSVFromCallbackHTML(html: string): string | null {
  // The callback page embeds CSV data for the frontend
  const match = html.match(/window\.opener\.postMessage\(({[\s\S]*?})/);
  if (match) {
    try {
      const data = JSON.parse(match[1]);
      return data.csv || null;
    } catch {
      return null;
    }
  }
  return null;
}
