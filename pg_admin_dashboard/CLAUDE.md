# CLAUDE.md - Project Configuration for Claude Code

## Project Overview
PostgreSQL Database Administration Dashboard - A full-featured web application for managing PostgreSQL databases, tables, queries, and data operations.

**PostgreSQL Version**: 18.1 (https://www.postgresql.org/docs/current/)

## Technology Stack
- **Frontend**: React with TypeScript, Tailwind CSS
- **Backend**: Node.js with Express/Fastify
- **Database**: PostgreSQL 18.1
- **Authentication**: JWT-based auth (SCRAM-SHA-256 for PostgreSQL roles)

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

## PostgreSQL 18.1 Features Used
- **uuidv7()**: Temporally sortable UUIDs (used for all primary keys in migrations)
- **SCRAM-SHA-256**: Default password authentication (md5 is deprecated)
- **EXPLAIN ANALYZE**: Automatically includes BUFFERS
- **pg_dump/pg_restore**: New --statistics and --sequence-data options
- **Data Checksums**: Enabled by default
- **Virtual Generated Columns**: Now the default for generated columns
- **Temporal Constraints**: WITHOUT OVERLAPS support for ranges

## Security Considerations
- Never expose database credentials in client-side code
- Validate all user inputs
- Use parameterized queries for all database operations
- Implement rate limiting on API endpoints
- Log all database operations for audit purposes
- Use SCRAM-SHA-256 authentication (PostgreSQL 18.1+ deprecates md5)
