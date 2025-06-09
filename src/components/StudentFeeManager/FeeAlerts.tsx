import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";

interface FeeAlertsProps {
  isLate: boolean;
  graceFeeAmount: number;
  dueDate: string;
  graceUntilDate: string;
  graceMonth: number;
}

export function FeeAlerts({ isLate, graceFeeAmount, dueDate, graceUntilDate, graceMonth }: FeeAlertsProps) {
  const due = new Date(dueDate);
  const graceUntil = graceUntilDate ? new Date(graceUntilDate) : null;

  return (
    <div className="space-y-4">
      {graceMonth > 0 && graceUntil && (
        <Alert>
          <AlertTitle>Grace Period Information</AlertTitle>
          <AlertDescription>
            Due date: {due.toLocaleDateString()}<br />
            Grace period: {graceMonth} months (until {graceUntil.toLocaleDateString()})
          </AlertDescription>
        </Alert>
      )}

      {isLate && (
        <Alert variant="destructive">
          <ExclamationTriangleIcon className="h-4 w-4" />
          <AlertTitle>Late Fee Warning</AlertTitle>
          <AlertDescription>
            This fee is past its grace period. A late fee of {graceFeeAmount} will be applied.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
} 