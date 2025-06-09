export function formatCurrency(amount: number | string) {
  const num = typeof amount === 'string' ? Number(amount) : amount;
  return num.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
} 