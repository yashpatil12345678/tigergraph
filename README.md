# TigerGraph × HHGoa Fraud Investigation

This Next.js application provides the HHGoa investigation dashboard, a server-side evidence adapter, a bounded investigation agent, programmatic policy decisions, and a TigerGraph integration boundary.

## Data requirements

Place the official files in `data/` or set `INVESTIGATION_DATA_DIR` to a server-side directory containing:

- `case_pack.csv` — the 20 official benchmark triggers.
- `transactions.csv` — transaction records.
- `identity.csv` — TransactionID-linked identity records.
- `closed_cases_history.csv` — historical investigations.

The application reports `DATA_READY` only when all four files exist. Without the three evidence datasets, investigation and benchmark endpoints return `DATA_INCOMPLETE`; no synthetic records or benchmark answers are generated.

## Run

```bash
pnpm install
pnpm dev
```

Use the dashboard to select a case and run an investigation. Evidence parsing stays server-side and responses are bounded to the selected case.

## TigerGraph

Configure server-only variables in Vercel or the local environment:

- `TIGERGRAPH_HOST`
- `TIGERGRAPH_GRAPH_NAME` (or `TIGERGRAPH_GRAPH`)
- `TIGERGRAPH_API_TOKEN` (or `TIGERGRAPH_TOKEN`), or the deployment's required username/password variables

The client performs an authenticated vertex request before reporting `AUTHENTICATED`. Graph failures remain explicit. The supported graph model uses Customer, Card, Transaction, DeviceProfile, EmailDomain, BillingRegion, and ClosedCase vertices with OWNS, MADE, FROM_DEVICE, PURCHASER_EMAIL, BILLED_IN, NEXT, INVOLVES, ON_CARD, and CONNECTED_TO relationships. No TigerGraph MCP is configured in this repository.

## Agent and policy

The server agent records operational tool traces for case, transaction, customer/card history, identity, graph investigation, historical cases, additional evidence, policy, automatic actions, and case writeback. Programmatic policy rules determine exposure, routes, automatic execution, reporting, and bounded stop behavior; risk score is only an input signal.

## Benchmark

After all official datasets and TigerGraph configuration are available:

```bash
pnpm benchmark   # calls POST /api/benchmark and writes cases/HHG-001.json through HHG-020.json
pnpm validate    # validates files, schema, and required dataset availability
pnpm test        # policy calculation checks
pnpm build
```

The current repository intentionally does not contain generated case JSON files because the official evidence datasets are unavailable in this environment. Do not submit until `DATA_READY`, the benchmark, and validation all pass.

## Deployment and limitations

Deploy through the existing Vercel project. Keep datasets and credentials server-side; never expose them to browser code. TigerGraph authentication, graph traversal, and graph writeback can only be verified after valid deployment credentials are configured. MCP is supported only as a future integration boundary and is not claimed as active.
