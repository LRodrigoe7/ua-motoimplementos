import { Navbar } from '@/components/layout/Navbar'
import { NotificationManager } from '@/components/layout/NotificationManager'

export default function TallerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <NotificationManager />
      <main className="sm:pt-14 pb-20 sm:pb-0 min-h-screen">
        <div className="max-w-2xl mx-auto px-4 py-4 sm:py-6">
          {children}
        </div>
      </main>
    </>
  )
}
