# System Wiring Audit

## 1. Architecture Overview

### Inventory Architecture
- Core storage: Firestore `ingredients` collection for current stock and ingredient metadata.
- Immutable stock history: `inventory_ledger` collection stores every stock movement with `branchId`, `ingredientId`, `prevStock`, `newStock`, `type`, `reason`, `refId`, and `timestamp`.
- Business flow:
  - `InventoryService.recordMovement()` updates ingredient stock via a Firestore transaction and writes a ledger entry.
  - `InventoryService.deductByRecipe()` deducts multiple ingredient stocks atomically for POS sales, writing ledger entries for each ingredient.
- Accounting integration: purchase movements call `AccountingService.recordTransaction()` for `stock_purchase` outflows.

### Vendor Architecture
- Vendor master data: `vendors` collection stores vendor metadata and type.
- Vendor-specific flows:
  - Milk supplies: `vendor_milk_supplies`
  - Gas refills: `vendor_gas_cylinders`
  - Distributor invoices: `vendor_invoices`
- Ledger linkage: each vendor event also writes a `financial_ledger` entry through `AccountingService.recordTransaction()`.
- Vendor service endpoints:
  - `VendorService.createVendor()`
  - `VendorService.recordMilkSupply()`
  - `VendorService.recordGasRefill()`
  - `VendorService.recordDistributorInvoice()`
  - `VendorService.recordInvoicePayment()`
  - `VendorService.getVendorLedger()`
  - `VendorService.getVendorPendingBalance()`
  - `VendorService.getMonthlyVendorSummary()`

### Accounting Architecture
- Single transactional source of truth: `financial_ledger` collection.
- Supported ledger entry types:
  - `inflow`
  - `outflow`
- Supported categories include `stock_purchase`, `milk`, `vendor_payment`, and others.
- Primary service: `AccountingService.recordTransaction()` writes an immutable transaction record using Firestore `addDoc()`.
- Analytics helpers:
  - `getBranchLedger()`
  - `getMonthlyCategoryTotals()`
  - `getLiquidity()`

### Firestore Structure
- `ingredients`
- `inventory_ledger`
- `financial_ledger`
- `vendors`
- `vendor_milk_supplies`
- `vendor_gas_cylinders`
- `vendor_invoices`

### Branch Separation Strategy
- Branch separation is implemented using `branchId` fields across:
  - `ingredients`
  - `inventory_ledger`
  - `financial_ledger`
  - vendor documents and vendor event documents
- Services use branch-aware queries such as `where("branchId", "==", branchId)`.
- Current isolation is client-side query filtering, with no evidence of server-side auth or rule enforcement in this audit.

---

## 2. Wiring Audit Findings

### Critical Issues
- `localStorage` legacy data stores still exist and can cause duplicate reporting or stale state alongside Firestore.
  - Files: `src/lib/storage.ts`, `src/lib/expense-storage.ts`, `src/lib/hisaab-storage.ts`, `src/lib/office-dairy-storage.ts`, `src/app/settings/page.tsx`.
- Vendor event creation is not fully atomic with ledger writes.
  - `VendorService.recordMilkSupply()`, `recordGasRefill()`, and `recordDistributorInvoice()` create the vendor document first, then call `AccountingService.recordTransaction()`. If ledger creation fails, vendor event can exist without a matching ledger entry.
- Build config hides TypeScript and ESLint issues.
  - `next.config.ts` sets `typescript.ignoreBuildErrors = true` and `eslint.ignoreDuringBuilds = true`.

### Medium Issues
- Vendor ledger queries are unbounded.
  - `VendorService.getVendorLedger()` returns all matching entries without pagination.
- `getVendorPendingBalance()` recomputes payable totals by scanning invoices and ledger entries in memory, risking stale or expensive calculations.
- Vendor invoice flow records an invoice as `stock_purchase` outflow immediately, which can overstate expenses if later paid entries are also treated as outflow.
- Branch isolation relies solely on filter clauses; no auth or rule-based enforcement is visible, making branch-level access control weak.

### Low-Priority Issues
- `InventoryService.getMonthlyStockCost()` uses `-31` to build end-of-month timestamps regardless of month length.
- `VendorService.getMilkSupplies()` and `getGasEntries()` build queries conditionally using `query()` with optional clauses, which can be simplified for readability.
- UI pages for vendors and reports are mixed with both Firestore-driven and localStorage-driven logic, increasing maintenance overhead.

---

## 3. Data Integrity Audit

### Immutable Ledgers
- Good: `financial_ledger` entries are written with `timestamp` and `createdAt: serverTimestamp()`.
- Good: `inventory_ledger` entries are written inside Firestore transactions alongside stock updates.
- Risk: vendor event documents can be created before ledger records, violating transaction atomicity.

### Centralized Calculations
- `AccountingService` provides centralized financial aggregation for branch ledgers and category totals.
- However, daily expense/hisaab totals remain split into legacy localStorage logic, preventing a fully centralized calculation model.

### Firestore Consistency
- Firestore structure is coherent and well separated by collection.
- There is a potential consistency gap in vendor invoice vs payment data because `recordInvoicePayment()` updates only the invoice document and ledger entry, while outstanding balances are recomputed in application code.

### Duplicate Calculation Risks
- Legacy expense and hisaab local stores duplicate financial state with ledger calculations.
- `src/lib/expense-storage.ts` and `src/lib/hisaab-storage.ts` can produce reporting that diverges from `financial_ledger` values.
- `getAllExpenses()` scans all localStorage keys, which risks including unrelated keys if naming conventions overlap.

### localStorage Legacy Risks
- `src/lib/storage.ts` is still used to persist settings and historical entries in the browser.
- Legacy modules still expose data that is not Firestore-backed and can be lost or corrupted if browser storage is cleared.
- The project needs a hard migration from localStorage-based business logic to Firestore-first persistence.

---

## 4. Business Logic Audit

### Inventory Deduction
- `InventoryService.recordMovement()` is structurally sound and transactional for stock updates.
- `InventoryService.deductByRecipe()` correctly deducts stock for POS sales, but it does not create a financial cost-of-goods-sold ledger entry.
- There is no explicit recipe inventory valuation or margin calculation built into POS flows yet.

### Vendor Payments
- Payments are recorded through `AccountingService.recordTransaction()` as `outflow` with category `vendor_payment`.
- Distributor invoice payments update invoice status and maintain payment totals.
- There is no vendor payable account model; vendor balance is inferred from invoices and payments rather than maintained by a true double-entry flow.

### Expense Calculations
- Expense entries are still primarily stored in `src/lib/expense-storage.ts` localStorage.
- `AccountingService` handles ledger-level expenses but `expense-storage` is not integrated with the ledger.
- Daily hisaab totals are computed in `src/lib/hisaab-storage.ts`, separate from the Firestore transaction system.

### Branch Reporting
- Branch reporting is supported by `AccountingService.getBranchLedger()` and inventory branch queries.
- The branch strategy is adequate for segregation but requires access controls to be reliable.
- `VendorService` supports branch and vendor filtering, but vendor summary calculations may be expensive at scale.

### Profit Calculation Readiness
- The system has strong foundations for revenue and cost tracking, but profit readiness is not yet complete.
- Missing elements:
  - explicit COGS accounting for POS recipe deductions
  - revenue recognition and sales ledger writes from POS
  - integrated expense ledger for daily hisaab
  - a central profit engine that combines inventory, vendor, and ledger data

---

## 5. Build & Deployment Audit

### `npm run build` Status
- Current status: build passes successfully after the latest fix.
- The build output shows 19 routes generated and `next build` completed without runtime failures.

### Vercel Compatibility
- Next.js 15.5.9 is compatible with Vercel.
- Warning: workspace root inference due to multiple lockfiles; this should be resolved for clean deployments.
- `next.config.ts` currently ignores TypeScript and ESLint build errors, which masks issues before deployment.

### Route Validation
- Vendor routes are present and valid:
  - `/vendors`
  - `/vendors/[id]`
  - `/vendors/milk`
  - `/vendors/gas`
  - `/vendors/distributor`
- Static and dynamic route generation is working.
- The previous build blocker was a missing `Users` icon import in `Navbar.tsx`, which is now fixed.

### TypeScript Health
- The project runs with `typescript.ignoreBuildErrors = true`.
- This means the build is not a reliable signal for full type health.
- There are also several `as any` casts in `vendor-service.ts` and ledger mapping code that reduce type safety.

---

## 6. Performance Audit

### Potential Bottlenecks
- Unbounded Firestore queries in vendor ledger and vendor balance routines.
- `getVendorPendingBalance()` loads all vendor invoices and all ledger entries for a vendor in memory.
- `InventoryService` helpers use `getDocs()` rather than paginated or streamed access.

### Duplicate Services
- `AccountingService` and `VendorService` overlap in ledger logic, but the design is acceptable if vendor-side data is kept consistent.
- Legacy storage services duplicate business logic in browser-local persistence.

### Unnecessary Rerenders
- `Navbar.tsx` includes client state for theme, shop, and role. This is expected for a client nav component and does not create an obvious performance issue.
- Additional optimization should focus on page components that fetch large query results without pagination.

### Firestore Query Risks
- `getMilkSupplies()` and `getGasEntries()` build Firestore queries with optional clauses and use `orderBy("date", "desc")` without clear pagination, which may lead to large result sets.
- `VendorService.getVendorLedger()` lacks query limits and may return all vendor ledger entries for a single vendor.

---

## 7. Mobile UX Audit

### Responsiveness
- The navbar is client-rendered and uses a mobile menu, which is positive for responsive navigation.
- Vendor sub-navigation is present, but the layout should be verified on small screens for overflow and tap target usability.

### Navigation Usability
- Desktop vendor dropdown and mobile vendor sublinks are good for discoverability.
- The role-based nav visibility (stored in localStorage) is useful, but actual access control should be enforced at the service/rules layer, not just hidden in the UI.

### Form Usability
- Vendor forms are present for create, milk supply, gas refill, and distributor invoice flows.
- There is no explicit validation summary visible in the audit, and the application relies on client-side state updates.

### Table Overflow Risks
- Vendor lists and ledger tables are likely to exceed mobile width if not wrapped in horizontal scroll containers.
- The audit recommends reviewing vendor and inventory tables for responsive wrappers or overflow handling.

---

## 8. Security Audit

### Firebase Initialization Safety
- Firestore is used directly in services via `src/firebase` and service modules.
- No server-side secret exposure was detected in this audit, but review of `src/firebase/index.ts` is still recommended for environment variable usage.

### Branch Isolation Risks
- Branch isolation is implemented by query filters, not by enforced Firestore security rules in the audited code.
- This makes branch-level data access fragile and again highlights the need for backend rule enforcement.

### Exposed Secret Checks
- No secrets or API keys were visible in the audited files.
- The repo uses standard public Firebase client SDK patterns and should be validated for config leakage outside this audit.

### Unsafe Client-Side Calculations
- Legacy `localStorage` persistence does business logic in the browser, which is unsafe for financial state.
- `hisaab` and `expense` totals are computed client-side and stored locally, making them outside Firestore immutability and audit trails.

---

## 9. Technical Debt Section

### Legacy Logic Remaining
- `src/lib/storage.ts`
- `src/lib/expense-storage.ts`
- `src/lib/hisaab-storage.ts`
- `src/lib/office-dairy-storage.ts`
- Browser theme and settings persistence in `src/app/settings/page.tsx`

### Temporary Compatibility Layers
- `DB` localStorage wrapper is a compatibility layer that should be retired as Firestore-first flows are completed.
- `next.config.ts` ignores build validation, which is a temporary compatibility shortcut.

### Cleanup Tasks
- Migrate expense and hisaab persistence from localStorage to `financial_ledger` or Firestore collections.
- Convert vendor event + ledger write flows into atomic transactions or batched operations.
- Replace `as any` cast patterns in `vendor-service.ts` and ledger mapping code with strict types.

### Future Migration Risks
- Continuing to maintain both localStorage business models and Firestore-backed models increases the chance of data drift.
- Branch isolation based only on client-side queries may need a future migration to authenticated rule-enforced branch contexts.
- The absence of explicit POS revenue ledger entries means the profit engine may require a second major migration pass.

---

## 10. Recommended Roadmap

### Priority Order
1. Phase 2 Expense Ledger
   - Migrate all expense and hisaab workflows to Firestore-backed immutable ledger entries.
   - Remove localStorage-backed expense/hisaab persistence.
2. Profit Engine
   - Add POS revenue writes, cost-of-goods-sold ledger entries, and centralized profit calculations.
3. Daily Hisaab
   - Build a Firestore-driven daily hisaab workflow with audit trail and branch totals.
4. Variance Detection
   - Implement discrepancy alerts between ledger totals, inventory valuations, and daily hisaab summaries.
5. Analytics Dashboard
   - Add branch dashboards and vendor analytics based on Firestore aggregates to replace legacy local reports.

---

## 11. Final ERP Readiness Score

| Area | Score | Notes |
|---|---|---|
| Architecture | 7/10 | Strong Firestore collections and branch tagging, but branch isolation is not fully enforced.
| Scalability | 6/10 | Good collection design, but unbounded queries and legacy local logic limit scale.
| Accounting Readiness | 6/10 | Ledger foundation exists, but vendor payables and expense ledger consolidation are incomplete.
| Inventory Intelligence | 6/10 | Stock and recipe deduction are wired, but profit/cost accounting is not complete.
| Business Workflow Readiness | 6/10 | Vendor and inventory workflows are present, but legacy localStorage persistence and mixed calculation paths remain.

### Summary
The system has a solid Firestore-first design in its newer service layers, especially for inventory and vendor ledger flows. The remaining enterprise risk is largely around legacy localStorage logic, unbounded Firestore queries, branch isolation, and incomplete profit/accounting wiring. Completing the roadmap above will move the system from an ERP prototype toward a more enterprise-grade Firestore-powered tea-shop ERP.
