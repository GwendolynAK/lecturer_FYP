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
  lecturerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lecturer',
    required: true
  },
  isVerified: {
    type: Boolean,
    default: false
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
/* UserSchema.methods.comparePasscode = async function(candidatePasscode) {
  return bcrypt.compare(candidatePasscode, this.passcode);
}; */

// In your User model
userSchema.methods.comparePasscode = async function(candidatePasscode) {
  try {
    return await bcrypt.compare(candidatePasscode, this.passcode);
  } catch (error) {
    console.error('Error comparing passcode:', error);
    return false;
  }
};
export default mongoose.model('User', UserSchema);
