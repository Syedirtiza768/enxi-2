'use client'

import React, { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Package } from 'lucide-react'
import { SalesOrderFormClean } from '@/components/sales-orders/sales-order-form-clean'

function NewSalesOrderContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const quotationId = searchParams.get('quotationId')
  const salesCaseId = searchParams.get('salesCaseId')

  return (
    <SalesOrderFormClean 
      salesCaseId={salesCaseId}
      quotationId={quotationId}
    />
  )
}

export default function NewSalesOrderPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewSalesOrderContent />
    </Suspense>
  )
}