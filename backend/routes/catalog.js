import express from "express";
import CourseCatalog from "../models/CourseCatalog.js";

const router = express.Router();

// GET /api/catalog/levels - Get all levels
router.get("/levels", async (req, res) => {
  try {
    console.log('Fetching levels from database...');
    
    // Find all documents and extract unique levels
    const documents = await CourseCatalog.find({});
    console.log(`Found ${documents.length} documents`);
    
    // Extract unique levels from the documents
    const levels = [...new Set(documents.map(doc => doc.level))];
    
    console.log('Extracted levels:', levels);
    
    res.json({
      success: true,
      data: levels,
      count: levels.length
    });
  } catch (error) {
    console.error('Error fetching levels:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching levels',
      error: error.message
    });
  }
});

// GET /api/catalog/programs/:level - Get programs for a specific level
router.get("/programs/:level", async (req, res) => {
  try {
    const { level } = req.params;
    console.log(`Fetching programs for level: ${level}`);
    
    // Find the document for the specified level
    const document = await CourseCatalog.findOne({ level: level });
    
    if (!document) {
      console.log(`No document found for level: ${level}`);
      return res.status(404).json({
        success: false,
        message: `Level '${level}' not found`
      });
    }
    
    // Extract program names from the programs object
    const programs = Object.keys(document.programs || {});
    
    console.log(`Found ${programs.length} programs for level ${level}:`, programs);
    
    res.json({
      success: true,
      data: programs,
      count: programs.length,
      level: level
    });
  } catch (error) {
    console.error('Error fetching programs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching programs',
      error: error.message
    });
  }
});

// GET /api/catalog/courses/:level/:program - Get courses for a specific level and program
router.get("/courses/:level/:program", async (req, res) => {
  try {
    const { level, program } = req.params;
    console.log(`Fetching courses for level: ${level}, program: ${program}`);
    
    // Find the document for the specified level
    const document = await CourseCatalog.findOne({ level: level });
    
    if (!document) {
      console.log(`No document found for level: ${level}`);
      return res.status(404).json({
        success: false,
        message: `Level '${level}' not found`
      });
    }
    
    // Get courses for the specified program
    const courses = document.programs[program];
    
    if (!courses) {
      console.log(`No courses found for program: ${program}`);
      return res.status(404).json({
        success: false,
        message: `Program '${program}' not found in level '${level}'`
      });
    }
    
    console.log(`Found ${courses.length} courses for program ${program}`);
    
    res.json({
      success: true,
      data: courses,
      count: courses.length,
      level: level,
      program: program
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching courses',
      error: error.message
    });
  }
});

// GET /api/catalog/all-programs - Get all programs across all levels
router.get("/all-programs", async (req, res) => {
  try {
    console.log('Fetching all programs from database...');
    
    // Find all documents
    const documents = await CourseCatalog.find({});
    console.log(`Found ${documents.length} documents`);
    
    // Extract all unique programs across all levels
    const allPrograms = new Set();
    
    documents.forEach(doc => {
      if (doc.programs) {
        Object.keys(doc.programs).forEach(program => {
          allPrograms.add(program);
        });
      }
    });
    
    const programs = Array.from(allPrograms);
    
    console.log(`Found ${programs.length} unique programs:`, programs);
    
    res.json({
      success: true,
      data: programs,
      count: programs.length
    });
  } catch (error) {
    console.error('Error fetching all programs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching all programs',
      error: error.message
    });
  }
});

export default router;