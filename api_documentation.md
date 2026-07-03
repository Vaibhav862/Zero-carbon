# API Documentation

All endpoints are prefixed with `/api`.

---

## Authentication

Most endpoints require authentication using a Bearer token (JWT). Include the header:
```http
Authorization: Bearer <your_access_token>
```

---

## Authentication Endpoints (`/auth`)

### POST /api/auth/register
Register a new user. **The first user is automatically an admin!**

**Request Body**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "admin"
    },
    "access_token": "eyJhbGc...",
    "refresh_token": "eyJfaWQi..."
  }
}
```

---

### POST /api/auth/login
Log in an existing user.

**Request Body**:
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "user": { /* ... */ },
    "access_token": "...",
    "refresh_token": "..."
  }
}
```

---

### POST /api/auth/refresh
Refresh an expired access token using the refresh token.

**Request Body**:
```json
{
  "refresh_token": "..."
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "access_token": "..."
  }
}
```

---

### POST /api/auth/logout (Protected)
Log out the current user.

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### GET /api/auth/me (Protected)
Get the current authenticated user's profile.

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "user": { /* ... */ }
  }
}
```

---

## Document Endpoints (`/documents`) (All Protected)

### POST /api/documents/upload (Protected)
Upload one or more files. Max 10 files, 20MB per file.

**Request**: `multipart/form-data` with `files` key.

**Response (201 Created)**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "original_name": "electricity-bill.pdf",
      "filename": "uuid.pdf",
      "status": "queued"
    }
  ]
}
```

---

### GET /api/documents (Protected)
Get paginated list of documents.
- Regular users only see their own docs
- Admins see all docs

**Query Params**:
| Name | Type | Default | Description |
|---|---|---|---|
| `page` | number | 1 | Page number |
| `limit` | number | 10 | Number of items per page |
| `search` | string | | Search by original filename |
| `status` | string | | Filter by status |

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "original_name": "bill.pdf",
      "status": "done",
      "uploaded_at": "...",
      "extraction_summary": {
        "document_type": "electricity_bill",
        "vendor": "Tata Power",
        "total_amount": 1200
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "pages": 5
  }
}
```

---

### GET /api/documents/:id (Protected)
Get a single document by ID.

**Response (200 OK)**:
```json
{
  "success": true,
  "data": { /* document */ }
}
```

---

### GET /api/documents/:id/status (Protected)
Poll document status (used by frontend).

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "status": "ai_extracting"
  }
}
```

---

### DELETE /api/documents/:id (Protected, Owner/Admin Only)
Delete a document and all associated data (OcrResult, Extraction, Approval).

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

---

## Extraction Endpoints (`/extractions`) (All Protected)

### GET /api/extractions/approvals (Admin Only)
Get list of all approvals.

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [ /* approvals */ ]
}
```

---

### GET /api/extractions/:id (Protected)
Get extraction data for a document.

**Response (200 OK)**:
```json
{
  "success": true,
  "data": { /* extraction */ }
}
```

---

### PATCH /api/extractions/:id (Protected)
Update extraction fields.

**Request Body**:
```json
{
  "fields": {
    "total_amount": {
      "value": 15000,
      "confidence": 1.0
    }
  }
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": { /* updated extraction */ }
}
```

---

### POST /api/extractions/:id/approve (Protected)
Approve extraction (and set document status to done).

**Request Body (optional)**:
```json
{
  "notes": "Looks good!",
  "corrections": {
    "vendor": {
      "original": "Tata Power",
      "corrected": "Tata Power Ltd"
    }
  }
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Extraction approved"
}
```

---

### POST /api/extractions/:id/reject (Protected)
Reject extraction.

**Request Body (optional)**:
```json
{
  "notes": "Need to re-upload"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Extraction rejected"
}
```