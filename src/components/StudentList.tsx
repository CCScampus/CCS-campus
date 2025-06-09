import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Student } from "@/types";
import { Edit, Search, Filter, MoreHorizontal, Download, Mail, FileText, Trash, Check, ChevronsUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { updateStudent } from '@/services/studentService';
import { deleteStudent, getStudents } from "@/services/studentService";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSystemDefaults } from "@/hooks/useSystemDefaults";
import { generateBatchOptions } from "@/lib/utils";

interface StudentListProps {
  students: Student[];
  loading: boolean;
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
}

const currentYear = new Date().getFullYear();
const DEFAULT_BATCH_OPTIONS = Array.from({ length: 6 }, (_, i) => `${currentYear + i}-${currentYear + i + 1}`);

const StudentList = ({ students, loading, setStudents }: StudentListProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [batchFilter, setBatchFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { defaults } = useSystemDefaults();
  
  // For sending reminders
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  // For delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  
  // Get unique courses from students or system defaults
  const courseOptions = useMemo(() => {
    if (defaults?.course_list && defaults.course_list.length > 0) {
      return defaults.course_list;
    }
    const set = new Set(students.map(s => s.course).filter(Boolean));
    return Array.from(set);
  }, [students, defaults]);
  
  // Get batch options from 2020 to 2030
  const batchOptions = useMemo(() => {
    return generateBatchOptions();
  }, []);
  
  const handleSendReminder = (student: Student) => {
    setSelectedStudent(student);
    setReminderDialogOpen(true);
  };
  
  const handleConfirmReminder = () => {
    if (selectedStudent) {
      toast({
        title: "Reminder Sent",
        description: `Fee reminder has been sent to ${selectedStudent.name}.`,
      });
    }
    setReminderDialogOpen(false);
  };
  
  const handleDeletePrompt = (student: Student) => {
    setStudentToDelete(student);
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;
    try {
      await deleteStudent(studentToDelete.id);
      const latest = await getStudents();
      setStudents(latest);
      toast({
        title: "Student Removed",
        description: `${studentToDelete.name} has been removed from the system.`,
      });
    } catch (error) {
      console.error("Error deleting student:", error);
      toast({
        title: "Error",
        description: "Failed to delete student. Please try again.",
        variant: "destructive",
      });
    }
    setDeleteDialogOpen(false);
  };
  
  const handleStatusChange = async (studentId: string, newStatus: string) => {
    try {
      const studentToUpdate = students.find(s => s.id === studentId);
      if (!studentToUpdate) return;
      
      const updatedStudent = await updateStudent(studentId, {
        status: newStatus as any
      });
      
      setStudents(prevStudents => 
        prevStudents.map(s => s.id === studentId ? updatedStudent : s)
      );
      
      toast({
        title: "Status Updated",
        description: `Student status has been updated to ${newStatus}.`,
      });
    } catch (error) {
      console.error("Error updating student status:", error);
      toast({
        title: "Error",
        description: "Failed to update student status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.rollNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filter === "all" || student.status === filter;
    const matchesBatch =
      batchFilter === "all" || student.batch === batchFilter;
    const matchesCourse =
      courseFilter === "all" || student.course === courseFilter;
    return matchesSearch && matchesFilter && matchesBatch && matchesCourse;
  });
  
  const handleDownloadCSV = () => {
    const headers = ["Name", "Roll No", "Course", "Batch", "Email", "Phone", "Status", "Join Date"];
    
    const csvData = filteredStudents.map(student => [
      student.name,
      student.rollNo,
      student.course,
      student.batch,
      student.email || "",
      student.phone || "",
      student.status,
      student.joinDate
    ]);
    
    const csvContent = [
      headers.join(","),
      ...csvData.map(row => row.join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "students.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex w-full sm:w-72 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={batchFilter} onValueChange={setBatchFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Batch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Batches</SelectItem>
              {batchOptions.map((batch) => (
                <SelectItem key={batch} value={batch}>{batch}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Course" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {courseOptions.map((course) => (
                <SelectItem key={course} value={course}>{course}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="alumni">Alumni</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleDownloadCSV}>
            Download CSV
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Roll No</TableHead>
              <TableHead className="hidden md:table-cell">Course</TableHead>
              <TableHead className="hidden md:table-cell">Batch</TableHead>
              <TableHead className="hidden lg:table-cell">Email</TableHead>
              <TableHead className="hidden lg:table-cell">Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center h-24">
                  Loading students...
                </TableCell>
              </TableRow>
            ) : filteredStudents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center h-24">
                  No students found.
                </TableCell>
              </TableRow>
            ) : (
              filteredStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">
                    <Link to={`/students/${student.id}/view`} className="hover:underline">
                      {student.name}
                    </Link>
                  </TableCell>
                  <TableCell>{student.rollNo}</TableCell>
                  <TableCell className="hidden md:table-cell">{student.course}</TableCell>
                  <TableCell className="hidden md:table-cell">{student.batch}</TableCell>
                  <TableCell className="hidden lg:table-cell">{student.email}</TableCell>
                  <TableCell className="hidden lg:table-cell">{student.phone}</TableCell>
                  <TableCell>
                    <Select 
                      defaultValue={student.status} 
                      onValueChange={(value) => handleStatusChange(student.id, value)}
                    >
                      <SelectTrigger className="h-7 w-24 px-2">
                        <Badge
                          variant={
                            student.status === "active"
                              ? "default"
                              : student.status === "inactive"
                              ? "secondary"
                              : "outline"
                          }
                          className="w-full justify-center"
                        >
                          {student.status}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="alumni">Alumni</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/students/edit/${student.id}`)}>
                          <Edit className="mr-2 h-4 w-4" />
                          <span>Edit</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/students/${student.id}/view`)}>
                          <FileText className="mr-2 h-4 w-4" />
                          <span>View Details</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSendReminder(student)}>
                          <Mail className="mr-2 h-4 w-4" />
                          <span>Send Reminder</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeletePrompt(student)}>
                          <Trash className="mr-2 h-4 w-4" />
                          <span>Delete</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Reminder Dialog */}
      <Dialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Fee Reminder</DialogTitle>
            <DialogDescription>
              Send a fee reminder to {selectedStudent?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Message</label>
              <textarea 
                className="w-full min-h-[100px] p-2 border rounded-md" 
                defaultValue={`Dear ${selectedStudent?.name},\n\nThis is a friendly reminder that your fee payment is due. Please make the payment at your earliest convenience.\n\nThank you,\nCCS Campus Administration`}
              />
            </div>
            <Button onClick={handleConfirmReminder} className="w-full">Send Reminder</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete {studentToDelete?.name}'s record and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteStudent}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StudentList;
