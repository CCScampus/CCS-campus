import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Download, Bug } from "lucide-react";
import { Student } from "@/types";
import { toast } from "@/hooks/use-toast";
import { getDailyAttendance } from "@/services/attendanceService";
import { format } from "date-fns";
import { downloadLeaveReasonsReportPDF } from "@/lib/pdf-exporter";

interface LeaveReasonsReportButtonProps {
  students: Student[];
}

export function LeaveReasonsReportButton({ students }: LeaveReasonsReportButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleGenerateReport = async () => {
    // Get selected student and month from data attributes
    const selectedStudentId = document.querySelector('[data-selected-student]')?.getAttribute('data-selected-student');
    const selectedMonthStr = document.querySelector('[data-selected-month]')?.getAttribute('data-selected-month');
    
    if (!selectedStudentId || selectedStudentId === 'all') {
      toast({ 
        title: "Selection Required", 
        description: "Please select a specific student for the report.", 
        variant: "destructive" 
      });
      return;
    }
    
    if (!selectedMonthStr) {
      toast({ 
        title: "Selection Required", 
        description: "Please select a month for the report.", 
        variant: "destructive" 
      });
      return;
    }
    
    const selectedMonth = new Date(selectedMonthStr);
    const month = selectedMonth.getMonth() + 1;
    const year = selectedMonth.getFullYear();
    
    const student = students.find(s => s.id === selectedStudentId);
    if (!student) {
      toast({ 
        title: "Student Not Found", 
        description: "The selected student could not be found.", 
        variant: "destructive" 
      });
      return;
    }
    
    setLoading(true);
    try {
      console.log(`Generating leave reasons report for ${student.name} (${month}/${year})`);
      
      // Get all dates in the month
      const daysInMonth = new Date(year, month, 0).getDate();
      const dates = Array.from({ length: daysInMonth }, (_, i) => 
        new Date(year, month - 1, i + 1).toISOString().split('T')[0]
      );
      
      // Prepare data for the leave reasons report
      const dailyData = [];
      
      // For each date, get the attendance status
      for (const dateStr of dates) {
        const attendanceData = await getDailyAttendance(dateStr);
        const studentAttendance = attendanceData.find(a => a.studentId === selectedStudentId);
        
        if (studentAttendance && studentAttendance.hourlyStatus.length > 0) {
          // Check for leave entries
          const leaveEntries = studentAttendance.hourlyStatus.filter(h => h.status === 'leave' && h.reason);
          
          if (leaveEntries.length > 0) {
            // Create hourly details array with leave reasons
            const hourlyDetails = [];
            
            leaveEntries.forEach(entry => {
              // Ensure the array has enough elements
              while (hourlyDetails.length < entry.hour) {
                hourlyDetails.push(null);
              }
              
              // Add the leave entry
              hourlyDetails[entry.hour - 1] = {
                status: 'leave',
                reason: entry.reason
              };
            });
            
            // Add the day to dailyData
            dailyData.push({
              date: dateStr,
              hourlyDetails
            });
          }
        }
      }
      
      // Generate the leave reasons report
      const success = await downloadLeaveReasonsReportPDF(
        student,
        month,
        year,
        dailyData,
        toast
      );
      
      if (!success) {
        throw new Error("Failed to generate leave reasons report");
      }
    } catch (error) {
      console.error("Leave reasons report generation error:", error);
      toast({
        title: "Report Generation Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 pt-4 border-t">
      <h3 className="text-lg font-medium mb-2">Leave Reasons Report</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Generate a dedicated report showing all leave reasons for the selected student and month.
      </p>
      <div className="flex gap-2">
        <Button 
          onClick={handleGenerateReport}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Download className="mr-2 h-4 w-4" />
          {loading ? "Generating..." : "Download Leave Reasons Report"}
        </Button>
      </div>
    </div>
  );
} 