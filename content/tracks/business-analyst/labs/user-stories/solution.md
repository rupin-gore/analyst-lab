**Story 1: Document readability check**
*As a* seller uploading KYC documents, *I want* to know immediately if a photo is unreadable, *so that* my application isn't rejected a week later.
- **Given** I upload a PAN image that fails the readability check, **When** I tap Upload, **Then** I see "This photo is blurry or cut off. Please retake it in good light." and the document is not saved.
- **Given** I upload a readable image, **When** the check passes, **Then** a green tick appears next to the document within 30 seconds.
- **Given** the readability service is unavailable, **When** I upload, **Then** the document is saved, marked "check pending", and I can still submit.
- **Priority: Must**: blurry documents are 36% of rejections.

**Story 2: Bank name verification**
*As a* KYC reviewer, *I want* the bank account holder name checked against the PAN name before I review, *so that* I only spend time on applications likely to pass.
- **Given** the names match exactly or differ only in case and spacing, **When** the check runs, **Then** the application shows "Bank name: verified".
- **Given** the bank name is an initial form ("R. Kumar" vs "Ravi Kumar"), **When** the check runs, **Then** the application shows "Bank name: partial match: review" and stays in my queue.
- **Given** the names don't match, **When** the check runs, **Then** the seller is asked to upload a matching cancelled cheque before submission.
- **Priority: Must**: second-largest rejection reason (23%).

**Story 3: Status notifications**
*As a* seller, *I want* a WhatsApp message whenever my application status changes, *so that* I don't need to call support.
- **Given** my application moves to Approved, Rejected or Live, **When** the status changes, **Then** I receive a WhatsApp message within 15 minutes with the new status and the next step.
- **Given** it is rejected, **Then** the message states the reason and links to re-upload only the failed document.
- **Given** WhatsApp delivery fails, **When** 15 minutes pass, **Then** an SMS with the same content is sent.
- **Priority: Should**: cuts ~200 status calls a week, but doesn't change approval time on its own.
