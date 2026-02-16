async function fetchTransactions(code, redirectUri) {
  // Exchange code for access token
  const tokenRes = await fetch('https://auth.truelayer.com/connect/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.TRUELAYER_CLIENT_ID,
      client_secret: process.env.TRUELAYER_CLIENT_SECRET,
      redirect_uri: redirectUri,
      code,
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    const errMsg = tokenData.error_description || tokenData.error || 'Token exchange failed';
    throw new Error(errMsg);
  }

  const token = tokenData.access_token;
  const headers = { Authorization: `Bearer ${token}` };

  // Fetch accounts and cards
  const [accountsRes, cardsRes] = await Promise.all([
    fetch('https://api.truelayer.com/data/v1/accounts', { headers }),
    fetch('https://api.truelayer.com/data/v1/cards', { headers }),
  ]);
  const accountsData = await accountsRes.json();
  const cardsData = await cardsRes.json();

  const accounts = accountsData.results || [];
  const cards = cardsData.results || [];

  // Date range: last 12 months
  const to = new Date().toISOString().split('T')[0];
  const fromDate = new Date();
  fromDate.setFullYear(fromDate.getFullYear() - 1);
  const from = fromDate.toISOString().split('T')[0];

  // Fetch all transactions
  const txPromises = [
    ...accounts.map((a) =>
      fetch(`https://api.truelayer.com/data/v1/accounts/${a.account_id}/transactions?from=${from}&to=${to}`, { headers }).then((r) => r.json())
    ),
    ...cards.map((c) =>
      fetch(`https://api.truelayer.com/data/v1/cards/${c.account_id}/transactions?from=${from}&to=${to}`, { headers }).then((r) => r.json())
    ),
  ];

  const txResults = await Promise.all(txPromises);
  const allTx = txResults.flatMap((r) => r.results || []);

  // Convert to CSV
  const csvLines = ['Date,Description,Amount'];
  for (const tx of allTx) {
    const date = tx.timestamp ? tx.timestamp.split('T')[0] : '';
    const desc = (tx.merchant_name || tx.description || '').replace(/,/g, ' ');
    const amount = tx.transaction_type === 'CREDIT' ? Math.abs(tx.amount) : -Math.abs(tx.amount);
    csvLines.push(`${date},${desc},${amount}`);
  }
  const csv = csvLines.join('\n');

  return { csv, transactionCount: allTx.length };
}

export default async function handler(req, res) {
  // POST: Frontend sends code + redirect_uri as JSON body
  if (req.method === 'POST') {
    const { code, redirect_uri } = req.body || {};
    if (!code) return res.status(400).json({ error: 'Missing authorization code' });

    const redirectUri = redirect_uri || 'https://telegram-truelayer-webapp.vercel.app/';

    try {
      const result = await fetchTransactions(code, redirectUri);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // GET: Direct browser redirect from TrueLayer (fallback)
  if (req.method === 'GET') {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: 'Missing authorization code' });

    const redirectUri = 'https://telegram-truelayer-webapp.vercel.app/api/truelayer/callback';

    try {
      const { csv, transactionCount } = await fetchTransactions(code, redirectUri);

      res.setHeader('Content-Type', 'text/html');
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Connected</title></head>
        <body>
          <h2>Bank connected successfully</h2>
          <p>${transactionCount} transactions loaded.</p>
          <div id="csv-data" style="display:none">${encodeURIComponent(csv)}</div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'truelayer-csv', csv: decodeURIComponent(document.getElementById('csv-data').textContent) }, '*');
              setTimeout(() => window.close(), 2000);
            }
          </script>
        </body>
        </html>
      `);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
