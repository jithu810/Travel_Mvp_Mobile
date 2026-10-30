import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSessionState } from '@/hooks/session-context';
import { loadPublicJourney } from '@/lib/discovery/queries';
import { restoreCustomizedTravel } from '@/lib/journey/customized-travel';
import { tripStore } from '@/lib/journey/trip-session';
import { canOpenTravelMode } from '@/lib/journey/travel-preview';
import { tripPersistence, tripRecovery } from '@/lib/journey/trip-recovery-store';
import { rebuildTripJourney, tripRecoveryPrompt, tripUnavailableMessage, type TripRecovery } from '@/lib/journey/trip-recovery';
import type { PublicJourney } from '@/types/journey';

export const TRIP_RECOVERY_TIMEOUT = 15000;
export const tripRetryMessage = 'We couldn’t reopen your saved trip. Check your connection and try again.';
// Travel Mode: keeps a location-free copy of this signed-in user's unfinished trip and offers
// a stored copy back once. Resume restores it PAUSED; GPS starts only from the Resume button.
// hold defers the prompt while a location-permission request may be on screen.
export function useTripRecovery(routeId: string, journeyId: string | null, hold = false) {
  const auth = useSessionState(), userId = auth.session?.user.id ?? null;
  const [checked, setChecked] = useState<string | null>(null), [notice, setNotice] = useState<string | null>(null);
  const [retryNotice, setRetryNotice] = useState<string | null>(null), [attempt, setAttempt] = useState(0);
  const [offer, setOffer] = useState<{ recovery: TripRecovery; journey: PublicJourney } | null>(null), [focused, setFocused] = useState(false);
  const offerShown = useRef(false), noticeShown = useRef(false), mounted = useRef(true), pendingOffer = useRef(offer);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { pendingOffer.current = offer; }, [offer]);
  // An offer still unanswered when the screen loses focus is asked again on return.
  useFocusEffect(useCallback(() => { setFocused(true); return () => { setFocused(false); if (pendingOffer.current) offerShown.current = false; }; }, []));
  useEffect(() => { if (userId && journeyId) tripPersistence.track(userId, journeyId); }, [userId, journeyId]);
  const checkKey = auth.loading ? null : (userId ?? '') + ':' + routeId + ':' + attempt;
  useEffect(() => {
    if (checkKey === null || !userId) return;
    let active = true;
    const controller = new AbortController();
    const finish = () => { if (!active) return false; active = false; clearTimeout(timer); setChecked(checkKey); return true; };
    // A slow or hung check gives up with a try-again message; the copy is kept.
    const timer = setTimeout(() => { if (finish()) { controller.abort(); setRetryNotice(tripRetryMessage); } }, TRIP_RECOVERY_TIMEOUT);
    const ready = () => tripStore.get(routeId).status === 'ready';
    void (async () => {
      const recovery = await tripRecovery.load(userId);
      if (!active) return;
      if (!recovery || recovery.journeyId !== routeId || !ready()) return void finish();
      let source: PublicJourney | null;
      // Offline or failing loads keep the copy for a later visit; only a missing journey discards it.
      try { source = await loadPublicJourney(recovery.sourceId ?? recovery.journeyId, controller.signal); } catch { return void finish(); }
      // A trip begun while this ran wins; its copy is never offered or removed from here.
      if (!active || !ready()) return void finish();
      const journey = rebuildTripJourney(recovery, source);
      if (!canOpenTravelMode(journey)) { void tripRecovery.clear(userId, recovery.journeyId); setNotice(tripUnavailableMessage); return void finish(); }
      if (finish()) setOffer({ recovery, journey });
    })();
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [checkKey, userId, routeId]);
  useEffect(() => {
    if (!offer || !focused || offerShown.current || !userId || hold) return;
    const { recovery, journey } = offer;
    const ready = () => tripStore.get(recovery.journeyId).status === 'ready';
    if (!ready()) { pendingOffer.current = null; void Promise.resolve().then(() => { if (mounted.current) setOffer(null); }); return; }
    offerShown.current = true;
    // A temporary route is registered either way so Travel Mode can open it (ready or paused).
    const register = () => {
      if (!recovery.customized || !recovery.sourceId) return true;
      try { restoreCustomizedTravel(journey, recovery.sourceId, recovery.addedStops.map(stop => stop.id)); return true; }
      catch { setNotice(tripUnavailableMessage); return false; }
    };
    const prompt = tripRecoveryPrompt(recovery);
    Alert.alert(prompt.title, prompt.body, [
      { text: 'Discard', style: 'destructive', onPress: () => { if (!mounted.current) return; if (ready()) void tripRecovery.clear(userId, recovery.journeyId); register(); setOffer(null); } },
      { text: 'Resume', onPress: () => { if (!mounted.current) return; if (register()) tripStore.restore(journey, recovery); setOffer(null); } },
    ], { cancelable: false });
  }, [offer, focused, userId, hold]);
  // The journey changed or is gone: say so once, even when its current version still opens.
  useEffect(() => {
    if (!notice || !focused || noticeShown.current || hold) return;
    noticeShown.current = true;
    Alert.alert('Trip can’t be resumed', notice);
  }, [notice, focused, hold]);
  const retry = useCallback(() => { setRetryNotice(null); setAttempt(value => value + 1); }, []);
  const checking = auth.loading || (!!userId && checked !== checkKey) || !!offer;
  return { checking, notice, retryNotice, retry, signedIn: !!userId };
}

// Home: the signed-in user's valid unfinished trip copy, re-read whenever Home is focused.
export function useUnfinishedTrip(userId: string | null) {
  const [trip, setTrip] = useState<TripRecovery | null>(null);
  useFocusEffect(useCallback(() => {
    if (!userId) return;
    let active = true;
    void tripRecovery.load(userId).then(value => { if (active) setTrip(value); });
    return () => { active = false; };
  }, [userId]));
  return trip && trip.userId === userId ? trip : null;
}
