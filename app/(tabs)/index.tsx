// app/index.tsx
import React, { useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, StyleSheet,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import ShiftCard from '@/src/components/ShiftCard';
import StatsBar from '@/src/components/StatsBar';
import { useShifts } from '@/src/hooks/UseShift';
import { useWeather } from '@/src/hooks/UseWeather';
import { requestNotificationPermissions, scheduleDailyWeatherReminder } from '@/src/services/notification';
import { COLORS } from '@/src/constants';

export default function HomeScreen() {
  const router  = useRouter();
  const weather = useWeather();
  const { shifts, loading, load, remove, totalHours, upcomingCount } = useShifts();

  // First launch setup
  useEffect(() => {
    (async () => {
      await requestNotificationPermissions();
      await scheduleDailyWeatherReminder();
      await load();
    })();
  }, [load]);

  // Reload every time the screen comes into focus (e.g. returning from paste screen)
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleDelete = (id: string) => {
    Alert.alert('Delete Shift', 'Remove this shift?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove(id) },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Rota</Text>
          <Text style={styles.weather}>{weather}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.push('/modal/api-key')}>
            <Text style={styles.settingsBtn}>⚙</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/paste')}>
            <Text style={styles.addBtnText}>+ Add Shift</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <StatsBar upcoming={upcomingCount} total={shifts.length} hours={totalHours} />

      {/* List */}
      {loading ? (
        <ActivityIndicator color={COLORS.blue} style={{ marginTop: 40 }} />
      ) : shifts.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>📭</Text>
          <Text style={styles.emptyTitle}>No shifts yet</Text>
          <Text style={styles.emptySub}>Tap + Add Shift to get started</Text>
        </View>
      ) : (
        <FlatList
          data={shifts}
          keyExtractor={(s) => s.id}
          renderItem={({ item }) => <ShiftCard shift={item} onDelete={handleDelete} />}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={load} tintColor={COLORS.blue} />
          }
        />
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', paddingTop: 8, marginBottom: 20,
  },
  title:   { color: COLORS.textPrimary, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  weather: { color: COLORS.textSecond, fontSize: 13, marginTop: 4 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingsBtn: { color: COLORS.textSecond, fontSize: 23, padding: 4 },
  addBtn:  { backgroundColor: COLORS.blue, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  empty:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '700', marginBottom: 6 },
  emptySub:   { color: '#666', fontSize: 14 },
});
