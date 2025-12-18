# Testing Guide - Question Paper Validation Feature

## Pre-Deployment Testing

### 1. Local Testing

#### Prerequisites
```bash
# Ensure all services are running
docker compose up -d

# Check services
docker compose ps
```

#### Test Steps

**Step 1: Setup Test Data**
```bash
# Seed database with test data
docker compose exec app bunx prisma db seed

# Or manually create:
# - A course
# - A course coordinator user
# - Upload a syllabus PDF
```

**Step 2: Test Syllabus Upload**
1. Login as Course Coordinator
2. Navigate to "Upload Material"
3. Select a course
4. Choose "Syllabus" as material type
5. Upload a syllabus PDF
6. Wait for parsing to complete (check status)
7. ✅ Verify: Syllabus appears in materials list with "COMPLETED" status

**Step 3: Test Question Paper Validation**
1. Navigate to "Validate Question Paper" (in Question Paper section)
2. Select the course (same as syllabus)
3. ✅ Verify: Alert shows "Syllabus found"
4. Upload a question paper PDF
5. Wait for validation to complete
6. ✅ Verify: Validation results are displayed

**Step 4: Verify Validation Results**
Check that results show:
- ✅ Summary (total questions, marks)
- ✅ Course Outcomes list
- ✅ Errors (if any)
- ✅ Warnings (if any)
- ✅ Bloom's Taxonomy distribution
- ✅ Course Outcome mapping
- ✅ Questions analysis

### 2. Test Scenarios

#### Scenario 1: Valid Question Paper
- **Input**: Question paper with proper CO mapping, correct marks, Bloom levels
- **Expected**: ✅ Valid status, minimal warnings

#### Scenario 2: Missing Syllabus
- **Input**: Try to validate without uploading syllabus
- **Expected**: ❌ Error message asking to upload syllabus first

#### Scenario 3: Invalid Mark Distribution
- **Input**: Part A question with 8 marks (should be 2)
- **Expected**: ❌ Error in validation results

#### Scenario 4: Missing CO Mapping
- **Input**: Question paper without CO codes
- **Expected**: ⚠️ Warning about unmapped questions

#### Scenario 5: Missing Bloom Levels
- **Input**: Question paper without Bloom levels
- **Expected**: ⚠️ Warning for each question missing Bloom level

### 3. API Testing

#### Test tRPC Endpoints

```bash
# Test syllabus check
curl -X POST http://localhost:3000/api/trpc/coordinator.checkSyllabusExists \
  -H "Content-Type: application/json" \
  -d '{"courseId": "your-course-id"}'

# Test validation (after uploading file)
# Note: This requires authentication and file upload
```

### 4. Integration Testing

#### Full Workflow Test

1. **Setup**
   - Create course
   - Upload syllabus
   - Wait for parsing

2. **Validation**
   - Upload question paper
   - Check results

3. **Verification**
   - All COs are mapped
   - Mark distribution is correct
   - Bloom levels are present
   - No critical errors

## Post-Deployment Testing

### 1. Production Smoke Tests

```bash
# Health check
curl https://your-domain.com/api/health

# Database connection
docker compose exec app bunx prisma db execute --stdin <<< "SELECT 1;"

# Ollama connection
curl http://localhost:11434/api/tags
```

### 2. User Acceptance Testing

**Test as Course Coordinator:**
1. ✅ Login successful
2. ✅ Can access "Validate Question Paper"
3. ✅ Can select course
4. ✅ Can upload question paper
5. ✅ Results display correctly
6. ✅ Can download/view results

**Test as Module Coordinator:**
1. ✅ Can access validation (if they coordinate the course)
2. ✅ Can view validation results

**Test as Program Coordinator:**
1. ✅ Can access validation (if they coordinate the course)
2. ✅ Can view validation results

### 3. Performance Testing

```bash
# Test with large PDF (10MB)
# Test with multiple concurrent validations
# Test with slow Ollama response
```

### 4. Error Handling Testing

- ✅ Invalid PDF format
- ✅ Corrupted PDF
- ✅ Missing course
- ✅ Network timeout
- ✅ Ollama service down
- ✅ Database connection lost

## Automated Testing Script

Create `test-validation.sh`:

```bash
#!/bin/bash

echo "🧪 Testing Question Paper Validation Feature"

# Check services
echo "1. Checking services..."
docker compose ps | grep -q "Up" || { echo "❌ Services not running"; exit 1; }
echo "✅ Services running"

# Check database
echo "2. Checking database..."
docker compose exec -T postgres psql -U bloom_user -d bloom_iq -c "SELECT 1;" > /dev/null || { echo "❌ Database not accessible"; exit 1; }
echo "✅ Database accessible"

# Check Ollama
echo "3. Checking Ollama..."
curl -s http://localhost:11434/api/tags > /dev/null || { echo "❌ Ollama not accessible"; exit 1; }
echo "✅ Ollama accessible"

# Check app
echo "4. Checking app..."
curl -s http://localhost:3000 > /dev/null || { echo "❌ App not accessible"; exit 1; }
echo "✅ App accessible"

echo "✅ All checks passed!"
```

Make it executable:
```bash
chmod +x test-validation.sh
./test-validation.sh
```

## Common Issues & Solutions

### Issue: Syllabus not found
**Solution**: Ensure syllabus is uploaded and parsing is completed

### Issue: Validation fails silently
**Solution**: Check logs:
```bash
docker compose logs app | grep -i validation
```

### Issue: Ollama timeout
**Solution**: Increase timeout or use smaller model

### Issue: PDF parsing fails
**Solution**: Check PDF is not scanned image, ensure pdf-parse is working

## Test Checklist

Before deploying to production:

- [ ] All services start correctly
- [ ] Database migrations run successfully
- [ ] Syllabus upload works
- [ ] Syllabus parsing completes
- [ ] Course outcomes are extracted
- [ ] Question paper upload works
- [ ] Validation completes successfully
- [ ] Results display correctly
- [ ] Errors are shown properly
- [ ] Warnings are shown properly
- [ ] CO mapping works
- [ ] Bloom distribution is calculated
- [ ] Mark distribution validation works
- [ ] UI is responsive
- [ ] No console errors
- [ ] Performance is acceptable (< 30s for validation)

## Performance Benchmarks

Expected performance:
- Syllabus parsing: 5-15 seconds
- Course outcome extraction: 2-5 seconds
- Question paper analysis: 10-30 seconds
- Total validation time: 15-50 seconds

If validation takes > 60 seconds, check:
- Ollama model size
- PDF size
- Network latency
- System resources

