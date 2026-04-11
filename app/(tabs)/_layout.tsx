import { Tabs, Redirect, useRouter } from 'expo-router';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { Fonts } from '../../constants/fonts';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const TAB_ITEMS: { name: string; icon: string; iconOutline: string; label: string }[] = [
  { name: 'index', icon: 'home', iconOutline: 'home-outline', label: 'Home' },
  { name: 'stats', icon: 'stats-chart', iconOutline: 'stats-chart-outline', label: 'Stats' },
  { name: 'goals', icon: 'flag', iconOutline: 'flag-outline', label: 'Goal' },
];

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const router = useRouter();

  return (
    <View style={styles.tabBarWrap}>
      {/* Pill background */}
      <BlurView intensity={72} tint="light" style={styles.pill}>
        {TAB_ITEMS.map((tab, i) => {
          const focused = state.index === i;
          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.tabItem}
              onPress={() => navigation.navigate(tab.name)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={(focused ? tab.icon : tab.iconOutline) as any}
                size={24}
                color={focused ? '#5C3D00' : 'rgba(26,26,46,0.35)'}
              />
              <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </BlurView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fabShadow}
        onPress={() => router.push('/add-expense')}
        activeOpacity={0.85}
      >
        <BlurView intensity={80} tint="dark" style={styles.fab}>
          <View style={styles.fabOverlay} />
          <Text style={styles.fabText}>+</Text>
        </BlurView>
      </TouchableOpacity>
    </View>
  );
}

export default function TabsLayout() {
  const { session, loading } = useAuth();

  if (loading) return null;
  if (!session) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="stats" />
      <Tabs.Screen name="goals" />
      <Tabs.Screen name="transactions" options={{ href: null }} />
      <Tabs.Screen name="chat" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}

const BOTTOM_INSET = Platform.OS === 'ios' ? 34 : 12;

const styles = StyleSheet.create({
  tabBarWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingBottom: BOTTOM_INSET,
    paddingHorizontal: 16,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 28,
    paddingVertical: 10,
    marginRight: 12,
    overflow: 'hidden',
    backgroundColor: Platform.OS === 'android' ? 'rgba(255,255,255,0.92)' : 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(92,61,0,0.08)',
    shadowColor: '#5C3D00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabLabel: {
    fontSize: 11,
    fontFamily: Fonts.semiBold,
    color: 'rgba(26,26,46,0.35)',
  },
  tabLabelActive: {
    color: '#5C3D00',
    fontFamily: Fonts.extraBold,
  },
  fabShadow: {
    width: 58,
    height: 58,
    borderRadius: 29,
    shadowColor: '#9A6E00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(92,61,0,0.55)',
  },
  fabText: {
    fontSize: 30,
    color: '#fff',
    fontFamily: Fonts.regular,
    lineHeight: 34,
    marginTop: -2,
    zIndex: 1,
  },
});
