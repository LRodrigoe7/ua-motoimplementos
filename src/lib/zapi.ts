// WasenderAPI helper
// Docs: https://wasenderapi.com/api-docs

export function normalizarTelefono(numero: string): string {
  const digits = numero.replace(/\D/g, '')
  if (digits.startsWith('549')) return digits
  if (digits.startsWith('54')) return `549${digits.slice(2)}`
  return `549${digits}`
}

// WasenderAPI expects JID format for individual chats
function toJID(numero: string): string {
  return `${normalizarTelefono(numero)}@s.whatsapp.net`
}

export async function zapiEnviarTexto(numero: string, mensaje: string): Promise<{ ok: boolean; messageId: string | null }> {
  const apiKey = process.env.WASENDER_API_KEY
  if (!apiKey) {
    console.error('[Wasender] WASENDER_API_KEY no configurada')
    return { ok: false, messageId: null }
  }

  const phone = toJID(numero)
  console.log(`[Wasender] Enviando a ${phone}`)

  try {
    const res = await fetch('https://www.wasenderapi.com/api/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ to: phone, text: mensaje }),
    })
    const body = await res.text()
    console.log(`[Wasender] status=${res.status} body=${body}`)
    if (!res.ok) return { ok: false, messageId: null }
    try {
      const data = JSON.parse(body)
      return { ok: true, messageId: data?.data?.msgId?.toString() || null }
    } catch {
      return { ok: true, messageId: null }
    }
  } catch (err) {
    console.error('[Wasender] fetch error:', err)
    return { ok: false, messageId: null }
  }
}
