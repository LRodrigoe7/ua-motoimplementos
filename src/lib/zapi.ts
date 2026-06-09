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
  if (!apiKey) return false

  try {
    const res = await fetch('https://www.wasenderapi.com/api/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ to: toE164(numero), text: mensaje }),
    })
    return res.ok
  } catch {
    return false
  }
}
