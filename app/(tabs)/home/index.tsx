import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function HomeTabScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Home</ThemedText>
      <ThemedText style={styles.copy}>
        This is now inside the tabs group. Your login screen is the app entry point at `/`.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    gap: 12,
  },
  copy: {
    color: '#64748B',
  },
});
