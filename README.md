# TaskFlow ⚡

TaskFlow is a premium, containerized, multi-service team task board application (a modern Kanban board clone like Trello or Jira). Built with **Next.js**, **Node.js/Express**, and **MySQL**, it features a fully-automated CI/CD deployment pipeline.

---

## 📖 Detailed Documentation

For full details on individual parts of the application, review the following guides inside the `docs/` directory:

*   [Architecture Guide](file:///home/techasoft/Downloads/Dipak/backup/github/taskflow/docs/ARCHITECTURE.md): Service interaction layout and technology explanation.
*   [API Reference](file:///home/techasoft/Downloads/Dipak/backup/github/taskflow/docs/API_REFERENCE.md): REST endpoints, input arguments, and JSON structures.
*   [Database Schema](file:///home/techasoft/Downloads/Dipak/backup/github/taskflow/docs/DATABASE_SCHEMA.md): Entity relationship descriptions and database table layout.
*   [Deployment Guide](file:///home/techasoft/Downloads/Dipak/backup/github/taskflow/docs/DEPLOYMENT_GUIDE.md): Render deployment configs, cloud databases, and GitHub Actions settings.

---

## 🚀 Key Features

*   **Premium Glassmorphism Dark Theme**: Styled with modern typography and animations.
*   **JWT-Based Auth**: Secure User registration, login, and sessions.
*   **Kanban Task Board**: Fluid HTML5 drag-and-drop mechanics to move tasks between `Todo`, `In Progress`, and `Done`.
*   **Role-Based Access Control**: Boards support `admin` (can manage members, delete board) and `member` (manage tasks/comments).
*   **Background Notifier**: Independent background service that polls the database and logs real-time task assignments.
*   **Fully Dockerized**: Simple orchestrations for local development and clean production builds.
*   **Automatic CI/CD**: Gated matrix testing on PRs and deployment pushing to GHCR and Render on merges to `main`.

---

## 📂 Repository Structure

```
taskflow/
├── frontend/                  # Next.js React client
│   ├── app/                   # App Router views & global CSS
│   ├── Dockerfile             # Multi-stage production build
│   └── ...
├── backend/                   # Express REST API
│   ├── db/                    # Connections & migrations runner
│   ├── controllers/           # Auth and board route controller logic
│   ├── routes/                # Auth, boards, tasks router
│   ├── Dockerfile             # Node API container
│   └── ...
├── notifier/                  # Background worker service
│   ├── worker.js              # Polling task assignments
│   ├── Dockerfile             # Worker container
│   └── ...
├── docker-compose.yml         # Local dev environment orchestrator
└── README.md                  # This documentation file
```

---

## 🛠️ Local Development

To run the entire suite locally using Docker Compose, ensure you have **Docker** and **Docker Compose** installed, then run:

```bash
docker compose up --build
```

### Port Mappings

*   **Frontend**: [http://localhost:3000](http://localhost:3000)
*   **Backend API**: [http://localhost:5000](http://localhost:5000)
*   **MySQL Server**: `localhost:3307` (Credentials: `root` / `root`)

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)
```env
PORT=5000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_NAME=taskflow
JWT_SECRET=your_jwt_secret_here
```

### Frontend (`frontend/.env`)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## 🔄 DB Migrations

Database tables are automatically created on container startup using a custom Javascript migrations script (`backend/db/migrate.js`). It checks if the database exists, creates the tables (`users`, `boards`, `board_members`, `tasks`, `comments`), and enforces foreign key constraints.

---

## 🛰️ CI/CD Deployment

### 1. Gated Pull Requests (CI)
The workflow in `.github/workflows/ci.yml` triggers on any pull request targeting `main`. It tests, lints, and verifies the build for all three directories using a matrix strategy.

### 2. Continuous Delivery (CD)
Upon merging a PR into `main`, the workflow `.github/workflows/deploy.yml`:
1. Logs into the **GitHub Container Registry (GHCR)**.
2. Builds and tags production-ready Docker images.
3. Pushes the images to `ghcr.io`.
4. Hits the **Render Deploy Hook** to trigger live container deployment.
