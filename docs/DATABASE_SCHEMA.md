# Database Schema — TaskFlow

TaskFlow runs on **MySQL** (minimum version 8.0 recommended) using the robust transactional **InnoDB** database engine. This provides full support for foreign keys, cascade deletes, and transaction rollbacks.

---

## 🗺️ Entity-Relationship Summary

The relationships between tables are structured as follows:

```
  +---------+         1   *         +---------+
  |  users  |<--------------------->| boards  |
  +---------+                       +---------+
    ^  ^  ^                              | 1
    |  |  |                              |
    |  |  |                              v *
    |  |  |  1   *  +---------------+    |
    |  |  +-------->| board_members |<---+
    |  |            +---------------+
    |  |
    |  |     1   *  +---------+
    |  +----------->|  tasks  |
    |               +---------+
    |                 | 1
    |                 |
    |        1   *    v *
    +-------------->| comments|
                    +---------+
```

---

## 📋 Table Specifications

### 1. `users`
Tracks individual user registrations and credentials.
*   `id` (INT, Primary Key, Auto Increment)
*   `email` (VARCHAR(255), Unique, Not Null) — User email used to login and assign tasks.
*   `password_hash` (VARCHAR(255), Not Null) — BCrypt password hash.
*   `name` (VARCHAR(255), Not Null) — Display name.
*   `created_at` (TIMESTAMP, Default: Current Timestamp)

### 2. `boards`
Represents shared team task board spaces.
*   `id` (INT, Primary Key, Auto Increment)
*   `name` (VARCHAR(255), Not Null) — Board title.
*   `owner_id` (INT, Not Null) — Foreign key pointing to `users(id)` (On Delete: Cascade).
*   `created_at` (TIMESTAMP, Default: Current Timestamp)

### 3. `board_members`
Joins users to boards they are authorized to access, with per-board user roles.
*   `board_id` (INT, Composite Primary Key, Foreign Key to `boards(id)` On Delete: Cascade)
*   `user_id` (INT, Composite Primary Key, Foreign Key to `users(id)` On Delete: Cascade)
*   `role` (ENUM('admin', 'member'), Default: 'member') — Determines permissions on the board.
    *   `admin`: Can add members, change roles, modify tasks, write comments, delete board.
    *   `member`: Can view boards, create tasks, edit tasks (drag-and-drop), and add comments.

### 4. `tasks`
Individual task items tracked inside boards.
*   `id` (INT, Primary Key, Auto Increment)
*   `board_id` (INT, Not Null, Foreign Key to `boards(id)` On Delete: Cascade)
*   `title` (VARCHAR(255), Not Null) — Task card title.
*   `description` (TEXT) — Details or markdown body.
*   `status` (ENUM('todo', 'in_progress', 'done'), Default: 'todo') — Represents Kanban board columns.
*   `assignee_id` (INT, Nullable, Foreign Key to `users(id)` On Delete: Set Null) — Reference to the user working on this task.
*   `created_at` (TIMESTAMP, Default: Current Timestamp)

### 5. `comments`
Activity feed comments left on specific tasks.
*   `id` (INT, Primary Key, Auto Increment)
*   `task_id` (INT, Not Null, Foreign Key to `tasks(id)` On Delete: Cascade)
*   `user_id` (INT, Not Null, Foreign Key to `users(id)` On Delete: Cascade)
*   `body` (TEXT, Not Null) — The text comment content.
*   `created_at` (TIMESTAMP, Default: Current Timestamp)
