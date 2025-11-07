-- Add DELETE policy to powerbi_pnl_data table
CREATE POLICY "Authenticated users can delete powerbi_pnl_data"
ON public.powerbi_pnl_data
FOR DELETE
TO public
USING (auth.uid() IS NOT NULL);