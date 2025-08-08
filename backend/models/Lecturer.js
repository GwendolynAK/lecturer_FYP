import mongoose from 'mongoose';

const LecturerSchema = new mongoose.Schema({
  name: String,
  token: String,
});

const Lecturer = mongoose.model('Lecturer', LecturerSchema, 'lecturers');
export default Lecturer; 