import express from 'express';
import User from '../models/User.js';
import Lecturer from '../models/Lecturer.js';
import VerificationCode from '../models/VerificationCode.js';
import { getLecturerProgramsAndCourses } from '../utils/lecturerDetails.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/emailService.js';

const router = express.Router();

// POST /api/auth/register - Complete user registration
router.post('/register', async (req, res) => {
  const { email, password, passcode, lecturerId } = req.body;
  
  if (!email || !password || !passcode || !lecturerId) {
    return res.status(400).json({ 
      success: false, 
      error: 'Email, password, passcode, and lecturer ID are required.' 
    });
  }
  
  // Validate passcode format (6 digits)
  if (!/^\d{6}$/.test(passcode)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Passcode must be exactly 6 digits.' 
    });
  }
  
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        error: 'User with this email already exists.' 
      });
    }
    
    // Verify lecturer exists
    const lecturer = await Lecturer.findById(lecturerId);
    if (!lecturer) {
      return res.status(404).json({ 
        success: false, 
        error: 'Lecturer not found.' 
      });
    }
    
    // Create new user
    const user = new User({
      email,
      password,
      passcode,
      lecturerId,
      isVerified: true // Since they've already been validated as a lecturer
    });
    
    await user.save();
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user._id,
        email: user.email,
        lecturerId: user.lecturerId
      }
    });
    
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Server error during registration.' 
    });
  }
});

// POST /api/auth/login - User login with email, password, and passcode (two-step)
router.post('/login', async (req, res) => {
  const { email, password, passcode } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password are required.'
    });
  }

  try {
    // Find user by email
    const user = await User.findOne({ email }).populate('lecturerId');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials.'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials.'
      });
    }

    // If passcode is not provided, require it as step 2
    if (!passcode) {
      return res.json({
        success: true,
        requirePasscode: true
      });
    }

    // Verify passcode
    const isPasscodeValid = await user.comparePasscode(passcode);
    if (!isPasscodeValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid passcode.'
      });
    }

    // Store previous login time before updating current login
    if (user.lastLogin) {
      user.previousLogin = user.lastLogin;
    }
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Fetch programs/courses for this lecturer
    let programs = [];
    if (user.lecturerId && user.lecturerId._id) {
      const details = await getLecturerProgramsAndCourses(user.lecturerId._id);
      programs = details.programs;
    }

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        email: user.email,
        lecturerId: user.lecturerId,
        lecturerName: user.lecturerId.name,
        programs // <-- add this!
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      success: false,
      error: 'Server error during login.'
    });
  }
});

// GET /api/auth/user-details - Get user details including createdAt and lastLogin
router.get('/user-details', async (req, res) => {
  try {
    // Get user ID from query parameter or request body
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required.'
      });
    }

    // Find user by ID
    const user = await User.findById(userId).populate('lecturerId');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found.'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        lecturerId: user.lecturerId,
        lecturerName: user.lecturerId?.name,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        previousLogin: user.previousLogin,
        isVerified: user.isVerified
      }
    });

  } catch (err) {
    console.error('Get user details error:', err);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching user details.'
    });
  }
});

// GET /api/auth/test
router.get('/test', (req, res) => res.json({ message: 'Auth route works!' }));

// POST /api/auth/send-verification - Send email verification code
router.post('/send-verification', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid email address' 
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        error: 'Email already registered' 
      });
    }
    
    // Generate 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    // Save verification code to database
    await VerificationCode.create({
      email,
      code,
      expiresAt
    });
    
    // Send verification email
    const emailSent = await sendVerificationEmail(email, code, 'Course Correct');
    
    if (!emailSent) {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to send verification email' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Verification code sent successfully' 
    });
    
  } catch (error) {
    console.error('Send verification error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error while sending verification code' 
    });
  }
});

// POST /api/auth/verify-code - Verify email verification code
router.post('/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    
    if (!email || !code) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email and verification code are required' 
      });
    }
    
    // Find verification code
    const verificationCode = await VerificationCode.findOne({
      email,
      code,
      used: false,
      expiresAt: { $gt: new Date() }
    });
    
    if (!verificationCode) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid or expired verification code' 
      });
    }
    
    // Mark verification code as used
    verificationCode.used = true;
    await verificationCode.save();
    
    res.json({ 
      success: true, 
      message: 'Email verified successfully' 
    });
    
  } catch (error) {
    console.error('Verify code error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error while verifying code' 
    });
  }
});

// POST /api/auth/send-password-reset - Send password reset code
router.post('/send-password-reset', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid email address' 
      });
    }
    
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    // Generate 6-digit reset code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    // Save reset code to database
    await VerificationCode.create({
      email,
      code,
      expiresAt
    });
    
    // Send password reset email
    const emailSent = await sendPasswordResetEmail(email, code, 'Course Correct');
    
    if (!emailSent) {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to send password reset email' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Password reset code sent successfully' 
    });
    
  } catch (error) {
    console.error('Send password reset error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error while sending password reset code' 
    });
  }
});

// POST /api/auth/verify-password-reset - Verify password reset code
router.post('/verify-password-reset', async (req, res) => {
  try {
    const { email, code, newPasscode } = req.body;
    
    if (!email || !code || !newPasscode) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email, verification code, and new passcode are required' 
      });
    }
    
    // Validate new passcode format (6 digits)
    if (!/^\d{6}$/.test(newPasscode)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Passcode must be exactly 6 digits' 
      });
    }
    
    // Find verification code
    const verificationCode = await VerificationCode.findOne({
      email,
      code,
      used: false,
      expiresAt: { $gt: new Date() }
    });
    
    if (!verificationCode) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid or expired verification code' 
      });
    }
    
    // Find user and update passcode
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    // Update user's passcode
    user.passcode = newPasscode;
    await user.save();
    
    // Mark verification code as used
    verificationCode.used = true;
    await verificationCode.save();
    
    res.json({ 
      success: true, 
      message: 'Password reset successfully' 
    });
    
  } catch (error) {
    console.error('Verify password reset error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error while resetting password' 
    });
  }
});

// POST /api/auth/login - User login with email, password, and passcode (two-step)
router.post('/login', async (req, res) => {
  try {
    console.log('Login attempt received:', { 
      email: req.body.email, 
      hasPassword: !!req.body.password,
      hasPasscode: !!req.body.passcode 
    });
    
    const { email, password, passcode } = req.body;

    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({
        success: false,
        error: 'Email and password are required.'
      });
    }

    console.log('Looking for user with email:', email);
    
    // Find user by email
    const user = await User.findOne({ email }).populate('lecturerId');
    if (!user) {
      console.log('User not found for email:', email);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials.'
      });
    }

    console.log('User found:', { 
      id: user._id, 
      email: user.email,
      hasPassword: !!user.password,
      hasPasscode: !!user.passcode,
      role: user.role || 'unknown'
    });

    // Verify password
    console.log('Verifying password...');
    const isPasswordValid = await user.comparePassword(password);
    console.log('Password valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('Invalid password for user:', email);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials.'
      });
    }

    // If passcode is not provided, require it as step 2
    if (!passcode) {
      console.log('Passcode not provided, requiring step 2');
      return res.json({
        success: true,
        requirePasscode: true
      });
    }

    // Verify passcode
    console.log('Verifying passcode...');
    const isPasscodeValid = await user.comparePasscode(passcode);
    console.log('Passcode valid:', isPasscodeValid);
    
    if (!isPasscodeValid) {
      console.log('Invalid passcode for user:', email);
      return res.status(401).json({
        success: false,
        error: 'Invalid passcode.'
      });
    }

    console.log('Login successful for user:', email);
    
    // ... rest of your login logic ...
    
  } catch (err) {
    console.error('Login error details:', {
      message: err.message,
      stack: err.stack,
      name: err.name
    });
    res.status(500).json({
      success: false,
      error: 'Server error during login.'
    });
  }
});

export default router;
