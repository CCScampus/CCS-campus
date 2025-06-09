import { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import { Header } from "./Header";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Handle sidebar state based on screen size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    };
    
    // Set initial state
    handleResize();
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Clean up
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Force redirect teachers to attendance page
  useEffect(() => {
    if (user?.role === 'teacher' && !location.pathname.includes('/attendance')) {
      console.log('Layout redirecting teacher to attendance page');
      navigate('/attendance', { replace: true });
    }
  }, [user, location.pathname, navigate]);

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  return (
    <div className="min-h-screen bg-white">
      <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
      <Header toggleSidebar={toggleSidebar} />
      <main
        className={cn(
          "mt-16 transition-all duration-300 ease-in-out bg-gray-50",
          sidebarOpen ? "md:ml-64" : "md:ml-20",
          "p-6"
        )}
      >
        <div className="container mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
