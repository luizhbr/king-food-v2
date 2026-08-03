import { NextRequest, NextResponse } from 'next/server';

// ─── ETAPA 1: Webhook Verification (GET) ───
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    console.log('[sorteio-webhook] Webhook verified successfully');
    return new NextResponse(challenge, { status: 200 });
  }

  console.warn('[sorteio-webhook] Verification failed', { mode, token });
  return new NextResponse('Forbidden', { status: 403 });
}

// ─── ETAPA 2: Comment Processing (POST) ───
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.object !== 'instagram') {
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'comments') continue;

        const comment = change.value;
        const texto = (comment.text || '')
          .toUpperCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        const userId = comment.from?.id;
        const username = comment.from?.username;
        const commentId = comment.id;

        if (!userId || !username) continue;

        // Check keyword (AÇAÍ or ACAI without accent)
        if (!texto.includes('ACAI')) continue;

        console.log(
          `[sorteio-webhook] Participation detected: @${username} (${userId}) — comment ${commentId}`
        );

        // Process async — never block the 200 response to Meta
        processarParticipacao({ userId, username, commentId }).catch((err) => {
          console.error('[sorteio-webhook] Async processing error:', err);
        });
      }
    }

    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (err) {
    console.error('[sorteio-webhook] General error:', err);
    // Still return 200 so Meta doesn't retry
    return NextResponse.json({ status: 'error' }, { status: 200 });
  }
}

// ─── ETAPA 3: Anti-duplication + coupon generation ───
async function processarParticipacao({
  userId,
  username,
  commentId,
}: {
  userId: string;
  username: string;
  commentId: string;
}) {
  const jaParticipou = await verificarNaPlanilha(userId);
  if (jaParticipou) {
    console.log(`[sorteio-webhook] @${username} already participated — skipping`);
    return;
  }

  const prefix = process.env.CUPOM_PREFIXO || 'SORTEIOKF15';
  const cupom = `${prefix}-${userId.slice(-6).toUpperCase()}`;
  const validadeDias = Number(process.env.CUPOM_VALIDADE_DIAS || '7');
  const expiraEm = new Date();
  expiraEm.setDate(expiraEm.getDate() + validadeDias);

  await registrarNaPlanilha({ userId, username, cupom, expiraEm, commentId });
  await enviarPrivateReply({ userId, cupom, validadeDias });
}

// ─── ETAPA 4: Google Sheets ───
async function verificarNaPlanilha(userId: string): Promise<boolean> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) {
    console.warn('[sorteio-webhook] GOOGLE_SHEET_ID not configured');
    return false;
  }

  try {
    const { getGoogleSheet } = await import('@/app/api/_lib/google-sheets');
    const sheet = await getGoogleSheet();
    const rows = await sheet.getRows();
    return rows.some((row) => row.instagram_user_id === userId);
  } catch (err) {
    console.error('[sorteio-webhook] Error checking sheet:', err);
    return false;
  }
}

async function registrarNaPlanilha({
  userId,
  username,
  cupom,
  expiraEm,
  commentId,
}: {
  userId: string;
  username: string;
  cupom: string;
  expiraEm: Date;
  commentId: string;
}) {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) {
    console.warn('[sorteio-webhook] GOOGLE_SHEET_ID not configured — skipping registration');
    return;
  }

  try {
    const { getGoogleSheet } = await import('@/app/api/_lib/google-sheets');
    const sheet = await getGoogleSheet();
    await sheet.addRow({
      timestamp: new Date().toISOString(),
      instagram_user_id: userId,
      instagram_username: username,
      cupom,
      status: 'GERADO',
      expira_em: expiraEm.toISOString(),
      whatsapp_enviado: 'N/A',
      comment_id: commentId,
    });
    console.log(`[sorteio-webhook] Coupon ${cupom} registered for @${username}`);
  } catch (err) {
    console.error('[sorteio-webhook] Error writing to sheet:', err);
  }
}

// ─── ETAPA 5: Instagram Private Reply ───
async function enviarPrivateReply({
  userId,
  cupom,
  validadeDias,
}: {
  userId: string;
  cupom: string;
  validadeDias: number;
}) {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const igBusinessId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

  if (!accessToken || !igBusinessId) {
    console.error('[sorteio-webhook] Meta credentials not configured');
    return;
  }

  const groupLink = process.env.WHATSAPP_GROUP_LINK || '#link-aqui';
  const mensagem =
    `Oi! 🎉 Seu cupom de 15% OFF é ${cupom} ` +
    `(válido por ${validadeDias} dias, não aplicável ao Milkshake de Açaí). ` +
    `Sua entrada no sorteio já está confirmada! ` +
    `Ah, e nosso grupo de ofertas exclusivas no WhatsApp tá aberto pra você: ${groupLink}`;

  try {
    const url = `https://graph.facebook.com/v21.0/${igBusinessId}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient: { id: userId },
        message: { text: mensagem },
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('[sorteio-webhook] Error sending DM:', data);
    } else {
      console.log(`[sorteio-webhook] DM sent to user ${userId}`);
    }
  } catch (err) {
    console.error('[sorteio-webhook] Network error sending DM:', err);
  }
}