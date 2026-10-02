WARRINGTON PORTAL - JOB REPORT PERIOD FILTERS

INSTALLATION

1. Stop the local development server if it is running.
2. Back up your current Warrington Portal folder.
3. Open this ZIP and copy all folders into:
   C:\warrington-portal
4. Allow Windows to merge the folders and replace the existing files.
5. The following files are new and must be created by the copy:
   - app\api\jobs\report\route.ts
   - components\job-portal\JobReportDialog.tsx
   - lib\job-report-period.ts
6. The following files replace the existing versions:
   - components\job-portal\JobHeader.tsx
   - lib\pdf-generator-jobs.ts
7. Run npm.cmd run build from C:\warrington-portal.

WHAT IS INCLUDED

- Generate Report opens a report-options dialog.
- Report periods: All Orders, Specific Day, Specific Week, Specific Month,
  Specific Year, and Custom Date Range.
- Admin can select All Customers or one specific customer.
- Customers can report only their own jobs.
- Workers can report only jobs assigned to them.
- Reports include all matching jobs, not only the current table page.
- The existing Warrington-branded PDF design is preserved.
- Customer reports continue to exclude internal worker rates, internal costs,
  and profit information.
- Worker reports expose only the signed-in worker's own payment information.
- Admin-generated PDFs continue to be downloaded and saved to the existing
  portal report storage. Customer and worker PDFs are private downloads only.
- A maximum of 5,000 jobs can be included in one report. For larger results,
  choose a date range or a specific customer.

NO EXTRA SETUP

- No MongoDB migration is required.
- No new MongoDB collection is required.
- No new environment variables are required.
- No package installation is required.

STAGING QA

1. Sign in as Admin and open Job Portal.
2. Click Generate Report.
3. Test All Orders with All Customers.
4. Test one customer with Day, Week, Month, Year, and Custom Date Range.
5. Confirm every PDF contains only jobs inside the selected range.
6. Confirm the PDF heading shows the selected reporting period.
7. Sign in as a Customer and repeat the period tests.
8. Confirm the Customer cannot see the customer-selection control and cannot
   receive jobs belonging to another customer.
9. Sign in as a Worker and repeat the period tests.
10. Confirm the Worker receives only assigned jobs and only their own earnings.
11. Test a date range with no jobs and confirm a clear No jobs message appears.

VALIDATION COMPLETED

- TypeScript: passed
- Focused lint checks for the new UI/API files: passed
- Next.js production build: passed

