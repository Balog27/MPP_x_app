const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { faker } = require('@faker-js/faker'); // Import Faker.js
const multer = require('multer'); // For file uploads
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 5003

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for storage
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    // Create unique filename with original extension
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Create upload middleware with size limit of 500MB
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB in bytes
});

// Middleware
app.use(cors({
  origin: '*', // Allow requests from any origin during development
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
})); 
app.use(bodyParser.json()); // Parse JSON bodies

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// In-memory data storage
let posts = [];

// Function to generate random posts
const generateRandomPosts = (numPosts) => {
  const randomPosts = [];
  for (let i = 0; i < numPosts; i++) {
    randomPosts.push({
      id: faker.string.uuid(), // Generate a unique ID
      text: faker.lorem.paragraph(1), // Generate a meaningful paragraph
      img: `https://picsum.photos/seed/${i}/300/200`, // Generate unique images using a seed
      date: faker.date.recent().toLocaleString(), // Generate a recent date
    });
  }
  return randomPosts;
};

// Populate the posts array with initial random posts
posts = generateRandomPosts(100);

// Helper function to validate post data
const validatePost = (post) => {
  if (!post.text || typeof post.text !== 'string' || post.text.trim() === '') {
    return 'Invalid text';
  }
  if (!post.img || typeof post.img !== 'string' || post.img.trim() === '') {
    return 'Invalid image URL';
  }
  return null;
};

// Add this to your server.js file to properly detect video types
const getMimeType = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogg': 'video/ogg',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.mkv': 'video/x-matroska',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp'
  };
  return mimeTypes[ext] || 'application/octet-stream';
};

// Routes

// Get all posts with optional filtering and sorting
app.get('/posts', (req, res) => {
  let filteredPosts = [...posts];

  // Filtering
  if (req.query.search) {
    const search = req.query.search.toLowerCase();
    filteredPosts = filteredPosts.filter((post) =>
      post.text.toLowerCase().includes(search)
    );
  }

  // Sorting
  if (req.query.sort === 'asc') {
    filteredPosts.sort((a, b) => a.text.localeCompare(b.text));
  } else if (req.query.sort === 'desc') {
    filteredPosts.sort((a, b) => b.text.localeCompare(a.text));
  }

  res.json(filteredPosts);
});

// Get a single post by ID
app.get('/posts/:id', (req, res) => {
  const post = posts.find((p) => p.id === req.params.id);
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }
  res.json(post);
});

// Create a new post
app.post('/posts', (req, res) => {
  const { text, img, id, date, isVideo } = req.body;

  // Validate data
  const error = validatePost({ text, img });
  if (error) {
    return res.status(400).json({ error });
  }

  const newPost = {
    id: id || Date.now().toString(), // Use client-provided ID if available
    text,
    img,
    date: date || new Date().toLocaleString(),
    isVideo: isVideo || false
  };

  posts.push(newPost);
  res.status(201).json(newPost);
});

// Update a post by ID
app.put('/posts/:id', (req, res) => {
  const { text, img, date } = req.body;
  const post = posts.find((p) => p.id === req.params.id);

  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  // Validate data
  const error = validatePost({ text, img });
  if (error) {
    return res.status(400).json({ error });
  }

  post.text = text;
  post.img = img;
  if (date) post.date = date;
  
  res.json(post);
});

// Delete a post by ID
app.delete('/posts/:id', (req, res) => {
  const postIndex = posts.findIndex((p) => p.id === req.params.id);

  if (postIndex === -1) {
    return res.status(404).json({ error: 'Post not found' });
  }

  posts.splice(postIndex, 1);
  res.status(204).send();
});

if (process.env.NODE_ENV !== 'test') {
  const HOST = '0.0.0.0'; // Listen on all network interfaces
  app.listen(PORT, HOST, () => {
    console.log(`Server is running on http://${HOST}:${PORT}`);
    console.log(`Access from other computers using this server's IP address:${PORT}`);
  });
}

app.get('/', (req, res) => {
  res.send('Welcome to the Posts API! Use /posts or /posts/infinite to interact with the API.');
});

// Infinite scroll endpoint
app.get('/posts/infinite', (req, res) => {
  const currentIndex = parseInt(req.query.currentIndex, 10) || 0;
  const postsBelow = parseInt(req.query.postsBelow, 10) || 25;
  const postsAbove = parseInt(req.query.postsAbove, 10) || 10;

  // Calculate the range of posts to return
  const startIndex = Math.max(0, currentIndex - postsAbove);
  const endIndex = Math.min(posts.length, currentIndex + postsBelow);

  const paginatedPosts = posts.slice(startIndex, endIndex);
  res.json(paginatedPosts);
});

// Add new file upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  // Use the requesting host (this will be your server's actual IP)
  const host = req.headers.host.split(':')[0];
  
  // Return the file details including URL to access it
  res.status(201).json({
    filename: req.file.filename,
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
    url: `http://${host}:${PORT}/uploads/${req.file.filename}`
  });
});

// Get list of uploaded files
app.get('/files', (req, res) => {
  fs.readdir(uploadDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to read files directory' });
    }
    
    const host = req.headers.host.split(':')[0];
    
    const fileList = files.map(filename => ({
      filename,
      url: `http://${host}:${PORT}/uploads/${filename}`
    }));
    
    res.json(fileList);
  });
});

// Add this to your server.js file
// Sync multiple operations endpoint
app.post('/sync', express.json({ limit: '50mb' }), (req, res) => {
  const { operations } = req.body;
  const results = [];
  const errors = [];
  
  if (!Array.isArray(operations)) {
    return res.status(400).json({ error: 'Operations must be an array' });
  }
  
  // Process each operation
  for (let operation of operations) {
    try {
      // Handle POST requests
      if (operation.method === 'POST' && operation.data) {
        const { text, img, id, date, isVideo } = operation.data;
        
        // Validate data
        const error = validatePost({ text, img });
        if (error) {
          errors.push({ id, error });
          continue;
        }
        
        const newPost = {
          id: id || Date.now().toString(),
          text,
          img,
          date: date || new Date().toLocaleString(),
          isVideo
        };
        
        posts.push(newPost);
        results.push({ id, success: true, post: newPost });
      }
      // Handle PUT requests
      else if (operation.method === 'PUT' && operation.id && operation.data) {
        const post = posts.find((p) => p.id === operation.id);
        
        if (!post) {
          errors.push({ id: operation.id, error: 'Post not found' });
          continue;
        }
        
        const { text, img, isVideo } = operation.data;
        
        // Validate data
        const error = validatePost({ text, img });
        if (error) {
          errors.push({ id: operation.id, error });
          continue;
        }
        
        post.text = text;
        post.img = img;
        if (isVideo !== undefined) post.isVideo = isVideo;
        
        results.push({ id: operation.id, success: true, post });
      }
      // Handle DELETE requests
      else if (operation.method === 'DELETE' && operation.id) {
        const postIndex = posts.findIndex((p) => p.id === operation.id);
        
        if (postIndex === -1) {
          errors.push({ id: operation.id, error: 'Post not found' });
          continue;
        }
        
        posts.splice(postIndex, 1);
        results.push({ id: operation.id, success: true });
      }
    } catch (error) {
      errors.push({ id: operation.id || 'unknown', error: error.message });
    }
  }
  
  res.json({ results, errors });
});

module.exports = app; // Export the app for testing