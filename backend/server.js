const express = require('express');
const cors = require('cors');
require('dotenv').config();
const runMigrations = require('./db/migrate');
const authRoutes = require('./routes/authRoutes');
const boardRoutes = require('./routes/boardRoutes');
const taskRoutes = require('./routes/taskRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: '*', // In production, narrow this to the frontend URL
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Request log
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Register routes
app.use('/auth', authRoutes);
app.use('/boards', boardRoutes);
app.use('/tasks', taskRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'backend' });
});

// Auto-run migrations on start with retry logic (waiting for DB container)
async function startServer() {
  const maxRetries = 10;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      await runMigrations();
      break;
    } catch (err) {
      retries++;
      console.log(`[Database] Migration attempt ${retries}/${maxRetries} failed. Retrying in 3 seconds...`);
      await new Promise(res => setTimeout(res, 3000));
    }
  }

  if (retries === maxRetries) {
    console.error('[Database] Could not run migrations. Exiting backend service.');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`[Server] Backend service running on port ${PORT}`);
  });
}

startServer();
