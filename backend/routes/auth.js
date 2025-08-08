import express from 'express';
import User from '../models/User.js';
import Lecturer from '../models/Lecturer.js';
import { getLecturerProgramsAndCourses } from '../utils/lecturerDetails.js';

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

// GET /api/auth/test
router.get('/test', (req, res) => res.json({ message: 'Auth route works!' }));

export default router; 