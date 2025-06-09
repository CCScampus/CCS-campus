import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { useSystemDefaults } from "@/hooks/useSystemDefaults";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const Settings = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("account");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [feeReminders, setFeeReminders] = useState(true);
  const [attendanceAlerts, setAttendanceAlerts] = useState(true);
  const [systemUpdates, setSystemUpdates] = useState(true);
  
  // Form values state
  const [formValues, setFormValues] = useState({
    grace_period_months: 5,
    grace_fee: 500,
    batch_format: 'YYYY-BATCH',
    course_list: ["BCA", "BBA", "MCA", "MBA", "BSc", "MSc", "BA", "MA"],
    min_payment: 500,
    attendance_threshold: 80,
    _newCourse: '', // For tracking new course input
  });

  // System defaults state from hook
  const { defaults, loading, error, updateDefaults, resetToDefault } = useSystemDefaults();

  // Update form values when defaults change
  useEffect(() => {
    if (defaults) {
      setFormValues(prev => ({
        ...defaults,
        _newCourse: prev._newCourse || '' // Preserve the _newCourse value
      }));
    }
  }, [defaults]);

  const handleInputChange = (key: string, value: any) => {
    // For number inputs, handle empty or invalid values
    if (typeof value === 'number' && isNaN(value)) {
      // Set to 0 or the default value for that field
      const defaultValue = {
        grace_period_months: 0,
        grace_fee: 0,
        min_payment: 0,
        attendance_threshold: 0
      }[key] || 0;
      
      setFormValues(prev => ({ ...prev, [key]: defaultValue }));
      return;
    }
    
    // Special handling for course_list
    if (key === 'course_list') {
      if (typeof value === 'string') {
        // Handle both CR+LF (\r\n) and LF (\n) line endings
        const normalizedValue = value.replace(/\r\n/g, '\n');
        
        // Split by newline, keep empty lines for editing convenience
        const courses = normalizedValue
          .split('\n')
          .map(course => course.trim())
          .filter((course, index, array) => {
            // Keep empty lines that are not at the end of the array
            // This helps when user is actively typing new courses
            if (course === '' && index === array.length - 1) {
              return array.length <= 1; // Keep if it's the only line
            }
            return true;
          });
        
        console.log('Parsed courses:', courses);
        setFormValues(prev => ({ ...prev, [key]: courses.filter(Boolean) }));
      } else if (Array.isArray(value)) {
        // If it's already an array, ensure each item is trimmed
        const courses = value.map(course => course.trim()).filter(Boolean);
        setFormValues(prev => ({ ...prev, [key]: courses }));
      }
      return;
    }
    
    setFormValues(prev => ({ ...prev, [key]: value }));
  };

  const handleUpdate = async (key: string, value: any) => {
    try {
      // If updating course_list, make sure we don't send internal state fields
      if (key === 'course_list') {
        await updateDefaults({ [key]: value });
      } else {
        await updateDefaults({ [key]: value });
      }
      
      // Special handling for course_list display
      let description = '';
      if (key === 'course_list') {
        if (Array.isArray(value) && value.length > 0) {
          description = `Course list updated. Now includes ${value.length} courses: ${value.slice(0, 3).join(', ')}${value.length > 3 ? '...' : ''}`;
        } else {
          description = "Course list updated.";
        }
      } else {
        // For other settings
        const displayValue = typeof value === 'object' ? JSON.stringify(value) : value.toString();
        description = `System default ${key.replace('_', ' ')} updated to ${displayValue}.`;
      }
      
      toast({
        title: "Updated",
        description: description,
      });
    } catch (error) {
      console.error("Error updating system defaults:", error);
      toast({
        title: "Error",
        description: "Failed to update setting. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    toast({
      title: "Profile updated",
      description: "Your profile information has been saved.",
    });
  };

  const handleNotificationsSubmit = (e) => {
    e.preventDefault();
    toast({
      title: "Notification settings updated",
      description: "Your notification preferences have been saved.",
    });
  };

  const [newEmail, setNewEmail] = useState("");
  const [currentPasswordForEmail, setCurrentPasswordForEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const handleChangeEmail = async (e) => {
    e.preventDefault();
    if (!newEmail || !currentPasswordForEmail) return;
    // Re-authenticate user (Supabase does not require password for email change, but you may want to verify)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email,
      password: currentPasswordForEmail,
    });
    if (signInError) {
      toast({ title: "Error", description: "Current password is incorrect.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Email updated. Please check your inbox to confirm the new email." });
      setNewEmail("");
      setCurrentPasswordForEmail("");
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmNewPassword) return;
    if (newPassword !== confirmNewPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }
    // Re-authenticate user
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email,
      password: currentPassword,
    });
    if (signInError) {
      toast({ title: "Error", description: "Current password is incorrect.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Password updated successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="defaults">System Defaults</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>
                Update your account settings and preferences.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Separator className="my-6" />
              {/* Change Email */}
              <form onSubmit={handleChangeEmail} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">New Email</label>
                  <Input type="email" className="w-64" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Enter new email" required />
                </div>
                <div>
                  <label className="text-sm font-medium">Current Password</label>
                  <Input type="password" className="w-64" value={currentPasswordForEmail} onChange={e => setCurrentPasswordForEmail(e.target.value)} placeholder="Enter current password" required />
                </div>
                <Button type="submit">Change Email</Button>
              </form>
              <Separator className="my-6" />
              {/* Change Password */}
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Current Password</label>
                  <Input type="password" className="w-64" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Enter current password" required />
                </div>
                <div>
                  <label className="text-sm font-medium">New Password</label>
                  <Input type="password" className="w-64" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Enter new password" required />
                </div>
                <div>
                  <label className="text-sm font-medium">Confirm New Password</label>
                  <Input type="password" className="w-64" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} placeholder="Confirm new password" required />
                </div>
                <Button type="submit">Change Password</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>
                Configure how you receive notifications.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleNotificationsSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">Enable Notifications</label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications about important updates
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationsEnabled}
                      onChange={(e) => setNotificationsEnabled(e.target.checked)}
                      className="h-4 w-4"
                    />
                  </div>
                  <Separator />
                  <div className="space-y-4">
                    <label className="text-sm font-medium">Notification Types</label>
                    <div className="grid gap-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={feeReminders}
                          onChange={(e) => setFeeReminders(e.target.checked)}
                          disabled={!notificationsEnabled}
                          className="h-4 w-4"
                        />
                        <label>Fee Reminders</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={attendanceAlerts}
                          onChange={(e) => setAttendanceAlerts(e.target.checked)}
                          disabled={!notificationsEnabled}
                          className="h-4 w-4"
                        />
                        <label>Attendance Alerts</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={systemUpdates}
                          onChange={(e) => setSystemUpdates(e.target.checked)}
                          disabled={!notificationsEnabled}
                          className="h-4 w-4"
                        />
                        <label>System Updates</label>
                      </div>
                    </div>
                  </div>
                </div>
                <Button type="submit">Save Preferences</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="defaults" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>System Defaults</CardTitle>
              <CardDescription>
                Configure system-wide default settings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Grace Period */}
                <div className="flex items-end justify-between">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Grace Period (Months)</label>
                    <div className="flex items-center gap-2">
                      <Input 
                        type="number" 
                        min={0} 
                        max={12}
                        value={formValues.grace_period_months || ''} 
                        onChange={e => handleInputChange('grace_period_months', e.target.value === '' ? 0 : parseInt(e.target.value))} 
                        className="w-32" 
                        placeholder="0-12"
                      />
                      <span className="text-sm text-muted-foreground">Current: {defaults?.grace_period_months ?? 5} months</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Number of months before late fees apply</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={async () => {
                        try {
                          await resetToDefault('grace_period_months');
                          toast({
                            title: "Reset successful",
                            description: "Grace period has been reset to default value.",
                          });
                        } catch (error) {
                          toast({
                            title: "Reset failed",
                            description: "Failed to reset grace period. Please try again.",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      Reset
                    </Button>
                    <Button size="sm" onClick={() => handleUpdate('grace_period_months', formValues.grace_period_months)}>Update</Button>
                  </div>
                </div>

                {/* Grace Fee */}
                <div className="flex items-end justify-between">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Grace Fee</label>
                    <div className="flex items-center gap-2">
                      <Input 
                        type="number" 
                        min={0}
                        step="0.01"
                        value={formValues.grace_fee || ''} 
                        onChange={e => handleInputChange('grace_fee', e.target.value === '' ? 0 : parseFloat(e.target.value))} 
                        className="w-32" 
                        placeholder="0.00"
                      />
                      <span className="text-sm text-muted-foreground">Current: {defaults?.grace_fee ?? 500}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Fee amount charged after grace period</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={async () => {
                        try {
                          await resetToDefault('grace_fee');
                          // Update form values with default grace fee
                          setFormValues(prev => ({
                            ...prev,
                            grace_fee: 500
                          }));
                          toast({
                            title: "Reset successful",
                            description: "Grace fee has been reset to default value.",
                          });
                        } catch (error) {
                          toast({
                            title: "Reset failed",
                            description: "Failed to reset grace fee. Please try again.",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      Reset
                    </Button>
                    <Button size="sm" onClick={() => handleUpdate('grace_fee', formValues.grace_fee)}>Update</Button>
                  </div>
                </div>

                {/* Batch Format */}
                <div className="flex items-end justify-between">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Batch Format</label>
                    <div className="flex items-center gap-2">
                      <Input 
                        type="text"
                        value={formValues.batch_format} 
                        onChange={e => handleInputChange('batch_format', e.target.value)} 
                        className="w-48" 
                        placeholder="YYYY-BATCH"
                      />
                      <span className="text-sm text-muted-foreground">Current: {defaults?.batch_format ?? 'YYYY-BATCH'}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Format for batch numbers (e.g., YYYY-BATCH)</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => resetToDefault('batch_format')}>Reset</Button>
                    <Button size="sm" onClick={() => handleUpdate('batch_format', formValues.batch_format)}>Update</Button>
                  </div>
                </div>

                {/* Course List */}
                <div className="flex items-end justify-between">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Course List</label>
                    <div className="space-y-2 max-w-md">
                      {/* Current courses display */}
                      <div className="border rounded p-3 bg-gray-50 max-h-60 overflow-y-auto">
                        {Array.isArray(formValues.course_list) && formValues.course_list.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {formValues.course_list.map((course, index) => (
                              <div key={index} className="bg-white border rounded px-2 py-1 flex items-center text-sm">
                                <span>{course}</span>
                                <button
                                  type="button"
                                  className="ml-2 text-gray-500 hover:text-red-500"
                                  onClick={() => {
                                    const updatedCourses = [...formValues.course_list];
                                    updatedCourses.splice(index, 1);
                                    setFormValues(prev => ({ ...prev, course_list: updatedCourses }));
                                  }}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-gray-500 text-sm">No courses added yet</div>
                        )}
                      </div>
                      
                      {/* Add new course input */}
                      <div className="flex">
                        <Input
                          type="text"
                          placeholder="Enter a course name"
                          className="mr-2"
                          value={formValues._newCourse || ''}
                          onChange={(e) => {
                            setFormValues(prev => ({ ...prev, _newCourse: e.target.value }));
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && formValues._newCourse?.trim()) {
                              e.preventDefault();
                              const newCourse = formValues._newCourse.trim();
                              if (!formValues.course_list.includes(newCourse)) {
                                setFormValues(prev => ({
                                  ...prev,
                                  course_list: [...prev.course_list, newCourse],
                                  _newCourse: ''
                                }));
                              }
                            }
                          }}
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            if (formValues._newCourse?.trim()) {
                              const newCourse = formValues._newCourse.trim();
                              if (!formValues.course_list.includes(newCourse)) {
                                setFormValues(prev => ({
                                  ...prev,
                                  course_list: [...prev.course_list, newCourse],
                                  _newCourse: ''
                                }));
                              }
                            }
                          }}
                        >
                          Add
                        </Button>
                      </div>
                      
                      <div className="text-xs text-blue-600">
                        Enter a course name and press Enter or click Add to add it to the list
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        Current system courses: {Array.isArray(defaults?.course_list) 
                          ? defaults.course_list.join(', ') 
                          : ["BCA", "BBA", "MCA", "MBA", "BSc", "MSc", "BA", "MA"].join(', ')}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">List of available courses for students</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={async () => {
                        try {
                          await resetToDefault('course_list');
                          // Update form values with default course list
                          setFormValues(prev => ({
                            ...prev,
                            course_list: ["BCA", "BBA", "MCA", "MBA", "BSc", "MSc", "BA", "MA"],
                            _newCourse: '' // Clear the new course input
                          }));
                          toast({
                            title: "Reset successful",
                            description: "Course list has been reset to default values.",
                          });
                        } catch (error) {
                          toast({
                            title: "Reset failed",
                            description: "Failed to reset course list. Please try again.",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      Reset
                    </Button>
                    <Button size="sm" onClick={() => handleUpdate('course_list', formValues.course_list)}>Update</Button>
                  </div>
                </div>

                {/* Minimum Payment */}
                <div className="flex items-end justify-between">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Minimum Payment</label>
                    <div className="flex items-center gap-2">
                      <Input 
                        type="number" 
                        min={0}
                        step="0.01"
                        value={formValues.min_payment || ''} 
                        onChange={e => handleInputChange('min_payment', e.target.value === '' ? 0 : parseFloat(e.target.value))} 
                        className="w-32" 
                        placeholder="500.00"
                      />
                      <span className="text-sm text-muted-foreground">Current: {defaults?.min_payment ?? 500}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Minimum allowed payment amount</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => resetToDefault('min_payment')}>Reset</Button>
                    <Button size="sm" onClick={() => handleUpdate('min_payment', formValues.min_payment)}>Update</Button>
                  </div>
                </div>

                {/* Attendance Threshold */}
                <div className="flex items-end justify-between">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Attendance Threshold (%)</label>
                    <div className="flex items-center gap-2">
                      <Input 
                        type="number" 
                        min={0} 
                        max={100}
                        value={formValues.attendance_threshold || ''} 
                        onChange={e => handleInputChange('attendance_threshold', e.target.value === '' ? 0 : parseInt(e.target.value))} 
                        className="w-32" 
                        placeholder="0-100"
                      />
                      <span className="text-sm text-muted-foreground">Current: {defaults?.attendance_threshold ?? 80}%</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Minimum attendance percentage required</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => resetToDefault('attendance_threshold')}>Reset</Button>
                    <Button size="sm" onClick={() => handleUpdate('attendance_threshold', formValues.attendance_threshold)}>Update</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;