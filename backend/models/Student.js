import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const StudentSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  passcode: {
    type: String,
    required: true
  },
  // Student-specific fields
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  indexNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  level: {
    type: String,
    required: true,
    trim: true
  },
  program: {
    type: String,
    required: true,
    trim: true
  },
  availableCourses: [{
    courseCode: String,
    courseTitle: String
  }],
  role: {
    type: String,
    default: 'student',
    enum: ['student']
  },
  isVerified: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  },
  previousLogin: {
    type: Date
  }
});

// Hash password and passcode before saving
StudentSchema.pre('save', async function(next) {
  if (!this.isModified('password') && !this.isModified('passcode')) {
    return next();
  }
  
  try {
    // Hash password if modified
    if (this.isModified('password')) {
      this.password = await bcrypt.hash(this.password, 12);
    }
    
    // Hash passcode if modified
    if (this.isModified('passcode')) {
      this.passcode = await bcrypt.hash(this.passcode, 12);
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
StudentSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to compare passcode
StudentSchema.methods.comparePasscode = async function(candidatePasscode) {
  try {
    return await bcrypt.compare(candidatePasscode, this.passcode);
  } catch (error) {
    console.error('Error comparing passcode:', error);
    return false;
  }
};

export default mongoose.model('Student', StudentSchema);
