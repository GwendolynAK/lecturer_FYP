import express from 'express';
import Student from '../models/Student.js';
import { MongoClient } from 'mongodb';

const router = express.Router();

// MongoDB connection for student validation
const MONGODB_URI = process.env.MONGO_URI;
const DATABASE_NAME = process.env.DB_NAME;
const STUDENT_DATA_COLLECTION = 'studentData';

let client = null;

async function getMongoClient() {
  if (!client) {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
  }
  return client;
}

// POST /api/student-auth/register - Student registration
router.post('/register', async (req, res) => {
  try {
    const { 
      email, 
      password, 
      fullName, 
      indexNumber, 
      level, 
      program, 
      passcode, 
      availableCourses 
    } = req.body;
    
    // Validate required fields
    if (!email || !password || !fullName || !indexNumber || !level || !program || !passcode) {
      const missingFields = [];
      if (!email) missingFields.push('email');
      if (!password) missingFields.push('password');
      if (!fullName) missingFields.push('fullName');
      if (!indexNumber) missingFields.push('indexNumber');
      if (!level) missingFields.push('level');
      if (!program) missingFields.push('program');
      if (!passcode) missingFields.push('passcode');
      
      return res.status(400).json({ 
        success: false, 
        error: `Missing required fields: ${missingFields.join(', ')}` 
      });
    }
    
    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ 
        success: false, 
        error: 'Password must be at least 8 characters long' 
      });
    }
    
    // Validate passcode format (6 digits)
    if (!/^\d{6}$/.test(passcode)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Passcode must be exactly 6 digits.' 
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid email address' 
      });
    }
    
    // Check if student already exists in our Student collection
    const existingStudent = await Student.findOne({ 
      $or: [{ email }, { indexNumber }] 
    });
    
    if (existingStudent) {
      if (existingStudent.email === email) {
        return res.status(409).json({ 
          success: false, 
          error: 'Student with this email already exists.' 
        });
      } else {
        return res.status(409).json({ 
          success: false, 
          error: 'Student with this index number already exists.' 
        });
      }
    }
    
    // Verify student exists in the official studentData collection
    const mongoClient = await getMongoClient();
    const db = mongoClient.db(DATABASE_NAME);
    const studentCollection = db.collection(STUDENT_DATA_COLLECTION);
    
    const officialStudent = await studentCollection.findOne({ 
      studentId: indexNumber,
      level: level,
      program: program
    });
    
    if (!officialStudent) {
      return res.status(404).json({ 
        success: false, 
        error: 'Student not found in official database. Please check your details.' 
      });
    }
    
    // Additional name validation (case-insensitive)
    const officialNameLower = officialStudent.fullName.toLowerCase();
    const inputNameLower = fullName.toLowerCase();
    
    if (!officialNameLower.includes(inputNameLower) && !inputNameLower.includes(officialNameLower)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Student ID, level, and program match, but name does not match. Please check your full name.' 
      });
    }
    
    // Create new student
    const student = new Student({
      email,
      password,
      passcode,
      fullName,
      indexNumber,
      level,
      program,
      availableCourses: availableCourses || [],
      role: 'student',
      isVerified: true
    });
    
    await student.save();
    
    res.status(201).json({
      success: true,
      message: 'Student registered successfully',
      student: {
        id: student._id,
        email: student.email,
        fullName: student.fullName,
        indexNumber: student.indexNumber,
        level: student.level,
        program: student.program
      }
    });
    
  } catch (error) {
    console.error('Student registration error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error during student registration.' 
    });
  }
});

// POST /api/student-auth/login - Student login with email, password, and passcode (two-step)
router.post('/login', async (req, res) => {
  try {
    const { email, password, passcode } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required.'
      });
    }

    // Find student by email
    const student = await Student.findOne({ email });
    if (!student) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials.'
      });
    }

    // Verify password
    const isPasswordValid = await student.comparePassword(password);
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
    const isPasscodeValid = await student.comparePasscode(passcode);
    if (!isPasscodeValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid passcode.'
      });
    }

    // Store previous login time before updating current login
    if (student.lastLogin) {
      student.previousLogin = student.lastLogin;
    }
    
    // Update last login
    student.lastLogin = new Date();
    await student.save();

    res.json({
      success: true,
      message: 'Login successful',
      student: {
        id: student._id,
        email: student.email,
        fullName: student.fullName,
        indexNumber: student.indexNumber,
        level: student.level,
        program: student.program,
        availableCourses: student.availableCourses
      }
    });

  } catch (err) {
    console.error('Student login error:', err);
    res.status(500).json({
      success: false,
      error: 'Server error during login.'
    });
  }
});

// GET /api/student-auth/test
router.get('/test', (req, res) => res.json({ message: 'Student Auth route works!' }));

export default router;
