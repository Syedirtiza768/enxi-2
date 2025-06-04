import { ShipmentDetail } from '@/components/shipments/shipment-detail'

interface ShipmentDetailPageProps {
  params: {
    id: string
  }
}

export default function ShipmentDetailPage({ params }: ShipmentDetailPageProps) {
  return <ShipmentDetail shipmentId={params.id} />
}