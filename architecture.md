# Architecture

## System Architecture Overview

Zero Carbon One uses a modular, microservices-inspired architecture with Docker Compose orchestration.

```mermaid
flowchart LR
    subgraph "Client Layer"
        Browser[Web Browser]
    end

    subgraph "Presentation Layer"
        Frontend[React Frontend (Nginx)]
    end

    subgraph "API Layer"
        Backend[Express API Server]
    end

    subgraph "Queue & Worker Layer"
        Redis[(Redis)]
        Worker[BullMQ Document Worker]
    end

    subgraph "AI & OCR Layer"
        Mastra[Mastra AI Orchestrator]
        Agents[Multi-Agent System]
        OCRService[OCR Pipeline (pdf-parse + Tesseract)]
        LLMs[LLMs (OpenAI / Anthropic / Google)]
    end

    subgraph "Data Layer"
        MongoDB[(MongoDB Database)]
    end

    Browser --> Frontend
    Frontend --> Backend
    Backend --> Redis
    Backend --> MongoDB
    Redis --> Worker
    Worker --> OCRService
    Worker --> Mastra
    Mastra --> Agents
    Agents --> LLMs
    Worker --> MongoDB
```

---

## Document Processing Pipeline

This is the core flow of a document from upload to approval:

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Frontend
    participant Backend
    participant MongoDB
    participant Redis
    participant Worker
    participant OCRService
    participant Mastra

    User->>Frontend: Upload Document
    Frontend->>Backend: POST /api/documents/upload
    activate Backend
    Backend->>MongoDB: Create Document (status=queued)
    Backend->>Redis: Add BullMQ Job
    Backend->>Frontend: Return 201 Created
    deactivate Backend

    Worker->>Redis: Dequeue Job
    activate Worker
    Worker->>MongoDB: Update status to ocr_processing
    Worker->>OCRService: Run OCR Pipeline
    OCRService->>MongoDB: Save OcrResult
    Worker->>MongoDB: Update status to ai_extracting
    Worker->>Mastra: Run Extraction Workflow
    Mastra-->>Worker: Return Final JSON
    Worker->>MongoDB: Save Extraction
    Worker->>Redis: Complete Job
    deactivate Worker

    User->>Frontend: Check Dashboard
    Frontend->>Backend: GET /api/documents/:id/status
    Backend->>Frontend: Poll status updates

    User->>Frontend: Review & Approve
    Frontend->>Backend: POST /api/extractions/:id/approve
    Backend->>MongoDB: Create Approval, set Document to done
```

---

## Backend Component Architecture
