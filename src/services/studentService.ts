import { supabase } from '@/integrations/supabase/client';
import { Student } from '@/types';

export const getStudents = async (): Promise<Student[]> => {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .order('name');
  if (error) throw error;
  return data.map(student => ({
    id: student.id,
    name: student.name,
    rollNo: student.roll_no,
    course: student.course,
    batch: student.batch,
    email: student.email || '',
    phone: student.phone || '',
    status: student.status as any,
    profileImage: student.profile_image,
    address: student.address,
    dateOfBirth: student.date_of_birth ? new Date(student.date_of_birth).toISOString().split('T')[0] : undefined,
    joinDate: new Date(student.join_date).toISOString().split('T')[0],
    graceMonth: student.grace_month ? String(student.grace_month) : undefined,
    fatherName: student.father_name || '',
    fatherPhone: student.father_phone || '',
    motherName: student.mother_name || '',
    motherPhone: student.mother_phone || '',
    guardianName: student.guardian_name || '',
    guardianPhone: student.guardian_phone || '',
    courseDuration: student.course_duration || '',
    validityDate: student.validity_date ? new Date(student.validity_date).toISOString().split('T')[0] : undefined,
    courseFees: student.course_fees ? String(student.course_fees) : '',
    gracePeriodFees: student.grace_period_fees ? String(student.grace_period_fees) : '',
    discount: student.discount ? String(student.discount) : '',
  }));
};

export const getStudentById = async (id: string): Promise<Student | null> => {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('id', id)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return {
    id: data.id,
    name: data.name,
    rollNo: data.roll_no,
    course: data.course,
    batch: data.batch,
    email: data.email || '',
    phone: data.phone || '',
    status: data.status as any,
    profileImage: data.profile_image,
    address: data.address,
    dateOfBirth: data.date_of_birth ? new Date(data.date_of_birth).toISOString().split('T')[0] : undefined,
    joinDate: new Date(data.join_date).toISOString().split('T')[0],
    graceMonth: data.grace_month ? String(data.grace_month) : undefined,
    fatherName: data.father_name || '',
    fatherPhone: data.father_phone || '',
    motherName: data.mother_name || '',
    motherPhone: data.mother_phone || '',
    guardianName: data.guardian_name || '',
    guardianPhone: data.guardian_phone || '',
    courseDuration: data.course_duration || '',
    validityDate: data.validity_date ? new Date(data.validity_date).toISOString().split('T')[0] : undefined,
    courseFees: data.course_fees ? String(data.course_fees) : '',
    gracePeriodFees: data.grace_period_fees ? String(data.grace_period_fees) : '',
    discount: data.discount ? String(data.discount) : '',
  };
};

export const createStudent = async (student: Omit<Student, 'id'>): Promise<Student> => {
  // Create a clean object with only the fields that should exist in the database
  const studentData: Record<string, any> = {
    name: student.name,
    roll_no: student.rollNo,
    course: student.course,
    batch: student.batch,
    email: student.email || null,
    phone: student.phone || null,
    status: student.status || 'active',
    profile_image: student.profileImage || null,
    address: student.address || null,
    date_of_birth: student.dateOfBirth || null,
    join_date: student.joinDate,
    father_name: student.fatherName || null,
    father_phone: student.fatherPhone || null,
    mother_name: student.motherName || null,
    mother_phone: student.motherPhone || null,
    guardian_name: student.guardianName || null,
    guardian_phone: student.guardianPhone || null,
  };

  // Handle numeric fields with special care
  // graceMonth - ensure it's a valid integer
  if (student.graceMonth === '' || student.graceMonth === undefined) {
    studentData.grace_month = 5; // Default
  } else {
    const graceMonthNum = parseInt(student.graceMonth);
    studentData.grace_month = isNaN(graceMonthNum) ? 5 : graceMonthNum;
  }

  // courseFees - ensure it's a valid number
  if (student.courseFees === '' || student.courseFees === undefined) {
    studentData.course_fees = null; // Allow null 
  } else {
    // Preserve the exact string value to avoid floating point precision issues
    studentData.course_fees = student.courseFees;
  }

  // discount - ensure it's a valid number
  if (student.discount === '' || student.discount === undefined) {
    studentData.discount = null; // Allow null 
  } else {
    // Preserve the exact string value to avoid floating point precision issues
    studentData.discount = student.discount;
  }

  // gracePeriodFees - ensure it's a valid number
  if (student.gracePeriodFees === '' || student.gracePeriodFees === undefined) {
    studentData.grace_period_fees = 500; // Default
  } else {
    // Preserve the exact string value to avoid floating point precision issues
    studentData.grace_period_fees = student.gracePeriodFees;
  }

  // Handle other optional fields
  if (student.courseDuration) {
    studentData.course_duration = student.courseDuration;
  }
  
  if (student.validityDate) {
    studentData.validity_date = student.validityDate;
  }
  
  console.log('Student data being sent to Supabase:', JSON.stringify(studentData, null, 2));
  
  try {
    const { data, error } = await supabase
      .from('students')
      .insert(studentData)
      .select()
      .single();
      
    if (error) {
      console.error('Supabase insert error:', error);
      throw error;
    }
    
    console.log('Successfully created student, response data:', JSON.stringify(data, null, 2));
    
    return {
      id: data.id,
      name: data.name,
      rollNo: data.roll_no,
      course: data.course,
      batch: data.batch,
      email: data.email || '',
      phone: data.phone || '',
      status: data.status as any,
      profileImage: data.profile_image,
      address: data.address,
      dateOfBirth: data.date_of_birth ? new Date(data.date_of_birth).toISOString().split('T')[0] : undefined,
      joinDate: new Date(data.join_date).toISOString().split('T')[0],
      graceMonth: data.grace_month ? String(data.grace_month) : undefined,
      courseFees: data.course_fees ? String(data.course_fees) : undefined,
      courseDuration: data.course_duration || undefined,
      gracePeriodFees: data.grace_period_fees ? String(data.grace_period_fees) : undefined,
      fatherName: data.father_name || '',
      fatherPhone: data.father_phone || '',
      motherName: data.mother_name || '',
      motherPhone: data.mother_phone || '',
      guardianName: data.guardian_name || '',
      guardianPhone: data.guardian_phone || '',
      validityDate: data.validity_date ? new Date(data.validity_date).toISOString().split('T')[0] : undefined,
    };
  } catch (error) {
    console.error('Error creating student:', error);
    throw error;
  }
};

export const updateStudent = async (id: string, student: Partial<Student>): Promise<Student> => {
  const dbStudent: Record<string, any> = {};
  
  // Only add fields that are provided in the update
  if (student.name !== undefined) dbStudent.name = student.name;
  if (student.rollNo !== undefined) dbStudent.roll_no = student.rollNo;
  if (student.course !== undefined) dbStudent.course = student.course;
  if (student.batch !== undefined) dbStudent.batch = student.batch;
  if (student.email !== undefined) dbStudent.email = student.email || null;
  if (student.phone !== undefined) dbStudent.phone = student.phone || null;
  if (student.status !== undefined) dbStudent.status = student.status;
  if (student.profileImage !== undefined) dbStudent.profile_image = student.profileImage || null;
  if (student.address !== undefined) dbStudent.address = student.address || null;
  if (student.dateOfBirth !== undefined) dbStudent.date_of_birth = student.dateOfBirth || null;
  if (student.joinDate !== undefined) dbStudent.join_date = student.joinDate;
  if (student.fatherName !== undefined) dbStudent.father_name = student.fatherName || null;
  if (student.fatherPhone !== undefined) dbStudent.father_phone = student.fatherPhone || null;
  if (student.motherName !== undefined) dbStudent.mother_name = student.motherName || null;
  if (student.motherPhone !== undefined) dbStudent.mother_phone = student.motherPhone || null;
  if (student.guardianName !== undefined) dbStudent.guardian_name = student.guardianName || null;
  if (student.guardianPhone !== undefined) dbStudent.guardian_phone = student.guardianPhone || null;
  
  // Handle numeric fields with special care
  // graceMonth - ensure it's a valid integer
  if (student.graceMonth !== undefined) {
    if (student.graceMonth === '') {
      dbStudent.grace_month = 5; // Default
    } else {
      const graceMonthNum = parseInt(student.graceMonth);
      dbStudent.grace_month = isNaN(graceMonthNum) ? 5 : graceMonthNum;
    }
  }
  
  // courseFees - ensure it's a valid number
  if (student.courseFees !== undefined) {
    if (student.courseFees === '') {
      dbStudent.course_fees = null; // Allow null
    } else {
      // Preserve the exact string value to avoid floating point precision issues
      dbStudent.course_fees = student.courseFees;
    }
  }
  
  // discount - ensure it's a valid number
  if (student.discount !== undefined) {
    if (student.discount === '') {
      dbStudent.discount = null; // Allow null
    } else {
      // Preserve the exact string value to avoid floating point precision issues
      dbStudent.discount = student.discount;
    }
  }
  
  // gracePeriodFees - ensure it's a valid number
  if (student.gracePeriodFees !== undefined) {
    if (student.gracePeriodFees === '') {
      dbStudent.grace_period_fees = 500; // Default
    } else {
      // Preserve the exact string value to avoid floating point precision issues
      dbStudent.grace_period_fees = student.gracePeriodFees;
    }
  }
  
  // Handle other optional fields
  if (student.courseDuration !== undefined) {
    dbStudent.course_duration = student.courseDuration || null;
  }
  
  if (student.validityDate !== undefined) {
    dbStudent.validity_date = student.validityDate || null;
  }
  
  console.log('Updating student with data:', JSON.stringify(dbStudent, null, 2));
  
  try {
    const { data, error } = await supabase
      .from('students')
      .update(dbStudent)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase update error details:', error);
      throw error;
    }
    
    console.log('Successfully updated student, response data:', JSON.stringify(data, null, 2));

    return {
      id: data.id,
      name: data.name,
      rollNo: data.roll_no,
      course: data.course,
      batch: data.batch,
      email: data.email || '',
      phone: data.phone || '',
      status: data.status as any,
      profileImage: data.profile_image,
      address: data.address,
      dateOfBirth: data.date_of_birth ? new Date(data.date_of_birth).toISOString().split('T')[0] : undefined,
      joinDate: new Date(data.join_date).toISOString().split('T')[0],
      graceMonth: data.grace_month ? String(data.grace_month) : undefined,
      courseFees: data.course_fees ? String(data.course_fees) : undefined,
      courseDuration: data.course_duration || undefined,
      gracePeriodFees: data.grace_period_fees ? String(data.grace_period_fees) : undefined,
      fatherName: data.father_name || '',
      fatherPhone: data.father_phone || '',
      motherName: data.mother_name || '',
      motherPhone: data.mother_phone || '',
      guardianName: data.guardian_name || '',
      guardianPhone: data.guardian_phone || '',
      validityDate: data.validity_date ? new Date(data.validity_date).toISOString().split('T')[0] : undefined,
    };
  } catch (error) {
    console.error('Error updating student:', error);
    throw error;
  }
};

export const deleteStudent = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('students')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return true;
};

export const mapStudentFromDB = (student: any): Student => ({
  id: student.id,
  name: student.name,
  rollNo: student.roll_no,
  course: student.course,
  batch: student.batch,
  email: student.email,
  phone: student.phone,
  status: student.status as any,
  profileImage: student.profile_image,
  address: student.address,
  dateOfBirth: student.date_of_birth ? new Date(student.date_of_birth).toISOString().split('T')[0] : undefined,
  joinDate: new Date(student.join_date).toISOString().split('T')[0],
  graceMonth: student.grace_month ? String(student.grace_month) : undefined,
  fatherName: student.father_name || '',
  fatherPhone: student.father_phone || '',
  motherName: student.mother_name || '',
  motherPhone: student.mother_phone || '',
  guardianName: student.guardian_name || '',
  guardianPhone: student.guardian_phone || '',
  courseDuration: student.course_duration || '',
  validityDate: student.validity_date ? new Date(student.validity_date).toISOString().split('T')[0] : undefined,
  courseFees: student.course_fees ? String(student.course_fees) : '',
  gracePeriodFees: student.grace_period_fees ? String(student.grace_period_fees) : '',
  discount: student.discount ? String(student.discount) : '',
});

export const mapStudentToDB = (student: any) => {
  const mappedStudent: Record<string, any> = {
    name: student.name,
    roll_no: student.rollNo,
    course: student.course,
    batch: student.batch,
    email: student.email || null,
    phone: student.phone || null,
    status: student.status,
    profile_image: student.profileImage || null,
    address: student.address || null,
    date_of_birth: student.dateOfBirth || null,
    join_date: student.joinDate,
    father_name: student.fatherName || null,
    father_phone: student.fatherPhone || null,
    mother_name: student.motherName || null,
    mother_phone: student.motherPhone || null,
    guardian_name: student.guardianName || null,
    guardian_phone: student.guardianPhone || null,
    course_duration: student.courseDuration || null,
    validity_date: student.validityDate || null,
  };

  // Handle numeric fields with special care
  // graceMonth - ensure it's a valid integer
  if (student.graceMonth === '' || student.graceMonth === undefined) {
    mappedStudent.grace_month = 5; // Default
  } else {
    const graceMonthNum = parseInt(student.graceMonth);
    mappedStudent.grace_month = isNaN(graceMonthNum) ? 5 : graceMonthNum;
  }

  // courseFees - ensure it's a valid number
  if (student.courseFees === '' || student.courseFees === undefined) {
    mappedStudent.course_fees = null; // Allow null 
  } else {
    // Preserve the exact string value to avoid floating point precision issues
    mappedStudent.course_fees = student.courseFees;
  }

  // gracePeriodFees - ensure it's a valid number
  if (student.gracePeriodFees === '' || student.gracePeriodFees === undefined) {
    mappedStudent.grace_period_fees = 500; // Default
  } else {
    // Preserve the exact string value to avoid floating point precision issues
    mappedStudent.grace_period_fees = student.gracePeriodFees;
  }
  
  return mappedStudent;
};
// ... add any other student-related functions as needed ... 