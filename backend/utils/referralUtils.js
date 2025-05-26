// filepath: backend/utils/referralUtils.js
const crypto = require('crypto'); // Though not used in current function, good for future crypto needs.

/**
 * Generates a unique alphanumeric referral code.
 * @param {mongoose.Model} UserModel - The Mongoose User model to check for uniqueness.
 * @param {number} length - The desired length of the referral code.
 * @returns {Promise<string>} A unique referral code.
 */
async function generateUniqueReferralCode(UserModel, length = 7) {
  let referralCode;
  let isUnique = false;
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  while (!isUnique) {
    referralCode = '';
    for (let i = 0; i < length; i++) {
      referralCode += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    try {
      const existingUser = await UserModel.findOne({ referralCode });
      if (!existingUser) {
        isUnique = true;
      }
    } catch (error) {
      console.error('Error checking for existing referral code:', error);
      // Handle error appropriately, maybe throw or retry after a delay
      // For now, to prevent infinite loop on DB error, we might break or throw
      throw new Error('Failed to verify referral code uniqueness due to database error.');
    }
  }
  return referralCode;
}

module.exports = { generateUniqueReferralCode };
