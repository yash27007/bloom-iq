-- Storage policies for course-materials bucket
-- Run this in your Supabase SQL Editor

-- Enable RLS on storage.objects table (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow anyone to upload to course-materials bucket (you can restrict this later)
CREATE POLICY "Allow uploads to course-materials bucket"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'course-materials');

-- Allow anyone to read from course-materials bucket (public access)
CREATE POLICY "Allow reading from course-materials bucket"
ON storage.objects
FOR SELECT
USING (bucket_id = 'course-materials');

-- Allow anyone to delete from course-materials bucket (you can restrict this later)
CREATE POLICY "Allow deleting from course-materials bucket"
ON storage.objects
FOR DELETE
USING (bucket_id = 'course-materials');

-- Allow anyone to update files in course-materials bucket (needed for upsert)
CREATE POLICY "Allow updating files in course-materials bucket"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'course-materials')
WITH CHECK (bucket_id = 'course-materials');

-- Alternative: If you want to restrict to authenticated users only, 
-- replace the policies above with these:

/*
-- For authenticated users only
CREATE POLICY "Allow authenticated uploads to course-materials bucket"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'course-materials');

CREATE POLICY "Allow authenticated reading from course-materials bucket"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'course-materials');

CREATE POLICY "Allow authenticated deleting from course-materials bucket"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'course-materials');

CREATE POLICY "Allow authenticated updating files in course-materials bucket"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'course-materials')
WITH CHECK (bucket_id = 'course-materials');
*/
