/* models/User.js */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
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
  
  // User role and type
  role: {
    type: String,
    required: true,
    enum: ['lecturer', 'student', 'admin'],
    default: 'lecturer'
  },
  
  // Lecturer-specific fields
  lecturerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lecturer',
    required: function() {
      return this.role === 'lecturer';
    }
  },
  
  // Student-specific fields
  studentId: {
    type: String,
    required: function() {
      return this.role === 'student';
    },
    trim: true
  },
  fullName: {
    type: String,
    required: function() {
      return this.role === 'student';
    },
    trim: true
  },
  indexNumber: {
    type: String,
    required: function() {
      return this.role === 'student';
    },
    trim: true
  },
  level: {
    type: String,
    required: function() {
      return this.role === 'student';
    },
    trim: true
  },
  program: {
    type: String,
    required: function() {
      return this.role === 'student';
    },
    trim: true
  },
  availableCourses: [{
    courseCode: String,
    courseTitle: String
  }],
  
  // Common fields
  isVerified: {
    type: Boolean,
    default: false
  },
  
  // Profile information
  profile: {
    firstName: {
      type: String,
      trim: true
    },
    lastName: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    avatar: {
      type: String,
      trim: true
    }
  },
  
  // Account status
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending'],
    default: 'active'
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
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
UserSchema.pre('save', async function(next) {
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
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to compare passcode
UserSchema.methods.comparePasscode = async function(candidatePasscode) {
  try {
    return await bcrypt.compare(candidatePasscode, this.passcode);
  } catch (error) {
    console.error('Error comparing passcode:', error);
    return false;
  }
};

// Update the updatedAt field before saving
UserSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to find user by role
UserSchema.statics.findByRole = function(role) {
  return this.find({ role: role, status: 'active' });
};

// Static method to find lecturer by lecturerId
UserSchema.statics.findLecturerById = function(lecturerId) {
  return this.findOne({ lecturerId: lecturerId, role: 'lecturer', status: 'active' });
};

// Static method to find student by studentId
UserSchema.statics.findStudentById = function(studentId) {
  return this.findOne({ studentId: studentId, role: 'student', status: 'active' });
};

// Instance method to check if user is lecturer
UserSchema.methods.isLecturer = function() {
  return this.role === 'lecturer';
};

// Instance method to check if user is student
UserSchema.methods.isStudent = function() {
  return this.role === 'student';
};

// Instance method to get user's courses (for students)
UserSchema.methods.getCourses = function() {
  if (this.role === 'student') {
    return this.availableCourses || [];
  }
  return [];
};

// Instance method to update last login
UserSchema.methods.updateLastLogin = function() {
  this.previousLogin = this.lastLogin;
  this.lastLogin = new Date();
  return this.save();
};

export default mongoose.model('User', UserSchema);
