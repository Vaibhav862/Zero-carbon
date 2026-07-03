# Database Schema

MongoDB is used for data storage with Mongoose as ODM.

---

## Collections

### 1. users
Stores user authentication and profile info.

| Field | Type | Required | Description |
|---|---|---|---|
| `_id` | ObjectId | yes | User ID |
| `name` | String | yes | User's full name |
| `email` | String | yes | Unique email address (lowercase, normalized) |
| `password_hash` | String | yes | Hashed password (bcrypt) |
| `role` | String | yes | `admin` or `user` (default `user`) |
| `is_active` | Boolean | yes | Account active flag (default `true`) |
| `refresh_token` | String | no | JWT refresh token |
| `last_login` | Date | no | Last login timestamp |
| `created_at` | Date | yes | Account creation time |
| `updated_at` | Date | yes | Last updated time |

---

### 2. documents
Stores uploaded document metadata and processing status.

| Field | Type | Required | Description |
|---|---|---|---|
| `_id` | ObjectId | yes | Document ID |
| `user_id` | ObjectId | yes | Uploader ID (ref to users) |
| `filename` | String | yes | Unique filename (UUID-based) |
| `original_name` | String | yes | Original file name |
| `mime_type` | String | yes | File MIME type |
| `file_path` | String | yes | File storage path |
| `file_size` | Number | yes | File size in bytes |
| `status` | String | yes | `queued`, `ocr_processing`, `ai_extracting`, `done`, `failed` |
| `job_id` | String | no | BullMQ job ID |
| `error_message` | String | no | Error message if status = failed |
| `uploaded_at` | Date | yes | Upload timestamp |
| `updated_at` | Date | yes | Last updated |

**Indexes**: