# 🛡️ RateGuard — Smart API Rate Limiter

<div align="center">

**A full-stack API rate limiter with JWT authentication, Redis-based counters, MongoDB analytics, and a real-time React dashboard.**

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Redis](https://img.shields.io/badge/Redis-Rate%20Counters-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io)
[![MongoDB](https://img.shields.io/badge/MongoDB-Analytics-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://mongodb.com)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com)
[![Chart.js](https://img.shields.io/badge/Chart.js-Dashboard-FF6384?style=for-the-badge&logo=chart.js&logoColor=white)](https://chartjs.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![MIT License](https://img.shields.io/badge/License-MIT-F59E0B?style=for-the-badge)](LICENSE)

> Protect your API from abuse. Monitor usage in real time. Manage plans with a single click.  
> Role-based limits enforced at the Redis layer — fast, atomic, and production-ready.

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Quick Start with Docker](#quick-start-with-docker)
- [Manual Setup](#manual-setup)
- [API Documentation](#api-documentation)
- [Dashboard](#dashboard)
- [Testing the Rate Limiter](#testing-the-rate-limiter)
- [Project Structure](#project-structure)
- [Docker Hot-Reload Development](#docker-hot-reload-development)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

RateGuard is a production-ready API rate limiter that demonstrates the full stack of concerns behind request throttling — from atomic Redis counters to per-user plan management to live analytics charts. It ships as a Dockerized monorepo: one command starts MongoDB, Redis, the Express API, and the React frontend.

**Three plan tiers, enforced at the middleware layer:**

| Plan | Limit | Use Case |
|---|---|---|
| `FREE` | 20 requests / min | Default for new users |
| `PREMIUM` | 200 requests / min | Upgraded users |
| `ADMIN` | Unlimited | Internal / system access |

Rate counters live in Redis — atomic increments with 1-minute TTL. Every request (allowed or blocked) is logged to MongoDB for analytics. The dashboard renders all of it live.

---

## Features

| Category | Capability |
|---|---|
| **Auth** | JWT-based signup & login with bcrypt password hashing |
| **Rate Limiting** | Redis atomic counters, role-based limits, automatic TTL |
| **Analytics** | Every request logged to MongoDB (endpoint, user, status, timestamp) |
| **Dashboard** | Real-time stats cards, requests/hour chart, blocked/hour chart, top endpoints, active users |
| **Plan Management** | Users can switch plans instantly from their profile page |
| **Response Headers** | `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` on every response |
| **DevOps** | Full Docker Compose stack — zero manual service setup; override file enables hot-reload |
| **UI** | React 18 + Tailwind CSS + Chart.js, fully responsive |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, React Router v6, Axios, Chart.js, Tailwind CSS |
| **Backend** | Node.js, Express, JWT, bcryptjs, Mongoose, Nodemon |
| **Databases** | MongoDB (analytics + users), Redis (rate counters) |
| **DevOps** | Docker, Docker Compose, `docker-compose.override.yml` (hot-reload) |
| **Security** | bcrypt password hashing, JWT tokens, CORS, atomic Redis increments |

---

## Quick Start with Docker

> **Recommended.** Requires [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/).

```bash
# 1. Clone the repository
git clone https://github.com/kanhaiyaray/rateguard.git
cd rateguard

# 2. Start all services (MongoDB, Redis, API, Frontend)
docker-compose up -d

# 3. Open the app
open http://localhost:3000
```

All four services start in the background. To shut everything down:

```bash
docker-compose down
```

> **Note:** `docker-compose up -d` also automatically picks up `docker-compose.override.yml` if it exists in the project root. This means hot-reload for the server (via Nodemon) and live React updates for the client are enabled out of the box — no extra flags needed.

---

## Manual Setup

Prefer running services locally without Docker? Follow these steps.

### Prerequisites

- Node.js v18+
- MongoDB running locally or via [Atlas](https://mongodb.com/atlas)
- Redis running locally

### Step 1: Install Dependencies

```bash
# Server
cd server && npm install

# Client
cd ../client && npm install
```

### Step 2: Configure Environment Variables

**Server** (`server/.env`):
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/rate-limiter
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_secure_secret_key_here
```

**Client** (`client/.env`):
```env
REACT_APP_API_URL=http://localhost:5000/api
```

> **Note:** When running via Docker, the client points to port `5001` internally. For manual local runs, use port `5000` as shown above.

### Step 3: Run the Services

```bash
# Terminal 1 — Backend (Nodemon watches src/server.js and restarts on changes)
cd server && npm run dev

# Terminal 2 — Frontend
cd client && npm start
```

`npm run dev` on the server runs `nodemon src/server.js` — any change to a file inside `server/src/` will automatically restart the Express process. No manual kills needed.

Open **http://localhost:3000** in your browser.

---

## API Documentation

All endpoints are prefixed with `/api`.  
**Base URL:** `http://localhost:5000/api`

### 🔑 Authentication (Public)

| Method | Endpoint | Body | Description |
|---|---|---|---|
| `POST` | `/auth/register` | `{ name, email, password }` | Register a new user (defaults to `FREE` plan) |
| `POST` | `/auth/login` | `{ email, password }` | Login and receive a JWT |

### 🛡️ Protected (Requires `Authorization: Bearer <token>`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/profile` | Get current user profile and plan info |
| `GET` | `/dashboard` | Usage stats, charts data, top endpoints, active users |
| `POST` | `/admin/change-plan` | Switch plan (`FREE`, `PREMIUM`, or `ADMIN`) |

All protected routes pass through the rate limiter middleware. Requests over the plan limit receive a `429 Too Many Requests` response.

### Rate Limit Response Headers

Every response includes:

```
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 15
X-RateLimit-Reset: 1623456789
```

### Error Response — Rate Limit Exceeded

```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Upgrade your plan for a higher limit.",
  "retryAfter": 42
}
```

---

## Dashboard

The React dashboard gives you a live view of API health and usage:

| Section | What You See |
|---|---|
| **Stats Cards** | Requests today, remaining quota, requests blocked, current plan limit |
| **Requests/Hour Chart** | Bar chart of allowed requests over the last 24 hours |
| **Blocked/Hour Chart** | Bar chart of blocked requests over the last 24 hours |
| **Top Endpoints** | Most frequently called API paths ranked by request count |
| **Active Users** | Users ranked by request volume |
| **Profile Page** | User info, current plan, and one-click plan upgrade/downgrade buttons |

---

## Testing the Rate Limiter

1. **Register** a new account — plan defaults to `FREE` (20 req/min)
2. Open the **Dashboard** and refresh rapidly — watch the stats cards update
3. After the 20th request, the API returns `429 Too Many Requests`
4. The **Blocked** counter and chart increment in real time
5. Navigate to **Profile** → change plan to `PREMIUM` (200/min) or `ADMIN` (unlimited)
6. The new limit takes effect immediately — no restart required

---

## Project Structure

```
rateguard/
│
├── client/                          # React 18 frontend
│   ├── public/
│   ├── src/
│   │   ├── components/              # Navbar, Dashboard, Profile, Charts, etc.
│   │   ├── contexts/                # AuthContext — JWT token & user state
│   │   ├── pages/                   # Route-level page components
│   │   ├── services/                # Axios instance + API helpers
│   │   ├── utils/                   # Shared utility functions
│   │   ├── App.jsx
│   │   └── index.js
│   ├── .env
│   └── package.json
│
├── server/                          # Express backend
│   ├── src/
│   │   ├── config/                  # MongoDB + Redis connection setup
│   │   ├── controllers/             # Route handler logic
│   │   ├── middleware/              # Auth guard + Rate Limiter middleware
│   │   ├── models/                  # User and Analytics Mongoose schemas
│   │   ├── routes/                  # API route definitions
│   │   ├── services/                # Business logic layer
│   │   ├── app.js                   # Express app setup
│   │   └── server.js                # Server entry point 
│   ├── .env
│   └── package.json                 # "dev": "nodemon src/server.js"
│
├── docker-compose.override.yml      # Auto-loaded: enables hot-reload for dev
├── docker-compose.yml               # Orchestrates all 4 services (prod baseline)
├── Dockerfile.client                # React build container
├── Dockerfile.server                # Node.js API container
└── README.md
```

---

## Docker Hot-Reload Development

Docker Compose **automatically merges** `docker-compose.override.yml` with `docker-compose.yml` whenever you run `docker-compose up`. No extra flags or commands needed — the file just needs to exist.

The override file mounts your local source directories into the running containers and switches the server's start command to `npm run dev`, which runs `nodemon src/server.js`. Nodemon watches everything inside `server/src/` and restarts the process the moment any file changes. React's dev server already does the same for the client side.

**`docker-compose.override.yml`**
```yaml
services:
  server:
    volumes:
      - ./server/src:/app/src                  # Local src/ → container src/
      - ./server/package.json:/app/package.json
    command: npm run dev                        # Runs: nodemon src/server.js

  client:
    volumes:
      - ./client/src:/app/src                  # Live React source sync
      - ./client/public:/app/public
    # react-scripts already watches and hot-reloads — no command override needed
```

**How it works end-to-end:**

```
You edit server/src/middleware/rateLimiter.js
        │
        ▼
Docker bind mount syncs the change into /app/src/
        │
        ▼
Nodemon detects the file change → restarts Express
        │
        ▼
New rate-limit logic is live — no docker-compose restart needed
```

**Start the full hot-reload stack:**

```bash
docker-compose up -d
```

**Verify Nodemon is running inside the server container:**

```bash
docker-compose logs -f server
# You should see:
# [nodemon] starting `node src/server.js`
# ✅ MongoDB connected
# ✅ Redis connected
# 🚀 RateGuard server running on port 5000
```

**Stopping all services:**

```bash
docker-compose down
```

> **Tip:** If you add a new `npm` package during development, you'll need to rebuild the server container once so the new dependency is installed inside it:
> ```bash
> docker-compose up -d --build server
> ```
> After that, hot-reload continues as normal.

---

## Contributing

Contributions are welcome. Here's the workflow:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes with a clear message
4. Push to your fork and open a Pull Request

Please ensure your code follows the existing style and includes tests where relevant.

---

## License

This project is open-source under the **MIT License** — for personal, educational, and commercial use.

---

## Acknowledgements

- [Express](https://expressjs.com) — Node.js web framework
- [React](https://react.dev) — UI library
- [MongoDB](https://mongodb.com) — NoSQL analytics storage
- [Redis](https://redis.io) — In-memory rate counter store
- [Chart.js](https://chartjs.org) — Dashboard charts
- [Tailwind CSS](https://tailwindcss.com) — Utility-first styling
- [Nodemon](https://nodemon.io) — Automatic server restart on file change

---

<div align="center">

Built by **Kanhaiya Kumar**

[GitHub](https://github.com/kanhaiyaray) · [LinkedIn](https://www.linkedin.com/in/raykanhaiya/) · [samkanhaiya@gmail.com](mailto:samkanhaiya@gmail.com)

*"Rate limiting isn't just a feature — it's infrastructure."*

</div>