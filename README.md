# Product Compliance & Rejection Risk Analyzer

A comprehensive pre-certification decision-support platform that evaluates product formulations against strict regulatory standards, identifies compliance violations, and generates AI-powered risk assessments with professional PDF reports. 

The system now includes a **Virtual Reformulation Simulator**, a **Shelf-Life Prediction Engine**, and **User Evaluation History**, providing an all-in-one suite for R&D chemists and regulatory compliance officers.

---

## 🎯 Problem Statement

Manufacturers face costly product rejections during BIS (Bureau of Indian Standards) and FSSAI certification due to non-compliant formulations. Current compliance checks are manual, error-prone, and lack structured risk assessment — leading to delayed time-to-market and financial losses.

## 💡 Solution

An automated compliance engine and virtual lab that:
- Validates product ingredient data against regulation-grade rules (BIS, FSSAI)
- Detects violations (banned substances, exceeded limits, missing data)
- Computes rejection risk scores with severity-weighted aggregation
- Generates human-readable AI explanations and actionable recommendations
- Offers a **Virtual Reformulation Simulator** to test "what-if" scenarios and get dynamic optimization suggestions
- Includes a **Shelf-Life Prediction Module** to estimate degradation based on environmental factors
- Produces professional PDF compliance certificates
- Maintains User History for tracking past evaluations

---

## 📸 Screenshots

| Feature | Screenshot |
|---------|------------|
| **Product Compliance Dashboard** | <img src="assets/Landing.png" width="400" alt="Landing Page"> |
| **New Evaluation Input** | <img src="assets/Input.png" width="400" alt="Evaluation Input">  |
| **Compliance Results & Risk** | <img src="assets/Result.png" width="400" alt="Result Overview"> |
| **Shelf Life Calculation** | <img src="assets/Input2.png" width="400" alt="Evaluation Input 2"> |
| **Shelf Life Results** | <img src="assets/Result2.png" width="400" alt="Result Details"> |
| **Shelf Life Analysis** | <img src="assets/Analysis.png" width="400" alt="Delta Analysis"> |

---

## 🏗️ Architecture

```
Frontend (React + Tailwind CSS)
   ↓
API Layer (Express + JWT Auth)
   ↓
Validation & Normalization Layer (Zod + Aliases)
   ↓
Generic Rule Engine (JS) & Test Modules
   ↓
Category Rule Loader (JSON: Soap, Hair Oil, Talcum, Cookies, etc.)
   ↓
Delta Engine & Shelf-Life Engine
   ↓
Risk Aggregation & AI Explanation Engine (Gemini)
   ↓
PostgreSQL (Users, History, Shelf-Life Profiles, Substances)
```

**Core Principle:** Logic is generic. Categories are data.

---

## 📌 Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express |
| Frontend | React + Tailwind CSS + Vite |
| Database | PostgreSQL |
| Rule Engine | Custom JS engine + Extensible Test Modules |
| Rules | JSON-based, data-driven |
| AI | Google Gemini (explanations & contextual suggestions) |
| Validation | Zod |
| Reports | PDFKit |

---

## 📁 Project Structure

```
compliance/
├── assets/                        # Project images and screenshots
├── compliance-backend/
│   ├── database/                  # SQL migrations & seed data (schema, shelf-life, history)
│   ├── rules/                     # BIS/FSSAI regulation rules (JSON)
│   ├── src/
│   │   ├── controllers/           # API handlers (evaluate, auth, simulation, shelf-life)
│   │   ├── routes/                # Express routing
│   │   ├── services/              # Core business logic (ruleEngine, deltaEngine, aiService, etc.)
│   │   └── utils/                 # Helpers (converters, validators)
│   ├── tests/                     # Comprehensive Jest test suite
│   └── package.json
├── compliance-frontend/
│   ├── src/
│   │   ├── pages/                 # React Pages (Evaluate, SimulationLab, ShelfLife, History, Auth)
│   │   ├── api.js                 # Backend communication
│   │   └── App.jsx                # Router config
│   ├── tailwind.config.js         # Tailwind styling tokens
│   └── package.json
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Docker and Docker Compose (Recommended)
- Node.js (v20+) (For manual setup)
- PostgreSQL (v14+) (For manual setup)
- Google Gemini API Key

### Setup (Using Docker - Recommended)

The easiest way to run the entire application stack is using Docker Compose.

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd compliance
   ```

2. **Configure Environment Variables**
   Ensure your `compliance-backend/.env` file contains your Gemini API key (the rest will be overridden automatically by Docker):
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

3. **Run the Application**
   ```bash
   docker compose up --build
   ```
   *Note: On the first run, the PostgreSQL container will automatically seed the database schema and substance rules.*

4. **Access the App**
   - Frontend: `http://localhost:5174`
   - Backend API: `http://localhost:3000`

---

### Manual Setup (Without Docker)

1. **Setup Database**
   - Create a PostgreSQL database named `compliance_db`
   - Run the SQL files in `compliance-backend/database/` to seed schema, substances, history tracking, and shelf-life profiles.

2. **Backend Setup**
   ```bash
   cd compliance-backend
   npm install
   cp .env.example .env  # Add DB credentials, JWT_SECRET, and GEMINI_API_KEY
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd ../compliance-frontend
   npm install
   npm run dev
   ```

4. **Run Tests (Optional)**
   ```bash
   cd compliance-backend
   npm test
   ```

---

## 📡 API Endpoints Overview

- `POST /api/auth/signup` & `POST /api/auth/login` - User authentication
- `GET /api/history` - Fetch user's evaluation history
- `POST /api/evaluate` - Core compliance evaluation against rules
- `POST /api/report` - PDF certificate generation
- `POST /api/simulate` - Run reformulation scenarios and delta analysis
- `POST /api/shelflife` - Calculate microbial and chemical shelf-life impacts

---

## 🔒 Domain Scope (Current Categories)

| Category | Standard Mapped |
|---|---|
| Body Soap | BIS IS 2888:2004 |
| Hair Oil | BIS IS 7123:2019 |
| Talcum Powder | BIS IS 1462:2019 |
| Body Spray / Deodorant | BIS IS 8482:2007 |
| Moisturizing Cream/Lotion| BIS IS 6608:2004 |
| Cookies & Biscuits | FSSAI 2.11.10 |

---

## 📄 License

ISC
