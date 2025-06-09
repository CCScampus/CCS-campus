import { supabase } from '@/integrations/supabase/client';
import { Fee, Student, StudentStatus, Payment } from '@/types';
import { calculateGSTComponents } from '@/lib/utils';

// Database types that match the actual database schema
interface DBFee {
  id: string;
  student_id: string;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  due_date: string;
  status: 'paid' | 'partially_paid' | 'unpaid';
  created_at: string;
  updated_at: string;
  grace_month: number;
  grace_fee_amount: number;
  is_late_fee_applied: boolean;
}

interface DBPayment {
  id: string;
  fee_id: string;
  amount: number;
  payment_date: string;
  payment_method: 'cash' | 'bank_transfer' | 'online' | 'check' | 'system';
  reference_number?: string;
  slip_url?: string;
  created_at: string;
  updated_at: string;
  remaining_due_amount: number;
}

interface DBStudent {
  id: string;
  name: string;
  roll_no: string;
  course: string;
  batch: string;
  email?: string;
  phone?: string;
  status: StudentStatus;
  join_date: string;
  student_id?: string; // Added for compatibility with database response
  father_name?: string;
}

// Type for database responses
interface DBFeeResponse extends DBFee {
  student: DBStudent;
  payments: DBPayment[];
}

// Type conversion functions
const convertDBFeeToFee = (dbFee: DBFee, dbPayments: DBPayment[] = []): Fee => {
  return {
    id: dbFee.id,
    studentId: dbFee.student_id,
    totalAmount: dbFee.total_amount,
    paidAmount: dbFee.paid_amount,
    dueAmount: dbFee.due_amount,
    dueDate: dbFee.due_date,
    status: dbFee.status,
    payments: dbPayments.map(p => ({
      id: p.id,
      amount: p.amount,
      date: p.payment_date,
      method: p.payment_method === 'system' ? 'cash' : p.payment_method, // Map system to cash for frontend
      reference: p.reference_number || '',
      slipURL: p.slip_url || '',
      type: p.reference_number === 'LATE_FEE' ? 'grace_fee' : 'regular',
      remainingDueAmount: p.remaining_due_amount !== undefined ? p.remaining_due_amount : dbFee.due_amount
    })),
    graceMonth: dbFee.grace_month,
    graceFeeAmount: dbFee.grace_fee_amount,
    isLateFeeApplied: dbFee.is_late_fee_applied
  };
};

const convertDBStudentToStudent = (dbStudent: DBStudent): Student => {
  return {
    id: dbStudent.id,
    name: dbStudent.name,
    rollNo: dbStudent.roll_no,
    course: dbStudent.course,
    batch: dbStudent.batch,
    email: dbStudent.email || '',
    phone: dbStudent.phone || '',
    status: dbStudent.status,
    joinDate: dbStudent.join_date,
    fatherName: dbStudent.father_name || ''
  };
};

const convertPaymentToDBPayment = (
  feeId: string,
  payment: Omit<Payment, 'id'>
): Omit<DBPayment, 'id' | 'created_at' | 'updated_at'> => {
  return {
    fee_id: feeId,
    amount: payment.amount,
    payment_date: payment.date,
    payment_method: payment.method,
    reference_number: payment.reference,
    slip_url: payment.slipURL
  };
};

// Completely rewrite calculateGracePeriod to be fail-safe
export const calculateGracePeriod = (dueDate: string | null | undefined, graceMonth?: number | null): { 
  graceUntilDate: string;
  isLate: boolean;
} => {
  // Ensure we have a valid date to work with
  const today = new Date();
  const todayISOString = today.toISOString().split('T')[0];
  
  // Ensure months is a valid number (default to 0)
  const months = (graceMonth !== null && graceMonth !== undefined && !isNaN(Number(graceMonth))) 
    ? Number(graceMonth) 
    : 0;
  
  // No date provided - return today with no late fee
  if (!dueDate) {
    console.log('calculateGracePeriod: No due date provided, using today');
    return {
      graceUntilDate: todayISOString,
      isLate: false
    };
  }
  
  try {
    // Try to parse the due date
    const dueDateObj = new Date(dueDate);
    
    // Check if parsed date is valid
    if (isNaN(dueDateObj.getTime())) {
      console.log('calculateGracePeriod: Invalid due date format', dueDate);
      return {
        graceUntilDate: todayISOString,
        isLate: false
      };
    }
    
    try {
      // Calculate grace period date (with extra safety)
      const graceUntilObj = new Date(dueDateObj);
      graceUntilObj.setMonth(dueDateObj.getMonth() + months);
      
      // Validate the calculated grace date
      if (isNaN(graceUntilObj.getTime())) {
        console.log('calculateGracePeriod: Invalid grace period calculation', dueDate, months);
        return {
          graceUntilDate: todayISOString,
          isLate: false
        };
      }
      
      // Format the grace date (with safety)
      let graceUntilDate;
      try {
        graceUntilDate = graceUntilObj.toISOString().split('T')[0];
      } catch (e) {
        console.log('calculateGracePeriod: Could not format grace date', graceUntilObj);
        graceUntilDate = todayISOString;
      }
      
      // Determine if payment is late
      const isLate = today > graceUntilObj;
      
      return { graceUntilDate, isLate };
    } catch (e) {
      console.log('calculateGracePeriod: Error calculating grace period', e, dueDate, months);
      return {
        graceUntilDate: todayISOString,
        isLate: false
      };
    }
  } catch (error) {
    console.log('calculateGracePeriod: Unexpected error', error, dueDate, months);
    return {
      graceUntilDate: todayISOString,
      isLate: false
    };
  }
};

// Rewrite checkAndApplyLateFee to handle potentially missing values 
export const checkAndApplyLateFee = async (feeId: string): Promise<void> => {
  if (!feeId) {
    console.log('checkAndApplyLateFee: No fee ID provided');
    return;
  }
  
  try {
    // Get fee record
    const { data: feeData, error: feeError } = await supabase
      .from('fees')
      .select('*')
      .eq('id', feeId)
      .single();
      
    if (feeError) {
      console.log('checkAndApplyLateFee: Error fetching fee data', feeError);
      return;
    }
    
    // Safety check
    if (!feeData) {
      console.log('checkAndApplyLateFee: No fee data found for ID', feeId);
      return;
    }
    
    // Check if late fee has already been applied by checking for a LATE_FEE payment
    const { data: lateFeesData, error: lateFeesError } = await supabase
      .from('payments')
      .select('*')
      .eq('fee_id', feeId)
      .eq('reference_number', 'LATE_FEE');
    
    if (lateFeesError) {
      console.log('checkAndApplyLateFee: Error checking existing late fees', lateFeesError);
      return;
    }
    
    // If we already have a late fee payment, don't apply another one
    if (lateFeesData && lateFeesData.length > 0) {
      console.log('checkAndApplyLateFee: Late fee already applied for ID', feeId);
      return;
    }
    
    // Convert grace period days to months for calculation (assuming 30 days per month)
    const gracePeriodDays = (feeData as any).grace_period_days || 0;
    const graceMonths = Math.floor(gracePeriodDays / 30);
    
    // Calculate if past grace period (with safety)
    const { isLate } = calculateGracePeriod(feeData.due_date || null, graceMonths);
    
    if (isLate) {
      // Use the existing grace_fee_amount column if it exists, otherwise use default
      const graceFeeAmount = (feeData as any).grace_fee_amount || 500;
      
      // Only apply if there is a late fee to add
      if (graceFeeAmount > 0) {
        // Ensure total amount is a number
        const totalAmount = typeof feeData.total_amount === 'number' && !isNaN(feeData.total_amount)
          ? feeData.total_amount
          : 0;
        
        // Apply late fee
        try {
          const { error: updateError } = await supabase
            .from('fees')
            .update({
              total_amount: totalAmount + graceFeeAmount,
              // Do not update is_late_fee_applied as it might be a generated column
            })
            .eq('id', feeId);
            
          if (updateError) {
            console.log('checkAndApplyLateFee: Error updating fee with late fee', updateError);
            return;
          }
          
          // Record the late fee as a system-generated payment
          try {
            const { error: paymentError } = await supabase
              .from('payments')
              .insert({
                fee_id: feeId,
                amount: graceFeeAmount,
                payment_date: new Date().toISOString().split('T')[0],
                payment_method: 'system',
                reference_number: 'LATE_FEE'
              });
              
            if (paymentError) {
              console.log('checkAndApplyLateFee: Error recording late fee payment', paymentError);
              // Continue even if payment record fails
            }
          } catch (paymentErr) {
            console.log('checkAndApplyLateFee: Exception recording late fee payment', paymentErr);
            // Continue even if payment record fails
          }
        } catch (updateErr) {
          console.log('checkAndApplyLateFee: Exception updating fee with late fee', updateErr);
        }
      }
    }
  } catch (error) {
    console.log('checkAndApplyLateFee: Unexpected error', error);
    // Changed from throw to return + log to prevent crashing
  }
};

export const getStudentFees = async (studentId?: string): Promise<Array<Fee & { student: Student }>> => {
  let query = supabase
    .from('fees')
    .select(`
      *,
      student:student_id (id, name, roll_no, course, batch, email, phone, status, join_date, father_name),
      payments (*)
    `);
    
  if (studentId) {
    query = query.eq('student_id', studentId);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  if (!data) return [];

  return data.map(item => {
    const feeRecord = item as unknown as DBFeeResponse;
    
    return {
      ...convertDBFeeToFee(feeRecord, feeRecord.payments),
      student: convertDBStudentToStudent(feeRecord.student)
    };
  });
};

export const getAllStudentsWithFees = async (): Promise<Array<Fee & { student: Student } | { student: Student, noFeeRecord: true }>> => {
  try {
    // First get all students
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('*')
      .order('name');
    
    if (studentsError) throw studentsError;
    
    // Then get all fees with student data
    const { data: feesWithStudents, error: feesError } = await supabase
      .from('fees')
      .select(`
        *,
        student:student_id (*)
      `)
      .order('created_at', { ascending: false });
    
    if (feesError) throw feesError;
    
    // Map fees to the correct format
    const formattedFees = feesWithStudents.map((fee) => ({
      id: fee.id,
      studentId: fee.student_id,
      totalAmount: fee.total_amount,
      paidAmount: fee.paid_amount,
      dueAmount: fee.due_amount,
      dueDate: fee.due_date,
      status: fee.status,
      createdAt: fee.created_at,
      updatedAt: fee.updated_at,
      graceFeeAmount: fee.grace_fee_amount,
      isLateFeeApplied: fee.is_late_fee_applied,
      graceMonth: fee.grace_month,
      student: {
        id: fee.student.id,
        name: fee.student.name,
        rollNo: fee.student.roll_no,
        course: fee.student.course,
        batch: fee.student.batch,
        email: fee.student.email,
        phone: fee.student.phone,
        address: fee.student.address,
        dateOfBirth: fee.student.date_of_birth,
        joinDate: fee.student.join_date,
        guardianName: fee.student.guardian_name,
        guardianPhone: fee.student.guardian_phone,
        courseFees: fee.student.course_fees,
        discount: fee.student.discount,
        status: fee.student.status,
        graceMonth: fee.student.grace_month,
        gracePeriodFees: fee.student.grace_period_fees
      }
    }));
    
    // Create a set of student IDs that have fee records
    const studentIdsWithFees = new Set(formattedFees.map(fee => fee.studentId));
    
    // Add students without fee records
    const studentsWithoutFees = students
      .filter(student => !studentIdsWithFees.has(student.id))
      .map(student => ({
        student: {
          id: student.id,
          name: student.name,
          rollNo: student.roll_no,
          course: student.course,
          batch: student.batch,
          email: student.email,
          phone: student.phone,
          address: student.address,
          dateOfBirth: student.date_of_birth,
          joinDate: student.join_date,
          guardianName: student.guardian_name,
          guardianPhone: student.guardian_phone,
          courseFees: student.course_fees,
          discount: student.discount,
          status: student.status,
          graceMonth: student.grace_month,
          gracePeriodFees: student.grace_period_fees
        },
        noFeeRecord: true
      }));
    
    // Combine both arrays
    return [...formattedFees, ...studentsWithoutFees];
  } catch (error) {
    console.error('Error getting all students with fees:', error);
    throw error;
  }
};

export const createFeeRecord = async (
  studentId: string,
  baseAmount: number,
  dueDate: string,
  graceMonth: number,
  graceFeeAmount: number,
  initialPayment?: number
): Promise<Fee> => {
  try {
    console.log("createFeeRecord called with params:", {
      studentId,
      baseAmount,
      dueDate,
      graceMonth,
      graceFeeAmount,
      initialPayment
    });

    // Validate inputs
    if (!studentId) {
      console.error("createFeeRecord: Missing studentId");
      throw new Error("Student ID is required to create a fee record");
    }

    if (isNaN(baseAmount) || baseAmount < 0) {
      console.error("createFeeRecord: Invalid baseAmount:", baseAmount);
      throw new Error("Valid base amount is required to create a fee record");
    }

    // Calculate GST components
    const { totalWithGST } = calculateGSTComponents(baseAmount);
    console.log("createFeeRecord: GST calculation result:", { baseAmount, totalWithGST });
    
    // Prepare fee record data - don't include due_amount as it's a generated column
    const feeData = {
      student_id: studentId,
      total_amount: totalWithGST,
      paid_amount: initialPayment || 0,
      due_date: dueDate,
      grace_month: graceMonth,
      grace_fee_amount: graceFeeAmount,
      is_late_fee_applied: false
      // status and due_amount are generated columns, so don't include them
    };
    
    console.log("createFeeRecord: Prepared fee data:", feeData);

    // Insert fee record
    console.log("createFeeRecord: Inserting fee record into database");
    const { data: feeRecord, error: feeError } = await supabase
      .from('fees')
      .insert([feeData])
      .select('*, payments(*)')
      .single();

    if (feeError) {
      console.error("createFeeRecord: Error inserting fee record:", feeError);
      throw feeError;
    }
    
    if (!feeRecord) {
      console.error("createFeeRecord: No fee record returned after insert");
      throw new Error('Failed to create fee record');
    }
    
    console.log("createFeeRecord: Fee record created successfully:", feeRecord);

    // If there's an initial payment, create a payment record
    if (initialPayment && initialPayment > 0) {
      console.log("createFeeRecord: Creating initial payment record:", initialPayment);
      const paymentData = {
        fee_id: feeRecord.id,
        amount: initialPayment,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'cash',
        reference_number: null,
        slip_url: null
      };

      const { data: paymentRecord, error: paymentError } = await supabase
        .from('payments')
        .insert([paymentData])
        .select();

      if (paymentError) {
        console.error("createFeeRecord: Error creating payment record:", paymentError);
        throw paymentError;
      }
      
      console.log("createFeeRecord: Initial payment record created:", paymentRecord);
    }

    // Return the fee record with payments
    console.log("createFeeRecord: Returning fee record");
    return convertDBFeeToFee(feeRecord, feeRecord.payments);
  } catch (error) {
    console.error('Error creating fee record:', error);
    throw error;
  }
};

export const addPayment = async (
  feeId: string, 
  payment: Omit<Payment, 'id'>
): Promise<Fee> => {
  console.log('Adding payment:', { feeId, payment });

  // Validate reference number for online payments and bank transfers
  if ((payment.method === 'online' || payment.method === 'bank_transfer' || payment.method === 'check') && !payment.reference) {
    throw new Error(`Reference number is required for ${payment.method} payments`);
  }

  // Get current fee record
  const { data: currentFee, error: feeError } = await supabase
    .from('fees')
    .select('*, payments(*)')
    .eq('id', feeId)
    .single();

  if (feeError) {
    console.error('Error fetching fee record:', feeError);
    throw feeError;
  }
  if (!currentFee) throw new Error('Fee record not found');

  const feeRecord = currentFee as unknown as DBFeeResponse;
  
  // Calculate new amounts
  const newPaidAmount = Number(feeRecord.paid_amount) + Number(payment.amount);
  const newDueAmount = Number(feeRecord.total_amount) - newPaidAmount;
  const remainingDueAmount = newDueAmount > 0 ? newDueAmount : 0;
  
  // Prepare payment data
  const dbPayment = {
    fee_id: feeId,
    amount: Number(payment.amount),
    payment_date: payment.date,
    payment_method: payment.method,
    reference_number: payment.reference || null,
    slip_url: payment.slipURL || null,
    remaining_due_amount: remainingDueAmount // Store the remaining due amount
  };

  console.log('Inserting payment:', dbPayment);

  // Insert payment
  const { data: paymentData, error: paymentError } = await supabase
    .from('payments')
    .insert([dbPayment])
    .select()
    .single();

  if (paymentError) {
    console.error('Error creating payment record:', paymentError);
    throw paymentError;
  }
  if (!paymentData) throw new Error('Failed to create payment record');

  console.log('Updating fee record paid_amount:', {
    paid_amount: newPaidAmount
  });

  // Update fee paid_amount only (due_amount and status are generated columns)
  const { data: updatedFee, error: updateError } = await supabase
    .from('fees')
    .update({
      paid_amount: newPaidAmount
    })
    .eq('id', feeId)
    .select('*, payments(*)')
    .single();

  if (updateError) {
    console.error('Error updating fee record:', updateError);
    throw updateError;
  }
  if (!updatedFee) throw new Error('Failed to update fee record');

  return convertDBFeeToFee(
    updatedFee as DBFeeResponse,
    [...(feeRecord.payments || []), paymentData as DBPayment]
  );
};
// ... add any other fees-related functions as needed ... 