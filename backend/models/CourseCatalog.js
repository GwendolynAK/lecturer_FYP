   // backend/models/CourseCatalog.js
   import mongoose from 'mongoose';

   const CourseCatalogSchema = new mongoose.Schema({}, { strict: false });
   export default mongoose.model('CourseCatalog', CourseCatalogSchema, 'courseData');