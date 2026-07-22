const express = require('express');
const router = express.Router();
const boardController = require('../controllers/boardController');
const authMiddleware = require('../middleware/auth');

// All board routes require JWT auth
router.use(authMiddleware);

router.get('/', boardController.listBoards);
router.post('/', boardController.createBoard);
router.get('/:id', boardController.getBoard);
router.post('/:id/members', boardController.addMember);
router.get('/:id/tasks', boardController.listTasks);
router.post('/:id/tasks', boardController.createTask);

module.exports = router;
