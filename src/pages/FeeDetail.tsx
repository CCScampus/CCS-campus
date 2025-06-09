import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import {
  ArrowLeft,
  Download,
  Send,
  Calendar,
  CreditCard,
  FileDown,
  Receipt,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Student, Fee, Payment } from "@/types";
import { generateReceiptPDF, generateFeeDetailsPDF } from "@/lib/pdf-generator";
import { generateReminderEmailContent } from "@/lib/email-templates";
import { useReminderEmail } from "@/hooks/use-reminder-email";

const FeeDetail = () => {
  // State and hooks
  const { id } = useParams();
  const { toast } = useToast();
  const [fee, setFee] = useState<(Fee & { student: Student }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailContent, setEmailContent] = useState("");

  const { sendReminderEmail, reminderSending } = useReminderEmail(fee);

  // Fetch fee details
  useEffect(() => {
    const fetchFeeDetails = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("fees")
          .select(
            `*, student:student_id (id, name, roll_no, course, batch, email, phone, father_name), payments (*)`
          )
          .eq("id", id)
          .single();

        if (error) throw error;
        if (!data) return;

        // Map data to app types
        const mappedFee: Fee & { student: Student } = {
          id: data.id,
          studentId: data.student_id,
          totalAmount: data.total_amount,
          paidAmount: data.paid_amount,
          dueAmount: data.due_amount || 0,
          dueDate: data.due_date,
          status: data.status as "paid" | "partially_paid" | "unpaid",
          student: {
            id: data.student.id,
            name: data.student.name,
            rollNo: data.student.roll_no,
            course: data.student.course,
            batch: data.student.batch,
            email: data.student.email || "",
            phone: data.student.phone || "",
            status: "active",
            joinDate: "",
            fatherName: data.student.father_name || "",
          },
          payments: data.payments.map((payment: any) => ({
            id: payment.id,
            amount: payment.amount,
            date: payment.payment_date,
            method: payment.payment_method as Payment["method"],
            reference: payment.reference_number || "",
            slipURL: payment.slip_url || "",
          })),
        };
        setFee(mappedFee);

        // Pre-fill reminder email
        if (mappedFee.dueAmount > 0) {
          const { subject, content } = generateReminderEmailContent(mappedFee);
          setEmailSubject(subject);
          setEmailContent(content);
        }
      } catch (error) {
        console.error("Error fetching fee details:", error);
        toast({
          title: "Error",
          description: "Failed to load fee details. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchFeeDetails();
  }, [id, toast]);

  // Generate individual receipt
  const generateReceipt = (payment: Payment) => {
    if (fee) {
      generateReceiptPDF(payment, fee, (message) => {
        toast({
          title: "Receipt Generated",
          description: message,
        });
      });
    }
  };

  // Download fee details as PDF
  const downloadFeeDetails = () => {
    if (fee) {
      generateFeeDetailsPDF(fee, (message) => {
        toast({
          title: "Fee Details Generated",
          description: message,
        });
      });
    }
  };

  // Generate the latest receipt
  const downloadLatestReceipt = () => {
    if (fee && fee.payments.length > 0) {
      // Get the most recent payment based on date and time
      const latestPayment = [...fee.payments].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0];
      generateReceipt(latestPayment);
    }
  };

  // Handle reminder email
  const handleSendReminder = async () => {
    await sendReminderEmail(emailSubject, emailContent);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!fee) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/fees">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Fees
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6 text-center">
            <p>Fee record not found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/fees">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Fees
            </Link>
          </Button>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={downloadLatestReceipt}
            disabled={!fee || fee.payments.length === 0}
          >
            <Receipt className="h-4 w-4 mr-2" />
            Current Receipt
          </Button>
          <Button variant="outline" onClick={downloadFeeDetails}>
            <FileDown className="h-4 w-4 mr-2" />
            Export PDF
          </Button>

          {fee.dueAmount > 0 && (
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Send className="h-4 w-4 mr-2" />
                  Send Reminder
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Send Payment Reminder</DialogTitle>
                  <DialogDescription>
                    Send a payment reminder to {fee.student.name} for ₹
                    {fee.dueAmount.toLocaleString()}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      To: {fee.student.email || "Email not available"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Subject:</p>
                    <Input
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Message:</p>
                    <Textarea
                      rows={8}
                      value={emailContent}
                      onChange={(e) => setEmailContent(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleSendReminder}
                    disabled={reminderSending || !fee.student.email}
                  >
                    {reminderSending ? "Sending..." : "Send Email"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Student Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">
                  <Link 
                    to={`/student/${fee.student.id}/fees`}
                    className="text-primary hover:underline"
                  >
                    {fee.student.name}
                  </Link>
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Roll No</p>
                <p className="font-medium">{fee.student.rollNo}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Course</p>
                <p className="font-medium">{fee.student.course}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Batch</p>
                <p className="font-medium">{fee.student.batch}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">
                  {fee.student.email || "Not available"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">
                  {fee.student.phone || "Not available"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fee Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="font-medium">
                  ₹{fee.totalAmount.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Paid Amount</p>
                <p className="font-medium">
                  ₹{fee.paidAmount.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Due Amount</p>
                <p className="font-medium text-red-500">
                  ₹{fee.dueAmount.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Due Date</p>
                <p className="font-medium flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  {format(new Date(fee.dueDate), "PP")}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge
                  variant={
                    fee.status === "paid"
                      ? "default"
                      : fee.status === "partially_paid"
                      ? "secondary"
                      : "destructive"
                  }
                  className="mt-1"
                >
                  {fee.status.replace("_", " ")}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="h-5 w-5 mr-2" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {fee.payments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No payment records found.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                {" "}
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Sort payments by date and time with most recent first */}
                  {[...fee.payments]
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {format(new Date(payment.date), "PPP")}
                      </TableCell>
                      <TableCell>₹{payment.amount.toLocaleString()}</TableCell>
                      <TableCell className="capitalize">
                        {payment.method.replace("_", " ")}
                      </TableCell>
                      <TableCell>{payment.reference || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => generateReceipt(payment)}
                          title="Download Receipt"
                        >
                          <Receipt className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FeeDetail;
