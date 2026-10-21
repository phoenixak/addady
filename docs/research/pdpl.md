# Research: Egypt's Personal Data Protection Law (PDPL) and Addady v2

- Researched: 2026-10-20.
- This is not legal advice. It's the engineering gate from docs/PLAN.md §5: nothing leaves the phone until this review says it may.

## Facts (with sources)
- **Law and regulations:**
  - Law 151/2020 plus its Executive Regulations (Ministerial Decree 816/2025), issued on 1 Nov 2025.
  - The one-year compliance period ends on **1 Nov 2026**.
  - Sources: [CMS](https://cms.law/en/int/legal-updates/egypt-s-pdpl-executive-regulations-issued-one-year-compliance-countdown-begins), [Al Tamimi](https://www.tamimi.com/law_update_articles/from-policy-to-practice-egypt-issues-executive-regulations-of-the-personal-data-protection-law/)
- **Scope:** personal data of identified or **directly or indirectly identifiable** natural persons, processed electronically (Art. 1) ([Lawlab Africa](https://research.lawlab.africa/egypt/)). No source found defines "anonymised" data explicitly.
- **Cross-border:**
  - Personal data may not be transferred, stored, processed or accessed **outside Egypt** without a PDPC licence or permit. That requires an adequacy assessment of the destination and the data subject's explicit consent (Arts. 16, 24–25).
  - Sources: [Chambers](https://chambers.com/articles/a-first-look-at-egypt-s-personal-data-protection-executive-regulations), [Clyde & Co](https://www.clydeco.com/en/insights/2026/01/egypt-regulatory-update-on-data-privacy)
- **Licences:**
  - Controller/processor licences are typically valid for 3 years, with a 90-working-day review; silence counts as rejection.
  - Fees are reported at up to EGP 2,000,000, and cross-border permits at 50% of the licence fee.
  - Source: [Chambers](https://chambers.com/articles/a-first-look-at-egypt-s-personal-data-protection-executive-regulations)

## What that means for each v2 feature
| Feature | Data reaching a server | Personal data? | Verdict |
|---|---|---|---|
| v1 (everything today) | none except fetching `tariffs.json` and the release check from GitHub, which sends no user data | no | ✅ allowed |
| Anonymous monthly contribution (Supabase, EU region) | kWh, governorate, household bucket, **plus the sender's IP at the edge** | the record itself is arguably anonymous; **the IP is personal data** and is processed abroad | ⛔ **off** until a PDPC licence/permit, or a written legal opinion that it's out of scope |
| Bill-mismatch / run-out reports to our server | same as above | same | ⛔ off (same gate) |
| Household E2E sync (Supabase) | ciphertext, plus pseudonymous auth id and IP | **pseudonymous ids are personal data** | ⛔ off (same gate) |
| **User-posted public report** (pre-filled GitHub issue the user reviews and submits) | nothing reaches us; the user publishes it on a third-party site under their own account | we don't process it | ✅ allowed. This is v1's learning channel |

## Decision
1. Build the v2 backend (schema, RLS, Edge Functions, tests) so it's ready. The `app_config.data_collection_enabled` flag is **false** in the database, and both the Edge Functions and the app refuse to send while it's false.
2. Learning after release: the app offers "report a mismatch" and "check my prediction" as a **pre-filled GitHub issue**. It shows exactly what will be posted (kWh, amount, month, meter type, tariff version; no names, numbers or location finer than the governorate) and only opens the browser. The user decides whether to post.
3. Revisit this gate when either (a) PDPC publishes guidance on anonymised data, or (b) the project can host inside Egypt or obtain a permit.
