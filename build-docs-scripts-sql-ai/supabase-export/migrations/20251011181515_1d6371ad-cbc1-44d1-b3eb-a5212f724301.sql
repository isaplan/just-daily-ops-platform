-- Add DELETE policy to data_imports table
CREATE POLICY "Authenticated users can delete data_imports"
ON public.data_imports
FOR DELETE
TO public
USING (auth.uid() IS NOT NULL);