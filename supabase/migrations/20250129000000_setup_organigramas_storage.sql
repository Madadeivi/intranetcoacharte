CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'organigramas');

CREATE POLICY "Service role write access"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'organigramas' AND auth.role() = 'service_role');

CREATE POLICY "Service role update access"
ON storage.objects FOR UPDATE
USING (bucket_id = 'organigramas' AND auth.role() = 'service_role');

CREATE POLICY "Service role delete access"
ON storage.objects FOR DELETE
USING (bucket_id = 'organigramas' AND auth.role() = 'service_role');

