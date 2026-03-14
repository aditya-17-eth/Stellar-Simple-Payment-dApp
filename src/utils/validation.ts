/**
 * Input validation utilities for user inputs
 * Ensures data integrity before processing transactions
 */

import { isValidStellarAddress } from './stellar';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates a numeric amount input
 * 
 * @param amount - The amount string to validate
 * @param fieldName - Name of the field for error messages
 * @param maxDecimals - Maximum decimal places allowed (default: 7 for Stellar)
 * @returns Validation result with error message if invalid
 */
export function validateAmount(
  amount: string,
  fieldName: string = 'Amount',
  maxDecimals: number = 7
): ValidationResult {
  // Check if empty
  if (!amount || amount.trim() === '') {
    return {
      isValid: false,
      error: `${fieldName} is required`,
    };
  }

  // Check if valid number
  const numValue = parseFloat(amount);
  if (isNaN(numValue)) {
    return {
      isValid: false,
      error: `${fieldName} must be a valid number`,
    };
  }

  // Check if positive
  if (numValue <= 0) {
    return {
      isValid: false,
      error: `${fieldName} must be greater than 0`,
    };
  }

  // Check decimal places
  const decimalPart = amount.split('.')[1];
  if (decimalPart && decimalPart.length > maxDecimals) {
    return {
      isValid: false,
      error: `${fieldName} cannot have more than ${maxDecimals} decimal places`,
    };
  }

  return { isValid: true };
}

/**
 * Validates a Stellar address
 * 
 * @param address - The address to validate
 * @param fieldName - Name of the field for error messages
 * @returns Validation result with error message if invalid
 */
export function validateStellarAddress(
  address: string,
  fieldName: string = 'Address'
): ValidationResult {
  // Check if empty
  if (!address || address.trim() === '') {
    return {
      isValid: false,
      error: `${fieldName} is required`,
    };
  }

  // Check if valid Stellar format
  if (!isValidStellarAddress(address)) {
    return {
      isValid: false,
      error: `${fieldName} must be a valid Stellar address (starting with G)`,
    };
  }

  return { isValid: true };
}

/**
 * Validates that an amount doesn't exceed available balance
 * 
 * @param amount - The amount to send
 * @param balance - Available balance
 * @param reserve - Minimum reserve to maintain (default: 1 XLM for Stellar)
 * @returns Validation result with error message if invalid
 */
export function validateBalance(
  amount: string,
  balance: string,
  reserve: number = 1
): ValidationResult {
  const numAmount = parseFloat(amount);
  const numBalance = parseFloat(balance);

  if (isNaN(numAmount) || isNaN(numBalance)) {
    return {
      isValid: false,
      error: 'Invalid amount or balance',
    };
  }

  if (numAmount > numBalance - reserve) {
    return {
      isValid: false,
      error: `Insufficient balance. Keep at least ${reserve} XLM as reserve.`,
    };
  }

  return { isValid: true };
}
