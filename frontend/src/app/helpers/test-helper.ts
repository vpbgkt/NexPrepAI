// Firebase Phone OTP Authentication Test Helpers

/**
 * List of Firebase test phone numbers
 */
const TEST_PHONE_NUMBERS = [
  '+11234567890',
  '+16505551234'
];

/**
 * Checks if a phone number is a Firebase test phone number
 * @param phoneNumber The phone number to check
 * @returns True if it's a test phone number
 */
export function isFirebaseTestPhoneNumber(phoneNumber: string): boolean {
  return TEST_PHONE_NUMBERS.includes(phoneNumber);
}

/**
 * Gets the OTP verification code for test phone numbers
 * @param phoneNumber The phone number
 * @returns The OTP code for test numbers
 */
export function getTestOtpCode(phoneNumber: string): string {
  return isFirebaseTestPhoneNumber(phoneNumber) ? '123456' : '';
}
