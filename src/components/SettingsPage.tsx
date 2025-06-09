import React, { useState } from 'react';
import { useSystemDefaults, SystemDefaults } from '@/hooks/useSystemDefaults';

export default function SettingsPage() {
  const { defaults, loading, error, updateDefaults, resetToDefault } = useSystemDefaults();
  const [activeTab, setActiveTab] = useState('financial');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    setIsSaving(true);
    setSaveSuccess(false);
    
    const updates: Partial<SystemDefaults> = {
      grace_period_months: parseInt(formData.get('grace_period_months') as string) || 5,
      grace_fee: parseFloat(formData.get('grace_fee') as string) || 0,
      batch_format: formData.get('batch_format') as string,
      min_payment: parseFloat(formData.get('min_payment') as string) || 0,
      attendance_threshold: parseInt(formData.get('attendance_threshold') as string) || 80,
      currency: formData.get('currency') as string,
    };
    
    await updateDefaults(updates);
    setIsSaving(false);
    setSaveSuccess(true);
    
    // Hide success message after 3 seconds
    setTimeout(() => {
      setSaveSuccess(false);
    }, 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 max-w-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading settings</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!defaults) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 max-w-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">No settings found</h3>
              <div className="mt-2 text-sm text-yellow-700">
                Please check your database connection or run the setup SQL.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
          <p className="mt-2 text-sm text-gray-600">
            Configure system-wide default values and preferences
          </p>
        </div>
        
        {/* Success message */}
        {saveSuccess && (
          <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">
                  Settings saved successfully
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Tabs */}
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('financial')}
            className={`${
              activeTab === 'financial'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Financial
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`${
              activeTab === 'notifications'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Notifications
          </button>
          <button
            onClick={() => setActiveTab('formatting')}
            className={`${
              activeTab === 'formatting'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Formatting
          </button>
        </nav>
        
        {/* Settings Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-8">
          {/* Financial Settings */}
          {activeTab === 'financial' && (
            <div className="space-y-6">
              <div>
                <label htmlFor="grace_period_months" className="block text-sm font-medium text-gray-700">
                  Grace Period (Months)
                </label>
                <input
                  type="number"
                  name="grace_period_months"
                  id="grace_period_months"
                  defaultValue={defaults.grace_period_months}
                  min="0"
                  max="12"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              
              <div>
                <label htmlFor="grace_fee" className="block text-sm font-medium text-gray-700">
                  Late Fee Amount
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">₹</span>
                  </div>
                  <input
                    type="number"
                    name="grace_fee"
                    id="grace_fee"
                    defaultValue={defaults.grace_fee}
                    min="0"
                    step="0.01"
                    className="mt-1 block w-full pl-7 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="min_payment" className="block text-sm font-medium text-gray-700">
                  Minimum Payment Amount
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">₹</span>
                  </div>
                  <input
                    type="number"
                    name="min_payment"
                    id="min_payment"
                    defaultValue={defaults.min_payment}
                    min="0"
                    step="0.01"
                    className="mt-1 block w-full pl-7 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Notification Settings */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="notif_fee"
                        name="notif_fee"
                        type="checkbox"
                        defaultChecked={defaults.notif_fee}
                        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="notif_fee" className="font-medium text-gray-700">Fee Notifications</label>
                      <p className="text-gray-500">Receive notifications about fee payments and due dates</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="notif_attendance"
                        name="notif_attendance"
                        type="checkbox"
                        defaultChecked={defaults.notif_attendance}
                        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="notif_attendance" className="font-medium text-gray-700">Attendance Notifications</label>
                      <p className="text-gray-500">Receive notifications about attendance updates</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="notif_system"
                        name="notif_system"
                        type="checkbox"
                        defaultChecked={defaults.notif_system}
                        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="notif_system" className="font-medium text-gray-700">System Notifications</label>
                      <p className="text-gray-500">Receive important system updates and announcements</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Formatting Settings */}
          {activeTab === 'formatting' && (
            <div className="space-y-6">
              <div>
                <label htmlFor="batch_format" className="block text-sm font-medium text-gray-700">
                  Batch Format
                </label>
                <input
                  type="text"
                  name="batch_format"
                  id="batch_format"
                  defaultValue={defaults.batch_format}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Use YYYY for year placeholder (e.g., YYYY-BATCH)
                </p>
              </div>
              
              <div>
                <label htmlFor="attendance_threshold" className="block text-sm font-medium text-gray-700">
                  Attendance Threshold (%)
                </label>
                <input
                  type="number"
                  name="attendance_threshold"
                  id="attendance_threshold"
                  defaultValue={defaults.attendance_threshold}
                  min="0"
                  max="100"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
          )}
          
          {/* Save and Reset buttons */}
          <div className="pt-5">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  // Reset all fields in the current tab
                  const fieldsToReset = activeTab === 'financial' 
                    ? ['grace_period_months', 'grace_fee', 'min_payment']
                    : activeTab === 'notifications'
                    ? ['notif_fee', 'notif_attendance', 'notif_system']
                    : ['batch_format', 'attendance_threshold'];
                  
                  fieldsToReset.forEach(field => resetToDefault(field as keyof SystemDefaults));
                }}
                className="mr-3 bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Reset to Default
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                  isSaving 
                    ? 'bg-blue-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                }`}
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save Settings'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
} 