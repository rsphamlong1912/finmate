import { useRef } from 'react';
import { Animated, PanResponder, View, Text, Alert, StyleSheet } from 'react-native';
import { Fonts } from './fonts';

interface Props {
  onDelete: () => void;
  onLongPress?: () => void;
  children: React.ReactNode;
}

export function SwipeableRow({ onDelete, children }: Props) {
  const translateX = useRef(new Animated.Value(0)).current;
  const DELETE_THRESHOLD = 72;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8,
      onPanResponderMove: (_, { dx }) => {
        if (dx < 0) translateX.setValue(Math.max(dx, -90));
      },
      onPanResponderRelease: (_, { dx }) => {
        if (dx < -DELETE_THRESHOLD) {
          Alert.alert('Xóa giao dịch', 'Bạn có chắc muốn xóa?', [
            {
              text: 'Hủy', style: 'cancel',
              onPress: () => Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start(),
            },
            {
              text: 'Xóa', style: 'destructive',
              onPress: () => {
                Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
                onDelete();
              },
            },
          ]);
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  return (
    <View style={styles.wrap}>
      <View style={styles.deleteBack}>
        <Text style={styles.deleteLabel}>Xóa</Text>
      </View>
      <Animated.View
        style={{ transform: [{ translateX }] }}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', overflow: 'hidden' },
  deleteBack: {
    position: 'absolute', right: 0, top: 0, bottom: 0,
    width: 90, backgroundColor: '#ef4444',
    alignItems: 'center', justifyContent: 'center',
  },
  deleteLabel: { color: '#fff', fontSize: 13, fontFamily: Fonts.extraBold },
});
