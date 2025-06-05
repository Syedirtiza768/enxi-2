'use client'

import { useEffect } from 'react'
import { useParams } from 'next/navigation'

export default function EditInvoicePage() {
  const params = useParams()
  const invoiceId = params.id as string

  useEffect(() => {
    // Redirect to detail page with edit mode
    window.location.href = `/invoices/${invoiceId}?mode=edit`
  }, [invoiceId])

  return null
}