import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "./utils";

interface Payment {
  id: string;
  amount: number;
  date: string;
  method: string;
  reference?: string;
}

interface PaymentHistoryProps {
  payments: Payment[];
}

export function PaymentHistory({ payments }: PaymentHistoryProps) {
  if (!payments || payments.length === 0) {
    return <p className="text-sm text-gray-500 mt-2">No payments recorded yet.</p>;
  }
  return (
    <div className="mt-2 border rounded-md divide-y">
      {payments.map((payment) => (
        <div 
          key={payment.id} 
          className="p-3 flex justify-between items-center"
        >
          <div>
            <div className="font-medium flex items-center">
              {formatCurrency(payment.amount)}
              {payment.reference === 'LATE_FEE' && 
                <Badge variant="destructive" className="ml-2">Penalty</Badge>
              }
            </div>
            <div className="text-sm text-gray-500">
              {new Date(payment.date).toLocaleDateString()} • {payment.method}
              {payment.reference && ` • Ref: ${payment.reference}`}
            </div>
          </div>
          {payment.reference === 'LATE_FEE' ? (
            <div className="text-red-600 font-medium">
              +{formatCurrency(payment.amount)}
            </div>
          ) : (
            <div className="text-green-600 font-medium">
              -{formatCurrency(payment.amount)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
} 