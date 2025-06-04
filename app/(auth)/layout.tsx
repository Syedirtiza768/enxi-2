import { AppLayout } from '@/components/design-system/organisms/AppLayout'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AppLayout>
      {children}
    </AppLayout>
  )
}