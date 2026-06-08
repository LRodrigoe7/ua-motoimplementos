'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useNoLeidos() {
  const [count, setCount] = useState(0)

  const actualizar = async () => {
    const supabase = createClient()
    const { count: c } = await supabase
      .from('mensajes')
      .select('*', { count: 'exact', head: true })
      .eq('remitente', 'cliente')
      .eq('leido', false)
    setCount(c || 0)
  }

  useEffect(() => {
    actualizar()

    const supabase = createClient()
    const channel = supabase
      .channel('badge-no-leidos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mensajes' }, actualizar)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return count
}
