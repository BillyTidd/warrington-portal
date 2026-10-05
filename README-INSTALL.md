# Folder filters for job reports

This package extends the previously supplied job report period filters and customer job folders. It contains complete replacement/new files at their project-relative locations.

## Install locally

1. Extract this ZIP.
2. Open the extracted `Warrington-Portal-Report-Folder-Filters` folder.
3. Copy its `app`, `components`, and `lib` folders, plus `package.json` and `package-lock.json`, into `C:\warrington-portal`. Merge folders and replace the matching files. Do not replace or delete your whole project folder.
4. Open a terminal in `C:\warrington-portal` and run `npm.cmd install`.
5. Run `npm.cmd run build` using your existing environment settings.
6. Restart your local server if it was already running.

No manual MongoDB migration, new environment variable, or new storage configuration is required. This feature uses your existing `jobs`, `job_folders`, `clients`, and `users` collections.

The added direct dependency is `jszip` version `^3.10.1`. If your local dependency manifests have additional changes made after the previous supplied project, preserve those changes and add this dependency to your current package.json instead of replacing your manifests; run npm.cmd install to update your lockfile.

## Included files

- app/api/jobs/report/route.ts — replacement
- app/api/jobs/report/folders/route.ts — new
- components/job-portal/JobReportDialog.tsx — replacement
- lib/job-report-access.ts — new
- lib/pdf-generator-jobs.ts — replacement
- package.json — replacement, adds jszip
- package-lock.json — replacement, declares the direct jszip dependency

## How reports work

Open Job Portal > Generate Report. Select the existing customer/date filters and optionally tick job folders.

- No folders selected: one PDF for all jobs matching your account and filters, including unfiled jobs.
- One folder selected: one PDF containing only matching jobs in that folder.
- Several folders selected: one ZIP containing a separate PDF for every selected folder.
- An empty selected folder, or a folder with no jobs in the selected dates, produces a zero-job PDF with an explanatory message.
- Folder names are shown in the PDF and filename. Duplicate folder names remain separate because selection uses unique folder IDs.

Admin sees all folders, or folders for the selected customer. Customers see only their own folders. Workers see only folders containing jobs assigned to them, and their reports contain only their assigned jobs. Selecting a folder never grants access to the other jobs inside it.

Admin portal copies are saved separately using the existing report-saving service. Customer and Worker reports are private downloads. A failure to save an Admin portal copy does not prevent the local download.

## Staging QA

1. As Admin, choose one customer and one folder. Verify the PDF contains only that folder's jobs.
2. Choose two folders. Extract the downloaded ZIP and verify it contains two separate PDFs, each with the correct folder name and jobs.
3. Combine folder selection with Day, Week, Month, Year, and Custom dates. Verify only jobs starting within those dates are included.
4. Leave folder selection empty and verify the existing all-matching-jobs report still works, including unfiled jobs.
5. Test the same flow as Customer. Verify another customer's folders and jobs are unavailable.
6. Test as Worker with only one job assigned in a folder containing several jobs. Verify only the assigned job is listed in the PDF, and internal customer prices/other worker rates are not returned.
7. Test an empty folder and a date range with no matching jobs. Verify the selected folder still produces a zero-job PDF.
8. Rename a folder, reopen the report dialog, and verify the updated name. Delete a folder and verify it disappears from the list.
9. Test the dialog on a narrow mobile screen and desktop.

Development checks are separate from Joshua's staging QA sign-off.
