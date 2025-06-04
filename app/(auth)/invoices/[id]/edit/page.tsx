'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function EditInvoicePage() {
  const router = useRouter()
  const params = useParams()
  const invoiceId = params.id as string

  useEffect(() => {
    // Redirect to detail page with edit mode
    router.replace(`/invoices/${invoiceId}?mode=edit`)
  }, [invoiceId, router])

  return null
}