# MagicTea Elite ERP Executive Summary

## 1. System Overview

MagicTea Elite ERP is designed to modernize and centralize tea-shop operations for multi-branch businesses. It provides a single Firestore-backed platform for core retail workflows, including point-of-sale, inventory management, vendor purchasing, expense tracking, staff coordination, and reporting. The system is built to support enterprise workflows while preserving responsive mobile-first UIs and a scalable Firestore-first architecture.

### What the ERP does
- Enables sales capture and branch-level inventory deduction.
- Tracks purchase and inventory movements with immutable ledger entries.
- Manages vendors, supplier invoices, milk and gas purchases, and vendor payments.
- Provides expense and daily hisaab workflows for shop accounting.
- Offers branch-centric reporting and operational visibility.

### Target business workflow
- Franchise operators can manage branch stock, monitor vendor costs, and track supplier payables.
- Business owners get structured inventory and expense workflows to support financial discipline.
- Future developers can extend the system using centralized services, Firestore collections, and ledger-backed design.

## 2. Core Modules

### POS
- Sales order creation and checkout flows.
- Inventory deduction based on recipe ingredients.
- Checkout payment types and receipt-ready transaction records.
- Designed for local branch operations and future revenue ledger integration.

### Inventory
- Firestore-based `ingredients` stock master data.
- Immutable `inventory_ledger` entries for purchase, adjustment, wastage, and sale deductions.
- Branch-aware valuation and stock alert support.
- New costing foundation now supports batch-level tracking and weighted average costing.

### Vendor Management
- Vendor master data and classification.
- Milk, gas, and distributor invoice workflows.
- Vendor ledger integration through `financial_ledger` entries.
- Pending balance and monthly vendor summary calculations.

### Expense Ledger
- Expense workflows are present in the application and mapped to expense categories.
- Current ledger foundation supports financial outflows and branch expense aggregation.
- Future work will consolidate expense and hisaab workflows into Firestore-backed immutable ledgers.

### Staff Management
- Core staff records and salary tracking.
- Supports branch-specific staff assignment and payroll structure.
- Provides staff data for future labor cost planning and payroll analytics.

### Reports
- Branch ledger and inventory reports driven by Firestore data.
- Financial summaries and low-stock alerts embedded in the dashboard experience.
- Report layer is ready for expanded analytics once the profit engine and variance detection are introduced.

### Accounting Foundation
- Central `financial_ledger` as the source of truth for cashflows.
- `AccountingService` aggregates branch ledger entries, category totals, and liquidity.
- Inventory purchases and vendor payments are recorded as immutable transactions.
- New inventory batch architecture is in place to support accurate costing, branch-level inventory valuation, and future profit computations.

## Summary
MagicTea Elite ERP is positioned as a Firestore-first retail operations system for tea shops and franchise groups. It combines practical POS and inventory workflows with a strong enterprise accounting foundation. The current release establishes a solid platform for future profit engine, variance detection, and analytics dashboard phases while keeping the system stable for deployment and mobile use.