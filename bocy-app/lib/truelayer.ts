const AUTH_URL = 'https://auth.truelayer.com';
const CLIENT_ID = 'bocymoneypersonality-a01ae4';
const REDIRECT_URI = 'https://telegram-truelayer-webapp.vercel.app/api/truelayer/callback';
const SCOPES = ['accounts', 'balance', 'transactions', 'cards'];
const PROVIDERS = ['uk-ob-all', 'uk-cs-mock'];

export function getTrueLayerAuthUrl(): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    scope: SCOPES.join(' '),
    redirect_uri: REDIRECT_URI,
    providers: PROVIDERS.join(' '),
  });
  return `${AUTH_URL}/?${params.toString()}`;
}

export function extractCSVFromCallbackHTML(html: string): string | null {
  const match = html.match(/id="csv-data"[^>]*>([^<]+)</);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1].trim());
  } catch {
    return match[1].trim();
  }
}
