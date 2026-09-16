-- Allow sellers and admins to delete inquiries for their listings
CREATE POLICY "Sellers can delete inquiries for their listings" 
ON public.inquiries 
FOR DELETE 
USING (auth.uid() = seller_id);

CREATE POLICY "Admins can delete any inquiry" 
ON public.inquiries 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));