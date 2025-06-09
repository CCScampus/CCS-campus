import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { feeFormSchema } from "./schemas";
import { useEffect } from "react";

interface NewFeeFormProps {
  student?: { 
    graceMonth?: string;
    courseFees?: string;
    discount?: string;
    gracePeriodFees?: string;
  };
  onSubmit: (data: z.infer<typeof feeFormSchema>) => void;
  isSubmitting?: boolean;
}

export function NewFeeForm({ student, onSubmit, isSubmitting = false }: NewFeeFormProps) {
  const form = useForm<z.infer<typeof feeFormSchema>>({
    resolver: zodResolver(feeFormSchema),
    defaultValues: {
      totalAmount: "",
      dueDate: new Date().toISOString().split("T")[0],
      graceMonth: student?.graceMonth || "5",
      graceFeeAmount: student?.gracePeriodFees || "500",
      initialPayment: "",
    },
  });

  // Update form values when student data changes
  useEffect(() => {
    if (student?.courseFees) {
      let totalAmount = student.courseFees;
      
      // If there's a discount, calculate the discounted amount
      if (student.discount && Number(student.discount) > 0) {
        const originalAmount = parseFloat(student.courseFees);
        const discountPercent = Number(student.discount);
        const discountedAmount = originalAmount - (originalAmount * discountPercent / 100);
        totalAmount = discountedAmount.toString();
      }
      
      form.setValue("totalAmount", totalAmount);
    }
    
    if (student?.graceMonth) {
      form.setValue("graceMonth", student.graceMonth);
    }
    
    if (student?.gracePeriodFees) {
      form.setValue("graceFeeAmount", student.gracePeriodFees);
    }
  }, [student, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="totalAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Total Amount</FormLabel>
              <FormControl>
                <Input type="number" min="0" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="dueDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Due Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="graceMonth"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Grace Period (Months)</FormLabel>
              <FormControl>
                <Input type="number" min="0" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="graceFeeAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Late Fee Amount</FormLabel>
              <FormControl>
                <Input type="number" min="0" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="initialPayment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Initial Payment (Optional)</FormLabel>
              <FormControl>
                <Input type="number" min="0" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Fee Record"}
        </Button>
      </form>
    </Form>
  );
} 