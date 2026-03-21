import { Tabs, Redirect } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';

export default function TabsLayout() {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (!session) return <Redirect href="/(auth)/login" />;

  return (
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
        name="chat"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabItem icon={focused ? 'chatbubble' : 'chatbubble-outline'} label="Chat AI" focused={focused} />
          ),
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
      <Tabs.Screen name="stats" options={{ href: null }} />
    </Tabs>
  );
}

function TabItem({ icon, label, focused }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; focused: boolean }) {
  return (
    <View style={styles.tabItem}>
      <View style={[styles.topBar, focused && styles.topBarActive]} />
      <Ionicons name={icon} size={26} color={focused ? '#6b4fa8' : '#c4b5fd'} />
      <Text
        style={[styles.label, focused && styles.labelActive]}
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

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    elevation: 0,
    height: TAB_H,
    paddingBottom: 0,
    paddingTop: 0,
    paddingHorizontal: 0,
  },
  tabBarBg: {
    position: 'absolute',
    left: 12, right: 12,
    top: 4, height: BG_H,
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#3b1f6e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
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
    backgroundColor: '#6b4fa8',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#c4b5fd',
    textAlign: 'center',
    width: '100%',
  },
  labelActive: {
    color: '#6b4fa8',
    fontWeight: '800',
  },
});
