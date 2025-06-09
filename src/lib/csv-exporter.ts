import { Fee, Student, DailyAttendance, MonthlyAttendance } from "@/types";
import { format } from "date-fns";
import Papa from "papaparse";
import { calculateGSTComponents } from "./utils";

/**
 * Generates and downloads a CSV receipt file
 */
export const downloadFeeReceiptCSV = (fee: Fee & { student: Student }) => {
  if (!fee) return;

  const paymentDetails = fee.payments
    .map(
      (payment) =>
        `${format(new Date(payment.date), "MM/dd/yyyy")},${payment.amount},${
          payment.method
        },${payment.reference || "N/A"}`
    )
    .join("\n");

  // Calculate GST components
  const { baseAmount, gstAmount, gstPercentage, totalWithGST } = calculateGSTComponents(fee.totalAmount);

  const csvContent = [
    "Fee Receipt",
    `Student Name,${fee.student.name}`,
    `Father's Name,${fee.student.fatherName && fee.student.fatherName.trim() !== "" ? fee.student.fatherName : "-"}`,
    `Roll Number,${fee.student.rollNo}`,
    `Course,${fee.student.course}`,
    `Batch,${fee.student.batch}`,
    `Course Fee,₹${baseAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    `GST (${gstPercentage}%),₹${gstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    `Total Amount (with GST),₹${totalWithGST.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    `Paid Amount,₹${fee.paidAmount.toLocaleString()}`,
    `Due Amount,₹${fee.dueAmount.toLocaleString()}`,
    `Due Date,${format(new Date(fee.dueDate), "MM/dd/yyyy")}`,
    `Status,${fee.status.replace("_", " ")}`,
    "",
    "Payment History",
    "Date,Amount,Method,Reference",
    paymentDetails,
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fee_receipt_${fee.student.rollNo}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Download daily attendance as CSV
 * @param attendance DailyAttendance[]
 * @param students Student[]
 * @param toastFn (optional) toast callback for notifications
 */
export const downloadDailyAttendanceCSV = (
  attendance: DailyAttendance[],
  students: Student[],
  toastFn?: (opts: { title: string; description: string; variant?: 'default' | 'destructive' }) => void
) => {
  try {
    const rows: any[] = [];
    // Group attendance by student and date
    const attendanceMap = new Map();
    attendance.forEach((record) => {
      const student = students.find((s) => s.id === record.studentId);
      if (!student) return;
      const key = `${student.id}_${record.date}`;
      if (!attendanceMap.has(key)) {
        attendanceMap.set(key, {
          name: student.name,
          rollNo: student.rollNo,
          date: format(new Date(record.date), "dd-MM-yyyy"),
          hours: Array(12).fill({ status: "", time: "" })
        });
      }
      record.hourlyStatus.forEach((hourObj) => {
        if (hourObj.hour >= 1 && hourObj.hour <= 12) {
          attendanceMap.get(key).hours[hourObj.hour - 1] = {
            status: hourObj.status,
            time: hourObj.time ? format(new Date(hourObj.time), "dd-MM-yyyy HH:mm:ss") : ""
          };
        }
      });
    });
    // Prepare rows for CSV
    attendanceMap.forEach((value) => {
      const row: any = {
        "Name": value.name,
        "Roll No": value.rollNo,
        "Date": value.date,
      };
      for (let i = 1; i <= 12; i++) {
        row[`Hour ${i}`] = value.hours[i - 1].status;
        row[`Hour ${i} Time`] = value.hours[i - 1].time;
      }
      rows.push(row);
    });
    if (rows.length === 0) throw new Error("No attendance data to export.");
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_daily_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toastFn?.({ title: "Export Successful", description: "Daily attendance CSV downloaded.", variant: "default" });
  } catch (err: any) {
    toastFn?.({ title: "Export Failed", description: err.message, variant: "destructive" });
  }
};

/**
 * Download monthly attendance as CSV
 * @param monthly MonthlyAttendance[]
 * @param students Student[]
 * @param toastFn (optional) toast callback for notifications
 */
export const downloadMonthlyAttendanceCSV = (
  monthly: MonthlyAttendance[],
  students: Student[],
  toastFn?: (opts: { title: string; description: string; variant?: 'default' | 'destructive' }) => void
) => {
  try {
    const rows: any[] = [];
    monthly.forEach((record) => {
      const student = students.find((s) => s.id === record.studentId);
      if (!student) return;
      rows.push({
        "Student Name": student.name,
        "Roll No": student.rollNo,
        "Month": record.month,
        "Year": record.year,
        "Total Hours": record.totalHours,
        "Total Present": record.totalPresent,
        "Total Absent": record.totalAbsent,
        "Total Late": record.totalLate,
        "Total Leave": record.totalLeave,
        "Total Medical": record.totalMedical,
        "Attendance Percentage": record.attendancePercentage,
      });
    });
    if (rows.length === 0) throw new Error("No monthly attendance data to export.");
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_monthly_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toastFn?.({ title: "Export Successful", description: "Monthly attendance CSV downloaded.", variant: "default" });
  } catch (err: any) {
    toastFn?.({ title: "Export Failed", description: err.message, variant: "destructive" });
  }
};
