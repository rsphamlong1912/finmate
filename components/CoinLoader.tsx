import { View, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import { useTheme } from '../context/ThemeContext';

export function CoinLoader() {
  const { colors } = useTheme();

  return (
    <View style={[styles.overlay, { backgroundColor: colors.bg }]}>
      <LottieView
        source={{ uri: 'https://lottie.host/060b4dce-9140-4e30-a4fd-2ff38da1ffbb/4TnG5fTJQC.lottie' }}
        autoPlay
        loop
        style={styles.animation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  animation: {
    width: 140,
    height: 140,
  },
});
