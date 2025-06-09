import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Save } from "lucide-react";
import { Student, DailyAttendance } from "@/types";
import { toast } from "@/hooks/use-toast";
import { getStudents } from "@/services/studentService";
import { getDailyAttendance, getMonthlyAttendance } from "@/services/attendanceService";
import { format } from "date-fns";
import { DailyAttendance as DailyAttendanceComponent } from "@/components/DailyAttendance";
import { MonthlyReports } from "@/components/MonthlyReports";
import { useSystemDefaults } from "@/hooks/useSystemDefaults";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { downloadLeaveReasonsReportPDF, downloadImprovedMonthlyAttendancePDF } from "@/lib/pdf-exporter";
import { LeaveReasonsReportButton } from "@/components/LeaveReasonsReportButton";

const currentYear = new Date().getFullYear();
// Default batch options if system defaults aren't loaded
const DEFAULT_BATCH_OPTIONS = Array.from({ length: 6 }, (_, i) => `${currentYear + i}-${currentYear + i + 1}`);

const AttendanceManagement = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [activeTab, setActiveTab] = useState("daily");
  const [reportLoading, setReportLoading] = useState(false);
  const { defaults } = useSystemDefaults();
  
  // Generate batch options based on system defaults or use defaults
  const generateBatchOptions = () => {
    const options = [...DEFAULT_BATCH_OPTIONS];
    
    if (defaults?.batch_format) {
      const format = defaults.batch_format;
      if (format.includes('YYYY')) {
        for (let i = 0; i < 6; i++) {
          const year = currentYear + i;
          const batchName = format.replace('YYYY', String(year));
          if (!options.includes(batchName)) {
            options.push(batchName);
          }
        }
      }
    }
    
    return [...new Set(options)];
  };
  
  // Options for dropdowns
  const [batches, setBatches] = useState<string[]>(DEFAULT_BATCH_OPTIONS);
  const [courses, setCourses] = useState<string[]>([]);
  
  // Update batches when system defaults change
  useEffect(() => {
    if (defaults) {
      setBatches(generateBatchOptions());
    }
  }, [defaults]);

  const fetchStudents = async () => {
    try {
      const studentsData = await getStudents();
      // Sort students alphabetically by name
      const sortedStudents = [...studentsData].sort((a, b) => 
        a.name.localeCompare(b.name)
      );
      setStudents(sortedStudents);

      // Extract unique courses for filters
      const uniqueCourses = Array.from(new Set(sortedStudents.map(s => s.course)));
      setCourses(uniqueCourses);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load students.", variant: "destructive" });
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleDownloadReport = async ({ selectedStudent, selectedMonth }: { selectedStudent: string; selectedMonth: Date }) => {
    if (selectedStudent === "all") {
      toast({ 
        title: "Selection Required", 
        description: "Please select a specific student for the report.", 
        variant: "destructive" 
      });
      return;
    }

    setReportLoading(true);
    try {
      const month = selectedMonth.getMonth() + 1;
      const year = selectedMonth.getFullYear();
      const student = students.find(s => s.id === selectedStudent);
      if (!student) throw new Error("Student not found");
      
      // Fetch monthly summary for the student
      const monthlyAttendanceArr = await getMonthlyAttendance(month, year);
      const monthlyData = monthlyAttendanceArr.find(a => a.studentId === selectedStudent);
      if (!monthlyData) throw new Error("No monthly attendance data found for this student.");

      // Fetch daily details for the month
      const daysInMonth = new Date(year, month, 0).getDate();
      const dailyAttendancePromises = Array.from({ length: daysInMonth }, (_, i) => {
        const date = new Date(year, month - 1, i + 1);
        return getDailyAttendance(date.toISOString().split('T')[0]);
      });
      const dailyAttendanceResults = await Promise.all(dailyAttendancePromises);
      const studentDailyAttendance = dailyAttendanceResults
        .flat()
        .filter(record => record.studentId === selectedStudent)
        .map(record => ({
          date: record.date,
          status: record.hourlyStatus.length > 0 
            ? record.hourlyStatus.filter(h => h.status === 'present').length > record.hourlyStatus.length / 2 
              ? 'Present' 
              : 'Absent'
            : 'Absent',
          reason: record.hourlyStatus.some(h => h.status === 'medical') 
            ? 'Medical' 
            : record.hourlyStatus.some(h => h.status === 'leave') 
              ? 'Leave' 
              : '',
          hourlyDetails: Array(15).fill(null).map((_, idx) => {
            const hourData = record.hourlyStatus.find(h => h.hour === idx + 1);
            return hourData 
              ? { 
                  status: hourData.status, 
                  time: hourData.time || '',
                  reason: hourData.status === 'leave' ? hourData.reason : undefined
                }
              : { status: '', time: '' };
          })
        }));

      // Use improved PDF export
      downloadImprovedMonthlyAttendancePDF(
        monthlyData,
        studentDailyAttendance,
        student,
        month,
        year,
        toast
      );
    } catch (error) {
      console.error("Report generation error:", error);
      toast({
        title: "Report Generation Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-quicksand font-bold">Attendance</h1>
          <p className="text-muted-foreground">Track and manage student attendance records.</p>
        </div>
      </div>

      <Tabs defaultValue="daily" onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="reports">Monthly Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-4 mt-4">
          <DailyAttendanceComponent
            students={students}
            batches={batches}
            courses={courses}
            onStudentsUpdate={setStudents}
          />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Attendance Reports</CardTitle>
              <CardDescription>Generate and download monthly attendance reports for individual students.</CardDescription>
            </CardHeader>
            <CardContent>
              <MonthlyReports
                students={students}
                onDownloadReport={handleDownloadReport}
                reportLoading={reportLoading}
              />
              
              {/* Leave Reasons Report Button */}
              {activeTab === "reports" && (
                <LeaveReasonsReportButton students={students} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AttendanceManagement;