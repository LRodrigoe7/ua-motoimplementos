function normalizarTelefono(numero: string): string {
  const digits = numero.replace(/\D/g, '')
  if (digits.startsWith('549')) return digits
  if (digits.startsWith('54')) return `549${digits.slice(2)}`
  return `549${digits}`
}

export async function zapiEnviarTexto(numero: string, mensaje: string): Promise<boolean> {
  const instanceId = process.env.ZAPI_INSTANCE_ID
  const token = process.env.ZAPI_TOKEN
  const clientToken = process.env.ZAPI_CLIENT_TOKEN

  if (!instanceId || !token || instanceId === 'PEGAR_ID_DE_INSTANCIA_AQUI') return false

  const phone = normalizarTelefono(numero)
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (clientToken) headers['Client-Token'] = clientToken

  try {
    const res = await fetch(
      `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`,
      { method: 'POST', headers, body: JSON.stringify({ phone, message: mensaje }) }
    )
    return res.ok
  } catch {
    return false
  }
}
