throxy-persona-ranker/
├── src/
│   ├── app/
│   │   ├── api/rank/route.ts    # AI ranking endpoint
│   │   └── page.tsx              # Main UI with table
│   └── lib/
│       └── supabase.ts           # Database client + types

# Throxy Persona Ranker

AI-powered B2B lead qualification and ranking system. Built for the Throxy technical challenge.

## 🚀 Live Demo

[Deploy URL will be here after Vercel deployment]

## 📋 Features

- **AI-Powered Ranking**: Uses OpenAI GPT-4o-mini to rank leads against an ideal customer persona
- **CSV/TSV Import**: Upload leads in bulk, grouped by import batch
- **Business Filtering**: Applies advanced business rules before saving leads
- **Batch Management**: Work with specific import batches for focused ranking
- **Sortable Table**: Sort by AI score, priority, name, title, company, or size
- **CSV Export**: Download top N leads per company
- **Real-time Cost Tracking**: See OpenAI token/cost stats for each ranking
- **English UI**: All interface elements in English
- **Supabase/Postgres Backend**: Scalable, secure data storage
- **TypeScript**: Full type safety

## 🏗️ Architecture Overview

### Tech Stack
- **Frontend**: Next.js 16 (App Router) + React 19 + TailwindCSS
- **Backend**: Next.js API Routes (serverless)
- **Database**: PostgreSQL (Supabase)
- **AI**: OpenAI GPT-4o-mini
- **Deployment**: Vercel

### Data Flow
1. **Import**: Upload CSV/TSV via UI, assign to a batch, business filters applied before saving
2. **Ranking**: Select a batch, run AI ranking for only those leads
3. **Display**: View, sort, and export ranked leads in a responsive table

### Key Files
```
throxy-persona-ranker/
├── src/
│   ├── app/
│   │   ├── api/rank/route.ts    # AI ranking endpoint
│   │   └── page.tsx             # Main UI (tabs, import, table)
│   └── lib/
│       └── supabase.ts          # Database client + types
├── scripts/
│   └── ingest.ts                # CLI loader for initial data
├── data/
│   ├── leads.csv                # Example leads file
│   └── eval_set.csv             # Evaluation set
├── filter_leads.js              # Business filtering logic (ported to frontend)
└── supabase.sql                 # Database schema
```

## 🛠️ Local Setup

### Prerequisites
- Node.js 20+ and npm
- Supabase account (free tier works)
- OpenAI API key

### Step 1: Clone & Install
```bash
git clone <your-repo-url>
cd throxy-persona-ranker
npm install
```


### Step 2: Configure Environment
Create `.env.local` in the project root:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
OPENAI_API_KEY=your-openai-key
```

**Get Supabase credentials:**
1. Go to https://supabase.com
2. Create a project → Settings → API
3. Copy `Project URL` and `anon public` key

**Get OpenAI key:**
1. Go to https://platform.openai.com/api-keys
2. Create a new secret key

### Step 3: Setup Database
1. In Supabase dashboard → SQL Editor
2. Paste contents of `supabase.sql`
3. Run the query to create tables

### Step 4: (Optional) Ingest Example Data
```bash
npm run ingest
```
Or use the Import tab in the UI to upload your own CSV/TSV leads.

### Step 5: Run Development Server
```bash
npm run dev
```
Visit http://localhost:3000

### Step 6: Import & Rank Leads
1. Go to the "Import Leads" tab
2. Enter a batch name and upload a CSV/TSV file (see example in `data/`)
3. Only leads passing business filters will be imported
4. Switch to "Leads" tab, select your batch, and click "Start AI Ranking"
5. View, sort, and export ranked leads

## 🚢 Deployment (Vercel)

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. Deploy to Vercel
1. Go to https://vercel.com
2. Import your GitHub repository
3. Framework preset: **Next.js** (auto-detected)
4. Add environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `OPENAI_API_KEY`
5. Deploy

### 3. (Optional) Run Ingestion on Vercel
After first deploy:
```bash
vercel env pull .env.local
npm run ingest
```

## 📝 Delivery Instructions

1. Deploy to Vercel and verify the app is public
2. Send the Vercel URL and your GitHub repo link as your submission
3. (Optional) Add any notes about tradeoffs or improvements

---

## Key Decisions

### 1. Pre-filtering Strategy
**Decision**: Filter leads from 200 --> 21 using rule-based logic before AI ranking.

**Reasoning**:
- Reduces AI costs (21 leads vs 200)
- Faster ranking execution
- Removes obvious non-fits (HR, Finance, wrong seniority for company size)
- AI focuses on nuanced scoring, not binary exclusions

**Implementation**: `filter_leads.js` applies persona spec rules:
- Map company size (startup/SMB/mid/enterprise)
- Priority by title + size (Founders --> 5/5 in startups, VP Sales Dev --> 5/5 in SMB+)
- Hard exclusions (CTO, CFO, HR, etc.)
- Only keep priority ≥ 3

### 2. AI Model Selection
**Decision**: Use GPT-4o-mini instead of GPT-4

**Reasoning**:
- 60x cheaper ($0.15/1M input tokens vs $5/1M)
- Sufficient for structured ranking task
- Faster response times (~5s vs ~15s)
- Good enough accuracy for lead scoring

### 3. Database Schema
**Decision**: Two-table design: `leads` + `rankings`

**Reasoning**:
- Separate concerns: static lead data vs dynamic rankings
- Allows re-ranking without data duplication
- Easy to track ranking history (timestamp on rankings)
- Supports future features (multiple ranking runs, A/B testing prompts)

### 4. Frontend-Triggered Ranking
**Decision**: Execute ranking via button click, not on page load

**Reasoning**:
- User controls cost (each ranking = API call)
- Allows iterative testing of persona specs
- Clear feedback loop (loading state --> results)
- Avoids accidental repeated calls

### 5. Prompt Design
**Decision**: Include full persona spec in prompt + request structured JSON

**Reasoning**:
- Self-contained: AI has all context in one call
- Structured output (`{ leadIndex, score, reasoning }`) --> easy parsing
- Reasoning field provides transparency for sales teams
- Temperature 0.3 balances consistency with nuance

## 🔄 Tradeoffs & Future Improvements

### Time Constraints
**What I prioritized (MVP):**
- ✅ Core ranking functionality
- ✅ Clean UI with sorting/filtering
- ✅ Postgres + API architecture
- ✅ End-to-end deployment readiness

### Technical Debt
- **Error handling**: Basic alerts; would add toast notifications + retry logic
- **Type safety**: Using `any` in ranking response; should define strict interfaces
- **Testing**: No unit tests yet; would add Vitest for utils + API routes
- **Rate limiting**: No protection against spam clicks; would add debounce
- **Validation**: Trust GPT output format; should validate JSON schema

### Scalability Notes
- **Current**: Works well for <100 leads
- **At scale (1000+ leads)**:
  - Batch ranking in chunks (e.g., 50 at a time)
  - Use background jobs (Vercel Cron or Queue)
  - Consider vector embeddings for pre-filtering (Supabase pgvector)
  - Cache rankings with TTL

## 🚢 Deployment (Vercel)

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

### Step 2: Deploy to Vercel
1. Go to https://vercel.com
2. Import GitHub repository
3. Framework preset: **Next.js** (auto-detected)
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `OPENAI_API_KEY`
5. Deploy

### Step 3: Run Ingestion (One-time)
After first deploy:
```bash
vercel env pull .env.local
npm run ingest
```

## 📈 Performance Metrics

- **Filtering**: 200 leads --> 21 leads (89% reduction) in <1s
- **Ranking**: 21 leads in ~10-15s (GPT-4o-mini)
- **Cost per ranking**: ~$0.002 (21 leads × ~200 tokens each)
- **Database**: <10ms query time for 21 leads

## 🎯 Persona Matching Logic

The AI ranks leads based on:
1. **Title-to-size fit**: Founders in startups (high), CEOs in enterprise (low)
2. **Department relevance**: Sales Development > Sales > RevOps > Growth
3. **Decision-making authority**: VP/Director > Manager > IC
4. **Exclusion signals**: Finance/HR/Engineering roles
5. **Industry bonus**: Companies selling to manufacturing/education/healthcare

## 📝 License

MIT - Built for Throxy technical challenge

---

**Challenge submission**: December 28, 2025
