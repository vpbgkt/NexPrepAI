const mongoose = require('mongoose');
const Reward = require('../models/Reward');
const User = require('../models/User');
const connectDB = require('../config/db');
require('dotenv').config();

// Sample rewards data
const sampleRewards = [
  {
    title: "Premium Test Series Access",
    description: "Get access to premium test series with detailed analytics for 30 days",
    pointsCost: 500,
    category: "TEST_ACCESS",
    type: "FEATURE_UNLOCK",
    value: {
      validityDays: 30,
      featureCode: "PREMIUM_TESTS",
      instructionsText: "Access will be automatically enabled in your account"
    },
    isActive: true,
    isLimited: false,
    minimumLevel: 1,
    displayOrder: 1,
    termsAndConditions: "Valid for 30 days from redemption date. Cannot be transferred or refunded."
  },
  {
    title: "50% Discount Coupon",
    description: "Get 50% discount on any premium subscription",
    pointsCost: 300,
    category: "DISCOUNT",
    type: "VOUCHER_CODE",
    value: {
      discountPercent: 50,
      validityDays: 60,
      maxUsageCount: 1,
      instructionsText: "Use the voucher code during checkout"
    },
    isActive: true,
    isLimited: true,
    totalQuantity: 100,
    remainingQuantity: 100,
    minimumLevel: 1,
    displayOrder: 2,
    termsAndConditions: "Valid for 60 days. Cannot be combined with other offers."
  },
  {
    title: "₹100 Amazon Gift Card",
    description: "Receive a ₹100 Amazon gift card via email",
    pointsCost: 1000,
    category: "GIFT_CARDS",
    type: "MANUAL_DELIVERY",
    value: {
      discountAmount: 100,
      validityDays: 90,
      instructionsText: "Gift card will be sent to your registered email within 24 hours"
    },
    isActive: true,
    isLimited: true,
    totalQuantity: 50,
    remainingQuantity: 50,
    minimumLevel: 2,
    displayOrder: 3,
    termsAndConditions: "Processing may take up to 24 hours. Valid for 1 year from issue date."
  },
  {
    title: "1-Hour Mock Interview Session",
    description: "One-on-one mock interview session with expert guidance",
    pointsCost: 1500,
    category: "CONSULTATION",
    type: "MANUAL_DELIVERY",
    value: {
      validityDays: 30,
      instructionsText: "Schedule your session via email or phone call"
    },
    isActive: true,
    isLimited: true,
    totalQuantity: 20,
    remainingQuantity: 20,
    minimumLevel: 3,
    displayOrder: 4,
    termsAndConditions: "Must be scheduled within 30 days of redemption. Subject to expert availability."
  },
  {
    title: "NexPrepAI Study Guide E-book",
    description: "Comprehensive digital study guide with tips and strategies",
    pointsCost: 200,
    category: "DIGITAL_CONTENT",
    type: "INSTANT",
    value: {
      downloadUrl: "/downloads/study-guide.pdf",
      instructionsText: "Download link will be available immediately"
    },
    isActive: true,
    isLimited: false,
    minimumLevel: 1,
    displayOrder: 5,
    termsAndConditions: "Digital download only. For personal use only."
  },
  {
    title: "Ad-free Experience",
    description: "Remove all advertisements from the app for 90 days",
    pointsCost: 150,
    category: "PREMIUM_FEATURES",
    type: "FEATURE_UNLOCK",
    value: {
      validityDays: 90,
      featureCode: "AD_FREE",
      instructionsText: "Ad-free experience will be activated immediately"
    },
    isActive: true,
    isLimited: false,
    minimumLevel: 1,
    displayOrder: 6,
    termsAndConditions: "Valid for 90 days from redemption. Cannot be transferred."
  },
  {
    title: "₹500 Course Discount",
    description: "Get ₹500 off on any premium course enrollment",
    pointsCost: 800,
    category: "DISCOUNT",
    type: "VOUCHER_CODE",
    value: {
      discountAmount: 500,
      validityDays: 45,
      maxUsageCount: 1,
      instructionsText: "Apply coupon code during course enrollment"
    },
    isActive: true,
    isLimited: true,
    totalQuantity: 75,
    remainingQuantity: 75,
    minimumLevel: 2,
    displayOrder: 7,
    termsAndConditions: "Valid for 45 days. Minimum purchase amount ₹1000."
  },
  {
    title: "Priority Support Access",
    description: "Get priority customer support for 60 days",
    pointsCost: 100,
    category: "PREMIUM_FEATURES",
    type: "FEATURE_UNLOCK",
    value: {
      validityDays: 60,
      featureCode: "PRIORITY_SUPPORT",
      instructionsText: "Priority support will be activated within 1 hour"
    },
    isActive: true,
    isLimited: false,
    minimumLevel: 1,
    displayOrder: 8,
    termsAndConditions: "Valid for 60 days. Does not guarantee response time."
  }
];

async function seedRewards() {
  try {
    // Connect to database
    await connectDB();
    
    // Find an admin user to assign as creator
    let adminUser = await User.findOne({ role: { $in: ['admin', 'superadmin'] } });
    
    if (!adminUser) {
      console.log('No admin user found. Creating a dummy admin for reward creation...');
      // Create a dummy admin user
      adminUser = new User({
        username: 'rewardadmin',
        name: 'Reward Administrator',
        email: 'admin@nexprepai.com',
        role: 'admin',
        referralCode: 'ADMIN001'
      });
      await adminUser.save();
    }

    // Clear existing rewards
    await Reward.deleteMany({});
    console.log('Cleared existing rewards');

    // Add createdBy and updatedBy to each reward
    const rewardsWithAdmin = sampleRewards.map(reward => ({
      ...reward,
      createdBy: adminUser._id,
      updatedBy: adminUser._id
    }));

    // Insert sample rewards
    const createdRewards = await Reward.insertMany(rewardsWithAdmin);
    
    console.log(`✅ Successfully created ${createdRewards.length} sample rewards:`);
    createdRewards.forEach(reward => {
      console.log(`   - ${reward.title} (${reward.pointsCost} points)`);
    });

    console.log('\n🎉 Reward seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding rewards:', error);
    process.exit(1);
  }
}

// Run the seeding function
if (require.main === module) {
  seedRewards();
}

module.exports = { seedRewards, sampleRewards };
