import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppModal } from '@/src/components/AppModal';
import { sheetStyles } from '@/src/components/ui/sheet';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { palette } from '@/src/theme/colors';
import { LOG_REMINDER_HOURS, logReminderOf } from '@/src/utils/logReminder';
import { tapFeedback } from '@/src/utils/selectFeedback';

export function logReminderTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** Turns the daily "log your day" reminder on or off and picks its hour. */
export function LogReminderSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { settings, updateLogReminder } = useSettings();
  const current = logReminderOf(settings.logReminder);
  const [enabled, setEnabled] = useState(current.enabled);
  const [hour, setHour] = useState(current.hour);

  useEffect(() => {
    if (!visible) return;
    setEnabled(current.enabled);
    setHour(current.hour);
    // Reset only when the sheet opens.
  }, [visible]);

  async function save() {
    tapFeedback();
    await updateLogReminder({ enabled, hour, minute: hour === current.hour ? current.minute : 0 });
    onClose();
  }

  return (
    <AppModal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessible={false} style={sheetStyles.scrim} onPress={onClose}>
        <Pressable
          accessible={false}
          onPress={(e) => e.stopPropagation()}
          style={[sheetStyles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={sheetStyles.grabber} />
          <View style={sheetStyles.headerRow}>
            <Text style={sheetStyles.title}>{t('logReminder.pickTitle')}</Text>
          </View>
          <Text style={styles.copy}>{t('logReminder.pickHint')}</Text>

          <View style={styles.switchRow}>
            <Text style={sheetStyles.optionText}>{t('logReminder.switch')}</Text>
            <Switch
              testID="log-reminder-switch"
              accessibilityLabel={t('logReminder.switch')}
              value={enabled}
              onValueChange={(v) => {
                tapFeedback();
                setEnabled(v);
              }}
              trackColor={{ true: palette.teal, false: palette.border }}
            />
          </View>

          {enabled ? (
            <View style={styles.grid}>
              {LOG_REMINDER_HOURS.map((h) => {
                const on = h === hour;
                return (
                  <Pressable
                    key={h}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    onPress={() => {
                      tapFeedback();
                      setHour(h);
                    }}
                    style={[sheetStyles.option, on && sheetStyles.optionOn]}>
                    <Text style={sheetStyles.optionText}>{logReminderTime(h, 0)}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={() => void save()}
            style={[sheetStyles.primary, styles.save]}>
            <Text style={sheetStyles.primaryText}>{t('logReminder.done')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  copy: {
    marginTop: 6,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: palette.inkMuted,
  },
  switchRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  grid: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  save: { marginTop: 20 },
});
