-- Alternative: Simple policies for course-materials bucket
-- If the previous script failed, try these simpler versions

-- First, check if RLS is enabled (this should work with anon key)
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- If you have service role access, uncomment and run these:
/*
-- Enable RLS (might already be enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Simple public access policies
CREATE POLICY "Public Access" ON storage.objects FOR ALL USING (bucket_id = 'course-materials');
*/
