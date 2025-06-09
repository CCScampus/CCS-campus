"use client";

import type React from "react";

import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {BarChart3,BookOpen,Calendar,FileText,Home,LogOut,Menu,Users,X,} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const pathname = location.pathname;
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const routes = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: Home,
      active: pathname === "/dashboard",
    },
    {
      href: "/dashboard/students",
      label: "Students",
      icon: Users,
      active: pathname.includes("/dashboard/students"),
    },
    {
      href: "/dashboard/fees",
      label: "Fee Management",
      icon: FileText,
      active: pathname.includes("/dashboard/fees"),
    },
    {
      href: "/dashboard/attendance",
      label: "Attendance",
      icon: Calendar,
      active: pathname.includes("/dashboard/attendance"),
    },
    {
      href: "/dashboard/reports",
      label: "Reports",
      icon: BarChart3,
      active: pathname.includes("/dashboard/reports"),
    },
  ];

  // Replace signOut with navigation to login and clearing local storage (or your auth logic)
  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="h-full">
      {/* Mobile Navigation */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="p-0 bg-ccs-blue-900">
          <div className="p-6 bg-ccs-blue-800">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-white" />
                <span className="text-xl font-bold text-white">CCS CAMPUS</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
              >
                <X className="h-6 w-6 text-white" />
              </Button>
            </div>
          </div>
          <div className="flex flex-col w-full">
            <div className="flex-1 px-3 py-2">
              <nav className="flex flex-col gap-1">
                {routes.map((route) => (
                  <Link
                    key={route.href}
                    to={route.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:text-white",
                      route.active
                        ? "bg-ccs-blue-700 text-white"
                        : "text-gray-300 hover:bg-ccs-blue-800"
                    )}
                  >
                    <route.icon className="h-4 w-4" />
                    {route.label}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="p-3 mt-auto">
              <Button
                variant="ghost"
                className="w-full justify-start text-gray-300 hover:text-white hover:bg-ccs-blue-800"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Navigation */}
      <div className="hidden md:flex h-full w-64 flex-col fixed inset-y-0 z-50 bg-ccs-blue-900">
        <div className="p-6 bg-ccs-blue-800">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-white" />
            <span className="text-xl font-bold text-white">CCS CAMPUS</span>
          </div>
        </div>
        <div className="flex flex-col flex-1 overflow-y-auto">
          <div className="flex-1 px-3 py-3">
            <nav className="flex flex-col gap-1">
              {routes.map((route) => (
                <Link
                  key={route.href}
                  to={route.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:text-white",
                    route.active
                      ? "bg-ccs-blue-700 text-white"
                      : "text-gray-300 hover:bg-ccs-blue-800"
                  )}
                >
                  <route.icon className="h-4 w-4" />
                  {route.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="p-3 mt-auto">
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-300 hover:text-white hover:bg-ccs-blue-800"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="md:pl-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-6 md:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen(true)}
          >
            <Menu className="h-6 w-6" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
          <div className="flex-1 flex justify-end">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Admin</span>
            </div>
          </div>
        </header>
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
