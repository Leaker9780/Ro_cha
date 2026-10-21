import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, isValid } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function safeFormatDate(dateInput: any, outputFormat = 'dd/MM/yyyy'): string {
  if (!dateInput) return '-';
  try {
    let parsed: Date;
    if (dateInput instanceof Date) {
      parsed = dateInput;
    } else if (typeof dateInput === 'string') {
      const cleanStr = dateInput.trim();
      if (cleanStr.includes('T')) {
        parsed = new Date(cleanStr);
      } else if (cleanStr.includes('-')) {
        const parts = cleanStr.split('-').map(Number);
        if (parts.length >= 3 && !parts.some(isNaN)) {
          parsed = new Date(parts[0], parts[1] - 1, parts[2]);
        } else {
          parsed = new Date(cleanStr);
        }
      } else if (cleanStr.includes('/')) {
        const parts = cleanStr.split('/').map(Number);
        if (parts.length >= 3 && !parts.some(isNaN)) {
          parsed = new Date(parts[2], parts[1] - 1, parts[0]);
        } else {
          parsed = new Date(cleanStr);
        }
      } else {
        parsed = new Date(cleanStr);
      }
    } else if (typeof dateInput === 'number') {
      parsed = new Date(dateInput);
    } else {
      return '-';
    }

    return isValid(parsed) && !isNaN(parsed.getTime()) ? format(parsed, outputFormat) : '-';
  } catch {
    return '-';
  }
}
