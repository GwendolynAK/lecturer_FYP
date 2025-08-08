import mongoose from 'mongoose';
import dotenv from 'dotenv';
import CourseCatalog from './models/CourseCatalog.js';
import fs from 'fs';
import path from 'path';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

// Function to convert MongoDB ObjectId format to proper ObjectId
function convertObjectIds(obj) {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'object') {
    if (Array.isArray(obj)) {
      return obj.map(convertObjectIds);
    } else {
      const converted = {};
      for (const [key, value] of Object.entries(obj)) {
        if (key === '_id' && value && typeof value === 'object' && value.$oid) {
          converted[key] = value.$oid;
        } else {
          converted[key] = convertObjectIds(value);
        }
      }
      return converted;
    }
  }
  
  return obj;
}

async function importCourseData() {
  try {
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');
    
    // Read the course data JSON file
    const courseDataPath = path.join(process.cwd(), '..', 'course_correct.courseData.with_lecturer_ids.json');
    console.log('Reading course data from:', courseDataPath);
    
    const rawCourseData = JSON.parse(fs.readFileSync(courseDataPath, 'utf8'));
    console.log('Course data loaded, found', rawCourseData.length, 'documents');
    
    // Convert ObjectId format
    const courseData = convertObjectIds(rawCourseData);
    console.log('Converted ObjectId format');
    
    // Clear existing data
    await CourseCatalog.deleteMany({});
    console.log('Cleared existing course data');
    
    // Insert the new data
    const result = await CourseCatalog.insertMany(courseData);
    console.log('Successfully imported', result.length, 'course documents');
    
    // Verify the import
    const count = await CourseCatalog.countDocuments();
    console.log('Total documents in courseData collection:', count);
    
    // Test finding MOSES AGGOR's courses
    const testDoc = await CourseCatalog.findOne({});
    if (testDoc && testDoc.programs) {
      console.log('\nPrograms found:');
      Object.keys(testDoc.programs).forEach(program => {
        console.log(`- ${program}`);
      });
      
      // Look for BSc. Information Technology
      if (testDoc.programs['BSc. Information Technology']) {
        console.log('\nBSc. Information Technology courses:');
        const courses = testDoc.programs['BSc. Information Technology'];
        courses.forEach(course => {
          if (course.EXAMINER_IDS && course.EXAMINER_IDS.includes('68740157d09dbdb6951530d0')) {
            console.log('Found MOSES AGGOR in course:', course.COURSE_CODE, course.TITLE);
          }
        });
      }
    }
    
  } catch (err) {
    console.error('Error importing course data:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

importCourseData(); 