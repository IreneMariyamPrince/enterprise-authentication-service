# Enterprise Authentication Service (AuthSphere)

A production-grade full-stack authentication and authorization platform.

## Architecture

- **Frontend**: Next.js 15, React 19, Tailwind CSS, ShadCN UI
- **Backend**: NestJS, TypeScript, Prisma ORM
- **Database**: PostgreSQL
- **Cache**: Redis

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 20+

### Local Development

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in the values.
3. Start the infrastructure:
   ```bash
   docker-compose up -d
   ```
4. Backend setup:
   ```bash
   cd backend
   npm install
   npx prisma db push
   npm run start:dev
   ```
5. Frontend setup:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Documentation

- [Architecture Diagram](./docs/architecture.md)
- [Database Schema (ER Diagram)](./docs/er-diagram.md)
- [API Contracts](./docs/openapi.yaml)
- [Project Specifications](./docs/project-specification.md)
