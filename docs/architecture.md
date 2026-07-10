# Enterprise Authentication Service Architecture

## Overview
AuthSphere is a centralized authentication and authorization service designed to support multiple applications and organizations.

## High-Level Architecture
- **Frontend**: Next.js 15 (App Router) client application handling login, registration, dashboards (admin/user), and MFA setup. Deployed on Vercel.
- **Backend**: NestJS application exposing REST APIs. Handles business logic, token generation, and database interactions. Deployed on Render.
- **Database**: PostgreSQL hosted on Supabase.
- **Cache/Sessions**: Redis hosted on Upstash for session management and rate limiting.

## Backend Architecture (NestJS)
The backend follows a modular Clean Architecture approach:
- **Controllers**: Handle HTTP requests and routing.
- **Services**: Contain business logic and orchestration.
- **Repositories (Prisma)**: Abstract database access.
- **Guards**: Implement role-based and permission-based access control (RBAC).
- **Modules**: Domain-driven isolation (Auth, Users, Roles, Organizations, etc.).

## Security
- Password Hashing: Argon2
- Token Strategy: Short-lived Access Tokens (JWT, 15m) + Long-lived Refresh Tokens (30d).
- Rate Limiting: Redis-based rate limiting per IP/User.
- Cross-Site Request Forgery (CSRF): Handled via appropriate headers and SameSite cookies.
