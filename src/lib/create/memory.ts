import { coordinates, validateForm, type CreateForm, type StopInput } from './model';
export type MemoryEdit = { value: StopInput; baseline: StopInput; isNew: boolean };
export function emptyMemory(id: string): StopInput {
  return { id, name: '', description: '', latitude: null, longitude: null, mapboxId: null, photoPath: null, day: '', rating: '' };
}
export function memoryChanged(edit: MemoryEdit | null) { return !!edit && JSON.stringify(edit.value) !== JSON.stringify(edit.baseline); }
export function memorySnapshot(form: CreateForm, edit: MemoryEdit): CreateForm {
  const previous = form.stops.find(stop => stop.id === edit.baseline.id);
  if (edit.value.id !== edit.baseline.id || (edit.isNew ? previous : !previous)) throw new Error('This memory changed. Close it and reopen before saving.');
  const locationChanged = !previous || previous.latitude !== edit.value.latitude || previous.longitude !== edit.value.longitude || previous.mapboxId !== edit.value.mapboxId;
  if (locationChanged && coordinates(edit.value.latitude, edit.value.longitude) && form.stops.some(stop => stop.id !== edit.value.id
    && ((edit.value.mapboxId && stop.mapboxId === edit.value.mapboxId) || (stop.latitude === edit.value.latitude && stop.longitude === edit.value.longitude)))) {
    throw new Error('That place is already in your journey. Edit its existing memory instead.');
  }
  const snapshot = { ...form, stops: edit.isNew ? [...form.stops, edit.value] : form.stops.map(stop => stop.id === edit.value.id ? edit.value : stop) };
  const error = validateForm(snapshot, 'draft');
  if (error) throw new Error(error);
  return snapshot;
}
export function publicationIssue(form: CreateForm) {
  const error = validateForm(form, 'published');
  if (error?.startsWith('Every published stop')) {
    const index = form.stops.findIndex(stop => !coordinates(stop.latitude, stop.longitude));
    return 'Add a location to memory ' + (index + 1) + ' (' + (form.stops[index]?.name || 'Unnamed') + ') before publishing.';
  }
  if (error === 'Check stop names and descriptions.') {
    const index = form.stops.findIndex(stop => !stop.name.trim() || stop.name.length > 200 || stop.description.length > 1000);
    return 'Check the name (1–200 characters) and note (up to 1,000 characters) for memory ' + (index + 1) + '.';
  }
  return error;
}