// routes/students.js
import express from 'express';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

const router = express.Router();

// MongoDB connection - use environment variables
const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_NAME = process.env.DB_NAME;
const COLLECTION_NAME = 'studentData';

let client = null;

async function getMongoClient() {
  if (!client) {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
  }
  return client;
}

// Validate student
router.post('/validate', async (req, res) => {
  try {
    const { fullName, indexNumber, level, program } = req.body;
    
    const mongoClient = await getMongoClient();
    const db = mongoClient.db(DATABASE_NAME);
    const collection = db.collection(COLLECTION_NAME);
    
    // Find student in MongoDB
    const student = await collection.findOne({
      studentId: indexNumber,
      level: level,
      program: program
    });

    if (student) {
      // Additional name validation (case-insensitive)
      const studentNameLower = student.fullName.toLowerCase();
      const inputNameLower = fullName.toLowerCase();
      
      if (studentNameLower.includes(inputNameLower) || inputNameLower.includes(studentNameLower)) {
        res.json({ 
          success: true, 
          student: student,
          message: 'Student validation successful'
        });
      } else {
        res.json({ 
          success: false, 
          message: 'Student ID, level, and program match, but name does not match. Please check your full name.'
        });
      }
    } else {
      res.json({ 
        success: false, 
        message: 'Student information not found. Please check your details.'
      });
    }
  } catch (error) {
    console.error('Error validating student:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during validation' 
    });
  }
});

// Get all students
router.get('/', async (req, res) => {
  try {
    const mongoClient = await getMongoClient();
    const db = mongoClient.db(DATABASE_NAME);
    const collection = db.collection(COLLECTION_NAME);
    
    const students = await collection.find({}).toArray();
    res.json({ success: true, data: students });
  } catch (error) {
    console.error('Error getting students:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get student by index number
router.get('/:indexNumber', async (req, res) => {
  try {
    const { indexNumber } = req.params;
    
    const mongoClient = await getMongoClient();
    const db = mongoClient.db(DATABASE_NAME);
    const collection = db.collection(COLLECTION_NAME);
    
    const student = await collection.findOne({ studentId: indexNumber });
    
    if (student) {
      res.json({ success: true, data: student });
    } else {
      res.json({ success: false, message: 'Student not found' });
    }
  } catch (error) {
    console.error('Error finding student:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/students/register - Student registration
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
    
    // Validate required fields with specific error messages
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
    
    const mongoClient = await getMongoClient();
    const db = mongoClient.db(DATABASE_NAME);
    
    // Check if user already exists in users collection
    const usersCollection = db.collection('users');
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        error: 'User with this email already exists.' 
      });
    }
    
    // Check if student exists in studentData collection
    const studentCollection = db.collection(COLLECTION_NAME);
    const existingStudent = await studentCollection.findOne({ studentId: indexNumber });
    if (!existingStudent) {
      return res.status(404).json({ 
        success: false, 
        error: 'Student not found in database. Please contact administrator.' 
      });
    }
    
    // Hash the password for security
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Create new user in users collection
    const newUser = {
      email,
      password: hashedPassword, // Use hashed password
      passcode,
      studentId: indexNumber,
      fullName,
      level,
      program,
      availableCourses: availableCourses || [],
      isVerified: true,
      role: 'student',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await usersCollection.insertOne(newUser);
    
    res.status(201).json({
      success: true,
      message: 'Student registered successfully',
      user: {
        id: newUser._id,
        email: newUser.email,
        studentId: newUser.studentId,
        fullName: newUser.fullName,
        level: newUser.level,
        program: newUser.program
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

export default router;
