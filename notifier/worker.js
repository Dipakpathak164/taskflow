const mysql = require('mysql2/promise');
require('dotenv').config();

const ssl = process.env.DB_SSL === 'true' || (process.env.DB_HOST && process.env.DB_HOST.includes('aivencloud.com'))
  ? { rejectUnauthorized: false }
  : undefined;

const connectionConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'taskflow',
  ssl,
};

// Track notified task assignees: taskId -> assigneeId
const notifiedState = new Map();

async function pollAssignments(connection) {
  try {
    const [rows] = await connection.query(`
      SELECT tasks.id AS task_id, tasks.title AS task_title, users.id AS user_id, users.name AS user_name, users.email AS user_email
      FROM tasks
      INNER JOIN users ON tasks.assignee_id = users.id
    `);

    for (const row of rows) {
      const taskId = row.task_id;
      const assigneeId = row.user_id;

      // Check if we already notified this specific assignment
      if (!notifiedState.has(taskId) || notifiedState.get(taskId) !== assigneeId) {
        console.log(`\n============================================================`);
        console.log(`[Notifier] 🔔 NEW TASK ASSIGNMENT DETECTED`);
        console.log(`[Notifier] Sending Notification Email...`);
        console.log(`[Notifier] To: ${row.user_name} (${row.user_email})`);
        console.log(`[Notifier] Subject: Task Assigned - "${row.task_title}"`);
        console.log(`[Notifier] Body: Hello ${row.user_name},\n\n` +
                    `           You have been assigned to the task: "${row.task_title}".\n` +
                    `           Please check the TaskFlow board for more details.`);
        console.log(`============================================================\n`);

        // Record the notification in local memory
        notifiedState.set(taskId, assigneeId);
      }
    }

    // Clean up notifiedState for deleted tasks
    const activeTaskIds = new Set(rows.map(row => row.task_id));
    for (const taskId of notifiedState.keys()) {
      if (!activeTaskIds.has(taskId)) {
        notifiedState.delete(taskId);
      }
    }

  } catch (error) {
    console.error('[Notifier] Error querying assignments:', error.message);
  }
}

async function startWorker() {
  const maxRetries = 15;
  let retries = 0;
  let connection;

  console.log(`[Notifier] Connecting to MySQL at ${connectionConfig.host}:${connectionConfig.port}...`);
  while (retries < maxRetries) {
    try {
      connection = await mysql.createConnection(connectionConfig);
      console.log('[Notifier] Database connection established.');
      break;
    } catch (err) {
      retries++;
      console.log(`[Notifier] Database connection attempt ${retries}/${maxRetries} failed. Retrying in 3 seconds...`);
      await new Promise(res => setTimeout(res, 3000));
    }
  }

  if (!connection) {
    console.error('[Notifier] Could not connect to database. Exiting worker.');
    process.exit(1);
  }

  console.log('[Notifier] Background worker started. Polling task assignments every 5 seconds...');
  
  // Poll immediately on startup
  await pollAssignments(connection);

  // Poll periodically
  setInterval(async () => {
    await pollAssignments(connection);
  }, 5000);
}

startWorker();
