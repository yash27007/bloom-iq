# Uploads Directory

This directory stores PDF files uploaded by users.

## Structure:
- `/uploads/[courseId]/[materialId].pdf` - Organized by course and material ID
- Files are stored locally and processed by background jobs

## Notes:
- Make sure this directory has proper read/write permissions
- Consider adding file size limits and virus scanning in production
- Files should be cleaned up periodically to manage disk space
