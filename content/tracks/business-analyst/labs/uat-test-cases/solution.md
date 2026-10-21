| ID | Requirement | Scenario | Preconditions / test data | Steps | Expected result | Pass/Fail |
|---|---|---|---|---|---|---|
| UAT-01 | FR-2 | Exact name match | PAN: RAVI KUMAR; bank account in name RAVI KUMAR | 1. Upload cheque 2. Enter account and IFSC 3. Submit | Within 30 s, application shows "Bank name: verified" (green) | |
| UAT-02 | FR-2 | Case and space differences | PAN: Ravi  Kumar (double space); bank: RAVI KUMAR | As UAT-01 | Shows "Bank name: verified" | |
| UAT-03 | FR-2 | Initials vs full name | PAN: RAVI KUMAR SHARMA; bank: R K SHARMA | As UAT-01 | Shows "Partial match: review"; application stays in KYC queue | |
| UAT-04 | FR-2 | Different person | PAN: RAVI KUMAR; bank: SUNITA DEVI | As UAT-01 | Seller sees "Bank account name doesn't match your PAN. Upload a cheque for an account in your name." and cannot submit | |
| UAT-05 | FR-2 | Invalid account | Account number with a wrong IFSC | As UAT-01 | Message "We couldn't verify this account. Check the account number and IFSC." | |
| UAT-06 | FR-4 | Approval notification | Test seller with an opted-in WhatsApp number | 1. KYC reviewer approves the application | Seller receives "Your Bazaarly seller account is approved. Next: add your first product" within 15 minutes | |
| UAT-07 | FR-4 | Rejection notification | Application with a blurry address proof | 1. Reviewer rejects with reason "Blurry document" | WhatsApp within 15 minutes states the reason and links to re-upload only the address proof | |
| UAT-08 | FR-4 | WhatsApp failure | Number not registered on WhatsApp | 1. Approve the application | SMS with the same content arrives within 20 minutes | |
| UAT-09 | NFR-1 | Slow network | Android phone, 2 GB RAM, network throttled to 3G | 1. Upload a 4 MB cheque image | Upload completes within 10 s and verification within a further 30 s; no app crash | |

**Entry criteria:** system testing complete with no open critical defects; test seller accounts, test PANs and bank accounts ready; testers briefed.
**Exit criteria:** all cases pass, or failures have an agreed workaround; no open critical or high defects; sign-off by the Head of Seller Operations.
