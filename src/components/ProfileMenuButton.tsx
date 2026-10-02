import { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
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
import { useHowToGuide } from '@/src/hooks/useHowToGuide';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { palette, radii } from '@/src/theme/colors';
import { SUPPORT_EMAIL } from '@/src/constants/store';
import {
  pickAndReadBackupFile,
  shareBackupJson,
  shareTransactionsCsv,
} from '@/src/utils/backup';
import { tapFeedback } from '@/src/utils/selectFeedback';
import { authenticateAppLock, getAppLockKind } from '@/src/utils/appLock';

type Props = {
  light?: boolean;
};

export function ProfileMenuButton({ light = true }: Props) {
  const insets = useSafeAreaInsets();
  const { t, language, setLanguage } = useLanguage();
  const { openGuide } = useHowToGuide();
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
      Alert.alert(t('onboard.nameTitle'), t('onboard.nameNeed'));
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
      Alert.alert(t('lock.disabledTitle'), t('lock.disabledBody'));
      return;
    }
    const kind = await getAppLockKind();
    if (kind === 'none') {
      Alert.alert(t('lock.unavailableTitle'), t('lock.unavailableBody'));
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
        Alert.alert(t('lock.unavailableTitle'), t('lock.unavailableBody'));
      }
      return;
    }
    await updateAppLock(true);
    Alert.alert(t('lock.enabledTitle'), t('lock.enabledBody'));
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
      Alert.alert(t('backup.errorTitle'), t('backup.exportError'));
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
      Alert.alert(t('backup.errorTitle'), t('backup.exportError'));
    } finally {
      setBusy(false);
    }
  }

  function confirmRestore() {
    setMenuOpen(false);
    Alert.alert(t('backup.restoreTitle'), t('backup.restoreMessage'), [
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
              Alert.alert(t('backup.restoreDoneTitle'), t('backup.restoreDoneBody'));
            } catch (err) {
              const code = err instanceof Error ? err.message : '';
              if (code === 'CANCELLED') return;
              Alert.alert(t('backup.errorTitle'), t('backup.restoreError'));
            } finally {
              setBusy(false);
            }
          })();
        },
      },
    ]);
  }

  async function toggleNotifyOnExpense() {
    setMenuOpen(false);
    const ok = await updateNotifyOnExpense(!settings.notifyOnExpense);
    if (!ok) Alert.alert(t('notify.permissionTitle'), t('notify.permissionBody'));
  }

  function switchLanguage() {
    setMenuOpen(false);
    setLanguage(language === 'es' ? 'en' : 'es');
  }

  /** Destructive: lives here, away from the everyday Add button. Two confirmations. */
  function confirmReset() {
    setMenuOpen(false);
    Alert.alert(t('fab.resetTitle'), t('fab.resetMessage'), [
      { text: t('history.cancel'), style: 'cancel' },
      {
        text: t('fab.resetConfirm'),
        style: 'destructive',
        onPress: () => {
          Alert.alert(t('fab.resetTitle2'), t('fab.resetMessage2'), [
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
      Alert.alert(t('support.report'), t('support.reportError'));
    });
  }

  return (
    <>
      <Pressable
        onPress={() => {
          tapFeedback();
          setMenuOpen(true);
        }}
        hitSlop={10}
        style={[styles.dotsBtn, light && styles.dotsBtnLight]}
        accessibilityLabel={t('home.profileMenu')}
        disabled={busy}>
        <Text style={[styles.dots, light && styles.dotsLight]}>⋯</Text>
      </Pressable>

      <AppModal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <View style={[styles.menuSheet, { marginTop: insets.top + 56 }]}>
            <Pressable
              onPress={() => {
                tapFeedback();
                setMenuOpen(false);
                openGuide();
              }}
              style={styles.menuItem}>
              <Text style={styles.menuItemText}>{t('guide.menu')}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                tapFeedback();
                openEditName();
              }}
              style={styles.menuItem}>
              <Text style={styles.menuItemText}>{t('home.editName')}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                tapFeedback();
                void toggleAppLock();
              }}
              style={styles.menuItem}>
              <Text style={styles.menuItemText}>
                {settings.appLockEnabled ? t('lock.disable') : t('lock.enable')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                tapFeedback();
                void exportBackup();
              }}
              style={styles.menuItem}>
              <Text style={styles.menuItemText}>{t('backup.exportJson')}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                tapFeedback();
                void exportCsv();
              }}
              style={styles.menuItem}>
              <Text style={styles.menuItemText}>{t('backup.exportCsv')}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                tapFeedback();
                confirmRestore();
              }}
              style={styles.menuItem}>
              <Text style={[styles.menuItemText, styles.menuDanger]}>
                {t('backup.restore')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                tapFeedback();
                reportProblem();
              }}
              style={styles.menuItem}>
              <Text style={styles.menuItemText}>{t('support.report')}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                tapFeedback();
                void toggleNotifyOnExpense();
              }}
              style={styles.menuItem}>
              <Text style={styles.menuItemText}>
                {settings.notifyOnExpense ? t('notify.menuTurnOff') : t('notify.menuTurnOn')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                tapFeedback();
                switchLanguage();
              }}
              style={styles.menuItem}>
              <Text style={styles.menuItemText}>{t('language.switch')}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                tapFeedback();
                openPrivacyPolicy();
              }}
              style={styles.menuItem}>
              <Text style={styles.menuItemText}>{t('about.privacyPolicy')}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                tapFeedback();
                confirmReset();
              }}
              style={styles.menuItem}>
              <Text style={[styles.menuItemText, styles.menuDanger]}>{t('fab.reset')}</Text>
            </Pressable>
            <Pressable onPress={() => setMenuOpen(false)} style={styles.menuCancel}>
              <Text style={styles.menuCancelText}>{t('history.cancel')}</Text>
            </Pressable>
          </View>
        </Pressable>
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

const styles = StyleSheet.create({
  dotsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,20,28,0.08)',
  },
  dotsBtnLight: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  dots: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 22,
    color: palette.ink,
    marginTop: -6,
  },
  dotsLight: {
    color: palette.white,
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(8,20,28,0.35)',
    alignItems: 'flex-end',
    paddingHorizontal: 18,
  },
  menuSheet: {
    minWidth: 220,
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuItemText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: palette.ink,
  },
  menuDanger: {
    color: palette.danger,
  },
  menuCancel: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuCancelText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: palette.inkMuted,
  },
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
