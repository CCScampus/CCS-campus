import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { Student, MonthlyAttendance } from "@/types";
import { getMonthlyAttendance, getDailyAttendance } from '@/services/attendanceService';
import { downloadDetailedMonthlyAttendancePDF, downloadImprovedMonthlyAttendancePDF } from "@/lib/pdf-exporter";
import { useToast } from "@/hooks/use-toast";
import { useSystemDefaults } from "@/hooks/useSystemDefaults";

interface StudentAttendanceViewProps {
  student: Student;
}

interface DailyAttendanceRecord {
  date: string;
  status: string;
  reason: string;
  details: string;
}

export function StudentAttendanceView({ student }: StudentAttendanceViewProps) {
  const { toast } = useToast();
  const [attendance, setAttendance] = useState<MonthlyAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const { defaults } = useSystemDefaults();

  useEffect(() => {
    const fetchAttendanceData = async () => {
      try {
        setLoading(true);
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        // Get monthly attendance
        const attendanceData = await getMonthlyAttendance(currentMonth, currentYear);
        const studentAttendance = attendanceData.find(a => a.studentId === student.id) || null;
        setAttendance(studentAttendance);
      } catch (error) {
        console.error("Error fetching attendance data:", error);
        toast({
          title: "Error",
          description: "Failed to load attendance data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAttendanceData();
  }, [student.id, toast]);

  const handleGenerateReport = async () => {
    if (!student) return;
    
    try {
      setReportLoading(true);
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      // Get monthly data
      const monthlyData = await getMonthlyAttendance(currentMonth, currentYear);
      const attendance = monthlyData.find(data => data.studentId === student.id);
      
      if (!attendance) {
        toast({
          title: "No Data",
          description: "No attendance data found for the selected month.",
          variant: "destructive",
        });
        setReportLoading(false);
        return;
      }
      
      // Get daily data
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
      const dailyAttendancePromises = Array.from({ length: daysInMonth }, (_, i) => {
        const date = new Date(currentYear, currentMonth - 1, i + 1);
        return getDailyAttendance(date.toISOString().split('T')[0]);
      });
      
      const dailyAttendanceResults = await Promise.all(dailyAttendancePromises);
      const studentDailyAttendance = dailyAttendanceResults
        .flat()
        .filter(record => record.studentId === student.id)
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
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Generate and download PDF with improved layout
      downloadImprovedMonthlyAttendancePDF(
        attendance,
        studentDailyAttendance,
        student,
        currentMonth,
        currentYear,
        toast
      );
      
      setReportLoading(false);
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "Error",
        description: "Failed to generate attendance report. Please try again.",
        variant: "destructive",
      });
      setReportLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-4">Loading attendance data...</div>;
  }

  if (!attendance) {
    return <div className="text-center py-4">No attendance records found for current month</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="py-4 px-6">
            <CardTitle className="text-sm font-medium">Present</CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-6">
            <p className="text-2xl font-bold">{attendance.totalPresent} days</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="py-4 px-6">
            <CardTitle className="text-sm font-medium">Absent</CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-6">
            <p className="text-2xl font-bold">{attendance.totalAbsent} days</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="py-4 px-6">
            <CardTitle className="text-sm font-medium">Late</CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-6">
            <p className="text-2xl font-bold">{attendance.totalLate || 0} times</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="py-4 px-6">
            <CardTitle className="text-sm font-medium">Percentage</CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-6">
            <p className="text-2xl font-bold">{attendance.attendancePercentage}%</p>
            {defaults && attendance.attendancePercentage < defaults.attendance_threshold && (
              <p className="text-sm text-red-600 mt-1">
                Warning: Attendance below required threshold ({defaults.attendance_threshold}%)
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Button 
        className="w-full" 
        variant="outline" 
        onClick={handleGenerateReport}
        disabled={reportLoading}
      >
        {reportLoading ? (
          <>Generating Reports...</>
        ) : (
          <>
            <FileText className="mr-2 h-4 w-4" />
            Generate Monthly Reports
          </>
        )}
      </Button>
    </div>
  );
} 