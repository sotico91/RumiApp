import { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKeyboardHeight } from '@/src/hooks/useKeyboardVisible';
import { useLanguage } from '@/src/i18n/LanguageContext';
import type { TranslationKey } from '@/src/i18n/translations';
import { palette, radii } from '@/src/theme/colors';
import type { Account, Debt } from '@/src/types/finance';
import type { Currency } from '@/src/types/settings';
import type { OneTapHabit } from '@/src/utils/oneTapHabits';
import {
  defaultSpendAccountId,
  firstAccountId,
  liquidPocketsForPay,
} from '@/src/utils/accounts';
import { isDebtPayAccountId, revolvingAsPayAccounts } from '@/src/utils/debts';
import { formatAmountTyping } from '@/src/utils/money';
import { tapFeedback } from '@/src/utils/selectFeedback';
import { AppModal } from '@/src/components/AppModal';
import { AccountChoiceChips } from '@/src/components/AccountChoiceChips';
import { KeyboardSafeScroll } from '@/src/components/KeyboardSafe';
import {
  SpendSourcePicker,
  type SpendSource,
} from '@/src/components/SpendSourcePicker';

type Props = {
  visible: boolean;
  habit: OneTapHabit | null;
  label: string;
  /** Category of the label, shown under it ("Alimentación" under "Desayuno"). */
  group?: string;
  format: (n: number) => string;
  currency: Currency;
  parse: (raw: string) => number | null;
  busy?: boolean;
  accounts: Account[];
  debts: Debt[];
  onClose: () => void;
  onConfirm: (amount: number, note: string, accountId: string) => void;
  onEditFull: (amount: number, note: string) => void;
};

export function QuickRepeatSheet({
  visible,
  habit,
  label,
  group,
  format,
  currency,
  parse,
  busy,
  accounts,
  debts,
  onClose,
  onConfirm,
  onEditFull,
}: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const keyboardHeight = useKeyboardHeight();
  const [amountText, setAmountText] = useState('');
  const [noteText, setNoteText] = useState('');
  const [accountId, setAccountId] = useState('cash');
  const [spendSource, setSpendSource] = useState<SpendSource>('pocket');

  const pocketAccounts = useMemo(() => liquidPocketsForPay(accounts), [accounts]);
  const cardAccounts = useMemo(
    () =>
      revolvingAsPayAccounts(debts, (debt) =>
        debt.nameKey
          ? t(debt.nameKey as TranslationKey)
          : debt.name ?? t('debt.mainCard')
      ),
    [debts, t]
  );

  useEffect(() => {
    if (!visible || !habit) return;
    setAmountText('');
    setNoteText(habit.note ?? '');
    const fromCard =
      isDebtPayAccountId(habit.accountId) || habit.paymentMethod === 'credit';
    setSpendSource(fromCard ? 'card' : 'pocket');
    if (fromCard) {
      setAccountId(firstAccountId(cardAccounts, habit.accountId) ?? habit.accountId ?? '');
    } else {
      setAccountId(
        defaultSpendAccountId(accounts, {
          lastAccountId: habit.accountId,
          amount: habit.amount,
        })
      );
    }
  }, [
    visible,
    habit?.categoryId,
    habit?.amount,
    habit?.note,
    habit?.accountId,
    habit?.paymentMethod,
    accounts,
    cardAccounts,
  ]);

  if (!habit) return null;

  const lastAmount = habit.amount;
  // Empty field = the last amount (shown as its placeholder); typing replaces it.
  const typed = parse(amountText);
  const amount = typed != null && typed > 0 ? typed : amountText.trim() ? null : lastAmount;
  const sourceAccounts = spendSource === 'card' ? cardAccounts : pocketAccounts;
  const canConfirm =
    amount != null &&
    !busy &&
    Boolean(accountId) &&
    sourceAccounts.some((a) => a.id === accountId);
  const resolvedNote = noteText.trim();

  function handleClose() {
    if (busy) return;
    Keyboard.dismiss();
    tapFeedback();
    onClose();
  }

  function handleConfirm() {
    if (!canConfirm || amount == null) return;
    tapFeedback();
    onConfirm(amount, resolvedNote, accountId);
  }

  const keyboardOpen = keyboardHeight > 0;
  const bottomPad = keyboardOpen ? keyboardHeight + 8 : Math.max(insets.bottom, 16);
  const sheetMaxHeight = keyboardOpen
    ? Math.max(240, Dimensions.get('window').height - keyboardHeight - 16)
    : Dimensions.get('window').height * 0.88;

  return (
    <AppModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}>
      <View style={styles.root}>
        {/* Sibling backdrop so flex children do not swallow outside taps. */}
        <Pressable
          style={styles.backdropTap}
          onPress={handleClose}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={t('home.quickConfirmClose')}
        />
        <View
          style={[styles.keyboardWrap, { paddingBottom: bottomPad }]}
          pointerEvents="box-none">
          <View
            style={[styles.sheet, { maxHeight: sheetMaxHeight }]}
            onStartShouldSetResponder={() => true}>
            {/* Lifts whichever field has focus, including the inline new-wallet one. */}
            <KeyboardSafeScroll
              avoidKeyboard={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetInner}>
              <View style={styles.headerRow}>
                <Text style={styles.eyebrow}>{t('home.quickConfirmTitle')}</Text>
                <Pressable
                  onPress={handleClose}
                  disabled={busy}
                  hitSlop={12}
                  style={styles.closeBtn}
                  accessibilityRole="button"
                  accessibilityLabel={t('home.quickConfirmClose')}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </Pressable>
              </View>
              <Text style={styles.label}>{label}</Text>
              {group ? <Text style={styles.group}>{group}</Text> : null}
              {habit.isAnt ? (
                <View style={styles.antBadge}>
                  <Text style={styles.antBadgeText}>{t('home.quickAntBadge')}</Text>
                </View>
              ) : null}

              {/* Amount and Log first, above the keyboard: tap, change the value, done. */}
              <Text style={styles.fieldLabel}>{t('home.quickConfirmAmount')}</Text>
              <View style={styles.amountRow}>
                <Text style={styles.amountCurrency}>$</Text>
                <TextInput
                  testID="repeat-amount"
                  value={amountText}
                  onChangeText={(text) => setAmountText(formatAmountTyping(text, currency))}
                  keyboardType="decimal-pad"
                  autoFocus
                  placeholder={formatAmountTyping(String(lastAmount), currency)}
                  placeholderTextColor={palette.inkMuted}
                  style={styles.amountInput}
                  maxFontSizeMultiplier={1.2}
                  accessibilityLabel={t('home.quickConfirmAmount')}
                />
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={handleConfirm}
                disabled={!canConfirm}
                style={[styles.primaryBtn, !canConfirm && styles.btnDisabled]}>
                <Text style={styles.primaryText}>
                  {amount != null
                    ? t('home.quickConfirmLog', { amount: format(amount) })
                    : t('home.quickConfirmYes')}
                </Text>
              </Pressable>

              <Text style={styles.fieldLabel}>{t('flow.howPaid')}</Text>
              <SpendSourcePicker
                value={spendSource}
                onChange={(source) => {
                  setSpendSource(source);
                  if (source === 'card') {
                    const next = firstAccountId(cardAccounts, accountId);
                    if (next) setAccountId(next);
                    return;
                  }
                  const next = firstAccountId(pocketAccounts, accountId);
                  if (next) setAccountId(next);
                }}
                showNoCards={spendSource === 'card' && cardAccounts.length === 0}
              />

              {spendSource === 'card' && cardAccounts.length === 0 ? null : (
                <>
                  <Text style={styles.fieldLabel}>
                    {spendSource === 'card'
                      ? t('flow.whichCard')
                      : t('home.quickConfirmAccount')}
                  </Text>
                  <AccountChoiceChips
                    accounts={spendSource === 'card' ? cardAccounts : pocketAccounts}
                    selectedId={accountId}
                    onSelect={setAccountId}
                    allowAddWallet={false}
                  />
                </>
              )}

              <View>
                <Text style={styles.fieldLabel}>{t('home.quickConfirmNote')}</Text>
                <TextInput
                  value={noteText}
                  onChangeText={setNoteText}
                  placeholder={t('add.notePlaceholder')}
                  placeholderTextColor={palette.inkSoft}
                  style={styles.noteInput}
                  multiline
                  returnKeyType="done"
                  blurOnSubmit
                />
              </View>

              {keyboardOpen ? null : (
                <Text style={styles.hint}>{t('home.quickConfirmHint')}</Text>
              )}

              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    tapFeedback();
                    onEditFull(amount ?? lastAmount, resolvedNote);
                  }}
                  style={styles.linkBtn}>
                  <Text style={styles.linkText}>{t('home.quickConfirmFull')}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={handleClose}
                  disabled={busy}
                  style={styles.cancelBtn}>
                  <Text style={styles.cancelText}>{t('home.quickConfirmClose')}</Text>
                </Pressable>
              </View>
            </KeyboardSafeScroll>
          </View>
        </View>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  backdropTap: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  keyboardWrap: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    width: '100%',
  },
  sheet: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
  },
  sheetInner: {
    padding: 20,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: palette.border,
  },
  closeBtnText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 16,
    color: palette.inkMuted,
    lineHeight: 18,
  },
  eyebrow: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: palette.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    flex: 1,
  },
  label: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 22,
    color: palette.ink,
  },
  group: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: palette.inkMuted,
    marginTop: -6,
  },
  antBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF4E6',
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  antBadgeText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: '#B45309',
  },
  fieldLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: palette.inkMuted,
    marginTop: 4,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: palette.accent,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    backgroundColor: '#F7FAFC',
  },
  amountCurrency: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 28,
    color: palette.inkMuted,
  },
  amountInput: {
    flex: 1,
    fontFamily: 'Fraunces_700Bold',
    fontSize: 32,
    color: palette.ink,
    paddingVertical: 10,
  },
  noteInput: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    color: palette.ink,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#F7FAFC',
    minHeight: 48,
  },
  hint: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkMuted,
    lineHeight: 18,
  },
  actions: {
    gap: 10,
    marginTop: 8,
  },
  primaryBtn: {
    backgroundColor: palette.accent,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    color: '#fff',
  },
  linkBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  linkText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: palette.accent,
  },
  cancelBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: palette.inkMuted,
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
