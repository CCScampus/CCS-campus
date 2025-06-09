import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Save, Download, RefreshCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AttendanceTable from "@/components/AttendanceTable";
import { Student, AttendanceStatus, DailyAttendance as DailyAttendanceType, SelectedSlots } from "@/types";
import { toast } from "@/hooks/use-toast";
import { getDailyAttendance, updateDailyAttendance, deleteAttendanceForDate, resetAttendanceForHour, getSelectedSlots, updateSelectedSlots, validateAttendanceCount, subscribeToAttendanceChanges } from "@/services/attendanceService";
import { downloadDailyAttendanceCSV } from "@/lib/csv-exporter";
import { downloadDailyAttendancePDF } from "@/lib/pdf-exporter";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { useSystemDefaults } from "@/hooks/useSystemDefaults";
import { generateBatchOptions } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface DailyAttendanceProps {
  students: Student[];
  onStudentsUpdate: () => void;
}

export function DailyAttendance({ students, onStudentsUpdate }: DailyAttendanceProps) {
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<DailyAttendanceType[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlots[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resettingHour, setResettingHour] = useState<number | null>(null);
  const [activeHour, setActiveHour] = useState<number>(1);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [recentlyUpdatedStudents, setRecentlyUpdatedStudents] = useState<Set<string>>(new Set());
  
  // Get system defaults
  const { defaults } = useSystemDefaults();
  
  // Get auth context for teacher name
  const { user } = useAuth();
  
  // Filters for daily attendance
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDailyBatch, setSelectedDailyBatch] = useState<string>("all");
  const [selectedDailyCourse, setSelectedDailyCourse] = useState<string>("all");

  // Get unique courses from students or system defaults
  const courseOptions = useMemo(() => {
    if (defaults?.course_list && defaults.course_list.length > 0) {
      return defaults.course_list;
    }
    const set = new Set(students.map(s => s.course).filter(Boolean));
    return Array.from(set);
  }, [students, defaults]);

  // Generate batch options based on system defaults
  const batchOptions = useMemo(() => {
    return generateBatchOptions(defaults?.batch_format);
  }, [defaults?.batch_format]);

  // Track modified students
  const [modifiedStudents, setModifiedStudents] = useState<Set<string>>(new Set());

  // Define fetchAttendance function to get attendance data for a specific date
  const fetchAttendance = async (date: Date) => {
    setLoading(true);
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      console.log(`Fetching attendance for date: ${dateStr}`);
      
      // Get attendance data
      const data = await getDailyAttendance(dateStr);
      setAttendance(data);
      
      // Update last refresh time
      setLastRefresh(new Date());
      
      // Reset recently updated students on manual refresh
      setRecentlyUpdatedStudents(new Set());
      
    } catch (error) {
      console.error("Error fetching attendance:", error);
      toast({
        title: "Error",
        description: "Failed to fetch attendance data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Load attendance data when date changes
  useEffect(() => {
    fetchAttendance(selectedDate);
  }, [selectedDate]); // Only re-fetch when date changes

  // Apply filters to students - remove console logs that cause re-renders
  const applyFilters = useCallback(() => {
    let result = [...students];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(student => 
        student.name.toLowerCase().includes(query) || 
        student.rollNo.toLowerCase().includes(query)
      );
    }
    
    // Apply batch filter
    if (selectedDailyBatch !== "all") {
      result = result.filter(student => student.batch === selectedDailyBatch);
    }
    
    // Apply course filter
    if (selectedDailyCourse !== "all") {
      result = result.filter(student => student.course === selectedDailyCourse);
    }
    
    // Apply status filter if not set to 'all'
    if (selectedStatus !== "all" && attendance && attendance.length > 0) {
      // Check each student one by one
      result = result.filter(student => {
        // Find this student's attendance record
        const studentAttendance = attendance.find(a => a.studentId === student.id);
        if (!studentAttendance) {
          return false;
        }
        
        // Make sure hourlyStatus exists and is an array
        if (!studentAttendance.hourlyStatus || !Array.isArray(studentAttendance.hourlyStatus)) {
          return false;
        }
        
        // Find the status for the active hour
        const hourStatus = studentAttendance.hourlyStatus.find(h => h.hour === activeHour);
        
        // Match only if the status matches the selected status
        return hourStatus?.status === selectedStatus;
      });
    }
    
    setFilteredStudents(result);
  }, [searchQuery, selectedDailyBatch, selectedDailyCourse, students, selectedStatus, attendance, activeHour]);

  // Apply filters when any filter criteria changes
  useEffect(() => {
    applyFilters();
  }, [applyFilters, activeHour]);

  // Handle attendance change for a student
  const handleAttendanceChange = (
    studentId: string,
    hour: number,
    status: AttendanceStatus,
    reason?: string
  ) => {
    setAttendance((prev) => {
      const updated = [...prev];
      const index = updated.findIndex((a) => a.studentId === studentId);
      
      if (index !== -1) {
        const studentAttendance = { ...updated[index] };
        
        // Find the hourly status entry or create a new one
        const hourIndex = studentAttendance.hourlyStatus.findIndex(
          (h) => h.hour === hour
        );
        
        const currentTime = new Date().toISOString();
        
        if (hourIndex !== -1) {
          // Update existing entry
          studentAttendance.hourlyStatus[hourIndex] = {
            ...studentAttendance.hourlyStatus[hourIndex],
            status,
            time: currentTime,
            reason: reason || null,
          };
        } else {
          // Add new entry
          studentAttendance.hourlyStatus.push({
            hour,
            status,
            time: currentTime,
            reason: reason || null,
          });
        }
        
        // Increment the version for optimistic concurrency control
        studentAttendance.version = (studentAttendance.version || 0) + 1;
        
        // Sort hourlyStatus by hour for consistency
        studentAttendance.hourlyStatus.sort((a, b) => a.hour - b.hour);
        
        updated[index] = studentAttendance;
        
        // Track this student as modified
        setModifiedStudents((prev) => {
          const updated = new Set(prev);
          updated.add(studentId);
          return updated;
        });
      }
      
      return updated;
    });
  };

  // Handle selected slots change
  const handleSelectedSlotsChange = async (newSelectedSlots: SelectedSlots[]) => {
    try {
      await updateSelectedSlots(newSelectedSlots);
      setSelectedSlots(newSelectedSlots);
      toast({
        title: "Success",
        description: "Selected slots updated successfully",
      });
    } catch (error) {
      console.error("Error updating selected slots:", error);
      toast({
        title: "Error",
        description: "Failed to update selected slots",
        variant: "destructive",
      });
    }
  };

  // Subscribe to real-time attendance updates
  useEffect(() => {
    if (!selectedDate) return;
    
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    console.log(`Setting up real-time subscription for date: ${dateStr}`);
    
    let unsubscribe: (() => void) | undefined;
    let isSubscribed = true; // Flag to prevent updates after unmount
    const timeouts: NodeJS.Timeout[] = []; // Track all timeouts
    
    // Set up subscription to attendance changes
    try {
      unsubscribe = subscribeToAttendanceChanges(dateStr, (updatedAttendance) => {
        if (!isSubscribed) return; // Don't update if component is unmounted
        
        console.log(`Received real-time update for student: ${updatedAttendance.studentId}`);
        
        // Only apply updates if they're newer than what we have
        setAttendance(prevAttendance => {
          // Don't update if component is unmounted
          if (!isSubscribed) return prevAttendance;
          
          const updated = [...prevAttendance];
          const index = updated.findIndex(a => a.studentId === updatedAttendance.studentId);
          
          if (index === -1) {
            // New record we don't have yet
            return [...updated, updatedAttendance];
          }
          
          const currentVersion = updated[index].version || 0;
          
          // Only update if the new version is newer than what we have
          if (updatedAttendance.version > currentVersion) {
            updated[index] = updatedAttendance;
            
            // Add to recently updated students for UI feedback
            setRecentlyUpdatedStudents(prev => {
              if (!isSubscribed) return prev; // Don't update if unmounted
              
              const newSet = new Set(prev);
              newSet.add(updatedAttendance.studentId);
              
              // Remove this student from the set after 3 seconds
              const timeoutId = setTimeout(() => {
                if (!isSubscribed) return; // Don't update if unmounted
                setRecentlyUpdatedStudents(current => {
                  const updated = new Set(current);
                  updated.delete(updatedAttendance.studentId);
                  return updated;
                });
              }, 3000);
              
              // Track the timeout for cleanup
              timeouts.push(timeoutId);
              
              return newSet;
            });
            
            // If this student is in our modified set but was updated by someone else,
            // remove them from the modified set to prevent overwriting
            if (!modifiedStudents.has(updatedAttendance.studentId)) {
              setModifiedStudents(prev => {
                if (!isSubscribed) return prev; // Don't update if unmounted
                const newSet = new Set(prev);
                newSet.delete(updatedAttendance.studentId);
                return newSet;
              });
            }
          }
          
          return updated;
        });
      });
    } catch (error) {
      console.error('Error setting up real-time subscription:', error);
    }
    
    // Clean up subscription when component unmounts or date changes
    return () => {
      console.log('Cleaning up real-time subscription');
      isSubscribed = false; // Prevent any further state updates
      
      // Clear all timeouts
      timeouts.forEach(clearTimeout);
      
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [selectedDate]);

  // Handle save attendance
  const handleSaveAttendance = async () => {
    setLoading(true);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      
      // Get list of students that need attendance records
      const studentsToUpdate = filteredStudents.length > 0 
        ? filteredStudents 
        : students;
      
      // Only save students that have been modified
      const studentsWithChanges = studentsToUpdate.filter(student => 
        modifiedStudents.has(student.id)
      );
      
      console.log(`Found ${studentsWithChanges.length} students with modified attendance out of ${studentsToUpdate.length} total`);
      
      if (studentsWithChanges.length === 0) {
        toast({ title: "Info", description: "No attendance changes to save." });
        setLoading(false);
        return;
      }
      
      // Prepare attendance records only for students who need updates
      const attendanceRecordsToSave = studentsWithChanges.map(student => {
        // Find existing attendance record for this student
        const record = attendance.find(a => a.studentId === student.id);
        
        // Check if we have a valid ID that we can use
        const isValidId = record?.id && typeof record.id === 'string' && 
                          record.id.length === 36 && !record.id.startsWith('temp-');
        
        if (record && record.hourlyStatus.length > 0) {
          // Validate the number of present lectures
          if (!validateAttendanceCount(record.hourlyStatus)) {
            throw new Error(`Student ${student.name} has more than 12 lectures marked as present`);
          }
          
          // Use existing record with its hourly status
          return {
            studentId: student.id,
            date: dateStr,
            hourlyStatus: record.hourlyStatus.map(h => ({
              hour: h.hour,
              status: h.status,
              time: h.time || new Date().toISOString(),
              reason: h.reason || null
            })),
            ...(isValidId ? { id: record.id } : {}),
            version: record.version || 0
          };
        }
        
        // For students with no attendance recorded yet,
        // create an empty record with absent status for all hours
        return {
          studentId: student.id,
          date: dateStr,
          hourlyStatus: Array.from({ length: 15 }, (_, i) => ({
            hour: i + 1,
            status: 'absent' as AttendanceStatus,
            time: new Date().toISOString(),
            reason: null
          })),
          ...(isValidId ? { id: record.id } : {}),
          version: record?.version || 0
        };
      });
      
      console.log(`Prepared ${attendanceRecordsToSave.length} attendance records for saving`);
      
      await updateDailyAttendance(attendanceRecordsToSave);
      toast({ 
        title: "Attendance Saved", 
        description: `Attendance records for ${attendanceRecordsToSave.length} students have been saved successfully.` 
      });
      
      // Clear the modified students set after successful save
      setModifiedStudents(new Set());
      
      // Refresh the attendance data to get the latest changes including version updates
      await fetchAttendance(selectedDate);
    } catch (error) {
      console.error("Error saving attendance:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save attendance records",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDailyReport = () => {
    downloadDailyAttendancePDF(attendance, filteredStudents, toast, user?.displayName);
  };

  const handleResetFullDay = async () => {
    if (students.length === 0) {
      toast({ title: "Error", description: "No students found.", variant: "destructive" });
      return;
    }
    
    if (!confirm(`Are you sure you want to reset ALL attendance records for ${selectedDate.toLocaleDateString()}? This will permanently delete all attendance data for this date.`)) {
      return;
    }
    
    setResetLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      // Delete all attendance records for this date
      await deleteAttendanceForDate(dateStr);
      
      toast({ title: "Attendance Reset", description: "All attendance records have been deleted for this date." });
      await fetchAttendance(selectedDate);
    } catch (error) {
      toast({ title: "Error", description: "Failed to reset attendance.", variant: "destructive" });
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetHour = async (hour: number) => {
    if (students.length === 0) {
      toast({ title: "Error", description: "No students found.", variant: "destructive" });
      return;
    }
    
    if (!confirm(`Are you sure you want to reset attendance for Hour ${hour} on ${selectedDate.toLocaleDateString()}? This will remove all attendance data for this hour.`)) {
      return;
    }
    
    setResetLoading(true);
    setResettingHour(hour);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      // Reset attendance for specific hour
      await resetAttendanceForHour(dateStr, hour);
      
      toast({ 
        title: "Hour Reset", 
        description: `Attendance for Hour ${hour} has been reset.` 
      });
      await fetchAttendance(selectedDate);
    } catch (error) {
      toast({ title: "Error", description: "Failed to reset hour attendance.", variant: "destructive" });
    } finally {
      setResetLoading(false);
      setResettingHour(null);
    }
  };

  // Listen for activeHour changes from AttendanceTable
  const handleActiveHourChange = (hour: number) => {
    console.log("Active hour changed to:", hour);
    setActiveHour(hour);
  };

  // Defensive: always reset loading/resettingHour on mount
  useEffect(() => {
    setLoading(false);
    setResetLoading(false);
    setResettingHour(null);
  }, []);

  return (
    <div className="space-y-4">
      <Card className="mb-2">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or roll number..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Select 
                value={selectedDailyBatch} 
                onValueChange={setSelectedDailyBatch}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Batch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Batches</SelectItem>
                  {batchOptions.map(batch => (
                    <SelectItem key={batch} value={batch}>{batch}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select 
                value={selectedDailyCourse} 
                onValueChange={setSelectedDailyCourse}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {courseOptions.map(course => (
                    <SelectItem key={course} value={course}>{course}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select 
                value={selectedStatus} 
                onValueChange={(value) => {
                  console.log("Status filter changed to:", value);
                  setSelectedStatus(value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="leave">Leave</SelectItem>
                  <SelectItem value="medical">Medical</SelectItem>
                  <SelectItem value="exam">Exam</SelectItem>
                  <SelectItem value="in">In</SelectItem>
                  <SelectItem value="out">Out</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end items-center gap-2">
              <Button 
                onClick={() => fetchAttendance(selectedDate)} 
                variant="outline" 
                size="icon"
                disabled={loading}
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
              <div className="text-xs text-muted-foreground">
                Last refreshed: {format(lastRefresh, "h:mm:ss a")}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline"
              disabled={resetLoading}
              className="bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {resetLoading && resettingHour ? `Resetting Hour ${resettingHour}...` : 
               resetLoading ? "Resetting..." : "Reset Attendance"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={handleResetFullDay}>
              Reset Full Day
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
              <DropdownMenuItem key={hour} onClick={() => handleResetHour(hour)}>
                Reset Hour {hour}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Button variant="outline" onClick={handleSaveAttendance} disabled={loading}>
          <Save className="mr-2 h-4 w-4" />
          {loading ? "Saving..." : "Save"}
        </Button>
        <Button onClick={handleGenerateDailyReport} className="bg-blue-950 text-white">
          <Download className="mr-2 h-4 w-4" />
          Download PDF Report
        </Button>
      </div>

      <AttendanceTable
        students={filteredStudents.length > 0 ? filteredStudents : students}
        date={selectedDate}
        attendance={attendance}
        selectedSlots={selectedSlots}
        onDateChange={setSelectedDate}
        onAttendanceChange={handleAttendanceChange}
        onSelectedSlotsChange={handleSelectedSlotsChange}
        onActiveHourChange={handleActiveHourChange}
        recentlyUpdatedStudents={recentlyUpdatedStudents}
      />
    </div>
  );
} 