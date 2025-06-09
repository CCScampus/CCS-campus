import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format, isAfter, addMonths } from "date-fns";
import type { Fee, Payment, Student } from "@/types";
import { calculateGSTComponents } from "./utils";

/**
 * Check if late fee is applicable
 */
function isLateFeeApplicable(payment: Payment, fee: Fee) {
  if (!fee.graceMonth || !fee.graceFeeAmount) return false;
  
  const dueDate = new Date(fee.dueDate);
  const paymentDate = new Date(payment.date);
  const graceEndDate = addMonths(dueDate, Number(fee.graceMonth));
  
  return isAfter(paymentDate, graceEndDate);
}

/**
 * Generates an individual receipt PDF for a specific payment
 */
function generateReceiptPDF(
  payment: Payment,
  fee: Fee & { student: Student },
  onSuccess: (message: string) => void
) {
  const doc = new jsPDF();
  let yPos = 20;

  // Add logo (left side) - make it smaller (25x25 instead of 30x30)
  const logoPath = new URL("/logo.jpg", window.location.origin).href;
  doc.addImage(logoPath, "JPEG", 20, yPos - 10, 24, 20);

  // Add CCS Campus header text (centered, extra bold)
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  // Make it appear bolder by drawing it multiple times with slight offsets
  doc.text("CCS CAMPUS", 105, yPos, { align: "center" });
  doc.text("CCS CAMPUS", 105.5, yPos, { align: "center" });
  
  // Add tagline below
  doc.setFontSize(10);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(70, 70, 70);
  doc.text("COACHING FOR CAREER SUCCESS", 105, yPos + 8, { align: "center" });
  
  // Add contact details on the right - moved further right (190 instead of 180)
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("TEL: 8800500922, 8800500222", 190, yPos, { align: "right" });

  // Move yPos below header
  yPos += 25;

  // Add "Fees Receipt" heading
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Fees Receipt", 105, yPos, { align: "center" });

  // Move yPos below heading
  yPos += 15;

  // Receipt details (right column)
  let rightY = yPos;
  const rightColumnX = 120;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  
  // Receipt number and date
  doc.text("Receipt #:", rightColumnX, rightY);
  doc.text(payment.id.substring(0, 8).toUpperCase(), rightColumnX + 35, rightY);
  rightY += 6;
  
  doc.text("Date:", rightColumnX, rightY);
  doc.text(format(new Date(payment.date), "dd/MM/yyyy"), rightColumnX + 35, rightY);
  rightY += 6;
  
  doc.text("Due Date:", rightColumnX, rightY);
  doc.text(format(new Date(fee.dueDate), "dd/MM/yyyy"), rightColumnX + 35, rightY);

  // Student details (left column)
  doc.setFontSize(9);
  let leftY = yPos;
  const leftColumnX = 20;
  
  // Student Name
  doc.setFont("helvetica", "bold");
  doc.text("Student Name:", leftColumnX, leftY);
  doc.setFont("helvetica", "normal");
  doc.text(fee.student.name, leftColumnX + 35, leftY);
  leftY += 6;

  // Father's Name (assuming it's available in the student object)
  doc.setFont("helvetica", "bold");
  doc.text("Father's Name:", leftColumnX, leftY);
  doc.setFont("helvetica", "normal");
  doc.text(fee.student.fatherName && fee.student.fatherName.trim() !== "" ? fee.student.fatherName : "-", leftColumnX + 35, leftY);
  leftY += 6;

  // Roll Number
  doc.setFont("helvetica", "bold");
  doc.text("Roll No:", leftColumnX, leftY);
  doc.setFont("helvetica", "normal");
  doc.text(fee.student.rollNo, leftColumnX + 35, leftY);
  leftY += 6;

  // Mobile Number
  doc.setFont("helvetica", "bold");
  doc.text("Mobile No:", leftColumnX, leftY);
  doc.setFont("helvetica", "normal");
  doc.text(fee.student.phone || "-", leftColumnX + 35, leftY);
  leftY += 6;

  // Course and Batch
  doc.setFont("helvetica", "bold");
  doc.text("Course:", leftColumnX, leftY);
  doc.setFont("helvetica", "normal");
  doc.text(fee.student.course, leftColumnX + 35, leftY);
  leftY += 6;

  doc.setFont("helvetica", "bold");
  doc.text("Batch:", leftColumnX, leftY);
  doc.setFont("helvetica", "normal");
  doc.text(fee.student.batch, leftColumnX + 35, leftY);

  // If payment method is online and reference exists, show it
  const onlineMethods = ["net_banking", "upi", "credit_card", "debit_card", "online", "bank_transfer", "check"];
  if (onlineMethods.includes(payment.method) && payment.reference) {
    rightY += 6;
    doc.setFont("helvetica", "bold");
    doc.text("Transaction ID:", rightColumnX, rightY);
    doc.setFont("helvetica", "normal");
    doc.text(payment.reference, rightColumnX + 35, rightY);
  }

  // Move yPos below both columns
  yPos = Math.max(leftY, rightY) + 10;

  // Add horizontal line
  doc.setDrawColor(200, 200, 200);
  doc.line(20, yPos, 190, yPos);
  yPos += 10;

  // Calculate GST components
  const { baseAmount, gstAmount, gstPercentage, totalWithGST } = calculateGSTComponents(fee.totalAmount);

  // Check if late fee is applicable for this payment
  const isLateFee = isLateFeeApplicable(payment, fee);
  
  // Fee Details Table (simple black/white, no shading)
  const tableData = [];
  
  // Add course fee (base amount)
  tableData.push(["Course Fee", `Rs. ${baseAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]);
  
  // Add GST amount
  tableData.push([`GST (${gstPercentage}%)`, `Rs. ${gstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]);
  
  // Add total amount (with GST)
  tableData.push(["Total Amount (with GST)", `Rs. ${totalWithGST.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]);
  
  // Add late fee if applicable
  if (isLateFee && fee.graceFeeAmount) {
    tableData.push(["Late Fee", `Rs. ${fee.graceFeeAmount.toLocaleString("en-IN")}`]);
    tableData.push(["Total Amount with Late Fee", `Rs. ${(totalWithGST + fee.graceFeeAmount).toLocaleString("en-IN")}`]);
  }
  
  tableData.push(["Payment Method", payment.method.replace("_", " ")]);
  tableData.push(["Amount Paid", `Rs. ${payment.amount.toLocaleString("en-IN")}`]);
  tableData.push(["Current Balance Due", `Rs. ${payment.remainingDueAmount !== undefined ? payment.remainingDueAmount.toLocaleString("en-IN") : fee.dueAmount.toLocaleString("en-IN")}`]);

  // Adjust table styling for better appearance
  autoTable(doc, {
    startY: yPos,
    head: [["Description", "Amount/Details"]],
    body: tableData,
    theme: 'plain',
    styles: {
      fontSize: 9,
      cellPadding: 4,
      valign: 'middle',
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'left',
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
    },
    columnStyles: {
      0: { cellWidth: 80, fontStyle: 'normal', halign: 'left' },
      1: { cellWidth: 70, halign: 'right' },
    },
    margin: { left: 20, right: 20 },
  });

  // Add Terms & Conditions
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Terms & Conditions", 20, finalY);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("This receipt must be produced when demanded. Fees once paid are NOT REFUNDABLE.", 20, finalY + 8);

  // Save the PDF
  doc.save(`fee_receipt_${fee.student.rollNo}_${format(new Date(payment.date), "ddMMyyyy")}.pdf`);
  onSuccess("Payment receipt has been downloaded as PDF.");
}

/**
 * Generates a PDF with fee details and payment summary
 */
function generateFeeDetailsPDF(
  fee: Fee & { student: Student },
  onSuccess: (message: string) => void
) {
  const doc = new jsPDF();
  let yPos = 20;

  // Add logo (left side)
  const logoPath = new URL("/logo.jpg", window.location.origin).href;
  doc.addImage(logoPath, "JPEG", 20, yPos - 10, 30, 30);

  // Add CCS Campus header text (centered, extra bold)
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  // Make it appear bolder by drawing it multiple times with slight offsets
  doc.text("CCS CAMPUS", 105, yPos, { align: "center" });
  doc.text("CCS CAMPUS", 105.5, yPos, { align: "center" });
  
  // Add tagline below
  doc.setFontSize(12);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(70, 70, 70);
  doc.text("COACHING FOR CAREER SUCCESS", 105, yPos + 10, { align: "center" });
  
  // Add contact details on the right
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("TEL: 8800500922, 8800500222", 180, yPos, { align: "right" });

  // Move yPos below header
  yPos += 30;
  
  // Add "Fee Details" heading
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Fee Details", 105, yPos, { align: "center" });
  
  // Move yPos below heading
  yPos += 20;

  // Student Info header bar
  doc.setFillColor(18, 11, 77);
  doc.rect(20, yPos, 170, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text("Student Info", 25, yPos + 5.5);
  yPos += 12;

  // Student info in form style
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);

  const leftCol = 25;
  const rightCol = 70;
  const lineGap = 8;

  // Student details
  doc.text("Name:", leftCol, yPos);
  doc.text(fee.student.name, rightCol, yPos);
  doc.line(rightCol, yPos + 1, 190, yPos + 1);
  yPos += lineGap;

  doc.text("Father's Name:", leftCol, yPos);
  doc.text(fee.student.fatherName && fee.student.fatherName.trim() !== "" ? fee.student.fatherName : "-", rightCol, yPos);
  doc.line(rightCol, yPos + 1, 190, yPos + 1);
  yPos += lineGap;

  doc.text("Roll Number:", leftCol, yPos);
  doc.text(fee.student.rollNo, rightCol, yPos);
  doc.line(rightCol, yPos + 1, 190, yPos + 1);
  yPos += lineGap;

  doc.text("Course:", leftCol, yPos);
  doc.text(fee.student.course, rightCol, yPos);
  doc.line(rightCol, yPos + 1, 190, yPos + 1);
  yPos += lineGap;

  doc.text("Batch:", leftCol, yPos);
  doc.text(fee.student.batch, rightCol, yPos);
  doc.line(rightCol, yPos + 1, 190, yPos + 1);
  yPos += lineGap * 1.5;

  // Fee Info header bar
  doc.setFillColor(18, 11, 77);
  doc.rect(20, yPos, 170, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.text("Fee Details", 25, yPos + 5.5);
  yPos += 12;

  // Fee details
  doc.setTextColor(0, 0, 0);

  // Calculate GST components
  const { baseAmount, gstAmount, gstPercentage, totalWithGST } = calculateGSTComponents(fee.totalAmount);

  // Add base amount
  doc.text("Course Fee:", leftCol, yPos);
  doc.text(`Rs. ${baseAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, rightCol, yPos);
  doc.line(rightCol, yPos + 1, 190, yPos + 1);
  yPos += lineGap;

  // Add GST amount
  doc.text(`GST (${gstPercentage}%):`, leftCol, yPos);
  doc.text(`Rs. ${gstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, rightCol, yPos);
  doc.line(rightCol, yPos + 1, 190, yPos + 1);
  yPos += lineGap;

  // Add total fee amount
  doc.text("Total Amount (with GST):", leftCol, yPos);
  doc.text(`Rs. ${totalWithGST.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, rightCol, yPos);
  doc.line(rightCol, yPos + 1, 190, yPos + 1);
  yPos += lineGap;
  
  // Add late fee if applicable
  let totalWithLateFee = totalWithGST;
  if (fee.isLateFeeApplied && fee.graceFeeAmount) {
    doc.text("Late Fee:", leftCol, yPos);
    doc.text(`Rs. ${fee.graceFeeAmount.toLocaleString("en-IN")}`, rightCol, yPos);
    doc.line(rightCol, yPos + 1, 190, yPos + 1);
    yPos += lineGap;
    
    totalWithLateFee = totalWithGST + fee.graceFeeAmount;
    doc.text("Total with Late Fee:", leftCol, yPos);
    doc.text(`Rs. ${totalWithLateFee.toLocaleString("en-IN")}`, rightCol, yPos);
    doc.line(rightCol, yPos + 1, 190, yPos + 1);
    yPos += lineGap;
  }

  // Show total amount paid and balance
  doc.text("Total Amount Paid:", leftCol, yPos);
  doc.text(`Rs. ${fee.paidAmount.toLocaleString("en-IN")}`, rightCol, yPos);
  doc.line(rightCol, yPos + 1, 190, yPos + 1);
  yPos += lineGap;

  doc.text("Balance Due:", leftCol, yPos);
  doc.text(`Rs. ${fee.dueAmount.toLocaleString("en-IN")}`, rightCol, yPos);
  doc.line(rightCol, yPos + 1, 190, yPos + 1);
  yPos += lineGap;

  doc.text("Status:", leftCol, yPos);
  doc.text(fee.status.replace("_", " "), rightCol, yPos);
  doc.line(rightCol, yPos + 1, 190, yPos + 1);
  yPos += lineGap * 1.5;

  // Payment Summary table
  doc.setFillColor(18, 11, 77);
  doc.rect(20, yPos, 170, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.text("Payment Summary", 25, yPos + 5.5);
  yPos += 12;

  if (fee.payments && fee.payments.length > 0) {
    const tableColumn = [
      "Payment Date",
      "Amount",
      "Payment Method",
      "Type",
      "Status"
    ];
    
    // Sort payments by date and time, most recent first
    const sortedPayments = [...fee.payments].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    const tableRows = sortedPayments.map((payment) => {
      const isLate = isLateFeeApplicable(payment, fee);
      const paymentType = payment.type === 'grace_fee' ? 'Late Fee' : 'Regular';
      const paymentStatus = isLate ? "Late Payment" : "On Time";
      
      return [
        format(new Date(payment.date), "PP"),
        `Rs. ${payment.amount.toLocaleString("en-IN")}`,
        payment.method.replace("_", " "),
        paymentType,
        paymentStatus
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [tableColumn],
      body: tableRows,
      theme: "plain",
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: "bold",
      },
      styles: {
        lineWidth: 0.1,
        lineColor: [200, 200, 200],
      },
    });
  }

  // Footer with formal text
  doc.setFontSize(8);
  doc.setTextColor(50, 50, 50);
  doc.text(
    "This document is electronically generated and is valid without a physical stamp.",
    105,
    262,
    { align: "center" }
  );
  doc.text("CCS CAMPUS - Official Fee Details", 105, 268, {
    align: "center",
  });
  doc.text(
    "For any queries, please contact the accounts department.",
    105,
    274,
    { align: "center" }
  );

  doc.save(`fee_details_${fee.student.rollNo}.pdf`);
  onSuccess("Fee details have been downloaded as PDF.");
}

export { generateReceiptPDF, generateFeeDetailsPDF };
