import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Switch, TextInput, Modal
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useExpenses } from '../../context/ExpensesContext';
import { useProfile } from '../../context/ProfileContext';
import { formatVND, parseVND } from '../../lib/vnd';
import { useRouter } from 'expo-router';

const BUDGET_OPTIONS = [
  { label: '5tr', value: 5_000_000 },
  { label: '10tr', value: 10_000_000 },
  { label: '15tr', value: 15_000_000 },
  { label: '20tr', value: 20_000_000 },
  { label: '30tr', value: 30_000_000 },
];

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { totalThisMonth, expenses } = useExpenses();
  const { profile, updateBudget, updateDisplayName, updateSettings } = useProfile();
  const router = useRouter();

  const [showNameModal, setShowNameModal] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [customBudget, setCustomBudget] = useState('');

  const handleSignOut = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    await updateDisplayName(nameInput.trim());
    setShowNameModal(false);
    setNameInput('');
  };

  const handleCustomBudget = async () => {
    const val = parseVND(customBudget);
    if (!val || val < 100_000) {
      Alert.alert('Không hợp lệ', 'Ngân sách tối thiểu 100.000₫');
      return;
    }
    await updateBudget(val);
    setCustomBudget('');
  };

  const budget = profile?.monthly_budget ?? 10_000_000;
  const streakCount = profile?.streak_count ?? 0;
  const displayName = profile?.display_name ?? user?.email?.split('@')[0] ?? 'User';
  const initials = displayName[0].toUpperCase();
  const pct = Math.min((totalThisMonth / budget) * 100, 100);
  const isCustomBudget = !BUDGET_OPTIONS.find(o => o.value === budget);
  const parsedCustom = parseVND(customBudget);

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerCircle} />
          <View style={styles.headerCircle2} />
          <Text style={styles.headerTitle}>Cá nhân</Text>
          <TouchableOpacity
            style={styles.avatarCard}
            onPress={() => { setNameInput(profile?.display_name ?? ''); setShowNameModal(true); }}
          >
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.displayName}>{displayName}</Text>
              <Text style={styles.email} numberOfLines={1}>{user?.email}</Text>
              <View style={styles.freeBadge}>
                <Text style={styles.freeBadgeText}>✦ Gói miễn phí · Chỉnh tên →</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* STATS */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{formatVND(totalThisMonth)}</Text>
            <Text style={styles.statLabel}>Chi tiêu tháng này</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{expenses.length}</Text>
            <Text style={styles.statLabel}>Giao dịch</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statNum}>🔥 {streakCount}</Text>
            <Text style={styles.statLabel}>Ngày streak</Text>
          </View>
        </View>

        <View style={styles.body}>

          {/* UPGRADE */}
          <TouchableOpacity style={styles.upgradeBanner}>
            <Text style={styles.upgradeIcon}>⭐</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.upgradeTitle}>Nâng lên Pro</Text>
              <Text style={styles.upgradeSub}>Không giới hạn · 99.000₫/tháng</Text>
            </View>
            <Text style={styles.upgradeArrow}>→</Text>
          </TouchableOpacity>

          {/* BUDGET */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ngân sách tháng</Text>
            <View style={styles.budgetCard}>

              {/* Pills */}
              <View style={styles.pillsRow}>
                {BUDGET_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.pill, budget === opt.value && styles.pillActive]}
                    onPress={() => { updateBudget(opt.value); setCustomBudget(''); }}
                  >
                    <Text style={[styles.pillText, budget === opt.value && styles.pillTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Divider */}
              <View style={styles.divider} />

              {/* Custom input */}
              <View style={[styles.customRow, (isCustomBudget || customBudget.length > 0) && styles.customRowActive]}>
                <Text style={styles.customIcon}>✏️</Text>
                <TextInput
                  style={styles.customInput}
                  value={customBudget}
                  onChangeText={setCustomBudget}
                  placeholder="Nhập số khác... (VD: 12tr, 25000000)"
                  placeholderTextColor="#c4b5fd"
                  keyboardType="numeric"
                  returnKeyType="done"
                  onSubmitEditing={handleCustomBudget}
                />
                <Text style={styles.customCur}>₫</Text>
                {customBudget.length > 0 && parsedCustom > 0 && (
                  <TouchableOpacity style={styles.customSaveBtn} onPress={handleCustomBudget}>
                    <Text style={styles.customSaveText}>Lưu</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Preview */}
              {customBudget.length > 0 && parsedCustom > 0 && (
                <Text style={styles.customPreview}>{formatVND(parsedCustom)}/tháng</Text>
              )}

              <Text style={styles.budgetCurrent}>
                {isCustomBudget
                  ? `Tùy chỉnh: ${formatVND(budget)}/tháng · đã dùng ${Math.round(pct)}%`
                  : `Hiện tại: ${formatVND(budget)}/tháng · đã dùng ${Math.round(pct)}%`}
              </Text>
            </View>
          </View>

          {/* SETTINGS */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cài đặt</Text>
            <View style={styles.settingCard}>
              <View style={styles.settingRow}>
                <Text style={styles.settingIcon}>🔔</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>Thông báo chi tiêu</Text>
                  <Text style={styles.settingSub}>Nhắc khi gần vượt ngân sách</Text>
                </View>
                <Switch
                  value={profile?.notif_enabled ?? true}
                  onValueChange={v => updateSettings({ notif_enabled: v })}
                  trackColor={{ false: '#e4dff5', true: '#6b4fa8' }}
                  thumbColor="#fff"
                />
              </View>
              <View style={styles.settingDivider} />
              <View style={styles.settingRow}>
                <Text style={styles.settingIcon}>🔥</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>Streak hàng ngày</Text>
                  <Text style={styles.settingSub}>Nhắc mở app mỗi ngày</Text>
                </View>
                <Switch
                  value={profile?.streak_enabled ?? true}
                  onValueChange={v => updateSettings({ streak_enabled: v })}
                  trackColor={{ false: '#e4dff5', true: '#6b4fa8' }}
                  thumbColor="#fff"
                />
              </View>
            </View>
          </View>

          {/* MENU */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Khác</Text>
            <View style={styles.menuCard}>
              {[
                { icon: '📋', label: 'Lịch sử giao dịch', sub: 'Xem tất cả giao dịch', onPress: () => router.push('/(tabs)/transactions') },
                { icon: '🎯', label: 'Mục tiêu tiết kiệm', sub: 'Quản lý mục tiêu', onPress: () => router.push('/(tabs)/goals') },
                { icon: '📊', label: 'Báo cáo', sub: 'Biểu đồ phân tích', onPress: () => router.push('/(tabs)/stats') },
                { icon: '💬', label: 'Góp ý & Hỗ trợ', sub: 'Giúp chúng tôi cải thiện', onPress: () => {} },
              ].map((item, i, arr) => (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.menuRow, i < arr.length - 1 && styles.menuBorder]}
                  onPress={item.onPress}
                >
                  <View style={styles.menuIconWrap}>
                    <Text style={{ fontSize: 20 }}>{item.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.menuLabel}>{item.label}</Text>
                    <Text style={styles.menuSub}>{item.sub}</Text>
                  </View>
                  <Text style={styles.menuArrow}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Đăng xuất</Text>
          </TouchableOpacity>

          <Text style={styles.version}>FinMate v1.0.0 · Made by LONGEN lab</Text>
          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* EDIT NAME MODAL */}
      <Modal visible={showNameModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowNameModal(false)}>
              <Text style={styles.modalCancel}>Hủy</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Chỉnh tên hiển thị</Text>
            <TouchableOpacity onPress={handleSaveName}>
              <Text style={styles.modalSave}>Lưu</Text>
            </TouchableOpacity>
          </View>
          <View style={{ padding: 20 }}>
            <Text style={styles.inputLabel}>Tên của bạn</Text>
            <TextInput
              style={styles.nameInput}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="VD: Long, Minh, Hương..."
              placeholderTextColor="#c4b5fd"
              autoFocus
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#eeeaf8' },
  header: { backgroundColor: '#3b1f6e', paddingTop: 56, paddingBottom: 28, paddingHorizontal: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: 'hidden' },
  headerCircle: { position: 'absolute', top: -50, right: -50, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.06)' },
  headerCircle2: { position: 'absolute', bottom: -30, left: -30, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.04)' },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 20 },
  avatarCard: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  avatarCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#6b4fa8', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  avatarText: { fontSize: 22, fontWeight: '900', color: '#fff' },
  displayName: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 2 },
  email: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 6 },
  freeBadge: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  freeBadgeText: { fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: '700' },

  statsRow: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 20, marginTop: -18, borderRadius: 20, paddingVertical: 16, shadowColor: '#3b1f6e', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 8, zIndex: 10 },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  statNum: { fontSize: 14, fontWeight: '900', color: '#3b1f6e', marginBottom: 3 },
  statLabel: { fontSize: 9, color: '#9b8cc4', fontWeight: '600', textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: '#e4dff5', marginVertical: 8 },

  body: { paddingHorizontal: 20, paddingTop: 20 },
  upgradeBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#3b1f6e', borderRadius: 20, padding: 16, marginBottom: 20, shadowColor: '#1a0a3c', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 6 },
  upgradeIcon: { fontSize: 28 },
  upgradeTitle: { fontSize: 15, fontWeight: '900', color: '#fff', marginBottom: 2 },
  upgradeSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  upgradeArrow: { fontSize: 22, color: 'rgba(255,255,255,0.6)', fontWeight: '700' },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#3b1f6e', marginBottom: 12 },

  budgetCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, shadowColor: '#3b1f6e', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3 },
  pillsRow: { flexDirection: 'row', gap: 7, marginBottom: 12 },
  pill: { flex: 1, backgroundColor: '#f0edfb', borderRadius: 99, paddingVertical: 9, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  pillActive: { backgroundColor: '#6b4fa8', borderColor: '#6b4fa8' },
  pillText: { fontSize: 13, fontWeight: '700', color: '#6b4fa8' },
  pillTextActive: { color: '#fff' },
  divider: { height: 1, backgroundColor: '#f0edfb', marginBottom: 12 },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f8f6ff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 2, borderColor: '#e4dff5', marginBottom: 8 },
  customRowActive: { borderColor: '#6b4fa8', backgroundColor: '#f0edfb' },
  customIcon: { fontSize: 14 },
  customInput: { flex: 1, fontSize: 15, fontWeight: '700', color: '#3b1f6e', padding: 0 },
  customCur: { fontSize: 13, color: '#9b8cc4', fontWeight: '700' },
  customSaveBtn: { backgroundColor: '#6b4fa8', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  customSaveText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  customPreview: { fontSize: 12, color: '#6b4fa8', fontWeight: '700', marginBottom: 6, paddingLeft: 4 },
  budgetCurrent: { fontSize: 11, color: '#9b8cc4', fontWeight: '600' },

  settingCard: { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', shadowColor: '#3b1f6e', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3 },
  settingRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  settingIcon: { fontSize: 22 },
  settingLabel: { fontSize: 14, fontWeight: '700', color: '#3b1f6e', marginBottom: 2 },
  settingSub: { fontSize: 11, color: '#b0a3d4', fontWeight: '500' },
  settingDivider: { height: 1, backgroundColor: '#f5f3ff', marginHorizontal: 16 },

  menuCard: { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', shadowColor: '#3b1f6e', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: '#f5f3ff' },
  menuIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f0edfb', alignItems: 'center', justifyContent: 'center' },
  menuLabel: { fontSize: 14, fontWeight: '700', color: '#3b1f6e', marginBottom: 2 },
  menuSub: { fontSize: 11, color: '#b0a3d4', fontWeight: '500' },
  menuArrow: { fontSize: 20, color: '#c4b5fd', fontWeight: '700' },

  signOutBtn: { backgroundColor: '#fff', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginBottom: 16, borderWidth: 2, borderColor: '#f0edfb' },
  signOutText: { fontSize: 15, fontWeight: '800', color: '#E24B4A' },
  version: { textAlign: 'center', fontSize: 12, color: '#c4b5fd', fontWeight: '500' },

  modal: { flex: 1, backgroundColor: '#eeeaf8' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0edfb' },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#3b1f6e' },
  modalCancel: { fontSize: 15, color: '#b0a3d4', fontWeight: '600' },
  modalSave: { fontSize: 15, color: '#6b4fa8', fontWeight: '900' },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#6b4fa8', marginBottom: 8 },
  nameInput: { backgroundColor: '#fff', borderRadius: 16, padding: 16, fontSize: 18, color: '#3b1f6e', fontWeight: '700', borderWidth: 2, borderColor: '#e4dff5' },
});