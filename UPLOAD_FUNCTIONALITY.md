# Course Material Upload Functionality Documentation

## Overview
Complete implementation of PDF upload system for course coordinators with background parsing and status tracking.

## Architecture

### 1. File Upload Flow
```
User Selects PDF → Upload API → Save to /uploads → Create DB Record → Return Success
                                                         ↓
                                          Trigger Background PDF Parsing (Non-blocking)
```

### 2. Background PDF Parsing Flow
```
Background Job Triggered → Update Status: PROCESSING → Parse PDF → Log Content → Update Status: COMPLETED
                                                           ↓ (on error)
                                                    Update Status: FAILED
```

## Database Schema

### Course_Material Table
```prisma
model Course_Material {
  id                String         @id @default(uuid())
  courseId          String
  title             String
  filePath          String         // Path: uploads/{timestamp}-{filename}
  materialType      Material_Type  // SYLLABUS | UNIT_PDF
  unit              Int            @default(0)
  uploadedById      String
  parsedContent     String?        // Markdown content from PDF
  parsingStatus     Parsing_Status @default(PENDING)
  parsingError      String?        // Error message if parsing fails
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt
}

enum Parsing_Status {
  PENDING      // File uploaded, waiting to be parsed
  PROCESSING   // Currently parsing PDF
  COMPLETED    // Successfully parsed
  FAILED       // Parsing failed
}
```

## API Endpoints

### 1. File Upload API: `/api/upload`
**Method:** POST  
**Content-Type:** multipart/form-data  
**Authentication:** Required (COURSE_COORDINATOR role)

**Request:**
```typescript
FormData {
  file: File (PDF only, max 10MB)
}
```

**Response:**
```typescript
{
  message: string,
  filename: string,        // Unique filename with timestamp
  originalName: string,    // Original uploaded filename
  size: number,           // File size in bytes
  uploadedBy: string      // User ID
}
```

**Validations:**
- ✓ User must be authenticated
- ✓ User must have COURSE_COORDINATOR role
- ✓ File must be PDF format
- ✓ File size must be ≤ 10MB

### 2. tRPC Procedures

#### `coordinator.uploadCourseMaterial`
Creates database record for uploaded material and triggers background parsing.

**Input:**
```typescript
{
  courseId: string,
  title: string,
  filename: string,
  materialType: "SYLLABUS" | "UNIT_PDF",
  unit: number (0-5)
}
```

**Process:**
1. Validates user is course coordinator
2. Creates Course_Material record with `parsingStatus: PENDING`
3. Triggers background PDF parsing (non-blocking)
4. Returns immediately with material details

#### `coordinator.getUploadedMaterials`
Retrieves all materials for coordinator's courses with parsing status.

**Returns:**
```typescript
Array<{
  id: string,
  title: string,
  filename: string,
  materialType: string,
  unit: number,
  uploadedAt: string,
  parsingStatus: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED",
  parsingError: string | null,
  hasParsedContent: boolean,
  course: { course_code: string, name: string },
  uploadedBy: { firstName: string, lastName: string }
}>
```

#### `coordinator.deleteCourseMaterial`
Deletes a course material record.

**Input:**
```typescript
{ materialId: string }
```

## Background PDF Parsing

### Function: `parsePDFInBackground()`
Located in: `src/trpc/routers/coordinator-router.ts`

**Process:**
1. Update status to `PROCESSING`
2. Read PDF file from uploads folder
3. Parse PDF to text and markdown
4. Validate parsed content
5. **Log parsed content to console** (as requested)
6. Update database with:
   - `parsedContent`: Markdown formatted text
   - `parsingStatus`: COMPLETED
   - `parsingError`: null
7. On error:
   - Update `parsingStatus`: FAILED
   - Store error message in `parsingError`

**Console Log Format:**
```
========== PARSED PDF CONTENT (Material ID: xxx) ==========
Filename: {filename}
Pages: {page_count}
Text Length: {char_count} characters

--- Raw Text ---
{first 500 characters}...

--- Markdown Format ---
{first 500 characters}...

--- Full Metadata ---
{JSON metadata}
========== END OF PARSED CONTENT ==========
```

## PDF Parser (`src/lib/pdf-parser.ts`)

### Key Functions

#### `parsePDFToText(buffer: Buffer)`
Extracts text from PDF and converts to markdown.

**Returns:**
```typescript
{
  text: string,           // Raw extracted text
  markdown: string,       // Formatted markdown
  metadata: {
    pages: number,
    info: object
  }
}
```

**Features:**
- Detects headings (ALL CAPS, Chapter/Unit patterns)
- Converts numbered lists
- Preserves bullet points
- Structures content hierarchically

#### `validateParsedContent(content: ParsedPDFContent)`
Validates quality of parsed content.

**Checks:**
- Minimum text length (100 characters)
- Non-empty metadata
- Reasonable page count
- Content quality

## UI Implementation

### Upload Form
**Location:** `/coordinator/dashboard/course-management/upload-material`

**Features:**
- Drag & drop file upload
- Course selection dropdown
- Material type selection (Syllabus / Unit PDF)
- Unit number selection (for Unit PDFs)
- Real-time upload progress
- Success/error messages

### Material List Display

**Status Badges:**
- 🟡 **Pending**: `⏳ Parsing Pending` (yellow)
- 🔵 **Processing**: `🔄 Parsing...` (blue)
- 🟢 **Completed**: `✓ Parsed` (green)
- 🔴 **Failed**: `✗ Parse Failed` (red, with hover error message)

**Actions:**
- Download material (PDF file)
- Delete material
- Refresh list

## File Storage

### Upload Directory
```
src/uploads/{timestamp}-{sanitized_filename}.pdf
```

**Filename Format:**
- Timestamp: Unix milliseconds
- Original name: Sanitized (only alphanumeric, dots, hyphens)
- Example: `1699884567890-course_syllabus_unit_1.pdf`

**Database Reference:**
```
filePath: "uploads/1699884567890-course_syllabus_unit_1.pdf"
```

## Security

### Authentication
- All endpoints require valid session
- Upload restricted to COURSE_COORDINATOR role

### Authorization
- Coordinators can only upload to their assigned courses
- Coordinators can only view/delete their own materials

### File Validation
- PDF format only
- 10MB size limit
- Filename sanitization
- Path traversal prevention

## Error Handling

### Upload Errors
- **401 Unauthorized**: User not logged in
- **403 Forbidden**: Not a course coordinator
- **400 Bad Request**: 
  - No file provided
  - Invalid file type
  - File too large
  - Missing required fields

### Parsing Errors
- Errors logged to console
- Status updated to FAILED
- Error message stored in database
- Does NOT block upload completion

## Testing the Implementation

### 1. Upload a PDF
```bash
# Start the development server
bun run dev

# Navigate to:
http://localhost:3000/coordinator/dashboard/course-management/upload-material
```

### 2. Check Console Logs
After uploading, watch the terminal for:
```
[PDF Parser] Starting background parsing for material {id}
========== PARSED PDF CONTENT ==========
...
[PDF Parser] Successfully completed parsing for material {id}
```

### 3. Verify Database
```sql
SELECT id, title, parsingStatus, parsingError, 
       LENGTH(parsedContent) as content_length
FROM course_material
ORDER BY createdAt DESC;
```

### 4. Check UI Status
- Upload a file
- Wait 1-2 seconds
- Click "Refresh" button
- Status badge should change: PENDING → PROCESSING → COMPLETED

## Future Enhancements

### Planned Features
- [ ] Real-time parsing progress updates (WebSocket/SSE)
- [ ] Retry failed parsing jobs
- [ ] PDF preview in browser
- [ ] Batch upload support
- [ ] Advanced PDF content extraction (tables, images)
- [ ] Content search functionality
- [ ] Version history for materials

### Integration with AI Question Generation
The parsed markdown content (`parsedContent` field) is ready to be used as context for the Gemma AI model:

```typescript
// Example usage in question generation
const material = await prisma.course_Material.findUnique({
  where: { id: materialId }
});

if (material.parsingStatus === 'COMPLETED' && material.parsedContent) {
  // Pass to Gemma model
  const questions = await generateQuestionsWithGemma({
    context: material.parsedContent,
    unit: material.unit,
    difficulty: 'MEDIUM',
    count: 10
  });
}
```

## Troubleshooting

### Issue: Parsing status stuck on PENDING
**Cause:** Background job may have failed silently  
**Solution:** Check server logs for errors, manually trigger parsing

### Issue: Parse failed with error
**Cause:** Invalid PDF, corrupted file, or unsupported PDF format  
**Solution:** 
1. Check console for detailed error
2. Try re-uploading the file
3. Convert PDF to a standard format
4. Ensure PDF is not password protected

### Issue: Parsed content is empty
**Cause:** PDF may be image-based (scanned document)  
**Solution:** Use OCR preprocessing or notify user to upload text-based PDF

### Issue: File upload fails
**Cause:** File size, format, or permissions  
**Solution:**
1. Verify file is PDF and under 10MB
2. Check uploads folder permissions
3. Verify disk space available

## Summary

✅ **Implemented:**
- File upload to `src/uploads/` folder
- Database reference storage
- Background PDF parsing (non-blocking)
- Parsing status tracking
- Console logging of parsed content
- UI status indicators
- Error handling

✅ **User Experience:**
- Upload completes immediately
- No UI blocking during parsing
- Real-time status updates
- Clear error messages

✅ **Ready for AI Integration:**
- Parsed content in markdown format
- Structured and validated
- Easily consumable by Gemma model
