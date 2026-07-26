/**
 * GymBud Mobile — Profile Screen
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { colors, spacing, textStyles, borderRadius } from '../../theme';
import { useAuthStore } from '../../store/authStore';

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  function handleLogout() {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.full_name?.[0] || '?'}</Text>
        </View>
        <Text style={styles.name}>{user?.full_name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.card}>
        <ProfileRow label="Goal" value={user?.fitness_goal?.replace('_', ' ') || '—'} />
        <ProfileRow label="Experience" value={user?.experience_level || '—'} />
        <ProfileRow label="Weight" value={user?.weight_kg ? `${user.weight_kg} kg` : '—'} />
        <ProfileRow label="Height" value={user?.height_cm ? `${user.height_cm} cm` : '—'} />
        <ProfileRow label="Equipment" value={user?.equipment_access?.replace('_', ' ') || '—'} />
        <ProfileRow label="Weak Points" value={user?.weak_points?.join(', ') || 'None set'} />
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.base, paddingTop: spacing['3xl'] },

  header: { alignItems: 'center', marginBottom: spacing['2xl'] },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: { ...textStyles.h1, color: colors.text },
  name: { ...textStyles.h3, color: colors.text },
  email: { ...textStyles.caption, color: colors.textMuted },

  card: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.base, borderWidth: 1, borderColor: colors.surfaceBorder,
    marginBottom: spacing.xl,
  },

  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder },
  rowLabel: { ...textStyles.bodyMedium, color: colors.textSecondary },
  rowValue: { ...textStyles.body, color: colors.text, textTransform: 'capitalize' },

  logoutButton: {
    borderWidth: 1, borderColor: colors.error, borderRadius: borderRadius.md,
    paddingVertical: spacing.md, alignItems: 'center',
  },
  logoutText: { ...textStyles.bodyMedium, color: colors.error },
});
