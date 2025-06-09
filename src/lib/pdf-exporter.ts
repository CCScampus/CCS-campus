import { Fee, Student, DailyAttendance, MonthlyAttendance } from "@/types";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Reference timings for each hour
const HOUR_REFERENCE_TIMINGS = [
  "6:40", "7:30", "9:00", "10:00", "11:00", "12:00", "2:00", "3:00", 
  "4:00", "5:00", "8:00", "9:00", "10:00", "11:30", "12:30"
];

/**
 * Download monthly attendance as PDF
 * @param monthly MonthlyAttendance[]
 * @param students Student[]
 * @param toastFn (optional) toast callback for notifications
 */
export const downloadMonthlyAttendancePDF = (
  monthly: MonthlyAttendance[],
  students: Student[],
  toastFn?: (opts: { title: string; description: string; variant?: 'default' | 'destructive' }) => void
) => {
  try {
    if (monthly.length === 0) throw new Error("No monthly attendance data to export.");
    
    // Create PDF document
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text("Monthly Attendance Report", 14, 22);
    doc.setFontSize(12);
    doc.text(`Generated on: ${format(new Date(), "dd-MM-yyyy HH:mm")}`, 14, 30);
    
    // Prepare table data - sort by student name
    const tableData = monthly.map(record => {
      const student = students.find((s) => s.id === record.studentId);
      if (!student) return [];
      
      // Calculate total attendance to show in format like "10/12" without percentage
      const totalAttended = record.totalPresent + (record.totalLate || 0);
      const totalAttendanceDisplay = `${totalAttended}/12`;
      
      return [
        student.name,
        student.rollNo,
        `${record.month}/${record.year}`,
        record.totalHours.toString(),
        record.totalPresent.toString(),
        record.totalAbsent.toString(),
        record.totalLate ? record.totalLate.toString() : "0",
        record.totalLeave ? record.totalLeave.toString() : "0",
        record.totalMedical ? record.totalMedical.toString() : "0",
        totalAttendanceDisplay
      ];
    }).filter(row => row.length > 0);
    
    // Sort the table data by student name
    tableData.sort((a, b) => {
      return a[0].localeCompare(b[0]); // Sort by student name (first column)
    });
    
    // Calculate margins to center the table
    const pageWidth = doc.internal.pageSize.width;
    const tableWidth = 150; // Approximate table width
    const leftMargin = Math.max(5, (pageWidth - tableWidth) / 2);
    
    // Create table
    autoTable(doc, {
      head: [[
        'Student Name',
        'Roll No',
        'Month/Year',
        'Total Hours',
        'Present',
        'Absent',
        'Late',
        'Leave',
        'Medical',
        'Total Attendance'
      ]],
      body: tableData,
      startY: 40,
      styles: { 
        fontSize: 8, 
        cellPadding: 2,
        halign: 'center'
      },
      headStyles: { 
        fillColor: [0, 51, 102],
        halign: 'center'
      },
      alternateRowStyles: { fillColor: [240, 245, 255] },
      margin: { left: leftMargin, right: 5 }
    });
    
    // Save PDF
    const filename = `attendance_monthly_${format(new Date(), "yyyyMMdd_HHmmss")}.pdf`;
    doc.save(filename);
    
    toastFn?.({ title: "Export Successful", description: "Monthly attendance PDF downloaded.", variant: "default" });
  } catch (err: any) {
    toastFn?.({ title: "Export Failed", description: err.message, variant: "destructive" });
  }
};

/**
 * Download detailed monthly attendance as PDF with daily records
 * @param monthlyData MonthlyAttendance
 * @param dailyData DailyAttendance[]
 * @param student Student
 * @param month number
 * @param year number
 * @param toastFn (optional) toast callback for notifications
 */
export const downloadDetailedMonthlyAttendancePDF = (
  monthlyData: MonthlyAttendance,
  dailyData: any[],
  student: Student,
  month: number,
  year: number,
  toastFn?: (opts: { title: string; description: string; variant?: 'default' | 'destructive' }) => void
) => {
  try {
    // Create PDF document in landscape orientation
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' });
    
    // Add title and header info
    doc.setFontSize(16);
    doc.text(`Attendance Report: ${student.name}`, 14, 15);
    doc.setFontSize(11);
    doc.text(`${monthName} ${year}`, 14, 22);
    doc.text(`Roll No: ${student.rollNo}`, 14, 28);
    doc.text(`Course: ${student.course}`, 14, 34);
    
    // Add monthly summary
    doc.setFontSize(12);
    doc.text("Monthly Summary", 14, 42);
    
    autoTable(doc, {
      head: [['Metric', 'Value']],
      body: [
        ['Total Present', monthlyData.totalPresent.toString()],
        ['Total Absent', monthlyData.totalAbsent.toString()],
        ['Total Late', (monthlyData.totalLate || 0).toString()],
        ['Total Leave', (monthlyData.totalLeave || 0).toString()],
        ['Total Medical', (monthlyData.totalMedical || 0).toString()],
        ['Attendance Percentage', `${monthlyData.attendancePercentage}%`]
      ],
      startY: 46,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [0, 51, 102] },
      theme: 'grid'
    });
    
    // Add daily records
    const finalY = (doc as any).lastAutoTable.finalY || 60;
    doc.setFontSize(12);
    doc.text("Daily Attendance Records", 14, finalY + 8);
    
    // Create hourly status headers
    const hourlyHeaders = [];
    for (let i = 1; i <= 15; i++) {
      hourlyHeaders.push(`H${i}\n${HOUR_REFERENCE_TIMINGS[i-1]}`); // Add timing reference
      hourlyHeaders.push(`T${i}`); // Time column
    }
    hourlyHeaders.push('Total'); // Add Total header
    
    // Prepare daily data
    const dailyTableData = dailyData.map(record => {
      const row = [
        format(new Date(record.date), "dd-MM-yyyy"),
        record.status,
        record.reason || ''
      ];
      
      // Add hourly data and count attendance
      let dailyPresentCount = 0;
      for (let i = 0; i < 15; i++) {
        if (record.hourlyDetails && record.hourlyDetails[i]) {
          row.push(record.hourlyDetails[i].status);
          row.push(record.hourlyDetails[i].time || '');
          
          // Count present and late statuses for the total
          const status = record.hourlyDetails[i].status;
          if (status === 'present' || status === 'late' || status === 'in') {
            dailyPresentCount++;
          }
        } else {
          row.push('');
          row.push('');
        }
      }
      
      // Add total attendance column
      row.push(`${dailyPresentCount}/12`);
      
      return row;
    });
    
    // Calculate margins to center the table
    const pageWidth = doc.internal.pageSize.width;
    const tableWidth = 10 + 18 + 15 + 15 + (30 * 9); // Approximate table width based on column widths
    const leftMargin = Math.max(5, (pageWidth - tableWidth) / 2);
    
    // Create daily attendance table
    autoTable(doc, {
      head: [['Date', 'Status', 'Reason', ...hourlyHeaders]],
      body: dailyTableData,
      startY: finalY + 12,
      styles: { 
        fontSize: 7, 
        cellPadding: 1,
        halign: 'center'
      },
      headStyles: { 
        fillColor: [0, 51, 102],
        fontSize: 7,
        halign: 'center',
        cellPadding: { top: 2, right: 1, bottom: 2, left: 1 } // Adjusted padding for header cells
      },
      theme: 'grid',
      columnStyles: {
        0: { cellWidth: 18 },
        1: { cellWidth: 15 },
        2: { cellWidth: 15 },
        33: { cellWidth: 15 } // Total column (3 + 15*2)
      },
      margin: { left: leftMargin, right: 5 },
      didDrawCell: (data) => {
        // Reduce width of hourly status columns
        if (data.column.index > 2 && data.column.index < 33) {
          data.cell.width = 9;
        }
      }
    });
    
    // Save PDF
    const filename = `attendance_detailed_${student.name.replace(/\s+/g, '_')}_${year}_${month}.pdf`;
    doc.save(filename);
    
    toastFn?.({ title: "Reports Generated", description: "Monthly attendance reports have been downloaded successfully.", variant: "default" });
  } catch (err: any) {
    toastFn?.({ title: "Export Failed", description: err.message, variant: "destructive" });
  }
};

/**
 * Download daily attendance as PDF with improved landscape layout
 * @param attendance DailyAttendance[]
 * @param students Student[] - This should be the filtered list of students
 * @param toastFn (optional) toast callback for notifications
 * @param teacherName (optional) name of the teacher who generated the report
 */
export const downloadDailyAttendancePDF = (
  attendance: DailyAttendance[],
  students: Student[],
  toastFn?: (opts: { title: string; description: string; variant?: 'default' | 'destructive' }) => void,
  teacherName?: string
) => {
  try {
    if (attendance.length === 0) throw new Error("No attendance data to export.");
    
    // Create PDF document in landscape orientation
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    // Get the date from the first attendance record
    const dateStr = attendance[0].date;
    const date = new Date(dateStr);
    const formattedDate = format(date, "dd-MM-yyyy");
    
    // Add title and header info
    doc.setFontSize(16);
    doc.text("Daily Attendance Report", 14, 15);
    doc.setFontSize(11);
    doc.text(`Date: ${formattedDate}`, 14, 22);
    doc.text(`Generated on: ${format(new Date(), "dd-MM-yyyy HH:mm")}`, 14, 28);
    
    // Add teacher name who generated the report (aligned to the right)
    if (teacherName) {
      const pageWidth = doc.internal.pageSize.width;
      const teacherText = `Generated by: ${teacherName}`;
      const textWidth = doc.getStringUnitWidth(teacherText) * doc.getFontSize() / doc.internal.scaleFactor;
      const textX = pageWidth - textWidth - 14; // 14 is the right margin
      doc.text(teacherText, textX, 28); // Same y-position as "Generated on" text
    }
    
    // Add filter information if not all students are included
    if (students.length < attendance.length) {
      doc.setFontSize(10);
      doc.text("Note: This report includes filtered students only", 14, 34);
    }
    
    // Group attendance by student - only for filtered students
    const attendanceMap = new Map();
    attendance.forEach((record) => {
      const student = students.find((s) => s.id === record.studentId);
      // Skip if student is not in the filtered list
      if (!student) return;
      
      const hourlyStatus = Array(15).fill({ status: "", time: "" });
      record.hourlyStatus.forEach((hourObj) => {
        if (hourObj.hour >= 1 && hourObj.hour <= 15) {
          hourlyStatus[hourObj.hour - 1] = {
            status: hourObj.status,
            time: hourObj.time ? format(new Date(hourObj.time), "HH:mm") : ""
          };
        }
      });
      
      attendanceMap.set(student.id, {
        name: student.name,
        rollNo: student.rollNo,
        course: student.course,
        hourlyStatus
      });
    });
    
    // Prepare table data - sort by name in ascending order
    const tableData = Array.from(attendanceMap.values())
      .sort((a, b) => {
        // Sort by name in ascending order
        return a.name.localeCompare(b.name);
      })
      .map(student => {
        const row = [student.rollNo, student.name, student.course];
        
        // Add status and time for each hour in the same cell
        let totalPresent = 0; // Counter for present/attended lectures
        student.hourlyStatus.forEach((hourData) => {
          let statusSymbol = '–'; // Default for not marked
          let statusColor = '#888888'; // Gray for not marked
          let cellFillColor = null;
          
          if (hourData.status) {
            if (hourData.status === 'present') {
              statusSymbol = 'P';
              statusColor = '#4CAF50'; // Green
              cellFillColor = [240, 255, 240]; // Light green
              totalPresent++; // Increment the counter for present status
            } else if (hourData.status === 'absent') {
              statusSymbol = 'A';
              statusColor = '#F44336'; // Red
              cellFillColor = [255, 240, 240]; // Light red
            } else if (hourData.status === 'late') {
              statusSymbol = 'L';
              statusColor = '#FF9800'; // Orange
              cellFillColor = [255, 248, 225]; // Light orange
              totalPresent++; // Count late as present too
            } else if (hourData.status === 'leave') {
              statusSymbol = 'Lv';
              statusColor = '#2196F3'; // Blue
              cellFillColor = [235, 245, 255]; // Light blue
            } else if (hourData.status === 'medical') {
              statusSymbol = 'M';
              statusColor = '#9C27B0'; // Purple
              cellFillColor = [245, 235, 255]; // Light purple
            } else if (hourData.status === 'in') {
              statusSymbol = 'I';
              statusColor = '#009688'; // Teal
              cellFillColor = [235, 255, 250]; // Light teal
              totalPresent++; // Count 'in' as present
            } else if (hourData.status === 'out') {
              statusSymbol = 'O';
              statusColor = '#795548'; // Brown
              cellFillColor = [245, 240, 235]; // Light brown
            }
          }
          
          const timeStr = hourData.time || '';
          
          // Create cell content with status symbol and time
          const cellContent = {
            content: `${statusSymbol}\n${timeStr}`,
            styles: {
              halign: 'center',
              valign: 'middle',
              textColor: statusColor,
              fontStyle: 'bold',
              fontSize: 8,
              cellPadding: 1,
              fillColor: cellFillColor
            }
          };
          
          row.push(cellContent);
        });
        
        // Add the total attendance column
        const totalCell = {
          content: `${totalPresent}/12`,
          styles: {
            halign: 'center',
            valign: 'middle',
            textColor: totalPresent >= 8 ? '#4CAF50' : '#F44336', // Green if >= 8, otherwise red
            fontStyle: 'bold',
            fontSize: 9,
            cellPadding: 1,
            fillColor: totalPresent >= 8 ? [240, 255, 240] : [255, 240, 240] // Light green or light red
          }
        };
        row.push(totalCell);
        
        return row;
      });

    // Create headers for the table
    const headers = ['Roll No', 'Name', 'Course'];
    for (let i = 1; i <= 15; i++) {
      headers.push(`H${i}\n${HOUR_REFERENCE_TIMINGS[i-1]}`);
    }
    headers.push('Total'); // Add Total header

    // Calculate column widths
    const columnStyles = {
      0: { cellWidth: 20 }, // Roll No
      1: { cellWidth: 35 }, // Name
      2: { cellWidth: 25 }, // Course
    };
    
    // Set width for hour columns - reduced width for 15 columns
    for (let i = 3; i <= 17; i++) {
      columnStyles[i] = { cellWidth: 10 };
    }

    // Add the total column style
    columnStyles[18] = { cellWidth: 15 }; // Total column

    // Calculate margins to center the table
    const pageWidth = doc.internal.pageSize.width;
    const tableWidth = 10 + (20 + 35 + 25 + (15 * 10) + 15); // Approximate table width based on column widths including total
    const leftMargin = Math.max(5, (pageWidth - tableWidth) / 2);

    // Add the table with improved styling
    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: students.length < attendance.length ? 38 : 34,
      styles: {
        fontSize: 8,
        cellPadding: 1,
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
        overflow: 'linebreak',
        halign: 'center'
      },
      headStyles: {
        fillColor: [0, 51, 102],
        textColor: [255, 255, 255],
        fontSize: 7, // Slightly reduced font size to accommodate timings
        halign: 'center',
        fontStyle: 'bold',
        cellPadding: { top: 2, right: 1, bottom: 2, left: 1 } // Adjusted padding for header cells
      },
      columnStyles: columnStyles,
      alternateRowStyles: {
        fillColor: [248, 250, 255]
      },
      theme: 'grid',
      tableWidth: 'auto',
      margin: { left: leftMargin, right: 5 },
      didDrawPage: (data) => {
        // Add page number at the bottom
        doc.setFontSize(8);
        doc.text(
          `Page ${doc.getCurrentPageInfo().pageNumber} of ${doc.getNumberOfPages()}`,
          data.settings.margin.left,
          doc.internal.pageSize.height - 10
        );
      }
    });
    
    // Add summary at the bottom
    const finalY = (doc as any).lastAutoTable.finalY + 5;
    
    // Calculate statistics for filtered students
    const totalStudents = students.length;
    const presentStudents = tableData.filter(row => 
      row.slice(3).some(cell => 
        typeof cell === 'object' && cell.content && cell.content.startsWith('P')
      )
    ).length;
    const absentStudents = totalStudents - presentStudents;
    
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text([
      `Total Students: ${totalStudents}`,
      `Present: ${presentStudents}`,
      `Absent: ${absentStudents}`,
      `Attendance Rate: ${Math.round((presentStudents / totalStudents) * 100)}%`
    ].join("  |  "), 14, finalY);
    
    // Add legend
    if (finalY < doc.internal.pageSize.height - 20) {
      doc.setFontSize(9);
      doc.text("Legend:", 14, finalY + 10);
      doc.setFontSize(8);
      
      doc.setTextColor('#4CAF50');
      doc.text("P = Present", 14, finalY + 15);
      
      doc.setTextColor('#F44336');
      doc.text("A = Absent", 45, finalY + 15);
      
      doc.setTextColor('#FF9800');
      doc.text("L = Late", 76, finalY + 15);
      
      doc.setTextColor('#2196F3');
      doc.text("Lv = Leave", 107, finalY + 15);
      
      doc.setTextColor('#9C27B0');
      doc.text("M = Medical", 138, finalY + 15);
      
      doc.setTextColor('#009688');
      doc.text("I = In", 169, finalY + 15);
      
      doc.setTextColor('#795548');
      doc.text("O = Out", 190, finalY + 15);
      
      doc.setTextColor('#888888');
      doc.text("– = Not Marked", 220, finalY + 15);
    }
    
    // Save PDF
    const filename = `daily_attendance_${format(date, "yyyy-MM-dd")}.pdf`;
    doc.save(filename);
    
    toastFn?.({ title: "Report Generated", description: "Daily attendance report has been downloaded successfully.", variant: "default" });
  } catch (err: any) {
    console.error("Error generating PDF:", err);
    toastFn?.({ title: "Export Failed", description: err.message, variant: "destructive" });
  }
};

/**
 * Download monthly attendance as PDF with improved landscape layout
 * @param monthlyData MonthlyAttendance
 * @param dailyData DailyAttendance[] or processed daily data
 * @param student Student
 * @param month number
 * @param year number
 * @param toastFn (optional) toast callback for notifications
 */
export const downloadImprovedMonthlyAttendancePDF = (
  monthlyData: MonthlyAttendance,
  dailyData: any[],
  student: Student,
  month: number,
  year: number,
  toastFn?: (opts: { title: string; description: string; variant?: 'default' | 'destructive' }) => void
) => {
  try {
    console.log("Starting PDF generation with data:", {
      studentName: student.name,
      month,
      year,
      dailyDataCount: dailyData.length
    });
    
    console.log("Sample of daily data:", dailyData.slice(0, 2));
    
    // Create PDF document in landscape orientation
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' });
    
    // Add title and header info
    doc.setFontSize(16);
    doc.text(`Monthly Attendance Report: ${student.name}`, 14, 15);
    doc.setFontSize(11);
    doc.text(`${monthName} ${year}`, 14, 22);
    doc.text(`Roll No: ${student.rollNo}`, 14, 28);
    doc.text(`Course: ${student.course}`, 14, 34);
    
    // Add monthly summary
    doc.setFontSize(12);
    doc.text("Monthly Summary:", 150, 22);
    doc.setFontSize(10);
    doc.text(`Present: ${monthlyData.totalPresent} | Absent: ${monthlyData.totalAbsent} | Attendance: ${monthlyData.attendancePercentage}%`, 150, 28);
    doc.text(`Late: ${monthlyData.totalLate || 0} | Leave: ${monthlyData.totalLeave || 0} | Medical: ${monthlyData.totalMedical || 0}`, 150, 34);
    
    // Sort daily data by date
    const sortedDailyData = [...dailyData].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    // Collect leave reasons as we process the data
    const leaveReasons: { date: string; hour: number; reason: string }[] = [];
    
    // Process data for the table - each row is a date
    const tableData = sortedDailyData.map(record => {
      // First column is the date
      const row = [format(new Date(record.date), "dd-MM-yyyy")];
      
      // Debug the hourly details structure
      console.log("Processing record for date:", format(new Date(record.date), "dd-MM-yyyy"));
      console.log("Hourly details:", record.hourlyDetails);
      
      // Add hourly data - we'll show 15 hours
      let dailyPresentCount = 0; // Counter for daily present/attended lectures
      for (let i = 0; i < 15; i++) {
        const hourData = record.hourlyDetails?.[i];
        let statusSymbol = '–'; // Default for not marked
        let statusColor = '#888888'; // Gray for not marked
        let cellFillColor = null;
        
        // Debug hourly data
        if (hourData) {
          console.log(`Hour ${i + 1} data:`, hourData);
        }
        
        if (hourData && hourData.status) {
          if (hourData.status === 'present') {
            statusSymbol = 'P';
            statusColor = '#4CAF50'; // Green
            cellFillColor = [240, 255, 240]; // Light green
            dailyPresentCount++; // Increment counter for present
          } else if (hourData.status === 'absent') {
            statusSymbol = 'A';
            statusColor = '#F44336'; // Red
            cellFillColor = [255, 240, 240]; // Light red
          } else if (hourData.status === 'late') {
            statusSymbol = 'L';
            statusColor = '#FF9800'; // Orange
            cellFillColor = [255, 248, 225]; // Light orange
            dailyPresentCount++; // Count late as present
          } else if (hourData.status === 'leave') {
            statusSymbol = 'Lv';
            statusColor = '#2196F3'; // Blue
            cellFillColor = [235, 245, 255]; // Light blue
            
            // Debug leave data
            console.log(`Found leave at hour ${i + 1}:`, {
              status: hourData.status,
              reason: hourData.reason,
              date: format(new Date(record.date), "dd-MM-yyyy")
            });
            
            // Add leave reason to the collection if it exists
            if (hourData.reason && hourData.reason.trim()) {
              leaveReasons.push({
                date: format(new Date(record.date), "dd-MM-yyyy"),
                hour: i + 1,
                reason: hourData.reason.trim()
              });
            }
          } else if (hourData.status === 'medical') {
            statusSymbol = 'M';
            statusColor = '#9C27B0'; // Purple
            cellFillColor = [245, 235, 255]; // Light purple
          } else if (hourData.status === 'in') {
            statusSymbol = 'I';
            statusColor = '#009688'; // Teal
            cellFillColor = [235, 255, 250]; // Light teal
            dailyPresentCount++; // Count 'in' as present
          } else if (hourData.status === 'out') {
            statusSymbol = 'O';
            statusColor = '#795548'; // Brown
            cellFillColor = [245, 240, 235]; // Light brown
          }
        }
        
        // Format the time if available
        let timeStr = '';
        if (hourData && hourData.time) {
          try {
            const timeDate = new Date(hourData.time);
            timeStr = format(timeDate, "HH:mm");
          } catch (e) {
            // If date parsing fails, use the raw string
            timeStr = hourData.time.toString().substring(11, 16);
          }
        }
        
        // Create cell content with only status symbol and time
        const cellContent = {
          content: `${statusSymbol}\n${timeStr}`,
          styles: {
            halign: 'center',
            valign: 'middle',
            textColor: statusColor,
            fontStyle: 'bold',
            fontSize: 8,
            cellPadding: 1,
            fillColor: cellFillColor
          }
        };
        
        row.push(cellContent);
      }
      
      // Add the daily total attendance cell
      const totalCell = {
        content: `${dailyPresentCount}/12`,
        styles: {
          halign: 'center',
          valign: 'middle',
          textColor: dailyPresentCount >= 8 ? '#4CAF50' : '#F44336', // Green if >= 8, otherwise red
          fontStyle: 'bold',
          fontSize: 9,
          cellPadding: 1,
          fillColor: dailyPresentCount >= 8 ? [240, 255, 240] : [255, 240, 240] // Light green or light red
        }
      };
      row.push(totalCell);
      
      return row;
    });
    
    // Create column headers
    const headers = ['Date'];
    for (let i = 1; i <= 15; i++) {
      headers.push(`H${i}`);
    }
    headers.push('Total'); // Add Total header
    
    // Calculate column widths - date column wider, hour columns even
    const columnStyles = {
      0: { cellWidth: 20 } // Date column
    };
    
    // Set width for hour columns - smaller width to fit 15 columns
    for (let i = 1; i <= 15; i++) {
      columnStyles[i] = { cellWidth: 12 };
    }
    
    // Add total column style
    columnStyles[16] = { cellWidth: 15 }; // Total column
    
    // Calculate margins to center the table
    const pageWidth = doc.internal.pageSize.width;
    const tableWidth = 10 + 20 + (15 * 12) + 15; // Approximate table width based on column widths including total
    const leftMargin = Math.max(5, (pageWidth - tableWidth) / 2);
    
    // Create table with improved styling
    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: 42,
      styles: {
        fontSize: 8,
        cellPadding: 1,
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
        overflow: 'linebreak',
        halign: 'center'
      },
      headStyles: {
        fillColor: [0, 51, 102],
        textColor: [255, 255, 255],
        fontSize: 8,
        halign: 'center',
        fontStyle: 'bold'
      },
      columnStyles: columnStyles,
      alternateRowStyles: {
        fillColor: [248, 250, 255]
      },
      theme: 'grid',
      tableWidth: 'auto',
      margin: { left: leftMargin, right: 5 },
      didDrawPage: (data) => {
        // Add page number at the bottom
        doc.setFontSize(8);
        doc.text(
          `Page ${doc.getCurrentPageInfo().pageNumber} of ${doc.getNumberOfPages()}`,
          data.settings.margin.left,
          doc.internal.pageSize.height - 10
        );
      }
    });
    
    // Get the Y position after the main table
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    console.log("Collected leave reasons:", leaveReasons);
    
    // Add leave reasons section if there are any leave reasons
    if (leaveReasons.length > 0) {
      console.log(`Adding ${leaveReasons.length} leave reasons to the PDF`);
      
      // Add a new page for leave reasons
      doc.addPage();
      
      // Add section title
      doc.setFontSize(16);
      doc.setTextColor(0, 51, 102);
      doc.text("Leave Reasons Report", 14, 20);
      
      // Add student info
      doc.setFontSize(11);
      doc.text(`Student: ${student.name}`, 14, 30);
      doc.text(`Roll No: ${student.rollNo}`, 14, 37);
      doc.text(`Month: ${monthName} ${year}`, 14, 44);
      
      // Create leave reasons table
      const leaveTableData = leaveReasons.map(item => [
        item.date,
        `Hour ${item.hour}`,
        item.reason
      ]);
      
      // Add the leave reasons table
      autoTable(doc, {
        head: [['Date', 'Hour', 'Reason']],
        body: leaveTableData,
        startY: 55,
        styles: {
          fontSize: 10,
          cellPadding: 4,
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
          headStyles: {
            fillColor: [12, 23, 51], // blue-950
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'left'
          }
        },
        columnStyles: {
          0: { cellWidth: 40 }, // Date
          1: { cellWidth: 30 }, // Hour
          2: { cellWidth: 110 }  // Reason - wider column
        },
        theme: 'grid',
        margin: { left: 14, right: 14 }
      });
    } else {
      console.log("No leave reasons found to display");
    }
    
    // Add legend at the bottom of the last page
    const legendY = (doc as any).lastAutoTable.finalY + 5;
    
    if (legendY < doc.internal.pageSize.height - 20) {
      doc.setFontSize(9);
      doc.setTextColor(0);
      doc.text("Legend:", 14, legendY);
      doc.setFontSize(8);
      
      doc.setTextColor('#4CAF50');
      doc.text("P = Present", 14, legendY + 5);
      
      doc.setTextColor('#F44336');
      doc.text("A = Absent", 45, legendY + 5);
      
      doc.setTextColor('#FF9800');
      doc.text("L = Late", 76, legendY + 5);
      
      doc.setTextColor('#2196F3');
      doc.text("Lv = Leave", 107, legendY + 5);
      
      doc.setTextColor('#9C27B0');
      doc.text("M = Medical", 138, legendY + 5);
      
      doc.setTextColor('#009688');
      doc.text("I = In", 169, legendY + 5);
      
      doc.setTextColor('#795548');
      doc.text("O = Out", 190, legendY + 5);
      
      doc.setTextColor('#888888');
      doc.text("– = Not Marked", 220, legendY + 5);
    }
    
    // Save PDF
    const filename = `attendance_${student.name.replace(/\s+/g, '_')}_${year}_${monthName}.pdf`;
    doc.save(filename);
    
    toastFn?.({ 
      title: "Report Generated", 
      description: "Monthly attendance report has been downloaded successfully.", 
      variant: "default" 
    });
  } catch (err: any) {
    console.error("Error generating PDF:", err);
    toastFn?.({ 
      title: "Export Failed", 
      description: err.message || "Failed to generate PDF report", 
      variant: "destructive" 
    });
  }
};

/**
 * Generate a standalone leave reasons report PDF
 * @param student Student
 * @param month number
 * @param year number
 * @param dailyData Array of daily attendance data
 * @param toastFn Optional toast callback
 */
export const downloadLeaveReasonsReportPDF = (
  student: Student,
  month: number,
  year: number,
  dailyData: any[],
  toastFn?: (opts: { title: string; description: string; variant?: 'default' | 'destructive' }) => void
) => {
  try {
    console.log("Generating leave reasons report with data:", {
      studentName: student.name,
      month,
      year,
      dailyDataCount: dailyData.length
    });
    
    // Create PDF document in portrait orientation
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' });
    
    // Add title and header info
    doc.setFontSize(18);
    doc.text(`Leave Reasons Report`, 14, 20);
    doc.setFontSize(14);
    doc.text(`${student.name} - ${monthName} ${year}`, 14, 30);
    doc.setFontSize(11);
    doc.text(`Roll No: ${student.rollNo}`, 14, 40);
    doc.text(`Course: ${student.course}`, 14, 47);
    doc.text(`Generated on: ${format(new Date(), "dd-MM-yyyy HH:mm")}`, 14, 54);
    
    // Sort daily data by date
    const sortedDailyData = [...dailyData].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    // Collect all leave reasons
    const leaveReasons: { date: string; hour: number; reason: string }[] = [];
    
    sortedDailyData.forEach(record => {
      const date = format(new Date(record.date), "dd-MM-yyyy");
      
      if (record.hourlyDetails) {
        record.hourlyDetails.forEach((hourData: any, index: number) => {
          if (hourData && hourData.status === 'leave' && hourData.reason) {
            console.log(`Found leave reason for ${date} hour ${index+1}: "${hourData.reason}"`);
            leaveReasons.push({
              date,
              hour: index + 1,
              reason: hourData.reason
            });
          }
        });
      }
    });
    
    console.log(`Collected ${leaveReasons.length} leave reasons for PDF report`);
    
    if (leaveReasons.length === 0) {
      // No leave reasons found, add a message
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text("No leave reasons found for this period.", 14, 70);
    } else {
      // Create leave reasons table
      const leaveTableData = leaveReasons.map(item => [
        item.date,
        `Hour ${item.hour}`,
        item.reason
      ]);
      
      autoTable(doc, {
        head: [['Date', 'Hour', 'Reason']],
        body: leaveTableData,
        startY: 65,
        styles: {
          fontSize: 10,
          cellPadding: 4,
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
          overflow: 'linebreak'
        },
        headStyles: {
          fillColor: [12, 23, 51], // blue-950
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center'
        },
        columnStyles: {
          0: { cellWidth: 30 }, // Date
          1: { cellWidth: 20 }, // Hour
          2: { cellWidth: 'auto' }  // Reason - auto width
        },
        alternateRowStyles: {
          fillColor: [235, 245, 255] // Light blue background
        },
        theme: 'grid',
        margin: { left: 14, right: 14 },
        didDrawPage: (data) => {
          // Add page number at the bottom
          doc.setFontSize(8);
          doc.text(
            `Page ${doc.getCurrentPageInfo().pageNumber} of ${doc.getNumberOfPages()}`,
            data.settings.margin.left,
            doc.internal.pageSize.height - 10
          );
        }
      });
    }
    
    // Save PDF
    const filename = `leave_reasons_${student.name.replace(/\s+/g, '_')}_${year}_${monthName}.pdf`;
    doc.save(filename);
    
    toastFn?.({ 
      title: "Leave Reasons Report Generated", 
      description: "Leave reasons report has been downloaded successfully.", 
      variant: "default" 
    });
    
    return true;
  } catch (err: any) {
    console.error("Error generating leave reasons PDF:", err);
    toastFn?.({ 
      title: "Export Failed", 
      description: err.message || "Failed to generate leave reasons report", 
      variant: "destructive" 
    });
    return false;
  }
}; 