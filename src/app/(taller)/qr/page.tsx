'use client'

import { useEffect, useState } from 'react'

export default function QRPage() {
  const [qr, setQr] = useState<string | null>(null)

  useEffect(() => {
    const poll = async () => {
      const res = await fetch('/api/qr')
      const data = await res.json()
      if (data.qr) setQr(data.qr)
    }
    poll()
    const interval = setInterval(poll, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: 16 }}>
      <h1 style={{ fontSize: 20, fontWeight: 'bold' }}>Conectar WhatsApp</h1>
      {qr ? (
        <>
          <p style={{ color: '#555' }}>Escaneá con WhatsApp → Dispositivos vinculados</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR WhatsApp" style={{ width: 280, height: 280 }} />
        </>
      ) : (
        <p style={{ color: '#888' }}>Esperando QR... (se actualiza automáticamente)</p>
      )}
    </div>
  )
}
