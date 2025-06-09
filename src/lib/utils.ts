import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function generateBatchOptions(format?: string): string[] {
  const options: string[] = [];
  const startYear = 2020;
  const endYear = 2030;

  for (let year = startYear; year <= endYear; year++) {
    if (format === 'year-only') {
      options.push(`${year}`);
    } else {
      options.push(`${year}-${year + 1}`);
    }
  }

  return options;
}

export function formatBatch(year: number | string): string {
  const yearNum = Number(year);
  return `${yearNum}-${yearNum + 1}`;
}

export function getCurrentBatch(): string {
  const currentYear = new Date().getFullYear();
  return formatBatch(currentYear);
}

export function isValidBatch(batch: string): boolean {
  const regex = new RegExp('^\\d{4}-\\d{4}$');
  if (!regex.test(batch)) return false;
  
  const [startYear, endYear] = batch.split('-').map(Number);
  return endYear === startYear + 1 && startYear >= 2020 && startYear <= 2030;
}

/**
 * Calculate GST amount and base amount from total fee
 * @param totalAmount The base amount (course fee) before GST
 * @param gstPercentage The GST percentage (default: 9%)
 * @returns Object containing baseAmount, gstAmount, totalWithGST, and gstPercentage
 */
export function calculateGSTComponents(baseAmount: number, gstPercentage: number = 9) {
  // Calculate GST amount on top of base amount
  const gstAmount = (baseAmount * gstPercentage) / 100;
  const totalWithGST = baseAmount + gstAmount;
  
  return {
    baseAmount: Math.round(baseAmount * 100) / 100, // Round to 2 decimal places
    gstAmount: Math.round(gstAmount * 100) / 100,
    totalWithGST: Math.round(totalWithGST * 100) / 100,
    gstPercentage
  };
}
