import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppModal } from '@/src/components/AppModal';
import { KeyboardSafeOverlay } from '@/src/components/KeyboardSafe';
import { useFinance } from '@/src/hooks/useFinance';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { AppText } from '@/src/components/ui';
import { colors, radius, space, type } from '@/src/theme';
import { palette, radii } from '@/src/theme/colors';
import { SUPPORT_EMAIL } from '@/src/constants/store';
import {
  pickAndReadBackupFile,
  shareBackupJson,
  shareTransactionsCsv,
} from '@/src/utils/backup';
import { tapFeedback } from '@/src/utils/selectFeedback';
import { authenticateAppLock, getAppLockKind } from '@/src/utils/appLock';
import { appAlert } from '@/src/components/AppAlert';

/**
 * The avatar in Home's header. Opens Settings: profile, preferences, your
 * data, help, and the destructive reset kept apart at the bottom.
 */
export function ProfileMenuButton() {
  const insets = useSafeAreaInsets();
  const { t, language, setLanguage } = useLanguage();
  const {
    settings,
    quickTemplates,
    updateUserName,
    restoreSettingsFromBackup,
    updateAppLock,
    updateNotifyOnExpense,
  } = useSettings();
  const {
    transactions,
    accounts,
    budgets,
    debts,
    subscriptions,
    restoreFromBackup,
    resetFinance,
  } = useFinance();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState(settings.userName);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const initial = (settings.userName.trim().charAt(0) || 'R').toUpperCase();

  useEffect(() => {
    if (editOpen) setName(settings.userName);
  }, [editOpen, settings.userName]);

  function openEditName() {
    setMenuOpen(false);
    setEditOpen(true);
  }

  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed) {
      appAlert(t('onboard.nameTitle'), t('onboard.nameNeed'));
      return;
    }
    setSaving(true);
    try {
      await updateUserName(trimmed);
      setEditOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function toggleAppLock() {
    setMenuOpen(false);
    if (settings.appLockEnabled) {
      await updateAppLock(false);
      appAlert(t('lock.disabledTitle'), t('lock.disabledBody'));
      return;
    }
    const kind = await getAppLockKind();
    if (kind === 'none') {
      appAlert(t('lock.unavailableTitle'), t('lock.unavailableBody'), undefined, { tone: 'warning' });
      return;
    }
    // Let the ⋯ menu finish closing so Face ID is not replaced by the
    // device passcode sheet.
    await new Promise((resolve) => setTimeout(resolve, 400));
    const result = await authenticateAppLock(
      t('lock.promptFace'),
      t('lock.promptPin'),
      t('lock.usePasscode')
    );
    if (!result.ok) {
      if (result.reason === 'denied') {
        appAlert(t('lock.unavailableTitle'), t('lock.unavailableBody'), undefined, { tone: 'warning' });
      }
      return;
    }
    await updateAppLock(true);
    appAlert(t('lock.enabledTitle'), t('lock.enabledBody'), undefined, { tone: 'success' });
  }

  async function exportBackup() {
    setMenuOpen(false);
    setBusy(true);
    try {
      await shareBackupJson({
        transactions,
        accounts,
        budgets,
        debts,
        subscriptions,
        settings,
        quickTemplates,
      });
    } catch {
      appAlert(t('backup.errorTitle'), t('backup.exportError'), undefined, { tone: 'warning' });
    } finally {
      setBusy(false);
    }
  }

  async function exportCsv() {
    setMenuOpen(false);
    setBusy(true);
    try {
      await shareTransactionsCsv(transactions, {
        language,
        t,
        accounts,
        debts,
        spendConcepts: settings.spendConcepts ?? [],
      });
    } catch {
      appAlert(t('backup.errorTitle'), t('backup.exportError'), undefined, { tone: 'warning' });
    } finally {
      setBusy(false);
    }
  }

  function confirmRestore() {
    setMenuOpen(false);
    appAlert(t('backup.restoreTitle'), t('backup.restoreMessage'), [
      { text: t('history.cancel'), style: 'cancel' },
      {
        text: t('backup.restoreConfirm'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setBusy(true);
            try {
              const backup = await pickAndReadBackupFile();
              await restoreSettingsFromBackup({
                settings: backup.settings,
                quickTemplates: backup.quickTemplates,
              });
              await restoreFromBackup({
                transactions: backup.transactions,
                accounts: backup.accounts,
                budgets: backup.budgets,
                debts: backup.debts,
                subscriptions: backup.subscriptions,
              });
              appAlert(t('backup.restoreDoneTitle'), t('backup.restoreDoneBody'), undefined, { tone: 'success' });
            } catch (err) {
              const code = err instanceof Error ? err.message : '';
              if (code === 'CANCELLED') return;
              appAlert(t('backup.errorTitle'), t('backup.restoreError'), undefined, { tone: 'warning' });
            } finally {
              setBusy(false);
            }
          })();
        },
      },
    ]);
  }

  async function toggleNotifyOnExpense() {
    const ok = await updateNotifyOnExpense(!settings.notifyOnExpense);
    if (!ok) appAlert(t('notify.permissionTitle'), t('notify.permissionBody'));
  }

  function switchLanguage() {
    setLanguage(language === 'es' ? 'en' : 'es');
  }

  /** Destructive: lives here, away from the everyday Add button. Two confirmations. */
  function confirmReset() {
    setMenuOpen(false);
    appAlert(t('fab.resetTitle'), t('fab.resetMessage'), [
      { text: t('history.cancel'), style: 'cancel' },
      {
        text: t('fab.resetConfirm'),
        style: 'destructive',
        onPress: () => {
          appAlert(t('fab.resetTitle2'), t('fab.resetMessage2'), [
            { text: t('history.cancel'), style: 'cancel' },
            {
              text: t('fab.resetConfirm2'),
              style: 'destructive',
              onPress: () => {
                void (async () => {
                  setBusy(true);
                  try {
                    await resetFinance();
                  } finally {
                    setBusy(false);
                  }
                })();
              },
            },
          ]);
        },
      },
    ]);
  }

  function openPrivacyPolicy() {
    setMenuOpen(false);
    router.push('/privacidad');
  }

  function reportProblem() {
    setMenuOpen(false);
    const subject = encodeURIComponent(t('support.reportSubject'));
    const body = encodeURIComponent(t('support.reportBody'));
    const url = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    void Linking.openURL(url).catch(() => {
      appAlert(t('support.report'), t('support.reportError'));
    });
  }

  return (
    <>
      <Pressable
        onPress={() => {
          tapFeedback();
          setMenuOpen(true);
        }}
        hitSlop={6}
        style={({ pressed }) => [styles.avatar, pressed && styles.avatarPressed]}
        accessibilityRole="button"
        accessibilityLabel={t('settings.open')}
        disabled={busy}>
        <Text style={styles.avatarText}>{initial}</Text>
      </Pressable>

      <AppModal
        visible={menuOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setMenuOpen(false)}>
        <View style={styles.sheetRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuOpen(false)} />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
            <View style={styles.sheetHeader}>
              <AppText variant="h2">{t('settings.title')}</AppText>
              <Pressable
                onPress={() => setMenuOpen(false)}
                hitSlop={10}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel={t('settings.close')}>
                <Ionicons name="close" size={20} color={colors.text.secondary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetBody}>
              <SettingsGroup title={t('settings.profile')}>
                <SettingsRow
                  icon="person-outline"
                  label={t('settings.name')}
                  value={settings.userName.trim()}
                  onPress={openEditName}
                />
              </SettingsGroup>

              <SettingsGroup title={t('settings.preferences')}>
                <SettingsRow
                  icon="language-outline"
                  label={t('language.label')}
                  value={language === 'es' ? 'Español' : 'English'}
                  onPress={switchLanguage}
                />
                <SettingsRow
                  icon="notifications-outline"
                  label={t('settings.notify')}
                  hint={t('settings.notifyHint')}
                  toggle={settings.notifyOnExpense}
                  onPress={() => void toggleNotifyOnExpense()}
                />
                <SettingsRow
                  icon="lock-closed-outline"
                  label={t('settings.lock')}
                  toggle={settings.appLockEnabled}
                  onPress={() => void toggleAppLock()}
                />
              </SettingsGroup>

              <SettingsGroup title={t('settings.data')}>
                <SettingsRow
                  icon="download-outline"
                  label={t('backup.exportJson')}
                  onPress={() => void exportBackup()}
                />
                <SettingsRow
                  icon="document-text-outline"
                  label={t('backup.exportCsv')}
                  onPress={() => void exportCsv()}
                />
                <SettingsRow
                  icon="refresh-outline"
                  label={t('backup.restore')}
                  onPress={confirmRestore}
                />
              </SettingsGroup>

              <SettingsGroup title={t('settings.help')}>
                <SettingsRow
                  icon="chatbubble-ellipses-outline"
                  label={t('support.report')}
                  onPress={reportProblem}
                />
                <SettingsRow
                  icon="shield-checkmark-outline"
                  label={t('about.privacyPolicy')}
                  onPress={openPrivacyPolicy}
                />
              </SettingsGroup>

              <SettingsGroup title={t('settings.danger')}>
                <SettingsRow
                  icon="trash-outline"
                  label={t('fab.reset')}
                  danger
                  onPress={confirmReset}
                />
              </SettingsGroup>
            </ScrollView>
          </View>
        </View>
      </AppModal>

      <AppModal
        visible={editOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setEditOpen(false)}>
        <KeyboardSafeOverlay>
        <View
          style={[
            styles.editBackdrop,
            { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 },
          ]}>
          <View style={styles.editSheet}>
            <Text style={styles.editTitle}>{t('home.editNameTitle')}</Text>
            <Text style={styles.editCopy}>{t('home.editNameBody')}</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t('onboard.namePlaceholder')}
              placeholderTextColor={palette.inkSoft}
              autoCapitalize="words"
              autoCorrect={false}
              autoFocus
              maxLength={40}
              style={styles.nameInput}
              returnKeyType="done"
              onSubmitEditing={() => void saveName()}
            />
            <View style={styles.editActions}>
              <Pressable onPress={() => setEditOpen(false)} style={styles.secondary}>
                <Text style={styles.secondaryText}>{t('history.cancel')}</Text>
              </Pressable>
              <Pressable
                onPress={() => void saveName()}
                disabled={saving}
                style={[styles.primary, saving && { opacity: 0.7 }]}>
                <Text style={styles.primaryText}>
                  {saving ? t('add.saving') : t('home.saveName')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
        </KeyboardSafeOverlay>
      </AppModal>
    </>
  );
}

function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      <AppText variant="overline" color="tertiary" style={styles.groupTitle}>
        {title}
      </AppText>
      <View style={styles.groupCard}>{children}</View>
    </View>
  );
}

function SettingsRow({
  icon,
  label,
  hint,
  value,
  toggle,
  danger = false,
  onPress,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  hint?: string;
  /** Current value shown on the right, with a chevron. */
  value?: string;
  /** On / off; draws a switch instead of a chevron. */
  toggle?: boolean;
  danger?: boolean;
  onPress: () => void;
}) {
  const tint = danger ? colors.status.danger : colors.text.secondary;
  return (
    <Pressable
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      accessibilityRole={toggle === undefined ? 'button' : 'switch'}
      accessibilityState={toggle === undefined ? undefined : { checked: toggle }}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <Ionicons name={icon} size={20} color={tint} />
      <View style={styles.rowText}>
        <AppText variant="bodyStrong" style={danger ? styles.dangerText : undefined}>
          {label}
        </AppText>
        {hint ? (
          <AppText variant="caption" color="tertiary">
            {hint}
          </AppText>
        ) : null}
      </View>
      {toggle !== undefined ? (
        <Switch
          value={toggle}
          onValueChange={() => {
            tapFeedback();
            onPress();
          }}
          trackColor={{ true: colors.action.secondary, false: 'rgba(15,28,36,0.16)' }}
          thumbColor={colors.bg.surface}
          ios_backgroundColor="rgba(15,28,36,0.16)"
        />
      ) : (
        <View style={styles.rowEnd}>
          {value ? (
            <AppText variant="caption" color="secondary" numberOfLines={1} style={styles.rowValue}>
              {value}
            </AppText>
          ) : null}
          {danger ? null : (
            <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.action.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  avatarPressed: {
    backgroundColor: colors.action.primaryPressed,
  },
  avatarText: {
    fontFamily: type.h1.fontFamily,
    fontSize: 16,
    color: colors.text.onAction,
  },
  sheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.bg.scrim,
  },
  sheet: {
    maxHeight: '88%',
    backgroundColor: colors.bg.screen,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: space.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.gutter,
    paddingBottom: space.sm,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,28,36,0.06)',
  },
  sheetBody: {
    paddingHorizontal: space.gutter,
    paddingBottom: space.md,
    gap: space.lg,
  },
  group: { gap: space.xs },
  groupTitle: { paddingHorizontal: space.xxs },
  groupCard: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 52,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  rowPressed: { backgroundColor: colors.bg.surfaceMuted },
  rowText: { flex: 1, gap: 2 },
  rowEnd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xxs,
    maxWidth: '45%',
  },
  rowValue: { flexShrink: 1 },
  dangerText: { color: colors.status.danger },
  editBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(8,20,28,0.72)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  editSheet: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.xl,
    padding: 22,
  },
  editTitle: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 26,
    color: palette.ink,
  },
  editCopy: {
    marginTop: 6,
    marginBottom: 14,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: palette.inkMuted,
    lineHeight: 20,
  },
  nameInput: {
    borderWidth: 1.5,
    borderColor: palette.accent,
    backgroundColor: '#FFF8F4',
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 22,
    color: palette.ink,
  },
  editActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  secondary: {
    flex: 1,
    backgroundColor: '#EEF3F6',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryText: {
    fontFamily: 'DMSans_600SemiBold',
    color: palette.inkMuted,
  },
  primary: {
    flex: 1.3,
    backgroundColor: palette.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryText: {
    fontFamily: 'DMSans_600SemiBold',
    color: palette.white,
  },
});
