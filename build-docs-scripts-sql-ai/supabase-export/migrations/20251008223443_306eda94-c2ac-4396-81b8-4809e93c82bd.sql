-- Create storage bucket for finance imports
INSERT INTO storage.buckets (id, name, public)
VALUES ('finance_imports', 'finance_imports', false);

-- Create RLS policies for finance_imports bucket
CREATE POLICY "Authenticated users can upload finance files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'finance_imports');

CREATE POLICY "Authenticated users can view their finance files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'finance_imports');

CREATE POLICY "Authenticated users can delete their finance files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'finance_imports');