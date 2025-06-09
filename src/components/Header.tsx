import { Bell, LogOut, Menu, User, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  toggleSidebar: () => void;
}

export function Header({ toggleSidebar }: HeaderProps) {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const { unreadCount, notificationsEnabled } = useNotifications();
  
  const displayName = user?.displayName || user?.email?.split("@")[0] || "Admin";
  const initials = displayName.split(" ")[0].substring(0, 1).toUpperCase() + 
                  (displayName.split(" ")[1]?.substring(0, 1).toUpperCase() || displayName.split(" ")[0].substring(1, 2).toUpperCase());
  const role = user?.role || "admin";

  const handleLogout = async () => {
    try {
      const success = await logout();
      if (success) {
        toast({
          title: "Logged out",
          description: "You have been successfully logged out.",
        });
      } else {
        // Manual logout fallback
        localStorage.removeItem('userRole');
        window.location.href = '/';
        toast({
          title: "Logged out",
          description: "You have been logged out, but there may have been an issue with the server.",
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
      // Force logout even if there's an error
      localStorage.removeItem('userRole');
      window.location.href = '/';
      toast({
        title: "Logged out",
        description: "Logout completed, but there was an error communicating with the server.",
      });
    }
  };

  return (
    <header className="fixed top-0 right-0 left-0 border-b bg-white shadow-sm z-50 transition-all duration-300 ease-in-out md:left-64">
      <div className="flex items-center h-16 px-4">
        {/* Left: Sidebar toggle (mobile only) */}
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleSidebar}
            className="md:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
        {/* Center: Display teacher name when role is teacher */}
        {role === "teacher" && (
          <div className="flex items-center justify-center flex-1">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-gray-700">{displayName}</span>
              <Badge variant="secondary" className="text-xs">Teacher</Badge>
            </div>
          </div>
        )}
        {/* Spacer only for admin */}
        {role === "admin" && <div className="flex-1" />}
        {/* Right: Notifications and Profile */}
        <div className="flex items-center gap-4">
          <Link to="/notifications">
            <Button
              variant="ghost"
              size="icon"
              className="relative hover:bg-blue-50 transition-colors duration-300 rounded-full"
              aria-label="Notifications"
              disabled={role === "teacher"}
            >
              <Bell className="h-5 w-5 text-gray-600" />
              {notificationsEnabled && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center text-[10px] text-white font-medium animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-blue-50 transition-colors duration-300">
                <Avatar className="h-9 w-9 border-2 border-blue-100">
                  <AvatarFallback className="bg-blue-100 text-blue-700 font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 mt-1 rounded-xl shadow-lg border-blue-100">
              <DropdownMenuLabel className="font-bold">
                {displayName}
                <div className="flex items-center mt-1">
                  <Badge variant={role === "admin" ? "default" : "secondary"} className="text-xs">
                    {role === "admin" ? "Administrator" : "Teacher"}
                  </Badge>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {role === "admin" && (
                <DropdownMenuItem asChild className="rounded-lg focus:bg-blue-50 transition-colors duration-200">
                  <Link to="/settings" className="cursor-pointer w-full flex items-center">
                    <Settings className="mr-2 h-4 w-4 text-blue-600" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer rounded-lg focus:bg-blue-50 transition-colors duration-200"
              >
                <LogOut className="mr-2 h-4 w-4 text-blue-600" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
