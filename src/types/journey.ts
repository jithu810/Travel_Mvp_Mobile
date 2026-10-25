export const travelerTypes = ['solo', 'couple', 'friends', 'family'] as const;
export type TravelerType = typeof travelerTypes[number];

export type JourneyStop = {
  id: string;
  name: string;
  description: string;
  sequence: number;
  dayNumber: number | null;
  photo: string | null;
  photoThumbnail?: string | null;
  rating: number | null;
  latitude: number | null;
  longitude: number | null;
};
export type PublicJourney = {
  /** Already-public creator UUID, attached only to a gated detail response. */
  creatorId?: string;
  id: string;
  title: string;
  description: string;
  destination: string;
  destinationSlug: string;
  creatorName: string;
  creatorUsername: string | null;
  travelerType: TravelerType;
  durationDays: number | null;
  likes: number | null;
  cover: string | null;
  coverThumbnail?: string | null;
  stops: JourneyStop[];
  /** Direct remix parent (journeys.copied_from_journey_id); present only on detail. */
  sourceId?: string;
};
