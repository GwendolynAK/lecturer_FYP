// routes/students.js
import express from 'express';
import { MongoClient } from 'mongodb';

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

export default router;
