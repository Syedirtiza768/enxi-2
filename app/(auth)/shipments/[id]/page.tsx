import { ShipmentDetail } from '@/components/shipments/shipment-detail'

interface ShipmentDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function ShipmentDetailPage({ params }: ShipmentDetailPageProps) {
  const { id } = await params
  return <ShipmentDetail shipmentId={id} />
}