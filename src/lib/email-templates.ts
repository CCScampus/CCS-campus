import { format } from "date-fns";
import { Fee, Student } from "@/types";

/**
 * Generate default email reminder subject and content
 */
export const generateReminderEmailContent = (
  fee: Fee & { student: Student }
): { subject: string; content: string } => {
  if (!fee) return { subject: "", content: "" };

  const subject = `Fee Payment Reminder: ₹${fee.dueAmount.toLocaleString()} due for ${
    fee.student.name
  }`;
  const content = `Dear ${
    fee.student.name
  },\n\nThis is a reminder that you have a pending fee payment of ₹${fee.dueAmount.toLocaleString()} due on ${format(
    new Date(fee.dueDate),
    "PPP"
  )}.\n\nPlease make the payment as soon as possible to avoid any late fees.\n\nRegards,\nCCS Campus Admin`;

  return { subject, content };
};
