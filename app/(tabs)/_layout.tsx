import { Tabs, Redirect } from 'expo-router';
import { View, Text, StyleSheet, Platform, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { Fonts } from '../../constants/fonts';
import { useRef, useEffect } from 'react';
import { useAchievements } from '../../context/AchievementsContext';
import { AchievementUnlockModal } from '../../components/AchievementUnlockModal';
import { useTheme } from '../../context/ThemeContext';

function ChatTabButton({ onPress, onLongPress, accessibilityState }: any) {
  const { colors } = useTheme();
  const focused = accessibilityState?.selected;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (focused) {
      const pulse = Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ]));
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [focused]);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.86, duration: 90, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 220, friction: 6 }),
    ]).start();
    onPress?.();
  };

  const chatTabWrap = { flex: 1, alignItems: 'center' as const, justifyContent: 'flex-end' as const, paddingBottom: Platform.OS === 'ios' ? 10 : 6, marginTop: -22 };
  const chatGlowStyle = { position: 'absolute' as const, bottom: Platform.OS === 'ios' ? 26 : 22, width: 80, height: 80, borderRadius: 40, backgroundColor: colors.orb1 };
  const chatTabBtnStyle = { width: 60, height: 60, borderRadius: 30, backgroundColor: focused ? '#6366f1' : colors.accent, alignItems: 'center' as const, justifyContent: 'center' as const, borderWidth: 3, borderColor: colors.surface, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: focused ? 0.7 : 0.5, shadowRadius: 14, elevation: 14, marginBottom: 4 };
  const chatTabLabelStyle = { fontSize: 10, fontFamily: focused ? Fonts.extraBold : Fonts.semiBold, color: focused ? colors.accent : colors.textMuted, marginTop: 1 };

  return (
    <TouchableOpacity onPress={handlePress} onLongPress={onLongPress} style={chatTabWrap} activeOpacity={1}>
      {focused && (
        <Animated.View style={[chatGlowStyle, { transform: [{ scale: pulseAnim }] }]} />
      )}
      <Animated.View style={[chatTabBtnStyle, { transform: [{ scale: scaleAnim }] }]}>
        <Ionicons name="sparkles" size={24} color="#fff" />
      </Animated.View>
      <Text style={chatTabLabelStyle}>Chat AI</Text>
    </TouchableOpacity>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();
  const { session, loading } = useAuth();
  const { newlyUnlocked, clearNewlyUnlocked } = useAchievements();

  if (loading) return null;
  if (!session) return <Redirect href="/(auth)/login" />;

  const styles = StyleSheet.create({
    tabBar: {
      backgroundColor: 'transparent',
      borderTopWidth: 0,
      elevation: 0,
      height: TAB_H,
      paddingBottom: 0,
      paddingTop: 0,
      paddingHorizontal: 0,
      overflow: 'visible',
    },
    tabBarBg: {
      position: 'absolute',
      left: 12, right: 12,
      top: 4, height: BG_H,
      backgroundColor: colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: colors.shadowOpacity,
      shadowRadius: 16,
      elevation: 10,
    },
    tabBarItem: {
      height: BG_H,
      marginTop: 4,
      paddingTop: 0,
      paddingBottom: 0,
    },
    tabBarIcon: {
      height: BG_H,
      marginTop: 0,
      marginBottom: 0,
    },
    tabItem: {
      flex: 1,
      width: '100%',
      height: BG_H,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
      paddingHorizontal: 2,
      paddingTop: 4,
    },
    topBar: {
      position: 'absolute',
      top: 10,
      left: '15%', right: '15%',
      height: 3,
      borderRadius: 99,
      backgroundColor: 'transparent',
    },
    topBarActive: {
      backgroundColor: colors.accent,
    },
    chatTabWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingBottom: Platform.OS === 'ios' ? 10 : 6,
      marginTop: -22,
    },
    chatTabBtn: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: colors.surface,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.5,
      shadowRadius: 14,
      elevation: 14,
      marginBottom: 4,
    },
    chatTabBtnActive: {
      backgroundColor: '#6366f1',
      shadowOpacity: 0.7,
    },
    chatGlow: {
      position: 'absolute',
      bottom: Platform.OS === 'ios' ? 26 : 22,
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.orb1,
    },
    chatTabLabel: {
      fontSize: 10,
      fontFamily: Fonts.semiBold,
      color: colors.textMuted,
      marginTop: 1,
    },
    chatTabLabelActive: {
      color: colors.accent,
      fontFamily: Fonts.extraBold,
    },
    label: {
      fontSize: 12,
      fontFamily: Fonts.semiBold,
      color: colors.textMuted,
      textAlign: 'center',
      width: '100%',
    },
    labelActive: {
      color: colors.accent,
      fontFamily: Fonts.extraBold,
    },
  });

  return (
    <>
    <AchievementUnlockModal achievement={newlyUnlocked} onClose={clearNewlyUnlocked} />
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabBarItem,
        tabBarIconStyle: styles.tabBarIcon,
        tabBarBackground: () => <View style={styles.tabBarBg} />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabItem icon={focused ? 'home' : 'home-outline'} label="Tổng quan" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabItem icon={focused ? 'bar-chart' : 'bar-chart-outline'} label="Báo cáo" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          tabBarButton: (props) => <ChatTabButton {...props} />,
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabItem icon={focused ? 'trophy' : 'trophy-outline'} label="Mục tiêu" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabItem icon={focused ? 'person' : 'person-outline'} label="Cá nhân" focused={focused} />
          ),
        }}
      />

      {/* Ẩn khỏi tab bar */}
      <Tabs.Screen name="transactions" options={{ href: null }} />
    </Tabs>
    </>
  );
}

function TabItem({ icon, label, focused }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; focused: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, width: '100%', height: BG_H, alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 2, paddingTop: 4 }}>
      <View style={{ position: 'absolute', top: 10, left: '15%', right: '15%', height: 3, borderRadius: 99, backgroundColor: focused ? colors.accent : 'transparent' }} />
      <Ionicons name={icon} size={26} color={focused ? colors.accent : colors.textMuted} />
      <Text
        style={{ fontSize: 12, fontFamily: focused ? Fonts.extraBold : Fonts.semiBold, color: focused ? colors.accent : colors.textMuted, textAlign: 'center', width: '100%' } as any}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {label}
      </Text>
    </View>
  );
}

const TAB_H = Platform.OS === 'ios' ? 90 : 74;
const BG_H = TAB_H - (Platform.OS === 'ios' ? 16 : 6);
