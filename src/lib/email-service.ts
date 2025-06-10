import emailjs from '@emailjs/browser';
import { Fee, Student } from "@/types";
import { format } from "date-fns";

// Initialize EmailJS with your public key
export const initEmailJS = () => {
  // Replace with your actual EmailJS public key
  emailjs.init("KyqZ8UK-riqg9NW3g");
};

// Send fee reminder email using EmailJS
export const sendFeeReminderEmail = async (
  fee: Fee & { student: Student }
): Promise<{ success: boolean; message: string }> => {
  try {
    if (!fee?.student.email) {
      return {
        success: false,
        message: "Student email not available."
      };
    }

    // Replace these with your actual EmailJS service ID and template ID
    const serviceId = "service_qmnfr9a";
    const templateId = "template_i47eueb";
    
    // Format the due date
    const formattedDueDate = format(new Date(fee.dueDate), "PPP");
    
    // Standard late fee (used when not specified in the record)
    // Using graceFeeAmount if available, otherwise default to 500
    const lateFeeAmount = fee.graceFeeAmount || 500;
    
    // Subject line format from template
    const subject = `[Reminder] Pending Fee, Due by ${formattedDueDate} – CCS CAMPUS`;
    
    // IMPORTANT: Match exactly the variables used in the EmailJS template
    const emailData = {
      // Template content variables as per provided template
      student_name: fee.student.name,
      student_id: fee.student.rollNo,
      total_fee: fee.totalAmount?.toLocaleString() || "0",
      paid_amount: fee.paidAmount?.toLocaleString() || "0",
      due_amount: fee.dueAmount?.toLocaleString() || "0",
      due_date: formattedDueDate,
      late_fee: lateFeeAmount.toLocaleString(),
      
      // Email system variables
      email: fee.student.email,
      to_name: fee.student.name,
      from_name: "CCS Campus Admin",
      reply_to: "support@ccscampus.com",
      subject: subject
    };
    
    console.log("Attempting to send email with data:", emailData);
    
    const response = await emailjs.send(serviceId, templateId, emailData);
    console.log("EmailJS response:", response);
    
    return {
      success: true,
      message: `Email sent successfully to ${fee.student.email}`
    };
  } catch (error) {
    console.error("Error sending email:", error);
    return {
      success: false,
      message: `Failed to send email: ${error.message || "Unknown error"}`
    };
  }
}; 