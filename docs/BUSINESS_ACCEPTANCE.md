# Business acceptance scenarios

Business users validate terminology and workflow **after** live Musooka reconciliation.  
Do not treat engineering E2E as business sign-off.

## Actors

Administrator · Reviewer · Requester/normal user

## Scenarios

| # | Scenario | Pass criteria |
|---|----------|---------------|
| 1 | Login | Correct user reaches dashboard |
| 2 | Dashboard | KPIs/terms match business expectation |
| 3 | Create requisition | Required fields; draft saved |
| 4 | Submit | Status becomes submitted; audit/history visible |
| 5 | Review | Reviewer can move to under review |
| 6 | Approve | Authorized only; notification to requester |
| 7 | Reject | Authorized only; reason captured |
| 8 | Complete / process | Status path matches agreed lifecycle |
| 9 | Reports | Expected reports visible; export if required |
| 10 | Notifications | Relevant events appear |
| 11 | User administration | Admin can create/disable; others cannot |
| 12 | Roles | Role list/permissions understandable |
| 13 | Audit | Sensitive actions visible to authorized roles |
| 14 | Password reset | Email received; new password works |
| 15 | Logout | Session ended; protected pages blocked |

## Sign-off

| Role | Name | Date | Outcome |
|------|------|------|---------|
| Business owner | | | Pending recon |
| Operations | | | |
| Engineering | | | RC `1.0.0-rc.1` ready for review |

## Dependency

Live authenticated crawl of musooka.site must complete so scenario wording matches production vocabulary (statuses, roles, report names).
