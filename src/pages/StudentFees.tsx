import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import { ArrowLeft, Download, FileDown, Receipt, Send } from "lucide-react";
import { Student, Fee, Payment } from "@/types";
import { getStudentById } from '@/services/studentService';
import { getStudentFees } from '@/services/feesService';
import StudentFeeManager from "@/components/StudentFeeManager";
import { generateFeeDetailsPDF, generateReceiptPDF } from "@/lib/pdf-generator";
import { generateReminderEmailContent } from "@/lib/email-templates";
import { useReminderEmail } from "@/hooks/use-reminder-email";

const StudentFees = () => {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [feeRecords, setFeeRecords] = useState<(Fee & { student: Student })[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [emailSubject, setEmailSubject] = useState("");
  const [emailContent, setEmailContent] = useState("");
  const [selectedFee, setSelectedFee] = useState<(Fee & { student: Student }) | null>(null);
  const { sendReminderEmail, reminderSending } = useReminderEmail(selectedFee);

  useEffect(() => {
    const fetchStudentData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const studentData = await getStudentById(id);
        
        if (!studentData) {
          toast({
            title: "Error",
            description: "Student not found",
            variant: "destructive",
          });
          return;
        }
        
        setStudent(studentData);
        
        // Get fee records for this student
        const feesData = await getStudentFees(id);
        setFeeRecords(feesData);
      } catch (error) {
        console.error("Error fetching student data:", error);
        toast({
          title: "Error",
          description: "Failed to load student data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [id, toast]);

  // Generate individual receipt
  const generateReceipt = (payment: Payment, fee: Fee & { student: Student }) => {
    generateReceiptPDF(payment, fee, (message) => {
      toast({
        title: "Receipt Generated",
        description: message,
      });
    });
  };

  // Download fee details as PDF
  const handleDownloadFeeDetails = (fee: Fee & { student: Student }) => {
    generateFeeDetailsPDF(fee, (message) => {
      toast({
        title: "Fee Details Generated",
        description: message,
      });
    });
  };

  // Generate the latest receipt
  const downloadLatestReceipt = (fee: Fee & { student: Student }) => {
    if (fee.payments.length > 0) {
      // Get the most recent payment based on date and time
      const latestPayment = [...fee.payments].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0];
      generateReceipt(latestPayment, fee);
    }
  };

  // Export all receipts as PDFs
  const exportAllReceipts = (fee: Fee & { student: Student }) => {
    if (fee.payments.length > 0) {
      // Sort payments by date and time, most recent first
      const sortedPayments = [...fee.payments].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      // Generate receipt for each payment in sorted order
      sortedPayments.forEach(payment => {
        generateReceipt(payment, fee);
      });

      // Also generate the fee summary PDF
      handleDownloadFeeDetails(fee);

      toast({
        title: "Export Complete",
        description: `Exported ${fee.payments.length} receipts and fee summary.`,
      });
    }
  };

  // Handle reminder email
  const prepareReminderEmail = (fee: Fee & { student: Student }) => {
    setSelectedFee(fee);
    if (fee.dueAmount > 0) {
      const { subject, content } = generateReminderEmailContent(fee);
      setEmailSubject(subject);
      setEmailContent(content);
    }
  };

  const handleSendReminder = async () => {
    await sendReminderEmail(emailSubject, emailContent);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Loading student fees...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <p>Student not found</p>
        <Button asChild>
          <Link to="/students">Go Back</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link to="/fees">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Student Fees</h1>
            <p className="text-muted-foreground">{student.name} ({student.rollNo})</p>
          </div>
        </div>
        
        {feeRecords.length > 0 && feeRecords[0].payments.length > 0 && (
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={() => downloadLatestReceipt(feeRecords[0])}
              disabled={feeRecords[0].payments.length === 0}
            >
              <Receipt className="h-4 w-4 mr-2" />
              Current Receipt
            </Button>
            <Button variant="outline" onClick={() => exportAllReceipts(feeRecords[0])}>
              <FileDown className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            
            {feeRecords[0].dueAmount > 0 && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button onClick={() => prepareReminderEmail(feeRecords[0])}>
                    <Send className="h-4 w-4 mr-2" />
                    Send Reminder
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Send Payment Reminder</DialogTitle>
                    <DialogDescription>
                      Send a payment reminder to {student.name} for ₹
                      {feeRecords[0].dueAmount.toLocaleString()}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        To: {student.email || "Email not available"}
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
                      disabled={reminderSending || !student.email}
                    >
                      {reminderSending ? "Sending..." : "Send Email"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fee Management</CardTitle>
          <CardDescription>
            View and manage fee records for {student.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StudentFeeManager 
            student={student} 
            onSuccess={() => {
              toast({
                title: "Success",
                description: "Fee information updated successfully.",
              });
              // Refresh fee records after update
              getStudentFees(id).then(feesData => setFeeRecords(feesData));
            }}
          />
        </CardContent>
      </Card>
      
      {feeRecords.length > 0 && feeRecords[0].payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>
              View all payment records for this student
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Sort payments by date and time with most recent first */}
              {[...feeRecords[0].payments]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map(payment => (
                <div key={payment.id} className="flex justify-between items-center border-b pb-2">
                  <div>
                    <p className="font-medium">₹{payment.amount.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(payment.date).toLocaleDateString()} • {payment.method.replace('_', ' ')}
                      {payment.reference && ` • Ref: ${payment.reference}`}
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => generateReceipt(payment, feeRecords[0])}
                  >
                    <Receipt className="h-4 w-4 mr-2" />
                    Download Receipt
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentFees; 