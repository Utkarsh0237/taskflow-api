# TaskFlow API

TaskFlow API is a production-conscious RESTful task-management API built with **Node.js**, **TypeScript**, and **Express**, with automated testing powered by **Vitest** and **Supertest**.

---

## Tech Stack

- **Runtime:** Node.js (v18+)
- **Language:** TypeScript (strict compiler configuration)
- **Web Framework:** Express.js
- **Testing Suite:** Vitest & Supertest
- **Development Tooling:** tsx (TypeScript execution & live reload)

---

## Architecture Overview

TaskFlow API follows a clean, modular architecture:

```text
taskflow-api/
├── src/
│   ├── app.ts            # Express application initialization & middleware
│   ├── server.ts         # Server startup & port binding
│   ├── routes/           # Route definitions & mapping (PR #1 & #2)
│   ├── controllers/      # Request handlers & HTTP response logic
│   ├── services/         # Business logic & in-memory data store
│   ├── middleware/       # Validation & error-handling middleware
│   └── types/            # TypeScript domain interfaces & DTOs
├── tests/                # Automated integration & unit tests
├── dist/                 # Compiled JavaScript output (generated)
├── tsconfig.json         # Strict TypeScript compiler options
└── package.json          # Dependencies and npm scripts
```

The server startup (`src/server.ts`) is deliberately decoupled from the Express application configuration (`src/app.ts`). This allows integration test runners (such as Supertest) to instantiate and query the application directly without binding to network ports.

---

## Getting Started

### Prerequisites

- Node.js (v18.0.0 or higher)
- npm (v9.0.0 or higher)
- Git

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Utkarsh0237/taskflow-api.git
   cd taskflow-api
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Application

- **Development Mode** (with automatic reload on file changes):
  ```bash
  npm run dev
  ```
- **Build Production Bundle**:
  ```bash
  npm run build
  ```
- **Start Production Server**:
  ```bash
  npm start
  ```

---

## Automated Testing

Run the test suite using Vitest:

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch
```

---

## API Endpoints

### Health Check

- **`GET /health`**
  - **Description:** Verifies service health, uptime, and system time.
  - **Success Response (200 OK):**
    ```json
    {
      "status": "ok",
      "uptime": 1.234,
      "timestamp": "2026-10-16T12:00:00.000Z"
    }
    ```

### Tasks

- **`POST /tasks`**
  - **Description:** Creates a new task with validation and default values (`status: 'pending'`, `priority: 'medium'`).
  - **Request Body:**
    ```json
    {
      "title": "Build PR #1",
      "description": "Implement task creation and listing",
      "status": "pending",
      "priority": "high"
    }
    ```
  - **Success Response (201 Created):**
    ```json
    {
      "id": "e4b3c9f2-...",
      "title": "Build PR #1",
      "description": "Implement task creation and listing",
      "status": "pending",
      "priority": "high",
      "createdAt": "2026-10-16T12:00:00.000Z",
      "updatedAt": "2026-10-16T12:00:00.000Z"
    }
    ```

- **`GET /tasks`**
  - **Description:** Lists tasks, optionally filtered by `status` or `priority`.
  - **Query Parameters:**
    - `status` (optional): `pending` | `in_progress` | `completed`
    - `priority` (optional): `low` | `medium` | `high`
  - **Success Response (200 OK):**
    ```json
    {
      "tasks": [ ... ],
      "count": 1
    }
    ```

- **`GET /tasks/:id`**
  - **Description:** Retrieves a specific task by its UUID.
  - **Success Response (200 OK):**
    ```json
    {
      "id": "e4b3c9f2-...",
      "title": "Build PR #1",
      "description": "Implement task creation and listing",
      "status": "pending",
      "priority": "high",
      "createdAt": "2026-10-16T12:00:00.000Z",
      "updatedAt": "2026-10-16T12:00:00.000Z"
    }
    ```
  - **Error Responses:** `400 Bad Request` (invalid UUID format), `404 Not Found` (task not found).

- **`PATCH /tasks/:id`**
  - **Description:** Partially updates an existing task. Fields `id`, `createdAt`, and `updatedAt` are immutable.
  - **Request Body (at least one field required):**
    ```json
    {
      "title": "Updated Task Title",
      "status": "completed"
    }
    ```
  - **Success Response (200 OK):** Returns updated task with refreshed `updatedAt` timestamp.
  - **Error Responses:** `400 Bad Request` (validation failure, no fields provided, or tampering with immutable fields), `404 Not Found` (task not found).

- **`DELETE /tasks/:id`**
  - **Description:** Deletes a task by its UUID.
  - **Success Response (204 No Content)**
  - **Error Responses:** `400 Bad Request` (invalid UUID format), `404 Not Found` (task not found).

---

## Security, Reliability & Error Handling

- **Security Headers (Helmet):** Automatically configures HTTP protection headers (e.g. `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`) and strips identifying headers (`X-Powered-By`).
- **Body Size Limiting:** Enforces a maximum request body size of **50kb** via `express.json({ limit: '50kb' })`, guarding against memory exhaustion and payload flood attacks (`413 PayloadTooLarge`).
- **In-Memory Rate Limiting:** Sliding-window rate limiting per IP address attaching `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers. Exceeded rates return `429 Too Many Requests` with a `Retry-After` header.
- **Centralized JSON Error Handling:**
  - Undefined routes return structured JSON `404 Not Found` (`{ error: 'NotFound', message: 'Cannot GET /path' }`) rather than default HTML.
  - Unexpected internal errors return clean `500 Internal Server Error` responses, preventing internal stack trace leaks to clients.
- **Graceful Shutdown:** Handles `SIGTERM` and `SIGINT` signals, draining existing connections cleanly before process termination.
