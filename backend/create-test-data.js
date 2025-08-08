import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Lecturer from './models/Lecturer.js';
import User from './models/User.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function createTestData() {
  try {
    await mongoose.connect(MONGO_URI, { 
      useNewUrlParser: true, 
      useUnifiedTopology: true,
      dbName: process.env.DB_NAME || 'attendance_system'
    });
    console.log('Connected to MongoDB');
    
    // Create a test lecturer
    const testLecturer = new Lecturer({
      name: 'Test Lecturer',
      email: 'test.lecturer@example.com',
      department: 'Computer Science'
    });
    
    const savedLecturer = await testLecturer.save();
    console.log('Created test lecturer:', savedLecturer._id);
    
    // Create a test user
    const testUser = new User({
      email: 'test@example.com',
      password: 'test123',
      passcode: '123456',
      lecturerId: savedLecturer._id,
      isVerified: true
    });
    
    const savedUser = await testUser.save();
    console.log('Created test user:', savedUser._id);
    
    console.log('\nTest data created successfully!');
    console.log('Lecturer ID:', savedLecturer._id);
    console.log('User email: test@example.com');
    console.log('User password: test123');
    console.log('User passcode: 123456');
    
  } catch (err) {
    console.error('Error creating test data:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

createTestData();
