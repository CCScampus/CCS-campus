import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// This is a placeholder for the actual teacher type
interface Teacher {
  id: string;
  name: string;
  email: string;
  created_at?: string;
  updated_at?: string;
  updated_by?: string;
}

const TeacherManagementPage = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddTeacherDialogOpen, setIsAddTeacherDialogOpen] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [newTeacherPassword, setNewTeacherPassword] = useState('');

  const { session } = useAuth();

  const fetchTeachers = async () => {
    if (!session) return;
    setIsLoading(true);
    console.log('Fetching teachers...');
    
    try {
      // Try Edge Function first (now it uses service role to fetch real data)
      console.log('Attempting to fetch teachers from Edge Function...');
      
      const response = await fetch('https://rmhfbsmtmlsjvzvallkv.supabase.co/functions/v1/teacher-management', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': supabase.supabaseKey,
        }
      });
      
      if (response.ok) {
        const edgeData = await response.json();
        console.log('Teachers fetched from Edge Function:', edgeData);
        setTeachers(edgeData || []);
        setIsLoading(false);
        return;
      }
      
      console.error('Edge Function failed with status:', response.status);
      
      // Fallback to direct database query if Edge Function fails
      console.log('Falling back to direct database query...');
      const { data, error } = await supabase
        .from('teachers')
        .select('*');
      
      if (error) {
        console.error('Error fetching teachers from database:', error);
        toast.error('Failed to fetch teachers from database');
        setIsLoading(false);
        return;
      }
      
      console.log('Teachers fetched from database:', data);
      setTeachers(data || []);
    } catch (err: any) {
      console.error('Error fetching teachers:', err);
      toast.error('Failed to fetch teachers.', { description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, [session]);

  const handleAddTeacher = async () => {
    if (!session) return;
    console.log('Adding new teacher:', { name: newTeacherName, email: newTeacherEmail });
    if (!newTeacherName || !newTeacherEmail || !newTeacherPassword) {
      toast.error('All fields are required.');
      return;
    }

    try {
      // For adding teachers, we still need to use the Edge Function due to auth operations
      // But let's make the fallback the primary approach
      console.log('Attempting to add teacher via direct fetch...');
      const response = await fetch('https://rmhfbsmtmlsjvzvallkv.supabase.co/functions/v1/teacher-management', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': supabase.supabaseKey,
        },
        body: JSON.stringify({ 
          name: newTeacherName, 
          email: newTeacherEmail, 
          password: newTeacherPassword 
        }),
      });
      
      if (!response.ok) {
        // If direct fetch fails, try the original approach
        console.error('Direct fetch failed with status:', response.status);
        
        // Try to get more details about the error
        try {
          const errorData = await response.json();
          console.error('Error details:', errorData);
        } catch (jsonError) {
          console.error('Could not parse error response:', jsonError);
        }
        
        const { data, error } = await supabase.functions.invoke('teacher-management', {
          method: 'POST',
          body: { name: newTeacherName, email: newTeacherEmail, password: newTeacherPassword },
        });
        
        if (error) {
          console.error('Supabase invoke also failed:', error);
          throw new Error('Failed to add teacher: ' + error.message);
        }
        
        console.log('Teacher added via Supabase client:', data);
      } else {
        const directData = await response.json();
        console.log('Teacher added via direct fetch:', directData);
      }
      
      toast.success('Teacher added successfully!');
      setNewTeacherName('');
      setNewTeacherEmail('');
      setNewTeacherPassword('');
      setIsAddTeacherDialogOpen(false);
      fetchTeachers(); // Refresh the list
    } catch (err: any) {
      console.error('Error adding teacher:', err);
      toast.error('Failed to add teacher.', { description: err.message });
    }
  };

  const handleDeleteTeacher = async (userId: string) => {
    if (!session) return;
    if (!window.confirm('Are you sure you want to delete this teacher? This action is irreversible.')) {
      return;
    }
    console.log('Deleting teacher with user_id:', userId);
    try {
      // Use the edge function to delete the teacher with admin privileges
      const response = await fetch('https://rmhfbsmtmlsjvzvallkv.supabase.co/functions/v1/teacher-management', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': supabase.supabaseKey,
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete teacher');
      }
      
      toast.success('Teacher deleted successfully!');
      fetchTeachers(); // Refresh the list
    } catch (err: any) {
      console.error('Error deleting teacher:', err);
      toast.error('Failed to delete teacher.', { description: err.message });
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Teacher Management</h1>

      <div className="mb-4">
        <Dialog open={isAddTeacherDialogOpen} onOpenChange={setIsAddTeacherDialogOpen}>
          <DialogTrigger asChild>
            <Button>Add New Teacher</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Teacher</DialogTitle>
              <DialogDescription>
                Enter the new teacher's details. A welcome email will be sent.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input id="name" value={newTeacherName} onChange={(e) => setNewTeacherName(e.target.value)} className="col-span-3" placeholder="e.g. John Doe" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">Email</Label>
                <Input id="email" type="email" value={newTeacherEmail} onChange={(e) => setNewTeacherEmail(e.target.value)} className="col-span-3" placeholder="e.g. john.doe@example.com" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password"className="text-right">Password</Label>
                <Input id="password" type="password" value={newTeacherPassword} onChange={(e) => setNewTeacherPassword(e.target.value)} className="col-span-3" placeholder="A strong password" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleAddTeacher}>Save Teacher</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && <p>Loading teachers...</p>}

      {!isLoading && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teachers.map((teacher) => (
              <TableRow key={teacher.id}>
                <TableCell>{teacher.name}</TableCell>
                <TableCell>{teacher.email}</TableCell>
                <TableCell>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteTeacher(teacher.id)}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
       { !isLoading && teachers.length === 0 && (
          <div className="text-center py-10">
            <p className="text-gray-500">No teachers found.</p>
            <p className="text-gray-500">Click "Add New Teacher" to get started.</p>
          </div>
        )
      }
    </div>
  );
};

export default TeacherManagementPage; 