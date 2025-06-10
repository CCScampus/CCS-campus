# Setting Up EmailJS for Fee Reminders

This guide will help you set up EmailJS to send fee reminders directly from the CCS Campus application.

## Step 1: Create an EmailJS Account

1. Go to [EmailJS](https://www.emailjs.com/) and sign up for an account
2. After signing up, you'll be directed to the dashboard

## Step 2: Add an Email Service

1. In the EmailJS dashboard, navigate to "Email Services"
2. Click "Add New Service"
3. Choose your preferred email provider (Gmail, Outlook, etc.)
4. Follow the authentication steps to connect your email account
5. Name your service and note the **Service ID** for later use

## Step 3: Create an Email Template

1. In the EmailJS dashboard, navigate to "Email Templates"
2. Click "Create New Template"
3. In the template editor, set up your template with the following variables:
   - `{{student_name}}` - The student's name
   - `{{amount}}` - The due amount
   - `{{due_date}}` - The due date
   - `{{course}}` - The student's course
   - `{{batch}}` - The student's batch
   - `{{roll_no}}` - The student's roll number

4. You can use the following template as a starting point:

```
Hello {{student_name}},

This is a friendly reminder that you have a pending fee payment of ₹{{amount}} due on {{due_date}}.

Kindly make the payment as soon as possible to avoid any late fees or inconvenience.

If you've already completed the payment, please ignore this message.

Regards,
CCS Campus Admin
```

5. Save the template and note the **Template ID**

## Step 4: Get Your Public Key

1. In the EmailJS dashboard, navigate to "Account" > "API Keys"
2. Copy your **Public Key**

## Step 5: Update the Application Code

1. Open `src/lib/email-service.ts`
2. Replace the placeholder values with your actual EmailJS credentials:
   ```typescript
   // Replace with your actual EmailJS public key
   emailjs.init("YOUR_PUBLIC_KEY");
   
   // Replace these with your actual EmailJS service ID and template ID
   const serviceId = "YOUR_SERVICE_ID";
   const templateId = "YOUR_TEMPLATE_ID";
   ```

## Step 6: Test the Integration

1. Run the application
2. Navigate to a student with a pending fee
3. Click "Send Reminder"
4. Check that the email is sent successfully

## Troubleshooting

- If emails are not being sent, check the browser console for any error messages
- Verify that your EmailJS credentials are correct
- Make sure your email service is properly connected
- Check that the template variables match the ones used in the code

## EmailJS Free Plan Limitations

- The free plan allows 200 emails per month
- For higher volume, consider upgrading to a paid plan

For more information, visit the [EmailJS documentation](https://www.emailjs.com/docs/).