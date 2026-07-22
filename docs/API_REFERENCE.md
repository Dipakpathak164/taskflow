# API Reference — TaskFlow

All API routes are served by the backend container on port `5000`. Secured routes require a JSON Web Token (JWT) sent via the `Authorization` header.

## 🔑 Authentication Headers

For protected endpoints, include the JWT token as follows:
```http
Authorization: Bearer <your_token>
```

---

## 🚪 Auth Endpoints

### 1. Register User
*   **Method / Route**: `POST /auth/register`
*   **Request Body**:
    ```json
    {
      "name": "John Doe",
      "email": "john@company.com",
      "password": "securepassword"
    }
    ```
*   **Success Response (201 Created)**:
    ```json
    {
      "message": "User registered successfully",
      "token": "eyJhbGciOi...",
      "user": {
        "id": 1,
        "name": "John Doe",
        "email": "john@company.com"
      }
    }
    ```

### 2. Login User
*   **Method / Route**: `POST /auth/login`
*   **Request Body**:
    ```json
    {
      "email": "john@company.com",
      "password": "securepassword"
    }
    ```
*   **Success Response (200 OK)**:
    ```json
    {
      "message": "Login successful",
      "token": "eyJhbGciOi...",
      "user": {
        "id": 1,
        "name": "John Doe",
        "email": "john@company.com"
      }
    }
    ```

### 3. Verify Session User
*   **Method / Route**: `GET /auth/me`
*   **Headers**: Requires `Bearer` token
*   **Success Response (200 OK)**:
    ```json
    {
      "user": {
        "id": 1,
        "name": "John Doe",
        "email": "john@company.com",
        "created_at": "2026-07-23T00:00:00.000Z"
      }
    }
    ```

---

## 📋 Boards Endpoints

### 1. List User Boards
*   **Method / Route**: `GET /boards`
*   **Headers**: Requires `Bearer` token
*   **Success Response (200 OK)**:
    ```json
    {
      "boards": [
        {
          "id": 1,
          "name": "Project TaskFlow",
          "owner_id": 1,
          "created_at": "2026-07-23T00:00:00.000Z",
          "role": "admin"
        }
      ]
    }
    ```

### 2. Create Board
*   **Method / Route**: `POST /boards`
*   **Headers**: Requires `Bearer` token
*   **Request Body**:
    ```json
    {
      "name": "Q3 Launch Plan"
    }
    ```
*   **Success Response (201 Created)**:
    ```json
    {
      "message": "Board created successfully",
      "board": {
        "id": 2,
        "name": "Q3 Launch Plan",
        "owner_id": 1,
        "role": "admin"
      }
    }
    ```

### 3. Get Board Details
*   **Method / Route**: `GET /boards/:id`
*   **Headers**: Requires `Bearer` token
*   **Success Response (200 OK)**:
    ```json
    {
      "board": {
        "id": 2,
        "name": "Q3 Launch Plan",
        "owner_id": 1,
        "created_at": "2026-07-23T00:00:00.000Z"
      },
      "role": "admin",
      "members": [
        {
          "id": 1,
          "name": "John Doe",
          "email": "john@company.com",
          "role": "admin"
        }
      ]
    }
    ```

### 4. Add Board Member (Admin only)
*   **Method / Route**: `POST /boards/:id/members`
*   **Headers**: Requires `Bearer` token. User must have role `admin` on the board.
*   **Request Body**:
    ```json
    {
      "email": "colleague@company.com",
      "role": "member"
    }
    ```
*   **Success Response (201 Created)**:
    ```json
    {
      "message": "Member added successfully",
      "member": {
        "id": 4,
        "name": "Colleague Name",
        "email": "colleague@company.com",
        "role": "member"
      }
    }
    ```

---

## ⚡ Tasks Endpoints

### 1. List Board Tasks
*   **Method / Route**: `GET /boards/:id/tasks`
*   **Headers**: Requires `Bearer` token
*   **Success Response (200 OK)**:
    ```json
    {
      "tasks": [
        {
          "id": 12,
          "board_id": 2,
          "title": "Setup Docker Compose",
          "description": "Orchestrate our local containers",
          "status": "in_progress",
          "assignee_id": 4,
          "created_at": "2026-07-23T00:05:00.000Z",
          "assignee_name": "Colleague Name",
          "assignee_email": "colleague@company.com"
        }
      ]
    }
    ```

### 2. Create Task
*   **Method / Route**: `POST /boards/:id/tasks`
*   **Headers**: Requires `Bearer` token
*   **Request Body**:
    ```json
    {
      "title": "Add CI/CD Workflows",
      "description": "Create yml actions inside .github folder",
      "assignee_id": 1
    }
    ```
*   **Success Response (201 Created)**:
    ```json
    {
      "message": "Task created successfully",
      "task": {
        "id": 13,
        "board_id": 2,
        "title": "Add CI/CD Workflows",
        "description": "Create yml actions inside .github folder",
        "status": "todo",
        "assignee_id": 1
      }
    }
    ```

### 3. Update Task Status / Assignee
*   **Method / Route**: `PATCH /tasks/:id`
*   **Headers**: Requires `Bearer` token
*   **Request Body** (Both fields are optional):
    ```json
    {
      "status": "done",
      "assignee_id": 4
    }
    ```
*   **Success Response (200 OK)**:
    ```json
    {
      "message": "Task updated successfully",
      "task": {
        "id": 13,
        "board_id": 2,
        "title": "Add CI/CD Workflows",
        "description": "Create yml actions inside .github folder",
        "status": "done",
        "assignee_id": 4,
        "created_at": "2026-07-23T00:05:00.000Z"
      }
    }
    ```

---

## 💬 Comments Endpoints

### 1. List Task Comments
*   **Method / Route**: `GET /tasks/:id/comments`
*   **Headers**: Requires `Bearer` token
*   **Success Response (200 OK)**:
    ```json
    {
      "comments": [
        {
          "id": 1,
          "task_id": 13,
          "user_id": 1,
          "body": "Workflows added and verified on GitHub Actions.",
          "created_at": "2026-07-23T00:10:00.000Z",
          "user_name": "John Doe",
          "user_email": "john@company.com"
        }
      ]
    }
    ```

### 2. Create Comment
*   **Method / Route**: `POST /tasks/:id/comments`
*   **Headers**: Requires `Bearer` token
*   **Request Body**:
    ```json
    {
      "body": "PR merged!"
    }
    ```
*   **Success Response (201 Created)**:
    ```json
    {
      "message": "Comment added successfully",
      "comment": {
        "id": 2,
        "task_id": 13,
        "user_id": 1,
        "body": "PR merged!",
        "created_at": "2026-07-23T00:12:00.000Z"
      }
    }
    ```
