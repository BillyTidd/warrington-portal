'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, Home, Users, FileText, LogOut } from 'lucide-react'

export function Sidebar() {
  // const { data: session } = useSession()
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0">
        <SidebarContent />
      </SheetContent>
      <div className="hidden border-r bg-gray-100/40 md:block dark:bg-gray-800/40">
        <SidebarContent />
      </div>
    </Sheet>
  )
}

function SidebarContent() {
  const { data: session } = useSession()
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b px-4">
        <Link className="flex items-center gap-2 font-semibold" href="/">
          <FileText className="h-6 w-6" />
          <span>Time Tracker</span>
        </Link>
      </div>
      <ScrollArea className="flex-1">
        <nav className="flex flex-col gap-2 p-4">
          <Link href="/dashboard">
            <Button variant="ghost" className="w-full justify-start">
              <Home className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          </Link>
          {session?.user?.role === 'admin' && (
            <Link href="/admin/users">
              <Button variant="ghost" className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" />
                Manage Users
              </Button>
            </Link>
          )}
          <Link href="/profile">
            <Button variant="ghost" className="w-full justify-start">
              <FileText className="mr-2 h-4 w-4" />
              Profile
            </Button>
          </Link>
        </nav>
      </ScrollArea>
      <div className="border-t p-4">
        <Link href="/api/auth/signout">
          <Button variant="ghost" className="w-full justify-start">
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </Button>
        </Link>
      </div>
    </div>
  )
}