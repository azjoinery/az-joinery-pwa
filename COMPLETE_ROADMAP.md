# 🚀 AZ Joinery PWA - Complete Roadmap

**Total Build Time:** ~12 weeks (Phase 1 + Phases 4,3,6,2,5)  
**Start Date:** August 3, 2026  
**Deployment Strategy:** Phase 1 live immediately, then build phases sequentially

---

## 📋 BUILD ORDER (Your Choice)

```
WEEK 1:     Phase 1 (DEPLOY)     ✅ Production Dashboard, Jobs, Tasks
WEEK 2-3:   Phase 4              📦 Inventory Management
WEEK 4-6:   Phase 3              📐 Design Workflow
WEEK 7-8:   Phase 6              📊 Analytics & Compliance
WEEK 9-10:  Phase 2              💰 Invoicing & Quotes
WEEK 11-12: Phase 5              🎯 Sales Pipeline
```

---

## ✅ PHASE 1: Deploy NOW (Week 1 - 30 minutes)

**Status:** COMPLETE - Ready to deploy

### Features
- ✅ Production Dashboard (daily logging with counters)
- ✅ Job Management (list, filter, detail, progress)
- ✅ Task Tracking (assignment, completion)
- ✅ User Authentication (3 roles: Production, Designer, Manager)
- ✅ Bottom Navigation (mobile-friendly)
- ✅ PWA installable on all devices

### Your Action
1. Read: `STEP_BY_STEP_DEPLOYMENT.md`
2. Follow 5 steps (30 minutes)
3. Live at: `https://az-joinery-pwa.vercel.app`

### Code
- 11 React components
- 3 core logic files
- ~1,200 lines
- Grade A+ quality

---

## 📦 PHASE 4: Inventory Management (Weeks 2-3)

**Priority:** 🔴 HIGH (Material tracking is critical)  
**Estimated Time:** 2 weeks  
**Start After:** Phase 1 deployed & tested

### Features to Build

#### Stock Management
- [ ] Material catalog (Board Materials, Doors, Hinges, etc.)
- [ ] Stock on-hand tracking with quantities
- [ ] Low-stock alerts (color-coded warnings)
- [ ] Reorder levels per material
- [ ] Stock levels by location

#### Purchase Orders
- [ ] PO creation workflow
- [ ] Supplier management
- [ ] PO status tracking (Not Ordered, Ordered, Partially Received, Received)
- [ ] Approval workflow
- [ ] Cost tracking per unit

#### Material Transactions
- [ ] Stock in (receipts)
- [ ] Stock out (job usage)
- [ ] Stock adjustments (counting corrections)
- [ ] Wastage tracking
- [ ] Offcuts tracking & reuse

#### Reporting
- [ ] Stock on-hand report
- [ ] Low-stock alerts
- [ ] Material cost per project
- [ ] Supplier performance
- [ ] Reorder recommendations

### Data Model
```typescript
StockItem {
  id, name, category, brand, quantity, unit,
  reorderLevel, costPerUnit, supplier, lastRestockDate
}

PurchaseOrder {
  id, supplierId, items[], status, total, receivedDate,
  approvedBy, createdAt
}

StockTransaction {
  id, itemId, type (in/out/adjust), quantity, reason,
  jobId, date, notes
}
```

### API Endpoints Needed
```
GET    /api/stock                    List all materials
POST   /api/stock                    Create material
PATCH  /api/stock/{id}               Update quantity
GET    /api/stock/low                Low-stock alerts
GET    /api/purchase-orders          List POs
POST   /api/purchase-orders          Create PO
PATCH  /api/purchase-orders/{id}     Update PO status
POST   /api/stock/transactions       Record transaction
GET    /api/stock/transactions       List transactions
GET    /api/suppliers                List suppliers
POST   /api/suppliers                Create supplier
```

### UI Screens
1. **Stock Dashboard** - Overview, low-stock alerts
2. **Materials List** - All materials, search, filter by category
3. **Material Detail** - Stock levels, history, reorder
4. **Purchase Orders** - Create, track, receive
5. **Stock Transactions** - Log in/out/adjustments
6. **Suppliers** - List, manage, contact

---

## 📐 PHASE 3: Design Workflow (Weeks 4-6)

**Priority:** 🔴 HIGH (Core workflow)  
**Estimated Time:** 3 weeks  
**Start After:** Phase 4 complete

### Features to Build

#### Design Stage Tracking
- [ ] 14-stage workflow (Job Assigned → Released to Production)
- [ ] Auto-progress percentages (5% → 100%)
- [ ] Manual stage override with reason
- [ ] Stage history/timeline
- [ ] Current status display

#### Technical Checklist
- [ ] 24-item checklist (Site dimensions, ceiling, floor, services, etc.)
- [ ] Check/uncheck items
- [ ] Checklist progress %
- [ ] Notes per item
- [ ] Completion timestamp

#### Design Documents
- [ ] Cabinet Vision file integration
- [ ] CNC file generation
- [ ] Cutting lists
- [ ] Production notes
- [ ] Variations & revisions

#### Design Tasks
- [ ] Create design tasks
- [ ] Assign to drafters
- [ ] Track task status
- [ ] Due dates per task
- [ ] Task blocking/dependencies

#### Variations & Revisions
- [ ] Variation proposals
- [ ] Variation approval workflow
- [ ] Revision requests
- [ ] Revision tracking
- [ ] Change history

### Data Model
```typescript
DesignStage {
  id, jobId, stage, progress%, assignedDesignerId,
  dueDate, targetProductionDate, blockedReason, notes
}

TechnicalChecklist {
  id, jobId, items: [{name, completed, notes, timestamp}]
}

DesignTask {
  id, jobId, title, description, status, assigneeId, dueDate
}

Variation {
  id, jobId, description, amount, status, approvedBy, createdAt
}

Revision {
  id, jobId, description, status, requestedBy, completedAt
}
```

### API Endpoints Needed
```
GET    /api/jobs/{id}/design          Get design workflow
PATCH  /api/jobs/{id}/design          Update design stage
GET    /api/jobs/{id}/checklist       Get technical checklist
PATCH  /api/jobs/{id}/checklist/{id}  Check item
GET    /api/jobs/{id}/design-tasks    Get design tasks
POST   /api/design-tasks              Create task
PATCH  /api/design-tasks/{id}         Update task
GET    /api/jobs/{id}/variations      Get variations
POST   /api/variations                Create variation
GET    /api/jobs/{id}/revisions       Get revisions
POST   /api/revisions                 Create revision
```

### UI Screens
1. **Design Dashboard** - Stage progress, current status
2. **Stage Progression** - Move through 14 stages, auto-calc %
3. **Technical Checklist** - 24 items, progress bar
4. **Design Tasks** - Task assignment, tracking
5. **Variations** - Propose, approve, track changes
6. **Revisions** - Request, track, document
7. **Design Timeline** - Historical view of progression

---

## 📊 PHASE 6: Analytics & Compliance (Weeks 7-8)

**Priority:** 🟡 MEDIUM (Monitoring & oversight)  
**Estimated Time:** 2 weeks  
**Start After:** Phase 3 complete

### Features to Build

#### Production Analytics
- [ ] Daily output charts (cabinet counts, CNC items)
- [ ] Weekly/monthly production summaries
- [ ] Production trends
- [ ] Per-worker output tracking
- [ ] Production rate vs. targets

#### Financial Analytics
- [ ] Revenue by project
- [ ] Cost per project
- [ ] Margin analysis
- [ ] Labor cost tracking
- [ ] Material cost analysis

#### Staff Performance
- [ ] Daily output per worker
- [ ] Quality metrics (issues/corrections)
- [ ] Efficiency ratings
- [ ] Skills tracking
- [ ] Performance trends

#### QHS (Quality, Health & Safety)
- [ ] Safety incident tracking
- [ ] Compliance checklist
- [ ] Near-miss reports
- [ ] Audit schedule
- [ ] Corrective actions

#### Delivery & Installation
- [ ] Delivery status tracking
- [ ] Installation scheduling
- [ ] Installation completion
- [ ] Post-install photos/notes
- [ ] Delivery feedback

#### Reports & Exports
- [ ] Production report (PDF)
- [ ] Financial report (PDF)
- [ ] Staff performance report
- [ ] QHS compliance report
- [ ] Export to Excel

### Data Model
```typescript
DailyAnalytic {
  date, totalOutput, cabinetsByType, cncByType, issues
}

StaffPerformance {
  userId, date, outputCount, qualityScore, efficiency
}

QHSIncident {
  id, date, type, description, severity, resolution, status
}

DeliveryJob {
  jobId, scheduledDate, deliveredDate, photos, notes, feedback
}
```

### API Endpoints Needed
```
GET    /api/analytics/production     Daily output analytics
GET    /api/analytics/financial      Revenue & cost analytics
GET    /api/analytics/staff          Staff performance
GET    /api/analytics/qhs            QHS incidents
GET    /api/analytics/delivery       Delivery tracking
POST   /api/qhs/incidents            Report incident
GET    /api/reports/production       Production report
GET    /api/reports/financial        Financial report
GET    /api/reports/staff            Staff report
```

### UI Screens
1. **Analytics Dashboard** - KPI cards, charts
2. **Production Analytics** - Output trends, per-worker
3. **Financial Analytics** - Revenue, costs, margins
4. **Staff Performance** - Individual & team metrics
5. **QHS Compliance** - Incidents, checklist, audit
6. **Delivery Tracking** - Status, scheduling, feedback
7. **Reports** - Generate & export reports

---

## 💰 PHASE 2: Invoicing & Quotes (Weeks 9-10)

**Priority:** 🔴 HIGH (Revenue tracking)  
**Estimated Time:** 2 weeks  
**Start After:** Phase 6 complete

### Features to Build

#### Quotes
- [ ] Quote creation from jobs
- [ ] Line items (description, qty, rate, amount)
- [ ] Subtotal, discount, GST, total
- [ ] Material cost estimates
- [ ] Labour cost estimates
- [ ] Deposit & payment schedule
- [ ] Quote status (Draft, Sent, Viewed, Accepted, etc.)
- [ ] Quote expiry dates
- [ ] PDF generation

#### Invoices
- [ ] Invoice creation (from quote or manual)
- [ ] Invoice types (Deposit, Progress, Final, Variation, etc.)
- [ ] Line items with descriptions
- [ ] GST calculation
- [ ] Payment tracking
- [ ] Multiple payment methods (Bank transfer, Credit card, Cash, etc.)
- [ ] Payment status (Pending, Partially Paid, Paid, Overdue)
- [ ] PDF generation
- [ ] Email delivery

#### Payment Tracking
- [ ] Record payments
- [ ] Payment date & method
- [ ] Amount paid
- [ ] Outstanding balance
- [ ] Payment reminders
- [ ] Late payment tracking

#### Financial Reporting
- [ ] Outstanding invoices report
- [ ] Aged debt report
- [ ] Revenue by month
- [ ] Profit & loss
- [ ] Cash flow projections

### Data Model
```typescript
Quote {
  id, jobId, leadId, client, lineItems[], subtotal, discount, gst, total,
  estimatedMaterial, estimatedLabour, depositRequired, status, expiryDate
}

Invoice {
  id, jobId, quoteId, invoiceNumber, type, issueDate, dueDate,
  lineItems[], subtotal, gst, total, status, notes
}

Payment {
  id, invoiceId, amount, date, method, notes, processedBy
}
```

### API Endpoints Needed
```
GET    /api/quotes                   List quotes
POST   /api/quotes                   Create quote
PATCH  /api/quotes/{id}              Update quote
GET    /api/quotes/{id}/pdf          Generate PDF

GET    /api/invoices                 List invoices
POST   /api/invoices                 Create invoice
PATCH  /api/invoices/{id}            Update invoice
GET    /api/invoices/{id}/pdf        Generate PDF
POST   /api/invoices/{id}/payments   Record payment

GET    /api/reports/invoicing        Invoicing report
GET    /api/reports/aged-debt        Aged debt report
GET    /api/reports/revenue          Revenue report
```

### UI Screens
1. **Quotes Dashboard** - All quotes, status
2. **Create Quote** - Line items, pricing, estimates
3. **Quote Detail** - View, edit, send, PDF
4. **Invoices Dashboard** - All invoices, status
5. **Create Invoice** - Line items, terms
6. **Invoice Detail** - View, edit, send, PDF
7. **Payments** - Record payments, track status
8. **Reports** - Revenue, aging, cash flow

---

## 🎯 PHASE 5: Sales Pipeline (Weeks 11-12)

**Priority:** 🟡 MEDIUM (Lead generation)  
**Estimated Time:** 2 weeks  
**Start After:** Phase 2 complete

### Features to Build

#### Lead Management
- [ ] Lead creation (from multiple sources)
- [ ] Lead source tracking (Website, Google, Facebook, Referral, etc.)
- [ ] Lead temperature (Cold, Warm, Hot, Ready)
- [ ] Lead status workflow (22 statuses from New Lead → Lost/Converted)
- [ ] Lead notes & history
- [ ] Lead assignment

#### Contact Management
- [ ] Contact types (Homeowner, Builder, Architect, etc.)
- [ ] Contact info (phone, email, address)
- [ ] Contact relationship to job
- [ ] Multiple contacts per lead
- [ ] Contact history

#### Follow-up Management
- [ ] Schedule follow-ups (Phone, Email, SMS, Meeting, Site Visit)
- [ ] Follow-up reminders
- [ ] Follow-up history
- [ ] Completion tracking

#### Lead Conversion
- [ ] Track conversion to job
- [ ] Conversion rate analytics
- [ ] Sales funnel view
- [ ] Win/loss analysis

#### Referral Tracking
- [ ] Referral source types
- [ ] Referral credits
- [ ] Referral analytics

### Data Model
```typescript
Lead {
  id, source, temperature, contactId, projectName, siteAddress,
  status, notes, assignedToUserId, convertedJobId, createdAt
}

Contact {
  id, name, type, phone, email, address, leadIds, createdAt
}

FollowUp {
  id, leadId, type, scheduledDate, notes, completedAt, result
}

Referral {
  id, sourceUserId, leadId, creditAmount, status
}
```

### API Endpoints Needed
```
GET    /api/leads                    List leads
POST   /api/leads                    Create lead
PATCH  /api/leads/{id}               Update lead
GET    /api/leads/{id}               Get lead detail

GET    /api/contacts                 List contacts
POST   /api/contacts                 Create contact
PATCH  /api/contacts/{id}            Update contact

POST   /api/follow-ups               Schedule follow-up
PATCH  /api/follow-ups/{id}          Mark completed
GET    /api/follow-ups               List pending

GET    /api/analytics/sales-funnel   Sales funnel data
GET    /api/analytics/conversion     Conversion rates
GET    /api/reports/sales-pipeline   Sales report
```

### UI Screens
1. **Leads Dashboard** - Pipeline view, kanban board
2. **Create Lead** - Source, temperature, contact
3. **Lead Detail** - Status, follow-ups, conversion
4. **Contacts** - All contacts, relationships
5. **Follow-ups** - Schedule, track, reminders
6. **Sales Funnel** - Visual pipeline
7. **Conversion Analytics** - Rates, trends
8. **Reports** - Sales pipeline, win/loss

---

## 📅 TIMELINE

```
Week 1:   Phase 1 Deploy        ✅ Live
Week 2-3: Phase 4 Inventory     📦 Stock management
Week 4-6: Phase 3 Design        📐 14-stage workflow
Week 7-8: Phase 6 Analytics     📊 KPIs & compliance
Week 9-10: Phase 2 Invoicing    💰 Quotes & payments
Week 11-12: Phase 5 Sales       🎯 Lead pipeline
```

**Total: 12 weeks**

---

## 🎯 SUCCESS CRITERIA

### After Phase 1 Deploy
- ✅ App live at vercel.app
- ✅ Team can access
- ✅ Workers can log daily output
- ✅ Managers can track jobs & tasks

### After Phase 4 (Inventory)
- ✅ Stock levels tracked
- ✅ Low-stock alerts working
- ✅ Purchase orders flowing
- ✅ Material costs per project

### After Phase 3 (Design)
- ✅ Design workflow automated
- ✅ 14-stage tracking visible
- ✅ Technical checklist enforced
- ✅ Production docs ready

### After Phase 6 (Analytics)
- ✅ Production KPIs displayed
- ✅ Staff performance tracked
- ✅ QHS compliance monitored
- ✅ Reports generated

### After Phase 2 (Invoicing)
- ✅ Quotes created
- ✅ Invoices automated
- ✅ Payments tracked
- ✅ Revenue visible

### After Phase 5 (Sales)
- ✅ Leads managed
- ✅ Sales pipeline tracked
- ✅ Conversion analytics
- ✅ Follow-ups scheduled

---

## 🚀 DEPLOYMENT STRATEGY

### Phase 1 Deploy
1. You run deployment (30 min) following STEP_BY_STEP_DEPLOYMENT.md
2. App is live immediately
3. Team tests Phase 1

### Phases 4-5 Development
1. I build each phase (2-3 weeks each)
2. We test thoroughly
3. Deploy to production
4. Team uses new features
5. Gather feedback
6. Move to next phase

### Ongoing
- Auto-deploy on every GitHub push
- Vercel monitoring & analytics
- Version history maintained
- Easy rollback if needed

---

## 💡 NOTES

**Why this order?**
- Phase 4 (Inventory): Critical for operations
- Phase 3 (Design): Core workflow automation
- Phase 6 (Analytics): Monitor what you build
- Phase 2 (Invoicing): Revenue tracking
- Phase 5 (Sales): Growth & leads

**Flexibility**
- Can prioritize different phase if needed
- Can add features to any phase
- Each phase is self-contained
- Can deploy individually or together

**Team Involvement**
- After each phase deploys, team tests
- Feedback shapes next phase
- Iterate based on real usage
- Avoid building features nobody needs

---

## ✅ READY?

**Next Step:** Follow STEP_BY_STEP_DEPLOYMENT.md (30 min)

**After Deployment:** Message me with results, and we'll start Phase 4

Let's build this! 🚀

---

*Roadmap Created: August 3, 2026*  
*Build Order: Phase 1 → 4 → 3 → 6 → 2 → 5*  
*Total Time: ~12 weeks*
