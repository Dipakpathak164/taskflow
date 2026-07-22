'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiCall, getCurrentUser } from '../../utils/api';

export default function BoardDetail() {
  const params = useParams();
  const router = useRouter();
  const boardId = params.id;

  const [user, setUser] = useState(null);
  const [boardData, setBoardData] = useState(null); // { board, role, members }
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Member invite inputs
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteLoading, setInviteLoading] = useState(false);

  // New task inputs
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTaskCol, setNewTaskCol] = useState('todo');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [taskCreateLoading, setTaskCreateLoading] = useState(false);

  // Selected task details (for modal)
  const [selectedTask, setSelectedTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [newCommentBody, setNewCommentBody] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push('/login');
      return;
    }
    setUser(currentUser);
    loadBoardDetails();
  }, [boardId]);

  const loadBoardDetails = async () => {
    try {
      setLoading(true);
      const [boardRes, tasksRes] = await Promise.all([
        apiCall(`/boards/${boardId}`),
        apiCall(`/boards/${boardId}/tasks`)
      ]);
      setBoardData(boardRes);
      setTasks(tasksRes.tasks);
    } catch (err) {
      setError(err.message || 'Failed to load board details');
    } finally {
      setLoading(false);
    }
  };

  // HTML5 Drag & Drop handlers
  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (!taskId) return;

    // Optimistic Update
    const originalTasks = [...tasks];
    setTasks(tasks.map(t => t.id === parseInt(taskId) ? { ...t, status: targetStatus } : t));

    try {
      await apiCall(`/tasks/${taskId}`, {
        method: 'PATCH',
        body: { status: targetStatus }
      });
    } catch (err) {
      console.error('Failed to update task status:', err);
      // Revert optimistic update
      setTasks(originalTasks);
      alert('Error updating task status: ' + err.message);
    }
  };

  // Add member
  const handleInviteMember = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);

    try {
      const data = await apiCall(`/boards/${boardId}/members`, {
        method: 'POST',
        body: { email: inviteEmail, role: inviteRole }
      });
      setBoardData({
        ...boardData,
        members: [...boardData.members, data.member]
      });
      setInviteEmail('');
      alert('Member added successfully!');
    } catch (err) {
      alert(err.message || 'Failed to add member');
    } finally {
      setInviteLoading(false);
    }
  };

  // Create task
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setTaskCreateLoading(true);

    try {
      const data = await apiCall(`/boards/${boardId}/tasks`, {
        method: 'POST',
        body: {
          title: newTaskTitle,
          description: newTaskDesc,
          assignee_id: newTaskAssignee ? parseInt(newTaskAssignee) : null
        }
      });
      
      // Reload tasks list
      const tasksRes = await apiCall(`/boards/${boardId}/tasks`);
      setTasks(tasksRes.tasks);

      // Reset fields
      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskAssignee('');
      setShowTaskModal(false);
    } catch (err) {
      alert(err.message || 'Failed to create task');
    } finally {
      setTaskCreateLoading(false);
    }
  };

  // View Task Modal Details
  const handleOpenTaskDetails = async (task) => {
    setSelectedTask(task);
    setComments([]);
    setNewCommentBody('');
    try {
      const data = await apiCall(`/tasks/${task.id}/comments`);
      setComments(data.comments);
    } catch (err) {
      console.error('Failed to fetch comments', err);
    }
  };

  // Update Task Assignee from Modal
  const handleTaskAssigneeChange = async (newAssigneeId) => {
    if (!selectedTask) return;
    const originalTasks = [...tasks];
    const targetAssigneeId = newAssigneeId ? parseInt(newAssigneeId) : null;

    // Optimistically update lists
    setTasks(tasks.map(t => t.id === selectedTask.id ? { ...t, assignee_id: targetAssigneeId } : t));

    try {
      const data = await apiCall(`/tasks/${selectedTask.id}`, {
        method: 'PATCH',
        body: { assignee_id: targetAssigneeId }
      });
      // Fetch fresh board tasks list to update assignee name representation
      const tasksRes = await apiCall(`/boards/${boardId}/tasks`);
      setTasks(tasksRes.tasks);
      setSelectedTask(tasksRes.tasks.find(t => t.id === selectedTask.id));
    } catch (err) {
      setTasks(originalTasks);
      alert(err.message || 'Failed to update assignee');
    }
  };

  // Post comment
  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newCommentBody.trim() || !selectedTask) return;
    setCommentLoading(true);

    try {
      const data = await apiCall(`/tasks/${selectedTask.id}/comments`, {
        method: 'POST',
        body: { body: newCommentBody }
      });
      
      // Add author info to comments rendering state
      const commentWithAuthor = {
        ...data.comment,
        user_name: user.name,
        user_email: user.email
      };
      setComments([...comments, commentWithAuthor]);
      setNewCommentBody('');
    } catch (err) {
      alert(err.message || 'Failed to post comment');
    } finally {
      setCommentLoading(false);
    }
  };

  if (loading) return <div style={styles.centered}>Loading board details...</div>;
  if (error) return <div style={styles.errorContainer}><p>{error}</p><Link href="/" className="btn btn-secondary">Back to Dashboard</Link></div>;
  if (!boardData) return null;

  const isAdmin = boardData.role === 'admin';

  return (
    <div style={styles.container}>
      {/* Header */}
      <header className="glass-panel" style={styles.header}>
        <div style={styles.headerLeft}>
          <Link href="/" style={styles.backBtn}>← Back</Link>
          <h1 style={styles.boardTitle}>{boardData.board.name}</h1>
          <span className="glass-panel" style={styles.roleBadge}>{boardData.role}</span>
        </div>
        
        {/* Members Quickbar */}
        <div style={styles.membersBar}>
          <div style={styles.avatarsList}>
            {boardData.members.map((member) => (
              <span key={member.id} className="glass-panel" style={styles.avatar} title={`${member.name} (${member.role})`}>
                {member.name.charAt(0).toUpperCase()}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* Admin Panel (Invite Members) */}
      {isAdmin && (
        <section className="glass-panel fade-in" style={styles.adminSection}>
          <h4 style={styles.adminTitle}>Board Administration</h4>
          <form onSubmit={handleInviteMember} style={styles.inviteForm}>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <input
                type="email"
                className="form-input"
                placeholder="colleague@company.com"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <select 
                className="form-input" 
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={inviteLoading}>
              {inviteLoading ? 'Inviting...' : 'Add Member'}
            </button>
          </form>
        </section>
      )}

      {/* Kanban Board Grid */}
      <div style={styles.boardGrid}>
        {/* Todo Column */}
        <div 
          className="glass-panel" 
          style={styles.column}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, 'todo')}
        >
          <div style={styles.columnHeader}>
            <div style={styles.columnHeaderLeft}>
              <span style={{ ...styles.indicator, backgroundColor: 'var(--color-todo)' }} />
              <h3 style={styles.columnTitle}>To Do</h3>
              <span style={styles.columnCount}>{tasks.filter(t => t.status === 'todo').length}</span>
            </div>
            <button className="btn btn-secondary" onClick={() => { setNewTaskCol('todo'); setShowTaskModal(true); }} style={styles.colAddBtn}>+</button>
          </div>
          <div style={styles.taskList}>
            {tasks.filter(t => t.status === 'todo').map(task => (
              <div 
                key={task.id} 
                draggable 
                onDragStart={(e) => handleDragStart(e, task.id)}
                onClick={() => handleOpenTaskDetails(task)}
                className="glass-panel" 
                style={styles.taskCard}
              >
                <h4 style={styles.taskTitle}>{task.title}</h4>
                {task.description && <p style={styles.taskDesc}>{task.description.length > 60 ? task.description.substring(0, 60) + '...' : task.description}</p>}
                <div style={styles.taskFooter}>
                  {task.assignee_name ? (
                    <span style={styles.taskAssignee} title={`Assigned to ${task.assignee_name}`}>👤 {task.assignee_name}</span>
                  ) : (
                    <span style={styles.taskUnassigned}>Unassigned</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* In Progress Column */}
        <div 
          className="glass-panel" 
          style={styles.column}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, 'in_progress')}
        >
          <div style={styles.columnHeader}>
            <div style={styles.columnHeaderLeft}>
              <span style={{ ...styles.indicator, backgroundColor: 'var(--color-inprogress)' }} />
              <h3 style={styles.columnTitle}>In Progress</h3>
              <span style={styles.columnCount}>{tasks.filter(t => t.status === 'in_progress').length}</span>
            </div>
            <button className="btn btn-secondary" onClick={() => { setNewTaskCol('in_progress'); setShowTaskModal(true); }} style={styles.colAddBtn}>+</button>
          </div>
          <div style={styles.taskList}>
            {tasks.filter(t => t.status === 'in_progress').map(task => (
              <div 
                key={task.id} 
                draggable 
                onDragStart={(e) => handleDragStart(e, task.id)}
                onClick={() => handleOpenTaskDetails(task)}
                className="glass-panel" 
                style={styles.taskCard}
              >
                <h4 style={styles.taskTitle}>{task.title}</h4>
                {task.description && <p style={styles.taskDesc}>{task.description.length > 60 ? task.description.substring(0, 60) + '...' : task.description}</p>}
                <div style={styles.taskFooter}>
                  {task.assignee_name ? (
                    <span style={styles.taskAssignee} title={`Assigned to ${task.assignee_name}`}>👤 {task.assignee_name}</span>
                  ) : (
                    <span style={styles.taskUnassigned}>Unassigned</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Done Column */}
        <div 
          className="glass-panel" 
          style={styles.column}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, 'done')}
        >
          <div style={styles.columnHeader}>
            <div style={styles.columnHeaderLeft}>
              <span style={{ ...styles.indicator, backgroundColor: 'var(--color-done)' }} />
              <h3 style={styles.columnTitle}>Done</h3>
              <span style={styles.columnCount}>{tasks.filter(t => t.status === 'done').length}</span>
            </div>
            <button className="btn btn-secondary" onClick={() => { setNewTaskCol('done'); setShowTaskModal(true); }} style={styles.colAddBtn}>+</button>
          </div>
          <div style={styles.taskList}>
            {tasks.filter(t => t.status === 'done').map(task => (
              <div 
                key={task.id} 
                draggable 
                onDragStart={(e) => handleDragStart(e, task.id)}
                onClick={() => handleOpenTaskDetails(task)}
                className="glass-panel" 
                style={styles.taskCard}
              >
                <h4 style={{ ...styles.taskTitle, textDecoration: 'line-through', opacity: 0.7 }}>{task.title}</h4>
                {task.description && <p style={styles.taskDesc}>{task.description.length > 60 ? task.description.substring(0, 60) + '...' : task.description}</p>}
                <div style={styles.taskFooter}>
                  {task.assignee_name ? (
                    <span style={styles.taskAssignee} title={`Assigned to ${task.assignee_name}`}>👤 {task.assignee_name}</span>
                  ) : (
                    <span style={styles.taskUnassigned}>Unassigned</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create Task Modal */}
      {showTaskModal && (
        <div style={styles.modalOverlay} onClick={() => setShowTaskModal(false)}>
          <div className="glass-panel fade-in" style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Add Task to column: <span style={{ textTransform: 'capitalize', color: 'var(--color-primary)' }}>{newTaskCol}</span></h3>
            <form onSubmit={handleCreateTask}>
              <div className="form-group">
                <label className="form-label">Task Title</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Design Login Flow"
                  required
                  autoFocus
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <textarea
                  className="form-input"
                  style={{ height: '80px', resize: 'vertical' }}
                  placeholder="Add details about this task..."
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Assignee</label>
                <select 
                  className="form-input"
                  value={newTaskAssignee}
                  onChange={(e) => setNewTaskAssignee(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {boardData.members.map(member => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </div>

              <div style={styles.modalActions}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowTaskModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={taskCreateLoading}>
                  {taskCreateLoading ? 'Adding...' : 'Add Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Details Modal (Comments & Assignments) */}
      {selectedTask && (
        <div style={styles.modalOverlay} onClick={() => setSelectedTask(null)}>
          <div className="glass-panel fade-in" style={{ ...styles.modal, maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalDetailHeader}>
              <div>
                <span style={{ 
                  ...styles.statusDot, 
                  backgroundColor: selectedTask.status === 'todo' ? 'var(--color-todo)' : selectedTask.status === 'in_progress' ? 'var(--color-inprogress)' : 'var(--color-done)' 
                }} />
                <span style={styles.statusLabel}>{selectedTask.status.replace('_', ' ')}</span>
              </div>
              <button style={styles.closeBtn} onClick={() => setSelectedTask(null)}>×</button>
            </div>
            
            <h2 style={styles.detailTitle}>{selectedTask.title}</h2>
            {selectedTask.description ? (
              <p style={styles.detailDesc}>{selectedTask.description}</p>
            ) : (
              <p style={{ ...styles.detailDesc, fontStyle: 'italic', color: 'var(--color-text-muted)' }}>No description provided.</p>
            )}

            <div style={styles.detailSection}>
              <div className="form-group">
                <label className="form-label">Assigned User</label>
                <select 
                  className="form-input"
                  value={selectedTask.assignee_id || ''}
                  onChange={(e) => handleTaskAssigneeChange(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {boardData.members.map(member => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Comments Section */}
            <div style={styles.commentsSection}>
              <h4 style={styles.commentsHeaderTitle}>Comments ({comments.length})</h4>
              
              <div style={styles.commentsList}>
                {comments.length === 0 ? (
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', fontStyle: 'italic', padding: '1rem 0' }}>No comments yet. Write one below.</p>
                ) : (
                  comments.map(c => (
                    <div key={c.id} style={styles.commentItem}>
                      <div style={styles.commentMeta}>
                        <span style={styles.commentAuthor}>{c.user_name}</span>
                        <span style={styles.commentDate}>{new Date(c.created_at).toLocaleDateString()}</span>
                      </div>
                      <p style={styles.commentBody}>{c.body}</p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handlePostComment} style={styles.commentForm}>
                <textarea
                  className="form-input"
                  style={{ height: '70px', resize: 'none', fontSize: '0.9rem' }}
                  placeholder="Ask a question or post an update..."
                  required
                  value={newCommentBody}
                  onChange={(e) => setNewCommentBody(e.target.value)}
                />
                <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end', padding: '0.5rem 1.25rem', fontSize: '0.85rem' }} disabled={commentLoading}>
                  {commentLoading ? 'Posting...' : 'Comment'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '2rem',
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    borderRadius: 'var(--radius-lg)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  backBtn: {
    color: 'var(--color-primary)',
    fontWeight: '500',
    fontSize: '0.95rem',
  },
  boardTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#fff',
  },
  roleBadge: {
    fontSize: '0.75rem',
    padding: '0.2rem 0.6rem',
    borderRadius: '20px',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: '0.5px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: 'var(--color-text-muted)',
    border: '1px solid var(--border-glass)',
  },
  membersBar: {
    display: 'flex',
    alignItems: 'center',
  },
  avatarsList: {
    display: 'flex',
    gap: '-5px',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.85rem',
    fontWeight: '700',
    color: 'var(--color-primary)',
    backgroundColor: 'rgba(102, 252, 241, 0.08)',
    border: '1px solid rgba(102, 252, 241, 0.2)',
    marginLeft: '-8px',
    boxShadow: '0 0 5px rgba(0,0,0,0.5)',
  },
  adminSection: {
    padding: '1.25rem',
    borderRadius: 'var(--radius-lg)',
  },
  adminTitle: {
    fontSize: '0.9rem',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '0.75rem',
  },
  inviteForm: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  boardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1.5rem',
    alignItems: 'flex-start',
  },
  column: {
    padding: '1.25rem',
    borderRadius: 'var(--radius-lg)',
    minHeight: '600px',
    backgroundColor: 'rgba(20, 24, 30, 0.3)',
  },
  columnHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.25rem',
  },
  columnHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
  },
  indicator: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    display: 'inline-block',
  },
  columnTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#fff',
  },
  columnCount: {
    fontSize: '0.8rem',
    color: 'var(--color-text-muted)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: '0.15rem 0.5rem',
    borderRadius: '10px',
  },
  colAddBtn: {
    width: '28px',
    height: '28px',
    padding: 0,
    borderRadius: '50%',
    fontSize: '1.1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    minHeight: '500px',
  },
  taskCard: {
    padding: '1.25rem',
    borderRadius: 'var(--radius-md)',
    cursor: 'grab',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    borderLeft: '2px solid rgba(255,255,255,0.05)',
  },
  taskTitle: {
    fontSize: '0.95rem',
    color: '#fff',
    fontWeight: '600',
  },
  taskDesc: {
    fontSize: '0.85rem',
    color: 'var(--color-text-muted)',
    lineHeight: '1.4',
  },
  taskFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '0.5rem',
    fontSize: '0.8rem',
  },
  taskAssignee: {
    color: 'var(--color-primary)',
    fontWeight: '500',
  },
  taskUnassigned: {
    color: 'rgba(255, 255, 255, 0.25)',
  },
  centered: {
    textAlign: 'center',
    padding: '8rem',
    color: 'var(--color-text-muted)',
    fontFamily: 'var(--font-sans)',
  },
  errorContainer: {
    textAlign: 'center',
    padding: '8rem',
    color: '#f87171',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(5px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    width: '95%',
    maxWidth: '480px',
    padding: '2rem',
    backgroundColor: 'rgba(20, 20, 20, 0.98)',
  },
  modalTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    marginBottom: '1.5rem',
    color: '#fff',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    marginTop: '1.5rem',
  },
  modalDetailHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  statusDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    display: 'inline-block',
    marginRight: '0.5rem',
  },
  statusLabel: {
    textTransform: 'uppercase',
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--color-text-muted)',
    letterSpacing: '1px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '2rem',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    lineHeight: '0.5',
    transition: 'var(--transition-smooth)',
  },
  detailTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#fff',
    marginBottom: '1rem',
  },
  detailDesc: {
    fontSize: '0.95rem',
    color: 'var(--color-text-muted)',
    lineHeight: '1.6',
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: '1rem',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-glass)',
    marginBottom: '1.5rem',
  },
  detailSection: {
    marginBottom: '1.5rem',
  },
  commentsSection: {
    borderTop: '1px solid var(--border-glass)',
    paddingTop: '1.5rem',
  },
  commentsHeaderTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#fff',
    marginBottom: '1rem',
  },
  commentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginBottom: '1.5rem',
    maxHeight: '200px',
    overflowY: 'auto',
  },
  commentItem: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    border: '1px solid var(--border-glass)',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-md)',
  },
  commentMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
    marginBottom: '0.25rem',
  },
  commentAuthor: {
    fontWeight: '600',
    color: 'var(--color-primary)',
  },
  commentDate: {
    opacity: 0.8,
  },
  commentBody: {
    fontSize: '0.9rem',
    color: 'var(--color-text-main)',
    lineHeight: '1.4',
  },
  commentForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
};
