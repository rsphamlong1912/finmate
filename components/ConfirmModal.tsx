import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Fonts } from '../constants/fonts';
import { useTheme } from '../context/ThemeContext';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
};

export function ConfirmModal({
  visible, title, message,
  confirmLabel = 'Xác nhận', cancelLabel = 'Hủy',
  onConfirm, onCancel, destructive = false,
}: Props) {
  const { colors } = useTheme();
  const s = makeStyles(colors);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={s.overlay}>
        <View style={s.card}>
          <Text style={s.title}>{title}</Text>
          <Text style={s.message}>{message}</Text>
          <View style={s.dividerH} />
          <View style={s.btnRow}>
            <TouchableOpacity style={s.btn} onPress={onCancel} activeOpacity={0.7}>
              <Text style={s.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>
            <View style={s.dividerV} />
            <TouchableOpacity style={s.btn} onPress={onConfirm} activeOpacity={0.7}>
              <Text style={[s.confirmText, destructive && s.destructiveText]}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: ReturnType<typeof import('../context/ThemeContext').useTheme>['colors']) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(92,61,0,0.45)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 20,
      width: '100%',
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      overflow: 'hidden',
    },
    title: {
      fontSize: 16,
      fontFamily: Fonts.extraBold,
      color: colors.textPrimary,
      textAlign: 'center',
      paddingTop: 22,
      paddingHorizontal: 20,
      marginBottom: 8,
    },
    message: {
      fontSize: 13,
      fontFamily: Fonts.medium,
      color: colors.textMuted,
      textAlign: 'center',
      paddingHorizontal: 20,
      paddingBottom: 20,
      lineHeight: 19,
    },
    dividerH: {
      height: 1,
      backgroundColor: colors.divider,
    },
    btnRow: {
      flexDirection: 'row',
    },
    btn: {
      flex: 1,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dividerV: {
      width: 1,
      backgroundColor: colors.divider,
    },
    cancelText: {
      fontSize: 15,
      fontFamily: Fonts.semiBold,
      color: colors.textMuted,
    },
    confirmText: {
      fontSize: 15,
      fontFamily: Fonts.extraBold,
      color: colors.accent,
    },
    destructiveText: {
      color: colors.danger,
    },
  });
