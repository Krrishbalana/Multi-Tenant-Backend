# Multi-Tenant Backend API

This is the backend server for the role-based multi-tenant application built with Node.js and Express.

## Features

- User authentication with JWT and bcrypt password hashing
- Role-based access control with roles: `superadmin`, `admin`, and `user`
- Multi-tenant support with tenant isolation
- REST API endpoints for signup, login, tenant/user management
- CORS configured for frontend communication

## Setup

1. **Install dependencies**

npm install

2. **Configure environment variables**

For simplicity, secrets are hardcoded for development.  
For production, use environment variables:

- `JWT_SECRET`: JSON Web Token secret

3. **Run the server**

node server.js

Server listens on port `5050` by default.

## Predefined Users

- **Superadmin:**

  - Email: `superadmin@example.com`
  - Password: `supersecret`
  - Tenant ID: `global`

- **Admin:** (example, created manually or via API)
  - Email: `admin1@tenant1.com`
  - Password: `adminpassword`
  - Tenant ID: `tenant1`

## API Endpoints

- `POST /api/auth/signup` - Signup as regular user (role always `user`)
- `POST /api/auth/login` - Login user/admin/superadmin
- `GET /api/tenants` - List tenants (superadmin only)
- `GET /api/tenants/:tenantId/users` - List users in tenant (admin or superadmin)
- `POST /api/tenants/:tenantId/users` - Create user in tenant (admin or superadmin)
- `GET /api/users/me` - Get current user profile

## Notes

- This uses in-memory user storage for simplicity — data will reset on server restart.
- For production, integrate with a database and secure secret management.
