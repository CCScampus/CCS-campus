import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Student, Fee, MonthlyAttendance } from "@/types";
import { getStudentById } from '@/services/studentService';
import { getStudentFees } from '@/services/feesService';
import { getMonthlyAttendance, generateMonthlyReport, getDailyAttendance } from '@/services/attendanceService';
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Calendar, FileText, Mail, User, Phone, AtSign, Home, School, Clock, MessageCircle } from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import StudentFeeManager from "@/components/StudentFeeManager";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from '@/integrations/supabase/client';
import { updateStudent } from '@/services/studentService';
import { downloadDetailedMonthlyAttendancePDF, downloadImprovedMonthlyAttendancePDF } from "@/lib/pdf-exporter";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { StudentAttendanceView } from "@/components/StudentAttendanceView";

const StudentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [student, setStudent] = useState<Student | null>(null);
  const [fees, setFees] = useState<Fee[]>([]);
  const [attendance, setAttendance] = useState<MonthlyAttendance | null>(null);
  const [dailyAttendance, setDailyAttendance] = useState<Array<{
    date: string;
    status: string;
    reason: string;
    details: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [showRollDialog, setShowRollDialog] = useState(false);
  const [newRollNo, setNewRollNo] = useState("");
  const [password, setPassword] = useState("");
  const [rollLoading, setRollLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

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
          navigate("/students");
          return;
        }
        
        setStudent(studentData);
        
        // Get fees for this student
        await fetchStudentFees(id);
        
        // Get attendance for current month
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        const attendanceData = await getMonthlyAttendance(currentMonth, currentYear);
        const studentAttendance = attendanceData.find(a => a.studentId === id) || null;
        setAttendance(studentAttendance);

        // Get daily attendance for current month
        const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
        const dailyAttendancePromises = Array.from({ length: daysInMonth }, (_, i) => {
          const date = new Date(currentYear, currentMonth - 1, i + 1);
          return getDailyAttendance(date.toISOString().split('T')[0]);
        });
        
        const dailyAttendanceResults = await Promise.all(dailyAttendancePromises);
        const studentDailyAttendance = dailyAttendanceResults
          .flat()
          .filter(record => record.studentId === id)
          .map(record => {
            const presentHours = record.hourlyStatus.filter(h => h.status === 'present').length;
            const totalHours = record.hourlyStatus.length;
            const status = totalHours === 0 ? 'Not Marked' :
              presentHours > totalHours / 2 ? 'Present' : 'Absent';
            
            const reason = record.hourlyStatus.some(h => h.status === 'medical') 
              ? 'Medical' 
              : record.hourlyStatus.some(h => h.status === 'leave') 
                ? 'Leave' 
                : '';

            const details = totalHours === 0 ? '' :
              `${presentHours}/${totalHours} hours present`;

            return {
              date: record.date,
              status,
              reason,
              details
            };
          });

        // Sort by date
        studentDailyAttendance.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setDailyAttendance(studentDailyAttendance);
        
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
  }, [id, navigate, toast]);

  // Separate function to fetch student fees
  const fetchStudentFees = async (studentId: string) => {
    try {
      const feesData = await getStudentFees(studentId);
      setFees(feesData);
      return feesData;
    } catch (error) {
      console.error("Error fetching student fees:", error);
      toast({
        title: "Error",
        description: "Failed to load fee data",
        variant: "destructive",
      });
      return [];
    }
  };

  // Handle successful fee operations (creation/payment)
  const handleFeeSuccess = async () => {
    if (id) {
      await fetchStudentFees(id);
    }
  };

  const handleGenerateReport = async () => {
    if (!student) return;
    
    try {
      setReportLoading(true);
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      // Get monthly attendance data
      const monthlyData = await getMonthlyAttendance(currentMonth, currentYear);
      const studentMonthlyData = monthlyData.filter(data => data.studentId === student.id);
      
      // Also get the detailed daily attendance for the month
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
      const dailyAttendancePromises = Array.from({ length: daysInMonth }, (_, i) => {
        const date = new Date(currentYear, currentMonth - 1, i + 1);
        return getDailyAttendance(date.toISOString().split('T')[0]);
      });
      
      const dailyAttendanceResults = await Promise.all(dailyAttendancePromises);
      const studentDailyAttendance = dailyAttendanceResults
        .flat()
        .filter(record => record.studentId === student.id)
        .map(record => ({
          date: record.date,
          status: record.hourlyStatus.length > 0 
            ? record.hourlyStatus.filter(h => h.status === 'present').length > record.hourlyStatus.length / 2 
              ? 'Present' 
              : 'Absent'
            : 'Absent',
          reason: record.hourlyStatus.some(h => h.status === 'medical') 
            ? 'Medical' 
            : record.hourlyStatus.some(h => h.status === 'leave') 
              ? 'Leave' 
              : '',
          hourlyDetails: Array(12).fill(null).map((_, idx) => {
            const hourData = record.hourlyStatus.find(h => h.hour === idx + 1);
            return hourData 
              ? { 
                  status: hourData.status, 
                  time: hourData.time || '' 
                }
              : { status: '', time: '' };
          })
        }));
      
      // Generate PDF with both monthly summary and daily details
      if (studentMonthlyData.length > 0) {
        downloadImprovedMonthlyAttendancePDF(
          studentMonthlyData[0],
          studentDailyAttendance,
          student,
          currentMonth,
          currentYear,
          toast
        );
      } else {
        toast({
          title: "Error",
          description: "No monthly attendance data available for this student.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "Error",
        description: "Failed to generate attendance report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setReportLoading(false);
    }
  };

  const handleRollChange = async () => {
    setRollLoading(true);
    try {
      // Get current admin email from session
      const { data: { session } } = await supabase.auth.getSession();
      const adminEmail = session?.user?.email;
      if (!adminEmail) throw new Error("No admin session found");

      // Re-authenticate admin
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: adminEmail,
        password: password,
      });
      if (authError) throw new Error("Invalid admin password");

      // Update the student's roll number
      await updateStudent(student.id, { rollNo: newRollNo });

      // Refresh student data
      const updatedStudent = { ...student, rollNo: newRollNo };
      setStudent(updatedStudent);
      setShowRollDialog(false);
      toast({ title: "Success", description: "Roll number updated." });
    } catch (err) {
      toast({ title: "Error", description: err.message || "Failed to update roll number", variant: "destructive" });
    } finally {
      setRollLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Loading student details...</p>
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
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" asChild>
          <Link to="/students">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Student Details</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Profile</span>
              <Badge
                variant={
                  student.status === "active"
                    ? "default"
                    : student.status === "inactive"
                    ? "secondary"
                    : "outline"
                }
              >
                {student.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center">
                {student.profileImage ? (
                  <img
                    src={student.profileImage}
                    alt={student.name}
                    className="h-24 w-24 rounded-full object-cover"
                  />
                ) : (
                  <User className="h-12 w-12 text-muted-foreground" />
                )}
              </div>
              <div className="text-center">
                <h2 className="text-xl font-semibold">{student.name}</h2>
                <p className="text-muted-foreground">{student.rollNo}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <School className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{student.course}, {student.batch}</span>
              </div>
              
              {student.email && (
                <div className="flex items-center gap-2">
                  <AtSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{student.email}</span>
                </div>
              )}
              
              {student.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{student.phone}</span>
                </div>
              )}
              
              {student.address && (
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{student.address}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Joined on {new Date(student.joinDate).toLocaleDateString()}</span>
              </div>
              
              {student.dateOfBirth && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">DOB: {new Date(student.dateOfBirth).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" asChild>
              <Link to={`/students/edit/${student.id}`}>
                <FileText className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Mail className="mr-2 h-4 w-4" />
                  Contact
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {student.email ? (
                  <DropdownMenuItem asChild>
                    {/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(student.email.trim()) ? (
                      <a 
                        href={`mailto:${student.email.trim()}`}
                        className="flex items-center"
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        Email Student
                    </a>
                    ) : (
                      <div className="flex items-center text-muted-foreground">
                        <Mail className="mr-2 h-4 w-4" />
                        Invalid Email
                      </div>
                    )}
                  </DropdownMenuItem>
                ) : null}
                {student.phone && student.phone.trim() !== '' && (
                  <DropdownMenuItem asChild>
                    <a 
                      href={`https://wa.me/${student.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center"
                    >
                      <MessageCircle className="mr-2 h-4 w-4" />
                      WhatsApp Student
                    </a>
                  </DropdownMenuItem>
                )}
                {(!student.email && !student.phone) && (
                  <DropdownMenuItem disabled>
                    No contact information available
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </CardFooter>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Student Information</CardTitle>
            <CardDescription>
              View and manage student's academic information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
              <TabsList className="w-full grid grid-cols-2 sm:grid-cols-3 mb-4">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="attendance">Attendance</TabsTrigger>
                <TabsTrigger value="fees">Fees</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Personal Information</h3>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Name</span>
                        <span>{student.name}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Roll No</span>
                        <span className="font-mono">{student.rollNo}</span>
                        <Dialog open={showRollDialog} onOpenChange={setShowRollDialog}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="ml-2">Change</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Change Roll Number</DialogTitle>
                              <DialogDescription>Enter a new roll number and confirm your password.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-2">
                              <Input
                                placeholder="New Roll Number"
                                value={newRollNo}
                                onChange={e => setNewRollNo(e.target.value)}
                              />
                              <Input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                              />
                            </div>
                            <DialogFooter>
                              <Button onClick={handleRollChange} disabled={rollLoading || !newRollNo || !password}>
                                {rollLoading ? "Updating..." : "Update"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                      {student.dateOfBirth && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Date of Birth</span>
                          <span>{new Date(student.dateOfBirth).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Academic Information</h3>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Course</span>
                        <span>{student.course}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Batch</span>
                        <span>{student.batch}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Join Date</span>
                        <span>{new Date(student.joinDate).toLocaleDateString()}</span>
                      </div>
                      {student.courseFees && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Original Course Fees</span>
                            <span>₹{student.courseFees}</span>
                          </div>
                          {student.discount && Number(student.discount) > 0 && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Discount</span>
                                <span className="text-green-600 font-medium">{student.discount}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Discount Amount</span>
                                <span className="text-green-600 font-medium">-₹{(Number(student.courseFees) * Number(student.discount) / 100).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Final Fee (After Discount)</span>
                                <span className="font-medium">₹{(Number(student.courseFees) * (1 - Number(student.discount) / 100)).toFixed(2)}</span>
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Contact Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Email</span>
                        <span>{student.email || "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Phone</span>
                        <span>{student.phone || "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Address</span>
                        <span>{student.address || "-"}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Guardian's Name</span>
                        <span>{student.guardianName || "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Guardian's Phone</span>
                        <span>{student.guardianPhone || "-"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Parent Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Father's Name</span>
                        <span>{student.fatherName || "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Father's Phone</span>
                        <span>{student.fatherPhone || "-"}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Mother's Name</span>
                        <span>{student.motherName || "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Mother's Phone</span>
                        <span>{student.motherPhone || "-"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="fees">
                {student && (
                  <div className="space-y-6">
                    <StudentFeeManager student={student} onSuccess={handleFeeSuccess} />
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="attendance" className="mt-4">
                {student && <StudentAttendanceView student={student} />}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentDetail;
