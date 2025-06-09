import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Home,
  Users,
  Calendar,
  FileText,
  Settings,
  Mail,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const Sidebar = ({ isOpen, onToggle }: SidebarProps) => {
  const location = useLocation();
  const [mounted, setMounted] = useState(false);
  const { user } = useAuth();

  // Used to prevent animation on initial render
  useEffect(() => {
    setMounted(true);
  }, []);

  const navItems = [
    { path: "/", label: "Dashboard", icon: Home, roles: ["admin"] },
    { path: "/students", label: "Students", icon: Users, roles: ["admin"] },
    { path: "/admin/teachers", label: "Teachers", icon: Users, roles: ["admin"] },
    { path: "/attendance", label: "Attendance", icon: Calendar, roles: ["admin", "teacher"] },
    { path: "/fees", label: "Fees", icon: FileText, roles: ["admin"] },
    { path: "/notifications", label: "Notifications", icon: Mail, roles: ["admin"] },
    { path: "/settings", label: "Settings", icon: Settings, roles: ["admin"] },
  ];

  // Filter nav items based on user role
  const filteredNavItems = navItems.filter(item => 
    !user?.role || item.roles.includes(user.role)
  );

  return (
    <div
      className={cn(
        "fixed left-0 top-0 z-50 h-screen bg-[#050e34] border-r transition-all duration-300 ease-in-out overflow-y-auto min-scrollbar",
        isOpen ? "w-64" : "w-20",
        mounted && "transform"
      )}
    >
      <div className="flex items-center p-6 pb-2 justify-center relative">
        <div
          className={cn(
            "flex flex-col items-center gap-2 transition-all duration-300",
            "justify-center"
          )}
        >
          <img
            src="/logo.jpg"
            alt="CCS Logo"
            className={cn(
              isOpen
                ? "w-20 h-20 rounded-full p-1 bg-white mb-2 shadow-md hover:shadow-lg transition-shadow duration-300"
                : "w-8 h-8 rounded-full bg-white mb-2 transition-all duration-300"
            )}
          />
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#ffffff] text-lg">CCS</span>
            {isOpen && <span className="font-bold text-white text-lg">CAMPUS</span>}
          </div>
        </div>
        
        {/* Toggle button */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute -right-3 top-20 rounded-full bg-white p-1 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-200 text-[#050e34]"
          onClick={onToggle}
        >
          {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </Button>
      </div>

      <TooltipProvider delayDuration={0}>
        <div className="flex flex-col gap-2 p-4">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            
            return (
              <Tooltip key={item.path}>
                <TooltipTrigger asChild>
                  <Link
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-all duration-300 ease-in-out",
                      isActive
                        ? "bg-blue-900 text-white shadow-md font-medium"
                        : "hover:bg-blue-800/80 text-white/70 hover:text-white",
                      !isOpen && "justify-center p-3",
                      isActive && "border-l-4 border-blue-400"
                    )}
                  >
                    <item.icon className={cn(
                      "h-5 w-5 transition-transform duration-300",
                      !isOpen && "h-6 w-6",
                      "group-hover:scale-110"
                    )} />
                    {isOpen && <span className="tracking-wide">{item.label}</span>}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className={cn(isOpen && "hidden")}>
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    </div>
  );
};

export default Sidebar;
