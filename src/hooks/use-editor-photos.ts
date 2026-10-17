import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useLoad } from './use-load';
import { loadEditorPhotos } from '@/lib/create/queries';
const RENEW_AFTER = 55 * 60 * 1000;
export function useEditorPhotos(pathsKey: string, ownerId: string) {
  const loader = useCallback((signal: AbortSignal) => loadEditorPhotos(JSON.parse(pathsKey) as string[],ownerId,signal), [pathsKey,ownerId]);
  const photos = useLoad(loader), refreshed = useRef(0), requested = useRef(0);
  const refresh = photos.refresh;
  const refreshPreview = useCallback(() => {
    const now = Date.now();
    if (now-requested.current < 15000) return;
    requested.current = now; refresh();
  }, [refresh]);
  useEffect(() => {
    if (!photos.data || pathsKey === '[]') return;
    refreshed.current = Date.now();
    const timer = setTimeout(refreshPreview,RENEW_AFTER);
    return () => clearTimeout(timer);
  }, [photos.data,pathsKey,refreshPreview]);
  useFocusEffect(useCallback(() => { if (!photos.loading && Date.now()-refreshed.current >= RENEW_AFTER && pathsKey !== '[]') refreshPreview(); }, [pathsKey,photos.loading,refreshPreview]));
  useEffect(() => {
    const listener = AppState.addEventListener('change',state => { if (state === 'active' && Date.now()-refreshed.current >= RENEW_AFTER && pathsKey !== '[]') refreshPreview(); });
    return () => listener.remove();
  }, [pathsKey,refreshPreview]);
  return { ...photos, refreshPreview };
}
