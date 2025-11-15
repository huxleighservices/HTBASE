import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizePhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return '';
  // Remove all non-numeric characters from the string
  const digitsOnly = phoneNumber.replace(/\D/g, '');

  // If the number is 10 digits (e.g., 5551234567), prepend '+1'
  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  }

  // If the number is 11 digits and starts with '1' (e.g., 15551234567), prepend '+'
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return `+${digitsOnly}`;
  }
  
  // If the number already starts with '+', assume it's in a valid E.164 format
  if (digitsOnly.startsWith('+')) {
    return digitsOnly;
  }
  
  // If it's already in E.164 format but without the '+'
  if (phoneNumber.startsWith('+') && phoneNumber.length > 10) {
    return phoneNumber;
  }


  // Return the original number if it doesn't match expected formats for robust fallback
  // The Twilio extension might still reject it, but we've handled the most common cases.
  return phoneNumber;
}
