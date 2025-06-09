import { z } from "zod";

export const feeFormSchema = z.object({
  totalAmount: z.string().min(1, { message: "Total amount is required." }),
  dueDate: z.string().min(1, { message: "Due date is required." }),
  graceMonth: z.string().optional(),
  graceFeeAmount: z.string().optional(),
  initialPayment: z.string().optional(),
});

export const paymentSchema = z.object({
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Amount must be a valid number greater than 0",
  }),
  method: z.enum(["cash", "bank_transfer", "online", "check"]),
  date: z.string().min(1, "Payment date is required"),
  reference: z.string().optional()
}).superRefine((data, ctx) => {
  // Validate reference number for online payments, bank transfers, and checks
  if ((data.method === 'online' || data.method === 'bank_transfer' || data.method === 'check') && (!data.reference || !data.reference.trim())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Reference number is required for ${data.method} payments`,
      path: ["reference"]
    });
  }
}); 