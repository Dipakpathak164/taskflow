const express = require('express');
const router = express.Router();
const boardController = require('../controllers/boardController');
const authMiddleware = require('../middleware/auth');

// All task routes require JWT auth
router.use(authMiddleware);

router.patch('/:id', boardController.updateTask);
router.get('/:id/comments', boardController.listComments);
router.post('/:id/comments', boardController.createComment);

module.exports = router;
