# CI/CD & Deployment Guide — TaskFlow

This guide walks you through deploying TaskFlow live to production on the free hosting tiers of **Render** and **GitHub Container Registry (GHCR)**.

---

## 🎒 Prerequisites

1.  A GitHub repository containing the TaskFlow code.
2.  A free account at [render.com](https://render.com).
3.  A free MySQL database from a hosting provider like **Aiven**, **TiDB Cloud**, or **Clever Cloud**.

---

## 🛢️ 1. Provision a Cloud MySQL Database

Render's free tier natively hosts PostgreSQL, but since TaskFlow uses MySQL, you must set up an external MySQL database:

1.  Sign up at [Aiven.io](https://aiven.io) or another MySQL hosting provider.
2.  Create a free-tier MySQL database instance.
3.  Retrieve your database connection details:
    *   **DB_HOST**
    *   **DB_PORT** (usually `3306`)
    *   **DB_USER**
    *   **DB_PASSWORD**
    *   **DB_NAME** (e.g., `taskflow` or database name provided)

---

## 🚀 2. Deploy Services on Render

Create three separate services in your Render Dashboard:

### A. Backend Service
1.  Click **New +** ➔ **Web Service** in Render.
2.  Connect your GitHub repository.
3.  Configure parameters:
    *   **Name**: `taskflow-backend`
    *   **Language**: `Docker`
    *   **Docker Build Context**: `./backend`
    *   **Dockerfile Path**: `Dockerfile`
4.  Navigate to **Environment** tab and add the following variables:
    *   `PORT` = `5000`
    *   `DB_HOST` = `<your_cloud_mysql_host>`
    *   `DB_PORT` = `<your_cloud_mysql_port>`
    *   `DB_USER` = `<your_cloud_mysql_user>`
    *   `DB_PASSWORD` = `<your_cloud_mysql_password>`
    *   `DB_NAME` = `<your_cloud_mysql_database_name>`
    *   `JWT_SECRET` = `<a_strong_random_secret_string>`
5.  Launch the service. Note down the public URL (e.g. `https://taskflow-backend.onrender.com`).

### B. Frontend Service
1.  Click **New +** ➔ **Web Service** in Render.
2.  Connect your GitHub repository.
3.  Configure parameters:
    *   **Name**: `taskflow-frontend`
    *   **Language**: `Docker`
    *   **Docker Build Context**: `./frontend`
    *   **Dockerfile Path**: `Dockerfile`
4.  Navigate to **Environment** tab and add the following variables:
    *   `NEXT_PUBLIC_API_URL` = `https://taskflow-backend.onrender.com` (use your deployed backend URL from step A)
5.  Launch the service. This will build your Next.js application in production mode.

### C. Notifier Background Service
1.  Click **New +** ➔ **Background Worker** in Render.
2.  Connect your GitHub repository.
3.  Configure parameters:
    *   **Name**: `taskflow-notifier`
    *   **Language**: `Docker`
    *   **Docker Build Context**: `./notifier`
    *   **Dockerfile Path**: `Dockerfile`
4.  Navigate to **Environment** tab and add database credentials:
    *   `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (same as Backend).
5.  Launch the service. Since it doesn't listen on a port, it runs quietly in the background, polling for task changes.

---

## 🔒 3. Configure GitHub CI/CD Actions

1.  In your Render Dashboard, go to your **Backend Service** ➔ **Settings** ➔ Scroll to **Deploy Hook**.
2.  Copy the Deploy Hook URL.
3.  Open your GitHub Repository in a browser.
4.  Navigate to **Settings** ➔ **Secrets and variables** ➔ **Actions**.
5.  Click **New repository secret**:
    *   **Name**: `RENDER_DEPLOY_HOOK_URL`
    *   **Value**: Paste the Render Deploy Hook URL.
6.  Whenever code is merged to `main`, GitHub Actions will:
    1.  Log in to `ghcr.io` (using `GITHUB_TOKEN` credentials which are automatically provided).
    2.  Build the Matrix images for all three services.
    3.  Push them to your package library.
    4.  Call the Render webhook to trigger the redeployment.

---

## 🛡️ 4. Branch Protection Rules

Ensure your `main` branch is protected so changes cannot be pushed directly without code reviews and passing tests:

1.  Navigate to your GitHub repository **Settings** ➔ **Branches**.
2.  Click **Add rule** or edit existing rules for `main`.
3.  Enable **Require a pull request before merging**.
4.  Enable **Require status checks to pass before merging** and search for `build-and-test` to enforce the matrix CI checks.
5.  Save changes.
