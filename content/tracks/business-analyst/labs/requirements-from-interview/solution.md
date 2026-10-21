**Business objective**
Reduce seller onboarding time so that **80% of new sellers go live within 10 days of starting their application**, measured monthly, by Diwali (currently a median of ~15 days since April).

**Functional requirements**
- **FR-1** The system shall check each uploaded document image for readability and ask the seller to re-upload it before submission if it fails.
- **FR-2** The system shall verify that the bank account holder name matches the PAN name before the application reaches the KYC team.
- **FR-3** The system shall validate the GSTIN and fetch the registered business name and address automatically.
- **FR-4** The system shall notify the seller of every status change (submitted, approved, rejected with reason, live) within 15 minutes.
- **FR-5** The system shall show sellers the current status and the next step on their dashboard.
- **FR-6** The system shall let the KYC team see the reason for any automatic check failure on the application.
- **FR-7** The system shall let a rejected seller re-upload only the failed document, without restarting the application.
- **FR-8** The system shall report daily: applications by stage, age in each stage, and % live within 10 days.

**Non-functional requirements**
- **NFR-1** Document upload shall complete within 10 seconds on a 3G connection for files up to 5 MB.
- **NFR-2** The seller flow shall work on Android 9+ devices with 2 GB RAM.
- **NFR-3** KYC documents shall be retained for 8 years and be viewable only by the Seller Operations KYC role, with access logged.
- **NFR-4** Automatic checks shall respond within 30 seconds, 99% of the time.

**Assumptions and open questions**
- Which channel do sellers prefer for status updates: WhatsApp, SMS or email? *(Pooja; seller survey)*
- Which GST verification API, and what does it cost per check? *(Engineering, Procurement)*
- What readability threshold rejects too many valid documents? *(KYC team pilot)*
- Why do field-agent applications go smoother, and can that be replicated? *(Field ops lead)*
- Assumption: KYC team size stays at four until Diwali.
