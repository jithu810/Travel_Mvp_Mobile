import { Redirect, useLocalSearchParams } from 'expo-router';

// Keep existing draft links working while the editor owns loading and access checks.
export default function PrivateDraftScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === 'string' && params.id ? params.id : 'invalid';
  return <Redirect href={{ pathname: '/create', params: { draft: id } }} />;
}
