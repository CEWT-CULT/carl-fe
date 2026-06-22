# C.A.R.L Frontend

Cosmos Animal Racing League — Next.js app for [C.A.R.L](https://github.com/CEWT-CULT/carl-fe) on Cosmos Hub.

## Setup

```bash
npm install
cp .env.local.example .env.local   # if present; otherwise set NEXT_PUBLIC vars in .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Config

Contract and chain settings live in `config/index.js`. Override the contract with:

```env
NEXT_PUBLIC_CARL_CONTRACT=cosmos1...
```

## Scripts

- `npm run dev` — local development
- `npm run build` — production build
- `npm run start` — serve production build
