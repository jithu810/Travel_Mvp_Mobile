import { useLayoutEffect, useRef, useState } from 'react';

// Track failures by URL, so changed signed URLs and changed photos can recover.
export function useThumbnailSource(original: string | null, thumbnail?: string | null) {
  const [failedOriginal, setFailedOriginal] = useState<string | null>(null);
  const [failedThumbnail, setFailedThumbnail] = useState<string | null>(null);
  const preview = thumbnail && thumbnail !== original && thumbnail !== failedThumbnail ? thumbnail : null;
  const uri = preview || (original && original !== failedOriginal ? original : null);
  const current = useRef({ original, thumbnail, uri });
  useLayoutEffect(() => { current.current = { original, thumbnail, uri }; }, [original, thumbnail, uri]);
  return { uri, onError: () => {
    // Late native events from replaced images must not overwrite current failures.
    if (current.current.original !== original || current.current.thumbnail !== thumbnail || current.current.uri !== uri || !uri) return false;
    if (preview) setFailedThumbnail(preview);
    else if (uri) setFailedOriginal(uri);
    return !preview;
  } };
}
