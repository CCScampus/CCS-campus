import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { NotificationProvider } from "@/contexts/NotificationContext";

import Layout from "@/components/Layout";
import {
  Dashboard,
  StudentManagement,
  FeeManagement,
  AttendanceManagement,
  AddEditStudent,
  StudentDetail,
  FeeDetail,
  StudentFees,
  Notifications,
  NotFound
} from "@/pages";
import TeacherManagementPage from "@/app/admin/teachers/page";
// Import Settings directly to avoid any potential issues
import Settings from "@/pages/Settings";

// Auth components
import AuthGuard from "@/components/AuthGuard";
import RouteGuard from "@/components/RouteGuard";

const App = () => {
  return (
    <NotificationProvider>
      <Router>
        <Routes>
          <Route
            path="/"
            element={
              <AuthGuard>
                <Layout />
              </AuthGuard>
            }
          >
            <Route 
              index 
              element={
                <RouteGuard>
                  <Dashboard />
                </RouteGuard>
              } 
            />
            <Route 
              path="/students" 
              element={
                <RouteGuard>
                  <StudentManagement />
                </RouteGuard>
              } 
            />
            <Route 
              path="/admin/teachers" 
              element={
                <RouteGuard>
                  <TeacherManagementPage />
                </RouteGuard>
              } 
            />
            <Route 
              path="/students/add" 
              element={
                <RouteGuard>
                  <AddEditStudent />
                </RouteGuard>
              } 
            />
            <Route 
              path="/students/edit/:id" 
              element={
                <RouteGuard>
                  <AddEditStudent />
                </RouteGuard>
              } 
            />
            <Route 
              path="/students/:id/view" 
              element={
                <RouteGuard>
                  <StudentDetail />
                </RouteGuard>
              } 
            />
            <Route 
              path="/student/:id/fees" 
              element={
                <RouteGuard>
                  <StudentFees />
                </RouteGuard>
              } 
            />
            <Route 
              path="/fees" 
              element={
                <RouteGuard>
                  <FeeManagement />
                </RouteGuard>
              } 
            />
            <Route 
              path="/fees/:id" 
              element={
                <RouteGuard>
                  <FeeDetail />
                </RouteGuard>
              } 
            />
            <Route 
              path="/attendance" 
              element={
                <RouteGuard>
                  <AttendanceManagement />
                </RouteGuard>
              } 
            />
            <Route 
              path="/notifications" 
              element={
                <RouteGuard>
                  <Notifications />
                </RouteGuard>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <RouteGuard>
                  <Settings />
                </RouteGuard>
              } 
            />
            <Route 
              path="/settings-test" 
              element={
                <RouteGuard>
                  <Settings />
                </RouteGuard>
              } 
            />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
        <Toaster />
      </Router>
    </NotificationProvider>
  );
};

export default App;
