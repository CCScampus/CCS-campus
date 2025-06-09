import { useState } from "react";
import { Link } from "react-router-dom";
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
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Search, Filter, MoreHorizontal, Download, FileText, Mail, Plus } from "lucide-react";
import { Student, Fee } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface FeeTableProps {
  fees: Array<Fee & { student: Student } | { student: Student, noFeeRecord: true }>;
  loading: boolean;
  onAddPayment: (student: Student) => void;
}

const FeeTable = ({ fees, loading, onAddPayment }: FeeTableProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [courseFilter, setCourseFilter] = useState("all_courses");
  const [statusFilter, setStatusFilter] = useState("all_statuses");

  const getUniqueValues = (key: keyof Student) => {
    return Array.from(new Set(fees.map(fee => 'student' in fee ? fee.student[key] : fee.student[key])))
      .filter(Boolean) as string[];
  };

  const filteredFees = fees.filter(fee => {
    const student = 'student' in fee ? fee.student : fee.student;
    
    // Search filter
    const matchesSearch = searchTerm === "" ||
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.rollNo.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Course filter
    const matchesCourse = courseFilter === "all_courses" || student.course === courseFilter;
    
    // Status filter - only for records with fees
    const matchesStatus = statusFilter === "all_statuses" || 
      ('status' in fee && fee.status === statusFilter);
    
    return matchesSearch && matchesCourse && (statusFilter === "all_statuses" || 'status' in fee && matchesStatus);
  });

  const sortedFees = [...filteredFees].sort((a, b) => {
    const studentA = 'student' in a ? a.student : a.student;
    const studentB = 'student' in b ? b.student : b.student;
    return studentA.name.localeCompare(studentB.name);
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <p>Loading fee data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div className="flex flex-1 items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search students..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Course" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_courses">All Courses</SelectItem>
                {getUniqueValues("course").map((course) => (
                  <SelectItem key={course} value={course}>
                    {course}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_statuses">All Statuses</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partially_paid">Partially Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Course / Batch</TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
              <TableHead className="text-right">Paid Amount</TableHead>
              <TableHead className="text-right">Due Amount</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedFees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10">
                  No fee records found
                </TableCell>
              </TableRow>
            ) : (
              sortedFees.map((item) => {
                const student = 'student' in item ? item.student : item.student;
                const hasFeeRecord = !('noFeeRecord' in item);

                return (
                  <TableRow key={student.id} className={!hasFeeRecord ? "bg-muted/30" : ""}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{student.name}</div>
                        <div className="text-sm text-muted-foreground">{student.rollNo}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{student.course}</span>
                        <span className="text-sm text-muted-foreground">{student.batch}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {hasFeeRecord ? formatCurrency((item as Fee).totalAmount) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {hasFeeRecord ? formatCurrency((item as Fee).paidAmount) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {hasFeeRecord ? formatCurrency((item as Fee).dueAmount) : "—"}
                    </TableCell>
                    <TableCell>
                      {hasFeeRecord 
                        ? new Date((item as Fee).dueDate).toLocaleDateString() 
                        : "—"
                      }
                    </TableCell>
                    <TableCell>
                      {hasFeeRecord ? (
                        <Badge 
                          variant={
                            (item as Fee).status === "paid" 
                              ? "success" 
                              : (item as Fee).status === "partially_paid" 
                              ? "warning" 
                              : "destructive"
                          }
                        >
                          {(item as Fee).status.replace('_', ' ')}
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          No Fee Record
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 p-0"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => onAddPayment(student)}
                            className="cursor-pointer"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Payment
                          </DropdownMenuItem>
                          {hasFeeRecord && (
                            <>
                              <DropdownMenuItem asChild>
                                <Link 
                                  to={`/student/${student.id}/fees`}
                                  className="cursor-pointer"
                                >
                                  <FileText className="mr-2 h-4 w-4" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                            </>
                          )}
                          {student.email && (
                            <DropdownMenuItem asChild>
                              <a 
                                href={`mailto:${student.email}?subject=Fee Reminder`}
                                className="cursor-pointer"
                              >
                                <Mail className="mr-2 h-4 w-4" />
                                Send Reminder
                              </a>
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default FeeTable;
