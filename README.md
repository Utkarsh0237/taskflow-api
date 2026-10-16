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

*(Task management endpoints for task creation, listing, updating, and deletion are implemented via pull requests #1, #2, and #3).*
