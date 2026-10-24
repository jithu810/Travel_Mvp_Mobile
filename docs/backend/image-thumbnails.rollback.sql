-- Reference only. Rollback has not been applied to the live project; do not run without separate approval.
-- Target: gwybjhqgnrpouwcdvusi. This removes only the added read policy.
-- Also set EXPO_PUBLIC_STORED_THUMBNAILS_ENABLED=false and reload the client.
-- Uploaded originals, thumbnails, journey references and baseline policies remain.
BEGIN;
SET LOCAL lock_timeout = '5s';
DROP POLICY journey_media_thumbnail_v1_read ON storage.objects;
COMMIT;
