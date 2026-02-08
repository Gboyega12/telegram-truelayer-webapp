module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { code, redirect_uri } = req.body || {};

  if (!code) return res.status(400).json({ error: 'Missing authorization code' });
  if (!redirect_uri) return res.status(400).json({ error: 'Missing redirect_uri' });

  const CLIENT_ID = process.env.TRUELAYER_CLIENT_ID || 'bocymoneypersonality-a01ae4';
  const CLIENT_SECRET = process.env.TRUELAYER_CLIENT_SECRET;

  if (!CLIENT_SECRET) {
    return res.status(500).json({ error: 'TRUELAYER_CLIENT_SECRET not configured' });
  }

  try {
    // Step 1: Exchange authorization code for access token
    const tokenRes = await fetch('https://auth.truelayer.com/connect/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: redirect_uri,
        code: code,
      }),
    });

    if (!tokenRes.ok) {
      const detail = await tokenRes.text();
      return res.status(400).json({ error: 'Token exchange failed', detail });
    }

    const { access_token } = await tokenRes.json();
    const authHeaders = { Authorization: 'Bearer ' + access_token };

    // Step 2: Fetch accounts and cards in parallel
    const [accountsRes, cardsRes] = await Promise.all([
      fetch('https://api.truelayer.com/data/v1/accounts', { headers: authHeaders }).catch(() => null),
      fetch('https://api.truelayer.com/data/v1/cards', { headers: authHeaders }).catch(() => null),
    ]);

    const allTransactions = [];
    const from = new Date();
    from.setDate(from.getDate() - 90);
    const fromStr = from.toISOString();
    const toStr = new Date().toISOString();

    // Step 3: Fetch transactions for each account
    if (accountsRes && accountsRes.ok) {
      const accountsData = await accountsRes.json();
      const accounts = accountsData.results || [];
      const txPromises = accounts.map((acc) =>
        fetch(
          'https://api.truelayer.com/data/v1/accounts/' +
            acc.account_id +
            '/transactions?from=' +
            fromStr +
            '&to=' +
            toStr,
          { headers: authHeaders }
        )
          .then((r) => (r.ok ? r.json() : { results: [] }))
          .catch(() => ({ results: [] }))
      );
      const txResults = await Promise.all(txPromises);
      txResults.forEach((r) => {
        if (r.results) allTransactions.push(...r.results);
      });
    }

    // Step 4: Fetch transactions for each card
    if (cardsRes && cardsRes.ok) {
      const cardsData = await cardsRes.json();
      const cards = cardsData.results || [];
      const txPromises = cards.map((card) =>
        fetch(
          'https://api.truelayer.com/data/v1/cards/' +
            card.account_id +
            '/transactions?from=' +
            fromStr +
            '&to=' +
            toStr,
          { headers: authHeaders }
        )
          .then((r) => (r.ok ? r.json() : { results: [] }))
          .catch(() => ({ results: [] }))
      );
      const txResults = await Promise.all(txPromises);
      txResults.forEach((r) => {
        if (r.results) allTransactions.push(...r.results);
      });
    }

    // Step 5: Convert TrueLayer transactions to CSV for the enrichment engine
    const csvLines = ['Date,Description,Amount'];
    allTransactions.forEach((tx) => {
      const date = tx.timestamp
        ? new Date(tx.timestamp).toLocaleDateString('en-GB')
        : '';
      const desc = (tx.description || tx.merchant_name || 'Unknown').replace(
        /,/g,
        ' '
      );
      const amount =
        tx.transaction_type === 'DEBIT'
          ? -Math.abs(tx.amount)
          : Math.abs(tx.amount);
      csvLines.push(date + ',' + desc + ',' + amount);
    });

    return res.status(200).json({
      success: true,
      transactionCount: allTransactions.length,
      csv: csvLines.join('\n'),
    });
  } catch (e) {
    return res
      .status(500)
      .json({ error: 'Failed to fetch transactions', detail: e.message });
  }
};
