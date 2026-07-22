const pool = require('../db');

// Helper to check if user is a member of a board and return their role
async function getMemberRole(boardId, userId) {
  const [members] = await pool.query(
    'SELECT role FROM board_members WHERE board_id = ? AND user_id = ?',
    [boardId, userId]
  );
  return members.length > 0 ? members[0].role : null;
}

// GET /boards -> List all boards the user belongs to
exports.listBoards = async (req, res) => {
  try {
    const userId = req.user.id;
    const [boards] = await pool.query(
      `SELECT b.*, bm.role 
       FROM boards b
       INNER JOIN board_members bm ON b.id = bm.board_id
       WHERE bm.user_id = ?
       ORDER BY b.created_at DESC`,
      [userId]
    );
    res.json({ boards });
  } catch (error) {
    console.error('Error listing boards:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /boards -> Create a board
exports.createBoard = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { name } = req.body;
    const userId = req.user.id;

    if (!name) {
      return res.status(400).json({ error: 'Board name is required' });
    }

    // Insert board
    const [boardResult] = await connection.query(
      'INSERT INTO boards (name, owner_id) VALUES (?, ?)',
      [name, userId]
    );
    const boardId = boardResult.insertId;

    // Add creator as Admin member
    await connection.query(
      'INSERT INTO board_members (board_id, user_id, role) VALUES (?, ?, ?)',
      [boardId, userId, 'admin']
    );

    await connection.commit();
    res.status(201).json({
      message: 'Board created successfully',
      board: { id: boardId, name, owner_id: userId, role: 'admin' }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating board:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
};

// GET /boards/:id -> Get board details and its members
exports.getBoard = async (req, res) => {
  try {
    const boardId = req.params.id;
    const userId = req.user.id;

    const role = await getMemberRole(boardId, userId);
    if (!role) {
      return res.status(403).json({ error: 'Access denied. You are not a member of this board.' });
    }

    // Fetch board info
    const [boards] = await pool.query('SELECT * FROM boards WHERE id = ?', [boardId]);
    if (boards.length === 0) {
      return res.status(404).json({ error: 'Board not found' });
    }

    // Fetch members info
    const [members] = await pool.query(
      `SELECT u.id, u.name, u.email, bm.role 
       FROM users u
       INNER JOIN board_members bm ON u.id = bm.user_id
       WHERE bm.board_id = ?`,
      [boardId]
    );

    res.json({
      board: boards[0],
      role,
      members
    });
  } catch (error) {
    console.error('Error getting board:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /boards/:id/members -> Add member (Admin only)
exports.addMember = async (req, res) => {
  try {
    const boardId = req.params.id;
    const userId = req.user.id;
    const { email, role } = req.body; // role: 'admin' | 'member'

    if (!email) {
      return res.status(400).json({ error: 'User email is required' });
    }

    const targetRole = role === 'admin' ? 'admin' : 'member';

    // Verify requesting user is admin of this board
    const myRole = await getMemberRole(boardId, userId);
    if (myRole !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Only board administrators can add members.' });
    }

    // Find target user by email
    const [users] = await pool.query('SELECT id, name, email FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User with this email not found' });
    }
    const targetUser = users[0];

    // Check if target user is already a member
    const existingRole = await getMemberRole(boardId, targetUser.id);
    if (existingRole) {
      return res.status(409).json({ error: 'User is already a member of this board' });
    }

    // Add member
    await pool.query(
      'INSERT INTO board_members (board_id, user_id, role) VALUES (?, ?, ?)',
      [boardId, targetUser.id, targetRole]
    );

    res.status(201).json({
      message: 'Member added successfully',
      member: { id: targetUser.id, name: targetUser.name, email: targetUser.email, role: targetRole }
    });
  } catch (error) {
    console.error('Error adding board member:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /boards/:id/tasks -> List all tasks in a board
exports.listTasks = async (req, res) => {
  try {
    const boardId = req.params.id;
    const userId = req.user.id;

    const role = await getMemberRole(boardId, userId);
    if (!role) {
      return res.status(403).json({ error: 'Access denied. You are not a member of this board.' });
    }

    const [tasks] = await pool.query(
      `SELECT t.*, u.name AS assignee_name, u.email AS assignee_email 
       FROM tasks t
       LEFT JOIN users u ON t.assignee_id = u.id
       WHERE t.board_id = ?
       ORDER BY t.created_at ASC`,
      [boardId]
    );

    res.json({ tasks });
  } catch (error) {
    console.error('Error listing tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /boards/:id/tasks -> Create task
exports.createTask = async (req, res) => {
  try {
    const boardId = req.params.id;
    const userId = req.user.id;
    const { title, description, assignee_id } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Task title is required' });
    }

    // Verify membership
    const role = await getMemberRole(boardId, userId);
    if (!role) {
      return res.status(403).json({ error: 'Access denied. You are not a member of this board.' });
    }

    let finalAssigneeId = assignee_id || null;

    // Validate assignee is a member if provided
    if (finalAssigneeId) {
      const assigneeRole = await getMemberRole(boardId, finalAssigneeId);
      if (!assigneeRole) {
        return res.status(400).json({ error: 'Assignee must be a member of the board.' });
      }
    }

    // Insert task
    const [result] = await pool.query(
      'INSERT INTO tasks (board_id, title, description, status, assignee_id) VALUES (?, ?, ?, ?, ?)',
      [boardId, title, description || '', 'todo', finalAssigneeId]
    );

    const taskId = result.insertId;

    res.status(201).json({
      message: 'Task created successfully',
      task: { id: taskId, board_id: parseInt(boardId), title, description, status: 'todo', assignee_id: finalAssigneeId }
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PATCH /tasks/:id -> Update task status/assignee
exports.updateTask = async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user.id;
    const { status, assignee_id } = req.body;

    // Fetch the task to find its board ID
    const [tasks] = await pool.query('SELECT * FROM tasks WHERE id = ?', [taskId]);
    if (tasks.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = tasks[0];
    const boardId = task.board_id;

    // Verify membership
    const role = await getMemberRole(boardId, userId);
    if (!role) {
      return res.status(403).json({ error: 'Access denied. You are not a member of this board.' });
    }

    // Build update parameters dynamically
    const updateFields = [];
    const updateValues = [];

    if (status !== undefined) {
      if (!['todo', 'in_progress', 'done'].includes(status)) {
        return res.status(400).json({ error: 'Invalid task status. Must be todo, in_progress, or done' });
      }
      updateFields.push('status = ?');
      updateValues.push(status);
    }

    if (assignee_id !== undefined) {
      const finalAssigneeId = assignee_id || null;
      if (finalAssigneeId) {
        const assigneeRole = await getMemberRole(boardId, finalAssigneeId);
        if (!assigneeRole) {
          return res.status(400).json({ error: 'Assignee must be a member of this board' });
        }
      }
      updateFields.push('assignee_id = ?');
      updateValues.push(finalAssigneeId);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update provided' });
    }

    updateValues.push(taskId);

    await pool.query(
      `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Fetch updated task
    const [updatedTasks] = await pool.query('SELECT * FROM tasks WHERE id = ?', [taskId]);

    res.json({
      message: 'Task updated successfully',
      task: updatedTasks[0]
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /tasks/:id/comments -> List all comments for a task
exports.listComments = async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user.id;

    // Fetch the task
    const [tasks] = await pool.query('SELECT board_id FROM tasks WHERE id = ?', [taskId]);
    if (tasks.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    const boardId = tasks[0].board_id;

    // Verify membership
    const role = await getMemberRole(boardId, userId);
    if (!role) {
      return res.status(403).json({ error: 'Access denied. You are not a member of this board.' });
    }

    // Fetch comments
    const [comments] = await pool.query(
      `SELECT c.*, u.name AS user_name, u.email AS user_email 
       FROM comments c
       INNER JOIN users u ON c.user_id = u.id
       WHERE c.task_id = ?
       ORDER BY c.created_at ASC`,
      [taskId]
    );

    res.json({ comments });
  } catch (error) {
    console.error('Error listing comments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /tasks/:id/comments -> Add comment to task
exports.createComment = async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user.id;
    const { body } = req.body;

    if (!body || body.trim() === '') {
      return res.status(400).json({ error: 'Comment body is required' });
    }

    // Fetch the task
    const [tasks] = await pool.query('SELECT board_id FROM tasks WHERE id = ?', [taskId]);
    if (tasks.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    const boardId = tasks[0].board_id;

    // Verify membership
    const role = await getMemberRole(boardId, userId);
    if (!role) {
      return res.status(403).json({ error: 'Access denied. You are not a member of this board.' });
    }

    // Insert comment
    const [result] = await pool.query(
      'INSERT INTO comments (task_id, user_id, body) VALUES (?, ?, ?)',
      [taskId, userId, body]
    );

    const commentId = result.insertId;

    res.status(201).json({
      message: 'Comment added successfully',
      comment: {
        id: commentId,
        task_id: parseInt(taskId),
        user_id: userId,
        body,
        created_at: new Date()
      }
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
