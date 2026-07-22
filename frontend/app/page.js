'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiCall, getCurrentUser, logout } from './utils/api';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [boards, setBoards] = useState([]);
  const [newBoardName, setNewBoardName] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push('/login');
      return;
    }
    setUser(currentUser);
    fetchBoards();
  }, []);

  const fetchBoards = async () => {
    try {
      setLoading(true);
      const data = await apiCall('/boards');
      setBoards(data.boards);
    } catch (err) {
      setError('Failed to load boards');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBoard = async (e) => {
    e.preventDefault();
    if (!newBoardName.trim()) return;
    setCreateLoading(true);

    try {
      const data = await apiCall('/boards', {
        method: 'POST',
        body: { name: newBoardName },
      });
      setBoards([data.board, ...boards]);
      setNewBoardName('');
      setShowModal(false);
    } catch (err) {
      alert(err.message || 'Failed to create board');
    } finally {
      setCreateLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div style={styles.container}>
      {/* Header */}
      <header className="glass-panel" style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.logoIcon}>⚡</span>
          <h1 style={styles.logoText}>TaskFlow</h1>
        </div>
        <div style={styles.headerRight}>
          <span style={styles.userGreeting}>Hello, <strong>{user.name}</strong></span>
          <button className="btn btn-secondary" onClick={logout} style={styles.logoutBtn}>
            Log Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        <div style={styles.contentHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Your Boards</h2>
            <p style={styles.sectionSubtitle}>Select a board or create a new team space</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + Create Board
          </button>
        </div>

        {loading ? (
          <div style={styles.centered}>Loading your boards...</div>
        ) : error ? (
          <div style={styles.errorText}>{error}</div>
        ) : (
          <div style={styles.grid}>
            {/* Create Board Trigger Card */}
            <div 
              className="glass-panel fade-in" 
              style={{ ...styles.boardCard, ...styles.createCard }}
              onClick={() => setShowModal(true)}
            >
              <span style={styles.createCardIcon}>+</span>
              <h3>Create New Board</h3>
            </div>

            {/* List of Boards */}
            {boards.map((board) => (
              <Link 
                href={`/board/${board.id}`} 
                key={board.id} 
                className="glass-panel fade-in" 
                style={styles.boardCard}
              >
                <div style={styles.cardHeader}>
                  <h3 style={styles.boardName}>{board.name}</h3>
                  <span 
                    style={{
                      ...styles.roleBadge,
                      backgroundColor: board.role === 'admin' ? 'rgba(102, 252, 241, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      color: board.role === 'admin' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                      border: `1px solid ${board.role === 'admin' ? 'rgba(102, 252, 241, 0.3)' : 'var(--border-glass)'}`
                    }}
                  >
                    {board.role}
                  </span>
                </div>
                <div style={styles.cardFooter}>
                  <span>Opened recently</span>
                  <span style={styles.arrowIcon}>→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Create Board Modal */}
      {showModal && (
        <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className="glass-panel fade-in" style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Create a New Board</h3>
            <form onSubmit={handleCreateBoard}>
              <div className="form-group">
                <label className="form-label">Board Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Q3 Sprint, Marketing Roadmap"
                  required
                  autoFocus
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                />
              </div>
              <div style={styles.modalActions}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={createLoading}>
                  {createLoading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
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
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    marginBottom: '3rem',
    borderRadius: 'var(--radius-lg)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  logoIcon: {
    fontSize: '1.75rem',
  },
  logoText: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#fff',
    letterSpacing: '-0.5px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
  },
  userGreeting: {
    color: 'var(--color-text-muted)',
    fontSize: '0.95rem',
  },
  logoutBtn: {
    padding: '0.5rem 1rem',
    fontSize: '0.85rem',
  },
  main: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
  },
  contentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  sectionTitle: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: '#fff',
  },
  sectionSubtitle: {
    color: 'var(--color-text-muted)',
    fontSize: '0.95rem',
    marginTop: '0.25rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1.5rem',
  },
  boardCard: {
    padding: '1.5rem',
    height: '160px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    cursor: 'pointer',
  },
  createCard: {
    borderStyle: 'dashed',
    borderWidth: '2px',
    borderColor: 'var(--color-primary)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '0.5rem',
    color: 'var(--color-primary)',
  },
  createCardIcon: {
    fontSize: '2.5rem',
    fontWeight: '300',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1rem',
  },
  boardName: {
    fontSize: '1.2rem',
    fontWeight: '600',
    color: '#fff',
  },
  roleBadge: {
    fontSize: '0.75rem',
    padding: '0.2rem 0.6rem',
    borderRadius: '20px',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: '0.5px',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: 'var(--color-text-muted)',
    fontSize: '0.85rem',
  },
  arrowIcon: {
    fontSize: '1.1rem',
    transition: 'var(--transition-smooth)',
  },
  centered: {
    textAlign: 'center',
    padding: '4rem',
    color: 'var(--color-text-muted)',
  },
  errorText: {
    textAlign: 'center',
    padding: '4rem',
    color: '#f87171',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    width: '100%',
    maxWidth: '450px',
    padding: '2rem',
    backgroundColor: 'rgba(20, 20, 20, 0.95)',
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
};
