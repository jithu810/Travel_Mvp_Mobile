import { useEffect, useRef, useState } from 'react';
import { createLocalPhotoStore, type LocalPhoto, type LocalPhotoState, type PhotoSource } from '@/lib/create/photo-model';
import { photoDevice } from '@/lib/create/photo-device';
export function useLocalPhotos() {
  const [state, setState] = useState<LocalPhotoState>({ candidates: {}, errors: {}, busyKey: null });
  const store = useRef<ReturnType<typeof createLocalPhotoStore> | null>(null);
  useEffect(() => {
    const current = createLocalPhotoStore(photoDevice,setState); store.current = current;
    return () => { current.dispose(); if (store.current === current) store.current = null; };
  }, []);
  return { ...state, acceptSaved: (saved: Record<string, LocalPhoto>) => store.current?.acceptSaved(saved), isBusy: () => !!store.current?.getState().busyKey, select: (key: string, source: PhotoSource = 'gallery') => { void store.current?.select(key, source); }, remove: (key: string) => store.current?.remove(key) };
}
