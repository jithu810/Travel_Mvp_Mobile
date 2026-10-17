import type { CompanionViewport } from '@/lib/companion/model';
// Native prototype only. Never imports GL/Three on web.
export function TravelCompanion(_props: CompanionViewport & { enabled?: boolean; registerDisable?: (stop: (() => void) | null) => void; onGuideChange?: (active: boolean) => void }) { return null; }
