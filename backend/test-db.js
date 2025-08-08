import mongoose from 'mongoose';
import dotenv from 'dotenv';
import CourseCatalog from './models/CourseCatalog.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function printSampleCourseCatalog() {
  try {
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');
    
    const doc = await CourseCatalog.findOne({});
    if (!doc) {
      console.log('No CourseCatalog documents found.');
    } else {
      console.log('Sample CourseCatalog document structure:');
      console.log('Document keys:', Object.keys(doc.toObject()));
      
      // Look for programs
      if (doc.programs) {
        console.log('\nPrograms found:');
        Object.keys(doc.programs).forEach(program => {
          console.log(`- ${program}`);
          const courses = doc.programs[program];
          if (Array.isArray(courses) && courses.length > 0) {
            console.log(`  Sample course:`, courses[0]);
          }
        });
      }
      
      // Look for BSc. Information Technology specifically
      if (doc.programs && doc.programs['BSc. Information Technology']) {
        console.log('\nBSc. Information Technology courses:');
        const courses = doc.programs['BSc. Information Technology'];
        courses.forEach(course => {
          if (course.EXAMINER_IDS && course.EXAMINER_IDS.includes('68740157d09dbdb6951530d0')) {
            console.log('Found MOSES AGGOR in course:', course);
          }
        });
      }
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

printSampleCourseCatalog(); 