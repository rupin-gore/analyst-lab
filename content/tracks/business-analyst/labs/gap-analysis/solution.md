| Area | As-is | To-be | Gap | Action (owner) |
|---|---|---|---|---|
| Document validation | Checked by hand ~8 days after upload; blurry docs are the #1 rejection reason | Readability checked at upload, before submission | No automatic check; problems found a week late | Build readability check at upload (Engineering) |
| Bank verification | Name on cheque compared to PAN by hand | Penny-drop name match before submission | ~23% of rejections preventable at source | Integrate penny-drop API (Engineering); SOP for partial matches (KYC lead) |
| GSTIN | Typed into GST portal one by one | Auto-validated at upload | Manual effort and ~18% of rejections | GSTIN validation API (Engineering) |
| KYC review capacity and SLA | Median 8–9 days; 4 reviewers; no SLA | 48-hour SLA, measured daily | ~6 days slower than target | Daily queue-age review and SLA dashboard (Seller Ops); train reviewers on new SOP (KYC lead) |
| Rejection handling | Seller re-uploads everything and waits again | Re-upload only the failed document | Full restart on every rejection | Partial re-upload (Engineering); update rejection templates (KYC lead) |
| Seller communication | Email only; ~200 status calls a week | WhatsApp at every status change | No proactive updates | WhatsApp notifications (Engineering); new support scripts (Support lead) |
| Reporting | Monthly, manual | Daily % live within 10 days, by stage | No live view of the target | Onboarding dashboard (Data team) |

**Biggest risk:** automated checks wrongly rejecting valid documents and frustrating good sellers. Mitigate by piloting with 10% of sellers and a manual override for two weeks.
