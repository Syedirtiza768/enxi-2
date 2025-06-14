import { AppLayout } from '@/components/design-system/organisms/AppLayout'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <AppLayout>
      {children}
    </AppLayout>
  )
}