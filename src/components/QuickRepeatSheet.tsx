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
import { colors } from '@/src/theme';
import { palette } from '@/src/theme/colors';
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
  // Pinned to the bottom edge (on the keyboard when it is up), never under the status bar.
  const bottomPad = keyboardOpen ? 0 : insets.bottom;
  const sheetMaxHeight = Math.max(
    240,
    Dimensions.get('window').height - insets.top - 12 - (keyboardOpen ? keyboardHeight : 0)
  );

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
          style={[styles.keyboardWrap, { paddingBottom: keyboardOpen ? keyboardHeight : 0 }]}
          pointerEvents="box-none">
          <View
            style={[styles.sheet, { maxHeight: sheetMaxHeight, paddingBottom: bottomPad }]}
            onStartShouldSetResponder={() => true}>
            {/* Lifts whichever field has focus, including the inline new-wallet one. */}
            <KeyboardSafeScroll
              avoidKeyboard={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetInner}>
              <View style={styles.grabber} />
              <View style={styles.headerRow}>
                <View style={styles.headerTexts} accessibilityRole="header">
                  <Text style={styles.label} accessibilityLabel={`${t('home.quickConfirmTitle')}: ${label}`}>
                    {label}
                  </Text>
                  {group || habit.isAnt ? (
                    <Text style={styles.group}>
                      {group}
                      {group && habit.isAnt ? ' · ' : ''}
                      {habit.isAnt ? <Text style={styles.ant}>{t('home.quickAntBadge')}</Text> : null}
                    </Text>
                  ) : null}
                </View>
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

              {/* Amount and Log first, above the keyboard: tap, change the value, done. */}
              <View style={styles.amountRow}>
                <Text style={styles.amountCurrency}>$</Text>
                <TextInput
                  testID="repeat-amount"
                  value={amountText}
                  onChangeText={(text) => setAmountText(formatAmountTyping(text, currency))}
                  keyboardType="decimal-pad"
                  autoFocus
                  placeholder={formatAmountTyping(String(lastAmount), currency)}
                  placeholderTextColor={palette.inkSoft}
                  style={styles.amountInput}
                  maxFontSizeMultiplier={1.2}
                  accessibilityLabel={t('home.quickConfirmAmount')}
                />
              </View>
              <Text style={styles.lastAmount}>
                {t('home.quickRepeatLast', { amount: format(lastAmount) })}
              </Text>

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
                quiet
              />

              {spendSource === 'card' && cardAccounts.length === 0 ? null : (
                <>
                  <Text style={styles.fieldLabel}>
                    {spendSource === 'card'
                      ? t('flow.whichCard')
                      : t('home.quickConfirmAccount')}
                  </Text>
                  <AccountChoiceChips
                    // Remount once the account is resolved so a known one shows as a line, not a chip.
                    key={accountId}
                    quiet
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
                  style={styles.textBtn}>
                  <Text style={styles.linkText}>{t('home.quickConfirmFull')}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={handleClose}
                  disabled={busy}
                  style={styles.textBtn}>
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
    backgroundColor: colors.bg.scrim,
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
    width: '100%',
  },
  sheet: {
    backgroundColor: palette.surfaceSolid,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  sheetInner: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 12,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border.strong,
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerTexts: { flex: 1, gap: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 18,
    color: palette.inkMuted,
  },
  label: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 26,
    color: palette.ink,
  },
  group: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: palette.inkMuted,
  },
  ant: { color: colors.status.warningText },
  // A receipt line: the figure on a rule, no box.
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 8,
    borderBottomWidth: 2,
    borderBottomColor: palette.ink,
  },
  amountCurrency: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 30,
    color: palette.inkMuted,
  },
  amountInput: {
    flex: 1,
    fontFamily: 'Fraunces_700Bold',
    fontSize: 44,
    color: palette.ink,
    paddingVertical: 4,
  },
  lastAmount: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkMuted,
    marginTop: -4,
  },
  fieldLabel: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: palette.ink,
    marginTop: 8,
  },
  noteInput: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    color: palette.ink,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.bg.surfaceMuted,
    minHeight: 48,
  },
  hint: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkMuted,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  primaryBtn: {
    backgroundColor: palette.accent,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    color: palette.white,
  },
  textBtn: {
    minHeight: 44,
    justifyContent: 'center',
  },
  linkText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: palette.accentDeep,
  },
  cancelText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: palette.inkMuted,
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
