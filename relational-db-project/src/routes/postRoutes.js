const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');

// GET all posts
router.get('/', postController.getAllPosts);

// GET posts by tag
router.get('/by-tag/:tagId', postController.getPostsByTag);

// GET a single post
router.get('/:id', postController.getPostById);

// POST a new post
router.post('/', postController.createPost);

// PUT update a post
router.put('/:id', postController.updatePost);

// DELETE a post
router.delete('/:id', postController.deletePost);

module.exports = router;