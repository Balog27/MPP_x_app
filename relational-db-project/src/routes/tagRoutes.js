const express = require('express');
const router = express.Router();
const tagController = require('../controllers/tagController');

// GET all tags
router.get('/', tagController.getAllTags);

// GET tag statistics
router.get('/stats', tagController.getTagStats);

// GET a single tag
router.get('/:id', tagController.getTagById);

// POST a new tag
router.post('/', tagController.createTag);

// PUT update a tag
router.put('/:id', tagController.updateTag);

// DELETE a tag
router.delete('/:id', tagController.deleteTag);

// POST add tag to post
router.post('/add-to-post', tagController.addTagToPost);

// DELETE remove tag from post
router.delete('/:postId/tags/:tagId', tagController.removeTagFromPost);

module.exports = router;