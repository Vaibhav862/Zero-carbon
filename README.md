# Zero Carbon One

> Agentic AI-powered Utility Bill Extraction System for Carbon Accounting

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Features](#features)
3. [Technology Stack](#technology-stack)
4. [Architecture](#architecture)
5. [AI Workflow](#ai-workflow)
6. [Getting Started](#getting-started)
7. [Docker Deployment](#docker-deployment)
8. [API Documentation](#api-documentation)
9. [Database Schema](#database-schema)
10. [Design Decisions](#design-decisions)

---

## 🏭 Project Overview

**Zero Carbon One** is a full-stack AI-powered document processing system designed to automate the extraction of structured data from utility bills and invoices for manufacturing companies. The system processes documents from multiple vendors and formats, returning standardized data suitable for carbon accounting, energy management, and sustainability reporting.

### Business Context

Manufacturing companies receive thousands of utility bills annually, including:
- ⚡ Electricity Bills
- 🛢️ Diesel Purchase Invoices
- 🪨 Coal Purchase Invoices
- 💧 Water Bills
- 🔥 Natural Gas Bills
- 🧊 LPG Bills
- ♨️ Steam Bills
- 🌱 Renewable Energy Certificates (REC)
- 🚚 Fuel Transportation Invoices

---

## ✨ Features

### Document Upload & Processing
- ✅ Single/multiple file upload (PDF, PNG, JPG, JPEG)
- ✅ Upload progress & real-time processing status
- ✅ Hybrid OCR pipeline (pdf-parse + Tesseract)
- ✅ Image preprocessing for better OCR accuracy

### Agentic AI Workflow
- ✅ **7-step multi-agent pipeline** orchestrated via Mastra AI
- ✅ OCR text cleaning agent
- ✅ Document type classification
- ✅ Vendor/supplier identification
- ✅ Field-level extraction with confidence scores
- ✅ Duplicate invoice detection
- ✅ Business rule validation
- ✅ Standardized JSON output

### Human Review & Validation
- ✅ Review extracted values
- ✅ Edit fields with confidence scores
- ✅ Approve/reject extractions
- ✅ Store user corrections

### Data Management
- ✅ Role-based access control (Admin/User)
- ✅ MongoDB for persistent storage
- ✅ Background task queue (BullMQ + Redis)
- ✅ Audit trail with agent trace logging

---

## 🛠️ Technology Stack

### Frontend
- **React 18.3** with Vite
- **React Router DOM** for routing
- **Axios** for API communication
- **Lucide React** for icons
- **Chart.js** for data visualization

### Backend
- **Node.js** with Express.js
- **Mongoose** ODM for MongoDB
- **JWT** for authentication
- **BullMQ** + **Redis** for background queues
- **Winston** for logging
- **Multer** for file uploads

### AI/ML Components
- **Mastra AI** - Agentic workflow orchestration
- **Tesseract.js** - OCR engine
- **pdf-parse** - PDF text extraction
- **Sharp** - Image preprocessing
- **LLM Providers** (OpenAI, Anthropic, Google Gemini)

### DevOps
- **Docker** & **Docker Compose**
- **Nginx** (frontend serving)

---

## 🏗️ Architecture

### System Architecture

```
┌─────────────────┐
│   React Client  │
│   (Port 3000)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Express API    │
│  (Port 5000)    │
└────┬────────┬───┘
     │        │
     ▼        ▼
┌────────┐  ┌───────────┐
│MongoDB │  │   Redis   │
└────────┘  └─────┬─────┘
                  │
                  ▼
         ┌────────────────┐
         │   BullMQ       │
         │   Worker       │
         └─────┬──────────┘
               │
               ▼
         ┌────────────────┐
         │  OCR Pipeline  │
         │  + Mastra AI   │
         │  Multi-Agents  │
         └────────────────┘
```

See [architecture.md](./architecture.md) for detailed Mermaid diagrams.

---

## 🤖 AI Workflow

### 7-Step Multi-Agent Pipeline

The system uses **Mastra AI** to orchestrate a sophisticated agentic workflow:

1. **OCR Cleaner Agent** - Repairs noisy/broken OCR text
2. **Classifier Agent** - Identifies document type (electricity, diesel, coal, etc.)
3. **Vendor Agent** - Identifies the vendor/supplier
4. **Extractor Agent** - Extracts fields with confidence scores per field
5. **Duplicate Check** - Database check for duplicate invoices/bills
6. **Validator Agent** - Business rule validation
7. **Formatter Agent** - Final JSON formatting & overall confidence calculation

### OCR Pipeline

```
PDF → Try pdf-parse → Quality check? → Yes → Use extracted text
                  → No → Convert to images → Preprocess (Sharp) → Tesseract OCR → Combine

Image → Preprocess (auto-rotate, normalize, sharpen, binarize) → Tesseract OCR
```

### Model Selection (LLM Providers)

Priority order (configurable):
1. **Google Gemini** (`gemini-2.5-flash`)
2. **OpenAI** (`gpt-4o-mini`)
3. **Anthropic** (`claude-3-5-haiku-latest`)

See [ai_workflow.md](./ai_workflow.md) for complete details.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- MongoDB 6.0+
- Redis 7+
- API key for at least one LLM provider (OpenAI, Anthropic, or Google)

### Local Development

#### 1. Clone & Setup

```bash
git clone <repository-url>
cd zero-carbon-one
```

#### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your API keys and configuration
npm install
npm run dev
```

**Environment Variables** (`.env`):
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/zerocarbon
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=20
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

#### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

#### 4. Run Workers

In a separate terminal:
```bash
cd backend
npm run worker
```

#### 5. First User Registration

The **first user** to register will automatically be an **admin**! Visit `http://localhost:3000` and register an account.

---

## 🐳 Docker Deployment

### Quick Start (Docker Compose)

```bash
# Build and start all services
docker-compose up --build
```

### Services

| Service | Port | Description |
|---------|------|-------------|
| `frontend` | 3000 | React app (Nginx) |
| `backend` | 5000 | Express API server |
| `worker` | - | BullMQ background worker |
| `mongodb` | 27017 | MongoDB database |
| `redis` | 6379 | Redis queue |

### Environment Variables

Create a `.env` file in the project root with your LLM API keys:

```env
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **MongoDB**: mongodb://localhost:27017/zerocarbon

---

## 📡 API Documentation

All endpoints are prefixed with `/api`. See [api_documentation.md](./api_documentation.md) for complete API specs.

### Quick Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/register` | POST | Register new user (first = admin) |
| `/auth/login` | POST | User login |
| `/documents/upload` | POST | Upload one or more files |
| `/documents` | GET | List documents (paginated) |
| `/documents/:id/status` | GET | Poll document status |
| `/extractions/:id` | GET | Get extraction data |
| `/extractions/:id` | PATCH | Update extracted fields |
| `/extractions/:id/approve` | POST | Approve extraction |

---

## 💾 Database Schema

MongoDB collections:

1. **users** - User auth & profiles
2. **documents** - Uploaded documents & processing status
3. **ocr_results** - OCR output storage
4. **extractions** - AI extracted data with fields & confidence
5. **approvals** - Approval/rejection records

See [db_schema.md](./db_schema.md) for complete schema details.

---

## 🧠 Design Decisions

### 1. Agentic AI Architecture

**Why Mastra AI?**
- Provides clean workflow orchestration for multi-agent systems
- Built-in model provider abstraction
- Easy to extend with additional agents

**Why Multi-Agent?**
- Separation of concerns (classifier ≠ extractor ≠ validator)
- Better prompt engineering per specialized task
- Independent testing & improvement of each agent

### 2. OCR Pipeline

**Hybrid approach:**
- First try direct PDF text extraction (fast)
- Fallback to Tesseract if quality is poor (accurate)
- Image preprocessing with Sharp (auto-rotate, binarize, sharpen)

### 3. Field-Level Confidence

**Why per-field confidence?**
- Users can see which fields are trustworthy
- Better human-in-the-loop review experience
- Enables automated confidence-based routing

### 4. Background Processing

**Why BullMQ + Redis?**
- Prevents request timeouts for long-running OCR/AI tasks
- Horizontal scalability with multiple workers
- Job persistence & retries

### 5. Role-Based Access

- **First user = Admin** (bootstrap convenience)
- Users only see their own documents
- Admins see all documents & approvals

### 6. No Hallucination Policy

- **Strict instructions** to agents: if uncertain, return `null`
- Preserve numerical values *exactly* (invoice numbers, amounts, GSTIN)
- OCR Cleaner never invents information

---

## 📁 Project Structure

```
zero-carbon-one/
├── backend/
│   ├── src/
│   │   ├── config/          # DB, Redis config
│   │   ├── controllers/     # Request handlers
│   │   ├── mastra/          # AI agents & workflow
│   │   │   ├── agents/      # 7 specialized agents
│   │   │   └── workflows/   # extractionWorkflow.js
│   │   ├── middleware/      # Auth, error handling
│   │   ├── models/          # Mongoose schemas
│   │   ├── routes/          # API routes
│   │   ├── services/        # OCR, queue, storage
│   │   ├── workers/         # BullMQ worker
│   │   └── server.js        # Entry point
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── context/         # AuthContext
│   │   ├── pages/           # Dashboard, Upload, Review, Admin
│   │   └── App.jsx
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── architecture.md          # System architecture docs
├── ai_workflow.md           # AI pipeline docs
├── api_documentation.md     # API specs
├── db_schema.md             # Database docs
├── docker-compose.yml       # Docker setup
└── README.md                # This file
```

---

## 📝 License

MIT License - feel free to use this project for learning and development.

---

## 🤝 Support

For issues or questions, please refer to the documentation or create an issue in the repository.