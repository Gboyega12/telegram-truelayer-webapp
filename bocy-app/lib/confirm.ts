import { Alert, Platform } from 'react-native';

/**
 * Cross-platform confirm dialog.
 * Uses window.confirm on web (where Alert.alert is a no-op),
 * and Alert.alert on native.
 */
export function confirm(
  title: string,
  message: string,
  onConfirm: () => void | Promise<void>,
  confirmLabel = 'OK',
  destructive = false,
) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: confirmLabel,
        style: destructive ? 'destructive' : 'default',
        onPress: () => onConfirm(),
      },
    ]);
  }
}
