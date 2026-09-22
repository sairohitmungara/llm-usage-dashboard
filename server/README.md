# LLM Insight Hub

A simple web application that accepts text input and PDF uploads, processes the content using an LLM, and tracks LLM usage for every request.

## Features

- Text input processing
- PDF upload and text extraction
- LLM integration using OpenAI Responses API
- Model tracking
- Input token tracking
- Output token tracking
- Total token tracking
- Request count tracking
- Estimated cost calculation
- PostgreSQL usage history
- Simple usage dashboard
- Extensible model pricing configuration

## Tech Stack

### Frontend

- React
- TypeScript
- Vite

### Backend

- Node.js
- Express
- TypeScript
- OpenAI API
- PostgreSQL
- Multer
- pdf-parse

## Project Structure

```text
llm-usage-dashboard/
│
├── client/
│   └── React + TypeScript frontend
│
├── server/
│   ├── src/
│   │   ├── db.ts
│   │   ├── llm.ts
│   │   ├── pdf.ts
│   │   ├── server.ts
│   │   └── usage.ts
│   │
│   ├── uploads/
│   ├── .env
│   └── .env.example
│
└── README.md