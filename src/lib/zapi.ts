// WasenderAPI helper
// Docs: https://wasenderapi.com/api-docs

export function normalizarTelefono(numero: string): string {
  const digits = numero.replace(/\D/g, '')
  if (digits.startsWith('549')) return digits
  if (digits.startsWith('54')) return `549${digits.slice(2)}`
  return `549${digits}`
}

// WasenderAPI requires E.164 format (+549...)
function toE164(numero: string): string {
  return `+${normalizarTelefono(numero)}`
}

export async function zapiEnviarTexto(numero: string, mensaje: string): Promise<boolean> {
  const apiKey = process.env.WASENDER_API_KEY
  if (!apiKey) {
    console.error('[Wasender] WASENDER_API_KEY no configurada')
    return false
  }

  const phone = toE164(numero)
  console.log(`[Wasender] Enviando a ${phone}`)

  try {
    const res = await fetch('https://wasenderapi.com/api/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ to: phone, text: mensaje }),
    })
    const body = await res.text()
    console.log(`[Wasender] status=${res.status} body=${body}`)
    return res.ok
  } catch (err) {
    console.error('[Wasender] fetch error:', err)
    return false
  }
}
