import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Fee, Student } from "@/types";

/**
 * Custom hook to handle fee reminder email functionality
 */
export const useReminderEmail = (fee: (Fee & { student: Student }) | null) => {
  const { toast } = useToast();
  const [reminderSending, setReminderSending] = useState(false);

  const sendReminderEmail = async (
    emailSubject: string,
    emailContent: string
  ) => {
    if (!fee?.student.email) {
      toast({
        title: "Error",
        description: "Student email not available.",
        variant: "destructive",
      });
      return;
    }

    setReminderSending(true);

    try {
      // In a real app, this would call an API endpoint to send the email
      // For now, we'll simulate a successful email sending
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast({
        title: "Success",
        description: `Reminder sent to ${fee.student.email}`,
      });
    } catch (error) {
      console.error("Error sending reminder:", error);
      toast({
        title: "Error",
        description: "Failed to send reminder. Please try again.",
        variant: "destructive",
      });
    } finally {
      setReminderSending(false);
    }
  };

  return {
    reminderSending,
    sendReminderEmail,
  };
};
