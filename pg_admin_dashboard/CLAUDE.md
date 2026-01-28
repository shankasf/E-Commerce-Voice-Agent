# CLAUDE.md - Project Configuration for Claude Code

## Project Overview
PostgreSQL Database Administration Dashboard - A full-featured web application for managing PostgreSQL databases, tables, queries, and data operations.

## Technology Stack
- **Frontend**: React with TypeScript, Tailwind CSS
- **Backend**: Node.js with Express/Fastify
- **Database**: PostgreSQL
- **Authentication**: JWT-based auth

## Commands

### Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

### Database
```bash
# Run database migrations
npm run db:migrate

# Seed database
npm run db:seed
```

## Project Structure
```
pg_admin_dashboard/
├── frontend/          # React frontend application
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API service layer
│   │   └── hooks/        # Custom React hooks
├── backend/           # Node.js backend API
│   ├── src/
│   │   ├── routes/       # API routes
│   │   ├── controllers/  # Route handlers
│   │   ├── services/     # Business logic
│   │   └── middleware/   # Express middleware
└── docker-compose.yml # Docker configuration
```

## Key Features to Implement
1. **Project Management**: Add/edit/delete database connection profiles
2. **Database Browser**: View schemas, tables, views, functions
3. **Table Management**: Create, alter, drop tables
4. **Query Editor**: Execute SQL queries with syntax highlighting
5. **Data Editor**: CRUD operations on table data
6. **Index Management**: Create and manage indexes
7. **User Management**: Database roles and permissions
8. **Backup/Restore**: Database backup and restore operations
9. **Query History**: Track and replay past queries

## Environment Variables
```
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
JWT_SECRET=your-secret-key
PORT=3000
```

## Coding Standards
- Use TypeScript for type safety
- Follow React best practices with functional components and hooks
- Use Tailwind CSS for styling
- Implement proper error handling and validation
- Use parameterized queries to prevent SQL injection
- All database operations should be wrapped in transactions where appropriate

## Security Considerations
- Never expose database credentials in client-side code
- Validate all user inputs
- Use parameterized queries for all database operations
- Implement rate limiting on API endpoints
- Log all database operations for audit purposes
