/**
 * Google Sheets integration using Service Account JWT
 * Uses Google Sheets API v4 directly (zero extra npm deps)
 */

interface SheetRow {
  timestamp: string;
  instagram_user_id: string;
  instagram_username: string;
  cupom: string;
  status: string;
  expira_em: string;
  whatsapp_enviado: string;
  comment_id: string;
}

interface GoogleSheetClient {
  getRows(): Promise<SheetRow[]>;
  addRow(row: SheetRow): Promise<void>;
}

function base64url(buf: Buffer): string {
  return buf.toString('base64url');
}

async function getAccessToken(): Promise<string> {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n');

  const now = Math.floor(Date.now() / 1000);

  const header = base64url(Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const payload = base64url(
    Buffer.from(
      JSON.stringify({
        iss: clientEmail,
        scope: 'https://www.googleapis.com/auth/spreadsheets',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
      })
    )
  );

  const inputStr = `${header}.${payload}`;

  // Import RSA key for signing
  const key = await crypto.subtle.importKey(
    'pkcs8',
    new TextEncoder().encode(privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(inputStr)
  );

  const jwt = `${inputStr}.${base64url(Buffer.from(signature))}`;

  // Exchange JWT for access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error(
      `Failed to get Google access token: ${JSON.stringify(tokenData)}`
    );
  }

  return tokenData.access_token as string;
}

export async function getGoogleSheet(): Promise<GoogleSheetClient> {
  const sheetId = process.env.GOOGLE_SHEET_ID!;
  const range = 'Sheet1!A:H';

  async function getAuthHeaders() {
    const token = await getAccessToken();
    return { Authorization: `Bearer ${token}` };
  }

  return {
    async getRows(): Promise<SheetRow[]> {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`,
        { headers }
      );
      const data = await res.json();
      const values: string[][] = data.values || [];

      return values.slice(1).map((row) => ({
        timestamp: row[0] || '',
        instagram_user_id: row[1] || '',
        instagram_username: row[2] || '',
        cupom: row[3] || '',
        status: row[4] || '',
        expira_em: row[5] || '',
        whatsapp_enviado: row[6] || '',
        comment_id: row[7] || '',
      }));
    },

    async addRow(row: SheetRow): Promise<void> {
      const headers = await getAuthHeaders();
      const values = [[
        row.timestamp,
        row.instagram_user_id,
        row.instagram_username,
        row.cupom,
        row.status,
        row.expira_em,
        row.whatsapp_enviado,
        row.comment_id,
      ]];

      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
        {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values }),
        }
      );

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(`Failed to append row: ${JSON.stringify(errData)}`);
      }
    },
  };
}