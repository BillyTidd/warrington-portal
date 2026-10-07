# Worker document uploads and removal

This ZIP contains complete replacement files for the existing Warrington Portal document feature.

## Installation

1. Extract the ZIP and open Warrington-Worker-Document-Permissions.
2. Copy the included app and types folders into C:\warrington-portal.
3. Merge folders and replace the five matching files. Keep the rest of your project.
4. Run npm.cmd run build with your existing environment settings, then restart your local server.

No dependency installation, MongoDB migration, new environment variable or R2 configuration change is required.

## Behavior

Assigned workers can select and upload documents in Job Details > Documents. Existing formats are supported: PDF, PNG/JPG images, Word, Excel, CSV and TXT. Existing limits remain 25 MB per file and 10 files per upload.

Workers see Remove only beside files they personally uploaded. The server also checks uploader ownership and current job assignment before deletion. They cannot remove Admin, Customer or another worker's files. Admin retains permission to remove any job document. Customer permissions remain as before.

Worker upload URLs are tied to both their account and the specific assigned job. The attachment endpoint verifies assignment again before adding the document record. Unauthorized requests are rejected before deleting storage objects.

## Staging checks

1. Assign Worker A and Worker B to a test job.
2. As Worker A, upload a PNG and PDF. Verify both appear and open.
3. Verify Admin and the owning Customer can open both uploads.
4. As Worker A, remove one of their files. Verify it disappears after refresh for all users.
5. Add files as Admin and Customer. Verify Worker A can open them but has no Remove button.
6. Upload a file as Worker B. Verify Worker A cannot remove it, including by manually requesting DELETE /api/job-documents/<document-id>; expect 403.
7. Remove Worker A from the job. Verify upload requests and deletion requests to that job are rejected.
8. Verify Admin can still upload and remove files, and Customer uploads still work.
9. Verify oversized and unsupported files are rejected and the controls work on mobile.

This package was based on the previously supplied project baseline. Staging QA with your actual accounts and storage is still required.
