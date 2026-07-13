"use client";

import type React from "react";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Menu,
  FileText,
  Users,
  Calendar,
  LogOut,
  Moon,
  Sun,
  Package,
  LayoutDashboard,
  ClipboardList,
  TruckIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import Image from "next/image";

export function Layout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { theme, setTheme } = useTheme();

  const isActive = (path: string) => pathname === path;

  const userRole = session?.user?.role;

  // Navigation items based on user role
  const getNavItems = () => {
    if (userRole === "customer") {
      return [
        {
          href: "/customer/dashboard",
          label: "Dashboard",
          icon: LayoutDashboard,
        },
        {
          href: "/admin/job-requests",
          label: "My Job Requests",
          icon: ClipboardList,
        },
        { href: "/job-portal", label: "Job Portal", icon: Package },
        // { href: "/job-portal/reports", label: "Job Reports", icon: FileText },
        { href: "/estimate", label: "New Estimate", icon: FileText },
      ];
    }

    // Admin/Employee navigation
    return [
      ...(userRole === "admin"
        ? [{ href: "/dashboard", label: "Dashboard", icon: Users }]
        : []),
      { href: "/create-entry", label: "Create Entry", icon: FileText },
      { href: "/entries", label: "Entries", icon: FileText },
      ...(userRole === "admin"
        ? [{ href: "/clients", label: "Clients", icon: Users }]
        : []),
      ...(userRole === "admin"
        ? [{ href: "/admin/users", label: "Manage Users", icon: Users }]
        : []),
      ...(userRole === "admin"
        ? [{ href: "/invoice", label: "Invoices", icon: FileText }]
        : []),
      { href: "/calender", label: "Calendar", icon: Calendar },
      ...(userRole === "admin"
        ? [{ href: "/task-reports", label: "Tasks Reports", icon: FileText }]
        : []),
      { href: "/job-portal", label: "Job Portal", icon: Package },
      ...(userRole === "admin"
        ? [{ href: "/job-portal/reports", label: "Job Reports", icon: Package }]
        : []),
      ...(userRole === "admin"
        ? [
            {
              href: "/admin/job-requests",
              label: "Job Requests",
              icon: Package,
            },
          ]
        : []),
      ...(userRole === "admin"
        ? [{ href: "/estimate", label: "Estimates", icon: FileText }]
        : []),
      ...(userRole === "admin"
        ? [
            {
              href: "/admin/workers-vehicles",
              label: "Workers-Vehicles",
              icon: TruckIcon,
            },
          ]
        : []),
    ];
  };

  const navItems = getNavItems();
  const isCustomerLayout = userRole === "customer";

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div
        className={`flex h-14 items-center justify-center border-b px-4 ${
          isCustomerLayout
            ? "bg-gradient-to-r from-blue-600 to-indigo-600"
            : theme !== "dark"
            ? "bg-white"
            : ""
        }`}
      >
        <Link
          className={`flex items-center gap-2 font-semibold ${
            isCustomerLayout ? "text-white" : ""
          }`}
          href={isCustomerLayout ? "/customer/dashboard" : "/"}
        >
          {isCustomerLayout ? (
            <>
              <Package className="h-6 w-6" />
              <span>Customer Portal</span>
            </>
          ) : (
            <>
              {theme === "dark" ? (
                <Image
                  src={"/new-logo-dark.png"}
                  alt="logo"
                  width={600}
                  height={200}
                />
              ) : (
                <Image
                  src={"/new-logo-light.jpg"}
                  alt="logo"
                  width={600}
                  height={200}
                />
              )}
            </>
          )}
        </Link>
      </div>
      <ScrollArea className="flex-1">
        <nav className="flex flex-col gap-1 p-2">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="w-full">
              <Button
                variant={isActive(item.href) ? "secondary" : "ghost"}
                className="w-full justify-start h-10"
              >
                <div className="flex items-center w-full">
                  <div className="w-8 flex justify-center">
                    <item.icon className="h-4 w-4 shrink-0" />
                  </div>
                  <span className="ml-2">{item.label}</span>
                </div>
              </Button>
            </Link>
          ))}
        </nav>
      </ScrollArea>
      <div className="border-t p-2">
        {isCustomerLayout && (
          <div className="mb-2 px-3 py-2 text-sm text-muted-foreground">
            Welcome, {session?.user?.name}
          </div>
        )}
        <Button
          variant="ghost"
          className="w-full justify-start h-10 mb-1"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <div className="flex items-center w-full">
            <div className="w-8 flex justify-center">
              {theme === "dark" ? (
                <Sun className="h-4 w-4 shrink-0" />
              ) : (
                <Moon className="h-4 w-4 shrink-0" />
              )}
            </div>
            <span className="ml-2">Toggle Theme</span>
          </div>
        </Button>
        <Link href="/api/auth/signout" className="w-full">
          <Button variant="ghost" className="w-full justify-start h-10">
            <div className="flex items-center w-full">
              <div className="w-8 flex justify-center">
                <LogOut className="h-4 w-4 shrink-0" />
              </div>
              <span className="ml-2">Log out</span>
            </div>
          </Button>
        </Link>
      </div>
    </div>
  );

  if (status === "loading") {
    return null;
  }

  return (
    <div className="flex h-screen">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="md:hidden fixed top-4 left-4 z-50"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <SidebarContent />
        </SheetContent>
      </Sheet>
      <div className="hidden md:block w-64 border-r bg-background">
        <SidebarContent />
      </div>
      <main className="flex-1 overflow-y-auto p-4 md:p-8 pt-16 md:pt-8">{children}</main>
    </div>
  );
}
