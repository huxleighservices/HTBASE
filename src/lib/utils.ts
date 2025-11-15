import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizePhoneNumber(phoneNumber: string): string {
  // Remove all non-numeric characters from the string
  const digitsOnly = phoneNumber.replace(/\D/g, '');

  // If the number is 10 digits, prepend '+1'
  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  }

  // If the number is 11 digits and starts with '1', prepend '+'
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return `+${digitsOnly}`;
  }
  
  // If the number already starts with '+', assume it's in a valid format
  if (phoneNumber.startsWith('+')) {
    return phoneNumber;
  }

  // Return the original number if it doesn't match expected formats,
  // though it might still fail.
  return phoneNumber;
}
