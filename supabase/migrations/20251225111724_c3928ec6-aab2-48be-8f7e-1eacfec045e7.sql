-- Create storage bucket for listing images
INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-images', 'listing-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for listing-images (public bucket)
DO $$
BEGIN
  -- Drop policies if they exist to avoid conflicts
  DROP POLICY IF EXISTS "Anyone can view listing images" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload listing images" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their own listing images" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own listing images" ON storage.objects;
END $$;

CREATE POLICY "Anyone can view listing images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listing-images');

CREATE POLICY "Authenticated users can upload listing images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'listing-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own listing images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'listing-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own listing images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'listing-images' AND auth.uid()::text = (storage.foldername(name))[1]);