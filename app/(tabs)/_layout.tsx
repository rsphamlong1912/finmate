import { Tabs, Redirect } from 'expo-router';
import { View, Text, StyleSheet, Platform, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { Fonts } from '../../constants/fonts';
import { useRef, useEffect } from 'react';

function ChatTabButton({ onPress, onLongPress, accessibilityState }: any) {
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

  return (
    <TouchableOpacity onPress={handlePress} onLongPress={onLongPress} style={styles.chatTabWrap} activeOpacity={1}>
      {focused && (
        <Animated.View style={[styles.chatGlow, { transform: [{ scale: pulseAnim }] }]} />
      )}
      <Animated.View style={[styles.chatTabBtn, focused && styles.chatTabBtnActive, { transform: [{ scale: scaleAnim }] }]}>
        <Ionicons name="sparkles" size={24} color="#fff" />
      </Animated.View>
      <Text style={[styles.chatTabLabel, focused && styles.chatTabLabelActive]}>Chat AI</Text>
    </TouchableOpacity>
  );
}

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
    overflow: 'visible',
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
    backgroundColor: '#6b4fa8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#6b4fa8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 14,
    marginBottom: 4,
  },
  chatTabBtnActive: {
    backgroundColor: '#5a3d96',
    shadowOpacity: 0.7,
  },
  chatGlow: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 26 : 22,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(107,79,168,0.22)',
  },
  chatTabLabel: {
    fontSize: 10,
    fontFamily: Fonts.semiBold,
    color: '#c4b5fd',
    marginTop: 1,
  },
  chatTabLabelActive: {
    color: '#6b4fa8',
    fontFamily: Fonts.extraBold,
  },

  label: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    color: '#c4b5fd',
    textAlign: 'center',
    width: '100%',
  },
  labelActive: {
    color: '#6b4fa8',
    fontFamily: Fonts.extraBold,
  },
});
