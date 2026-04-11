import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Switch, TextInput, Modal
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useAuth } from '../../hooks/useAuth';
import { Fonts } from '../../constants/fonts';
import { useExpenses } from '../../context/ExpensesContext';
import { useProfile } from '../../context/ProfileContext';
import { formatVND, parseVND } from '../../lib/vnd';
import { supabase } from '../../lib/supabase';
import { useAchievements } from '../../context/AchievementsContext';
import { ACHIEVEMENTS, LEVELS } from '../../lib/achievements';
import { useTheme } from '../../context/ThemeContext';
import { CATEGORY_LABELS } from '../../types';

const BUDGET_OPTIONS = [
  { label: '5tr',  value: 5_000_000 },
  { label: '10tr', value: 10_000_000 },
  { label: '15tr', value: 15_000_000 },
  { label: '20tr', value: 20_000_000 },
  { label: '30tr', value: 30_000_000 },
];

export default function ProfileScreen() {
  const { user, signOut }                                  = useAuth();
  const { totalThisMonth, expenses }                       = useExpenses();
  const { profile, updateBudget, updateDisplayName, updateSettings } = useProfile();
  const router                                             = useRouter();
  const { totalXP, level, levelProgress, earnedIds } = useAchievements();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [showNameModal,     setShowNameModal]     = useState(false);
  const [showBudgetModal,   setShowBudgetModal]   = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showAchieveInfo,   setShowAchieveInfo]   = useState(false);
  const [nameInput,         setNameInput]         = useState('');
  const [customBudget,      setCustomBudget]      = useState('');
  const [newPw,             setNewPw]             = useState('');
  const [confirmPw,         setConfirmPw]         = useState('');
  const [nameSaving,        setNameSaving]        = useState(false);
  const [pwSaving,          setPwSaving]          = useState(false);
  const [exporting,         setExporting]         = useState(false);

  // ── handlers ────────────────────────────────────────────────────────────────
  const handleSignOut = () =>
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: signOut },
    ]);

  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    setNameSaving(true);
    await updateDisplayName(nameInput.trim());
    setNameSaving(false);
    setShowNameModal(false);
    setNameInput('');
  };

  // Bug #2 fix: trả về boolean để caller biết có đóng modal không
  const handleCustomBudget = async (): Promise<boolean> => {
    const val = parseVND(customBudget);
    if (!val || val < 100_000) { Alert.alert('Không hợp lệ', 'Ngân sách tối thiểu 100.000₫'); return false; }
    await updateBudget(val);
    setCustomBudget('');
    return true;
  };

  const handleChangePassword = async () => {
    if (newPw.length < 6) { Alert.alert('Lỗi', 'Mật khẩu tối thiểu 6 ký tự'); return; }
    if (newPw !== confirmPw) { Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp'); return; }
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setPwSaving(false);
    if (error) Alert.alert('Lỗi', error.message);
    else {
      Alert.alert('Thành công', 'Mật khẩu đã được cập nhật');
      setNewPw(''); setConfirmPw(''); setShowPasswordModal(false);
    }
  };

  const handleExport = async () => {
    if (expenses.length === 0) { Alert.alert('Không có dữ liệu', 'Chưa có giao dịch nào để xuất'); return; }
    setExporting(true);
    try {
      const header = 'Ngày,Số tiền,Danh mục,Ghi chú';
      const rows = expenses.map(e => {
        // Bug #3 fix: explicit date format + dùng tên danh mục thay vì ID
        const d = new Date(e.created_at);
        const date = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
        const categoryName = CATEGORY_LABELS[e.category] ?? e.category;
        const note = (e.note ?? '').replace(/,/g, ' ');
        return `${date},${e.amount},${categoryName},${note}`;
      });
      // Thêm UTF-8 BOM (\uFEFF) để Excel/Numbers đọc đúng tiếng Việt
      const csv = '\uFEFF' + [header, ...rows].join('\n');
      const path = `${FileSystem.cacheDirectory}finmate_export.csv`;
      await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: 'Xuất dữ liệu FinMate' });
    } catch {
      Alert.alert('Lỗi', 'Không thể xuất dữ liệu. Thử lại nhé!');
    }
    setExporting(false);
  };

  // ── computed ─────────────────────────────────────────────────────────────────
  const budget      = profile?.monthly_budget ?? 10_000_000;
  const streakCount = profile?.streak_count ?? 0;
  const displayName = profile?.display_name ?? user?.email?.split('@')[0] ?? 'User';
  const initials    = displayName[0].toUpperCase();
  const pct         = Math.min((totalThisMonth / budget) * 100, 100);
  const isCustomBudget = !BUDGET_OPTIONS.find(o => o.value === budget);
  const parsedCustom   = parseVND(customBudget);

  const unlockedCount  = earnedIds.size;
  // Show first 6 achievements as a preview in profile
  const previewAchievements = ACHIEVEMENTS.slice(0, 6);

  return (
    <View style={styles.root}>
      {/* ── HEADER - fixed, outside ScrollView ── */}
      <View style={styles.header}>
        <LinearGradient
          colors={['#FFD000', '#FFE234', '#FFF0A0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          pointerEvents="none"
        />
        <View style={styles.orb1} pointerEvents="none" />
        <View style={styles.orb2} pointerEvents="none" />
        <View style={styles.orb3} pointerEvents="none" />

        {/* Top row: avatar left + info right */}
        <View style={styles.headerTopRow}>
          {/* Avatar */}
          <View style={styles.avatarWrap}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeEmoji}>{level.emoji}</Text>
            </View>
          </View>

          {/* Info */}
          <View style={styles.headerInfo}>
            <Text style={styles.displayName} numberOfLines={1}>{displayName}</Text>
            <Text style={styles.email} numberOfLines={1}>{user?.email}</Text>
            <View style={styles.levelPill}>
              <Text style={styles.levelPillText}>{level.label}</Text>
            </View>
          </View>

          {/* Edit button */}
          <TouchableOpacity
            style={styles.editNameBtn}
            onPress={() => { setNameInput(profile?.display_name ?? ''); setShowNameModal(true); }}
            activeOpacity={0.7}
          >
            <Text style={styles.editNameText}>✎</Text>
          </TouchableOpacity>
        </View>

        {/* XP bar full width */}
        <View style={styles.xpWrap}>
          <View style={styles.xpRow}>
            <Text style={styles.xpLevelLabel}>{totalXP} XP</Text>
            <Text style={styles.xpTotal}>{level.next ? `còn ${level.next - totalXP} XP lên cấp` : 'Cấp tối đa'}</Text>
          </View>
          <View style={styles.xpTrack}>
            <View style={[styles.xpFill, { width: `${levelProgress * 100}%` as any }]} />
          </View>
        </View>
      </View>

      {/* ── STATS ── */}
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

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.body}>

          {/* ── ACHIEVEMENTS ── */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Thành tích</Text>
                <TouchableOpacity style={styles.infoBtn} onPress={() => setShowAchieveInfo(true)} activeOpacity={0.7}>
                  <Text style={styles.infoBtnText}>Cách hoạt động ›</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.sectionBadge}>{unlockedCount}/{ACHIEVEMENTS.length}</Text>
            </View>
            <TouchableOpacity style={styles.achieveCard} onPress={() => router.push('/achievements')} activeOpacity={0.85}>
              <View style={styles.achieveGrid}>
                {previewAchievements.map(a => {
                  const unlocked = earnedIds.has(a.id);
                  return (
                    <View key={a.id} style={styles.achieveBadgeWrap}>
                      <View style={[styles.achieveBadge, unlocked ? styles.achieveBadgeUnlocked : styles.achieveBadgeLocked]}>
                        <Text style={[styles.achieveEmoji, !unlocked && { opacity: 0.3 }]}>{a.emoji}</Text>
                        {!unlocked && (
                          <View style={styles.achieveLockOverlay}>
                            <Text style={{ fontSize: 10 }}>🔒</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.achieveLabel, !unlocked && styles.achieveLabelLocked]} numberOfLines={2}>
                        {a.title}
                      </Text>
                    </View>
                  );
                })}
              </View>
              <View style={styles.achieveCardFooter}>
                <Text style={styles.achieveCardFooterText}>Xem tất cả {ACHIEVEMENTS.length} thành tích</Text>
                <Text style={styles.achieveCardFooterArrow}>›</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* ── BUDGET ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ngân sách tháng</Text>
            <TouchableOpacity style={styles.budgetCard} onPress={() => setShowBudgetModal(true)} activeOpacity={0.85}>
              <View style={styles.budgetSummary}>
                <View>
                  <Text style={styles.budgetSummaryLabel}>Tháng này</Text>
                  <Text style={styles.budgetSummaryAmt}>{formatVND(budget)}</Text>
                </View>
                <View style={styles.budgetSummaryRight}>
                  <Text style={styles.budgetSummaryPct}>{Math.round(pct)}%</Text>
                  <Text style={styles.budgetSummaryUsed}>đã dùng</Text>
                </View>
              </View>
              <View style={styles.budgetTrack}>
                <View style={[styles.budgetFill, { width: `${Math.min(pct, 100)}%` as any, backgroundColor: pct > 90 ? colors.danger : colors.accent }]} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <Text style={styles.budgetRemain}>Còn lại {formatVND(Math.max(budget - totalThisMonth, 0))}</Text>
                <Text style={styles.budgetEditHint}>Thay đổi ›</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* ── SETTINGS ── */}
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
                  trackColor={{ false: colors.cardBorder, true: colors.accent }}
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
                  trackColor={{ false: colors.cardBorder, true: colors.accent }}
                  thumbColor="#fff"
                />
              </View>
              <View style={styles.settingDivider} />
              <TouchableOpacity style={styles.settingRow} onPress={() => setShowPasswordModal(true)}>
                <Text style={styles.settingIcon}>🔑</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>Đổi mật khẩu</Text>
                  <Text style={styles.settingSub}>Cập nhật mật khẩu đăng nhập</Text>
                </View>
                <Text style={styles.settingArrow}>›</Text>
              </TouchableOpacity>
              <View style={styles.settingDivider} />
              <TouchableOpacity style={styles.settingRow} onPress={handleExport} disabled={exporting}>
                <Text style={styles.settingIcon}>📤</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>Xuất dữ liệu</Text>
                  <Text style={styles.settingSub}>Tải về file CSV giao dịch</Text>
                </View>
                <Text style={styles.settingArrow}>{exporting ? '...' : '›'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── MENU ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Khác</Text>
            <View style={styles.menuCard}>
              {[
                { icon: '📋', label: 'Lịch sử giao dịch',  sub: 'Xem tất cả giao dịch',   onPress: () => router.push('/(tabs)/transactions') },
                { icon: '🎯', label: 'Mục tiêu tiết kiệm',  sub: 'Quản lý mục tiêu',         onPress: () => router.push('/(tabs)/goals') },
                { icon: '📊', label: 'Báo cáo',              sub: 'Biểu đồ phân tích',        onPress: () => router.push('/(tabs)/stats') },
                { icon: '💬', label: 'Góp ý & Hỗ trợ',      sub: 'Giúp chúng tôi cải thiện', onPress: () => {} },
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

      {/* ══ ACHIEVEMENT INFO ══ */}
      <Modal visible={showAchieveInfo} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.infoSheet}>

            {/* Hero */}
            <View style={styles.infoHero}>
              <View style={styles.infoHeroBubble} />
              <TouchableOpacity onPress={() => setShowAchieveInfo(false)} style={styles.infoClose}>
                <Text style={styles.infoCloseText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.infoHeroEmoji}>🏆</Text>
              <Text style={styles.infoHeroTitle}>Hệ thống Thành tích</Text>
              <Text style={styles.infoHeroSub}>
                Biến thói quen tài chính thành chiến tích — đây là hành trình đáng tự hào của bạn.
              </Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, padding: 20, paddingBottom: 8 }}>

              {/* How it works */}
              <Text style={styles.infoSectionLabel}>Cơ chế hoạt động</Text>
              <View style={styles.infoFlowRow}>
                <View style={styles.infoFlowStep}>
                  <View style={styles.infoFlowIcon}><Text style={{ fontSize: 16 }}>⚡</Text></View>
                  <Text style={styles.infoFlowLabel}>{'Hành động\ntrong app'}</Text>
                </View>
                <Text style={styles.infoFlowArrow}>›</Text>
                <View style={styles.infoFlowStep}>
                  <View style={styles.infoFlowIcon}><Text style={{ fontSize: 16 }}>🧩</Text></View>
                  <Text style={styles.infoFlowLabel}>{'Tích lũy\nXP'}</Text>
                </View>
                <Text style={styles.infoFlowArrow}>›</Text>
                <View style={styles.infoFlowStep}>
                  <View style={styles.infoFlowIcon}><Text style={{ fontSize: 16 }}>🏅</Text></View>
                  <Text style={styles.infoFlowLabel}>{'Mở khóa\nhuy hiệu'}</Text>
                </View>
                <Text style={styles.infoFlowArrow}>›</Text>
                <View style={styles.infoFlowStep}>
                  <View style={styles.infoFlowIcon}><Text style={{ fontSize: 16 }}>🌟</Text></View>
                  <Text style={styles.infoFlowLabel}>{'Lên cấp\ncao hơn'}</Text>
                </View>
              </View>

              {/* Earn XP */}
              <Text style={styles.infoSectionLabel}>Nguồn kiếm XP</Text>
              {[
                { icon: '🔥', title: 'Streak hàng ngày', desc: 'Mở app liên tục không bỏ ngày. Mốc 3 → 7 → 30 → 100 ngày, huy hiệu càng hiếm.' },
                { icon: '💰', title: 'Ghi chép giao dịch', desc: 'Mỗi lần ghi là một lần làm chủ dòng tiền. Đạt mốc 10 → 50 → 100 → 500 giao dịch.' },
                { icon: '🎯', title: 'Hoàn thành mục tiêu', desc: 'Đặt mục tiêu, tích luỹ đủ, chốt thành công. Càng nhiều mục tiêu hoàn thành, XP càng lớn.' },
              ].map(c => (
                <View key={c.title} style={styles.infoCatCard}>
                  <Text style={styles.infoCatIcon}>{c.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoCatTitle}>{c.title}</Text>
                    <Text style={styles.infoCatDesc}>{c.desc}</Text>
                  </View>
                </View>
              ))}

              {/* Tiers */}
              <Text style={styles.infoSectionLabel}>Độ hiếm huy hiệu</Text>
              <View style={styles.infoTierGrid}>
                {[
                  { medal: '🥉', name: 'Đồng',      xp: '10–20 XP',   bg: 'rgba(251,191,36,0.1)',   color: '#fbbf24', hint: 'Dễ đạt' },
                  { medal: '🥈', name: 'Bạc',       xp: '30–55 XP',   bg: 'rgba(160,174,192,0.15)', color: '#64748b', hint: 'Nỗ lực' },
                  { medal: '🥇', name: 'Vàng',      xp: '60–110 XP',  bg: 'rgba(251,191,36,0.15)',  color: '#fbbf24', hint: 'Thử thách' },
                  { medal: '💎', name: 'Kim cương', xp: '150–300 XP', bg: 'rgba(129,140,248,0.15)', color: '#818cf8', hint: 'Huyền thoại' },
                ].map(t => (
                  <View key={t.name} style={[styles.infoTierCard, { backgroundColor: t.bg }]}>
                    <Text style={styles.infoTierMedal}>{t.medal}</Text>
                    <Text style={[styles.infoTierName, { color: t.color }]}>{t.name}</Text>
                    <Text style={[styles.infoTierXp, { color: t.color }]}>{t.xp}</Text>
                    <Text style={[styles.infoTierHint, { color: t.color }]}>{t.hint}</Text>
                  </View>
                ))}
              </View>

              {/* Levels */}
              <Text style={styles.infoSectionLabel}>Hành trình lên cấp</Text>
              <View style={styles.infoLevelList}>
                {LEVELS.map((lv, i) => (
                  <View key={lv.label} style={[styles.infoLevelRow, i < LEVELS.length - 1 && styles.infoLevelRowBorder]}>
                    <Text style={styles.infoLevelEmoji}>{lv.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.infoLevelName, { color: lv.color }]}>{lv.label}</Text>
                      <Text style={styles.infoLevelXp}>
                        {i === 0 ? `0 – ${lv.next! - 1} XP` : lv.next ? `${lv.min} – ${lv.next - 1} XP` : `${lv.min}+ XP · Đỉnh cao`}
                      </Text>
                    </View>
                    {i === LEVELS.length - 1 && <Text style={{ fontSize: 14 }}>👑</Text>}
                  </View>
                ))}
              </View>

              <TouchableOpacity style={styles.infoAction} onPress={() => { setShowAchieveInfo(false); router.push('/achievements'); }}>
                <Text style={styles.infoActionText}>Xem thành tích của tôi →</Text>
              </TouchableOpacity>
              <View style={{ height: 8 }} />
            </ScrollView>
        </View>
      </Modal>

      {/* ══ CHANGE PASSWORD ══ */}
      <Modal visible={showPasswordModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <TouchableOpacity onPress={() => { setShowPasswordModal(false); setNewPw(''); setConfirmPw(''); }}>
              <Text style={styles.modalCancel}>Hủy</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Đổi mật khẩu</Text>
            <TouchableOpacity onPress={handleChangePassword} disabled={pwSaving}>
              <Text style={[styles.modalSave, pwSaving && { opacity: 0.4 }]}>
                {pwSaving ? 'Đang lưu...' : 'Lưu'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={{ padding: 20, gap: 14 }}>
            <View>
              <Text style={styles.inputLabel}>Mật khẩu mới</Text>
              <TextInput
                style={styles.nameInput}
                value={newPw}
                onChangeText={setNewPw}
                placeholder="Tối thiểu 6 ký tự"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                autoFocus
              />
            </View>
            <View>
              <Text style={styles.inputLabel}>Xác nhận mật khẩu</Text>
              <TextInput
                style={styles.nameInput}
                value={confirmPw}
                onChangeText={setConfirmPw}
                placeholder="Nhập lại mật khẩu mới"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ══ BUDGET MODAL ══ */}
      <Modal visible={showBudgetModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <TouchableOpacity onPress={() => { setShowBudgetModal(false); setCustomBudget(''); }}>
              <Text style={styles.modalCancel}>Đóng</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Ngân sách tháng</Text>
            <View style={{ width: 50 }} />
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Text style={styles.inputLabel}>Chọn nhanh</Text>
            <View style={styles.pillsRow}>
              {BUDGET_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.pill, budget === opt.value && styles.pillActive]}
                  onPress={() => { updateBudget(opt.value); setCustomBudget(''); setShowBudgetModal(false); }}
                >
                  <Text style={[styles.pillText, budget === opt.value && styles.pillTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.inputLabel, { marginTop: 24 }]}>Hoặc nhập số khác</Text>
            <View style={[styles.customRow, (isCustomBudget || customBudget.length > 0) && styles.customRowActive]}>
              <TextInput
                style={styles.customInput}
                value={customBudget}
                onChangeText={setCustomBudget}
                placeholder="VD: 12tr, 25000000"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                returnKeyType="done"
                onSubmitEditing={async () => { if (await handleCustomBudget()) setShowBudgetModal(false); }}
              />
              {customBudget.length > 0 && parsedCustom > 0 ? (
                <>
                  <Text style={styles.customPreviewInline}>{formatVND(parsedCustom)}</Text>
                  <TouchableOpacity style={styles.customSaveBtn} onPress={async () => { if (await handleCustomBudget()) setShowBudgetModal(false); }}>
                    <Text style={styles.customSaveText}>Lưu</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={styles.customCur}>₫</Text>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ══ EDIT NAME ══ */}
      <Modal visible={showNameModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <TouchableOpacity onPress={() => setShowNameModal(false)}>
              <Text style={styles.modalCancel}>Hủy</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Chỉnh tên hiển thị</Text>
            <TouchableOpacity onPress={handleSaveName} disabled={nameSaving}>
              <Text style={[styles.modalSave, nameSaving && { opacity: 0.45 }]}>
                {nameSaving ? 'Đang lưu...' : 'Lưu'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={{ padding: 20 }}>
            <Text style={styles.inputLabel}>Tên của bạn</Text>
            <TextInput
              style={styles.nameInput}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="VD: Long, Minh, Hương..."
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  orb1: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.18)', top: -60, right: -40 },
  orb2: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.12)', top: 30, right: 80 },
  orb3: { position: 'absolute', width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(180,120,0,0.12)', bottom: 20, left: -20 },

  header: {
    backgroundColor: colors.surface, paddingTop: 56, paddingBottom: 28, paddingHorizontal: 20,
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: 'hidden',
    gap: 16, borderBottomWidth: 1, borderBottomColor: colors.cardBorder,
  },

  headerTopRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerInfo:   { flex: 1, gap: 3 },

  editNameBtn:  { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accentBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.accentBorder, alignSelf: 'flex-start' },
  editNameText: { fontSize: 14, color: colors.textSecondary },

  avatarWrap:   { position: 'relative' },
  avatarCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.75)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(92,61,0,0.2)' },
  avatarText:   { fontSize: 24, fontFamily: Fonts.extraBold, color: colors.textPrimary },
  levelBadge:   { position: 'absolute', bottom: -3, right: -3, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.accentBorder },
  levelBadgeEmoji: { fontSize: 12 },

  displayName: { fontSize: 17, fontFamily: Fonts.extraBold, color: colors.textPrimary },
  email:       { fontSize: 11, color: colors.textMuted, fontFamily: Fonts.medium },
  levelPill:   { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(92,61,0,0.2)', marginTop: 2 },
  levelPillText: { fontSize: 11, fontFamily: Fonts.bold, color: colors.textPrimary },

  xpWrap:      { gap: 5 },
  xpRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  xpLevelLabel:{ fontSize: 11, fontFamily: Fonts.extraBold, color: colors.textSecondary },
  xpTotal:     { fontSize: 10, color: colors.textMuted, fontFamily: Fonts.semiBold },
  xpBarWrap:   {},
  xpNextText:  {},
  xpTrack:     { height: 4, backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 99, overflow: 'hidden' },
  xpFill:      { height: 4, backgroundColor: colors.textPrimary, borderRadius: 99 },

  statsRow: {
    flexDirection: 'row', marginHorizontal: 20, marginTop: -18, borderRadius: 20,
    paddingVertical: 16, zIndex: 10,
    backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.cardBorder,
    shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
  },
  statCard:    { flex: 1, alignItems: 'center', paddingVertical: 4 },
  statNum:     { fontSize: 14, fontFamily: Fonts.extraBold, color: colors.textPrimary, marginBottom: 3 },
  statLabel:   { fontSize: 9, color: colors.textMuted, fontFamily: Fonts.semiBold, textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: colors.accentBg, marginVertical: 8 },

  body: { paddingHorizontal: 20, paddingTop: 20 },

  section:        { marginBottom: 20 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle:   { fontSize: 15, fontFamily: Fonts.extraBold, color: colors.textPrimary, marginBottom: 12 },
  sectionTitleRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sectionBadge:   { fontSize: 12, fontFamily: Fonts.bold, color: colors.textPrimary, backgroundColor: 'rgba(92,61,0,0.08)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99, borderWidth: 1, borderColor: 'rgba(92,61,0,0.15)' },
  sectionArrow:   { fontSize: 18, color: colors.textMuted, fontFamily: Fonts.bold },
  achieveCard:         { backgroundColor: colors.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.cardBorder },
  achieveCardFooter:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.cardBorder, gap: 4 },
  achieveCardFooterText: { fontSize: 12, fontFamily: Fonts.bold, color: colors.textPrimary },
  achieveCardFooterArrow: { fontSize: 16, color: colors.textPrimary, fontFamily: Fonts.bold },

  infoBtn:        { backgroundColor: 'rgba(92,61,0,0.08)', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(92,61,0,0.15)' },
  infoBtnText:    { fontSize: 11, fontFamily: Fonts.bold, color: colors.textPrimary },

  infoSheet:       { flex: 1, backgroundColor: colors.bg },

  infoHero:        { backgroundColor: colors.surface, paddingTop: 28, paddingBottom: 24, paddingHorizontal: 24, alignItems: 'center', gap: 6, overflow: 'hidden' },
  infoHeroBubble:  { position: 'absolute', top: -40, right: -40, width: 130, height: 130, borderRadius: 65, backgroundColor: colors.orb1 },
  infoHeroEmoji:   { fontSize: 42, marginBottom: 4 },
  infoHeroTitle:   { fontSize: 20, fontFamily: Fonts.extraBold, color: colors.textPrimary, textAlign: 'center' },
  infoHeroSub:     { fontSize: 12, fontFamily: Fonts.medium, color: colors.textSecondary, textAlign: 'center', lineHeight: 18 },
  infoClose:       { position: 'absolute', top: 16, right: 16, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  infoCloseText:   { fontSize: 12, color: colors.textPrimary, fontFamily: Fonts.bold },

  infoSectionLabel: { fontSize: 11, fontFamily: Fonts.extraBold, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },

  infoCatCard:    { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 14, padding: 12, backgroundColor: colors.card, borderLeftWidth: 3, borderLeftColor: colors.accent },
  infoCatIcon:    { fontSize: 22, marginTop: 1 },
  infoCatTitle:   { fontSize: 13, fontFamily: Fonts.extraBold, color: colors.textPrimary, marginBottom: 3 },
  infoCatDesc:    { fontSize: 11, fontFamily: Fonts.medium, color: colors.textSecondary, lineHeight: 16 },

  infoLevelList:      { backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 4 },
  infoLevelRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  infoLevelRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  infoLevelEmoji:     { fontSize: 20, width: 28, textAlign: 'center' },
  infoLevelName:      { fontSize: 13, fontFamily: Fonts.extraBold, marginBottom: 1 },
  infoLevelXp:        { fontSize: 11, fontFamily: Fonts.medium, color: colors.textSecondary },

  infoFlowRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, borderRadius: 16, padding: 14 },
  infoFlowStep:   { alignItems: 'center', gap: 6, flex: 1 },
  infoFlowIcon:   { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentBg, alignItems: 'center', justifyContent: 'center' },
  infoFlowLabel:  { fontSize: 9, fontFamily: Fonts.bold, color: colors.textSecondary, textAlign: 'center', lineHeight: 13 },
  infoFlowArrow:  { fontSize: 16, color: colors.textPrimary, fontFamily: Fonts.bold, marginBottom: 14, paddingHorizontal: 2 },

  infoTierGrid:   { flexDirection: 'row', gap: 8 },
  infoTierCard:   { flex: 1, alignItems: 'center', borderRadius: 14, paddingVertical: 12, gap: 3 },
  infoTierMedal:  { fontSize: 22 },
  infoTierName:   { fontSize: 11, fontFamily: Fonts.extraBold },
  infoTierXp:     { fontSize: 10, fontFamily: Fonts.semiBold, opacity: 0.75 },
  infoTierHint:   { fontSize: 9, fontFamily: Fonts.medium, opacity: 0.6 },

  infoAction:     { backgroundColor: colors.accent, borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  infoActionText: { fontSize: 14, fontFamily: Fonts.extraBold, color: '#fff' },

  achieveGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  achieveBadgeWrap: { width: '30%', alignItems: 'center', gap: 8 },
  achieveBadge: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  achieveBadgeUnlocked: { backgroundColor: colors.accentBg, borderWidth: 1.5, borderColor: colors.accentBorder, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  achieveBadgeLocked:   { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.cardBorder },
  achieveLockOverlay:   { position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.cardBorder },
  achieveEmoji:       { fontSize: 28 },
  achieveLabel:       { fontSize: 10, fontFamily: Fonts.bold, color: colors.textSecondary, textAlign: 'center' },
  achieveLabelLocked: { color: colors.textMuted },

  budgetCard: { backgroundColor: colors.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.cardBorder },
  budgetSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 },
  budgetSummaryLabel: { fontSize: 11, color: colors.textMuted, fontFamily: Fonts.semiBold, marginBottom: 2 },
  budgetSummaryAmt:   { fontSize: 20, fontFamily: Fonts.extraBold, color: colors.textPrimary },
  budgetSummaryRight: { alignItems: 'flex-end' },
  budgetSummaryPct:   { fontSize: 20, fontFamily: Fonts.extraBold, color: colors.textPrimary },
  budgetSummaryUsed:  { fontSize: 11, color: colors.textMuted, fontFamily: Fonts.semiBold },
  budgetTrack:   { height: 6, backgroundColor: colors.divider, borderRadius: 99, marginBottom: 6, overflow: 'hidden' },
  budgetFill:    { height: 6, borderRadius: 99 },
  budgetRemain:  { fontSize: 11, color: colors.textMuted, fontFamily: Fonts.semiBold },
  budgetEditHint:{ fontSize: 12, color: colors.textPrimary, fontFamily: Fonts.bold },

  settingCard:    { backgroundColor: colors.card, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder },
  settingRow:     { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  settingIcon:    { fontSize: 22 },
  settingLabel:   { fontSize: 14, fontFamily: Fonts.bold, color: colors.textPrimary, marginBottom: 2 },
  settingSub:     { fontSize: 11, color: colors.textMuted, fontFamily: Fonts.medium },
  settingArrow:   { fontSize: 20, color: colors.textMuted, fontFamily: Fonts.bold },
  settingDivider: { height: 1, backgroundColor: colors.divider, marginHorizontal: 16 },

  menuCard: { backgroundColor: colors.card, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder },
  menuRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  menuIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.accentBg, alignItems: 'center', justifyContent: 'center' },
  menuLabel:  { fontSize: 14, fontFamily: Fonts.bold, color: colors.textPrimary, marginBottom: 2 },
  menuSub:    { fontSize: 11, color: colors.textMuted, fontFamily: Fonts.medium },
  menuArrow:  { fontSize: 20, color: colors.textMuted, fontFamily: Fonts.bold },

  signOutBtn:  { backgroundColor: colors.dangerBg, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: colors.dangerBorder },
  signOutText: { fontSize: 15, fontFamily: Fonts.extraBold, color: colors.danger },
  version:     { textAlign: 'center', fontSize: 12, color: colors.textMuted, fontFamily: Fonts.medium },

  sheet:       { flex: 1, backgroundColor: colors.bg },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.accentBorder, alignSelf: 'center', marginTop: 12 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
  modalTitle:  { fontSize: 17, fontFamily: Fonts.extraBold, color: colors.textPrimary },
  modalCancel: { fontSize: 15, color: colors.textSecondary, fontFamily: Fonts.semiBold },
  modalSave:   { fontSize: 15, color: colors.textPrimary, fontFamily: Fonts.extraBold },

  inputLabel: { fontSize: 12, fontFamily: Fonts.bold, color: colors.textPrimary, marginBottom: 8 },
  nameInput:  { backgroundColor: colors.inputBg, borderRadius: 16, padding: 16, fontSize: 18, color: colors.textPrimary, fontFamily: Fonts.bold, borderWidth: 1, borderColor: colors.inputBorder },

  pillsRow: { flexDirection: 'row', gap: 7, marginBottom: 14 },
  pill:     { flex: 1, backgroundColor: colors.card, borderRadius: 99, paddingVertical: 9, alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder },
  pillActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  pillText:   { fontSize: 13, fontFamily: Fonts.bold, color: colors.textPrimary },
  pillTextActive: { color: colors.textPrimary },
  customRow:        { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: colors.cardBorder },
  customRowActive:  { borderColor: colors.accent, backgroundColor: colors.accentBg },
  customInput:      { flex: 1, fontSize: 14, fontFamily: Fonts.bold, color: colors.textPrimary, padding: 0 },
  customCur:        { fontSize: 13, color: colors.textSecondary, fontFamily: Fonts.bold },
  customPreviewInline: { fontSize: 12, color: colors.textPrimary, fontFamily: Fonts.bold },
  customSaveBtn:    { backgroundColor: colors.textPrimary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  customSaveText:   { fontSize: 12, fontFamily: Fonts.extraBold, color: '#FFE234' },
  });
}
