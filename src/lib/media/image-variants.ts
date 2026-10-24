const uuid = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
const directory = `${uuid}/${uuid}/(?:cover|stops/${uuid})/`;
const original = new RegExp(`^(${directory}${uuid})\\.full-v1\\.(jpg|png|webp)$`);
const thumbnail = new RegExp(`^${directory}${uuid}\\.thumb-512-v1\\.jpg$`);
export const storedThumbnailsEnabled = () => process.env.EXPO_PUBLIC_STORED_THUMBNAILS_ENABLED === 'true';
export function thumbnailObjectName(objectName: string): string | null {
  const match = original.exec(objectName);
  return match ? match[1] + '.thumb-512-v1.jpg' : null;
}
export function isThumbnailObjectName(objectName: string) { return thumbnail.test(objectName); }
export function thumbnailStoragePath(path: string): string | null {
  if (!path.startsWith('journey-media/')) return null;
  const name = thumbnailObjectName(path.slice('journey-media/'.length));
  return name ? 'journey-media/' + name : null;
}
