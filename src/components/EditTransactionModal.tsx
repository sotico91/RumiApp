import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { categoriesForKind } from '@/src/data/categories';
import { spendSubsAsCategories } from '@/src/data/spendConcepts';
import { useFinance } from '@/src/hooks/useFinance';
import { useKeyboardVisible } from '@/src/hooks/useKeyboardVisible';
import { useMoney } from '@/src/hooks/useMoney';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import type { TranslationKey } from '@/src/i18n/translations';
import { palette, radii } from '@/src/theme/colors';
import type { PaymentMethod, Transaction, TransactionType } from '@/src/types/finance';
import { isPocketMove } from '@/src/types/finance';
import { categoryLabel } from '@/src/utils/categoryLabel';
import { incomeDestinationAccounts } from '@/src/utils/netWorth';
import { AccountChoiceChips } from '@/src/components/AccountChoiceChips';
import { KeyboardSafeOverlay, KeyboardSafeScroll } from '@/src/components/KeyboardSafe';
import { SpendSourcePicker, spendSourceFromMethod } from '@/src/components/SpendSourcePicker';
import {
  accountsForExpenseSource,
  firstAccountId,
  liquidPocketsForPay,
  paymentMethodForAccount,
  pocketMoveAccounts,
} from '@/src/utils/accounts';
import { payAccountIdForDebt } from '@/src/utils/debts';

type Props = {
  transaction: Transaction | null;
  visible: boolean;
  onClose: () => void;
};

const TYPES: TransactionType[] = [
  'expense',
  'income',
  'transfer',
  'debt_payment',
  'investment',
  'withdrawal',
];

const METHODS: PaymentMethod[] = ['cash', 'debit', 'credit', 'transfer'];

export function EditTransactionModal({ transaction, visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { format, parse, currency } = useMoney();
  const { settings } = useSettings();
  const { updateTransaction, accounts, debts } = useFinance();
  const keyboardVisible = useKeyboardVisible();

  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [categoryId, setCategoryId] = useState('otros');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [accountId, setAccountId] = useState('cash');
  const [toAccountId, setToAccountId] = useState('savings');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const categoryChoices = useMemo(() => {
    if (type === 'income') {
      return categoriesForKind('income', settings.enabledCategoryIds);
    }
    return spendSubsAsCategories(settings.spendConcepts ?? []);
  }, [type, settings.enabledCategoryIds, settings.spendConcepts]);

  const accountChoices = useMemo(() => {
    if (type === 'income') return incomeDestinationAccounts(accounts);
    if (isPocketMove(type)) {
      return pocketMoveAccounts(
        accounts,
        type === 'investment' ? 'investment' : 'transfer'
      );
    }
    if (type === 'debt_payment') return liquidPocketsForPay(accounts);
    return accountsForExpenseSource(accounts, method, {
      debts,
      debtLabel: (debt) =>
        debt.nameKey
          ? t(debt.nameKey as TranslationKey)
          : debt.name ?? t('debt.mainCard'),
    });
  }, [type, accounts, method, debts, t]);

  useEffect(() => {
    if (!transaction) return;
    setAmount(String(transaction.amount));
    setType(transaction.type);
    setCategoryId(
      transaction.categoryId ??
        (settings.spendConcepts?.[0]?.subs[0]?.id ?? 'otros')
    );
    const nextMethod = transaction.paymentMethod ?? 'cash';
    setMethod(nextMethod);
    const chargedId = transaction.creditDebtId
      ? payAccountIdForDebt(transaction.creditDebtId)
      : transaction.accountId ?? 'cash';
    setAccountId(chargedId);
    setToAccountId(transaction.toAccountId ?? 'savings');
    setNote(transaction.note ?? '');
  }, [transaction, settings.spendConcepts]);

  useEffect(() => {
    const next = firstAccountId(accountChoices, accountId);
    if (next && next !== accountId) setAccountId(next);
  }, [method, type, accountChoices, accountId]);

  function selectType(next: TransactionType) {
    setType(next);
    if (next === 'income') {
      setCategoryId('salario');
    } else if (next === 'expense') {
      setCategoryId(settings.spendConcepts?.[0]?.subs[0]?.id ?? 'otros');
    } else if (isPocketMove(next)) {
      setCategoryId('');
    }
  }

  const needsDestination = isPocketMove(type);

  async function handleSave() {
    if (!transaction) return;
    const parsed = parse(amount);
    if (!parsed) {
      Alert.alert(t('add.invalidTitle'), t('add.invalidMessage'));
      return;
    }

    setSaving(true);
    try {
      await updateTransaction(transaction.id, {
        type,
        amount: parsed,
        categoryId: isPocketMove(type) ? undefined : categoryId,
        paymentMethod:
          type === 'income' || isPocketMove(type)
            ? undefined
            : method === 'credit'
              ? method
              : paymentMethodForAccount(
                  accounts.find((a) => a.id === accountId),
                  method
                ),
        accountId,
        toAccountId: needsDestination ? toAccountId : undefined,
        note,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardSafeOverlay>
        <View style={[styles.backdrop, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.sheet}>
            <Text style={styles.title}>{t('history.editTitle')}</Text>
            <Text style={styles.copy}>{t('history.editBody')}</Text>

            <KeyboardSafeScroll
              ref={scrollRef}
              avoidKeyboard={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.body}>
              <Text style={styles.label}>{t('flow.summaryAmount')}</Text>
            <View style={styles.amountRow}>
              <Text style={styles.currency}>$</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                style={styles.amountInput}
              />
            </View>
            <Text style={styles.hint}>{format(parse(amount) ?? 0, { reveal: true })}</Text>
            <Text style={styles.hint}>{t('add.amountDecimalHint')}</Text>

            <Text style={styles.label}>{t('add.type')}</Text>
            <View style={styles.wrap}>
              {TYPES.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => selectType(item)}
                  style={[styles.chip, type === item && styles.chipOn]}>
                  <Text style={[styles.chipText, type === item && styles.chipTextOn]}>
                    {t(`type.${item}` as TranslationKey)}
                  </Text>
                </Pressable>
              ))}
            </View>

            {isPocketMove(type) ? null : (
              <>
                <Text style={styles.label}>{t('flow.chooseCategory')}</Text>
                <View style={styles.wrap}>
                  {categoryChoices.map((cat) => {
                    const selected = cat.id === categoryId;
                    return (
                      <Pressable
                        key={cat.id}
                        onPress={() => setCategoryId(cat.id)}
                        style={[
                          styles.chip,
                          selected && { backgroundColor: cat.color, borderColor: cat.color },
                        ]}>
                        <Text style={[styles.chipText, selected && styles.chipTextOn]}>
                          {categoryLabel(cat.id, t, settings.spendConcepts ?? [])}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            {type === 'expense' ? (
              <>
                <Text style={styles.label}>{t('flow.howPaid')}</Text>
                <SpendSourcePicker
                  value={spendSourceFromMethod(method)}
                  onChange={(source) => {
                    if (source === 'card') {
                      setMethod('credit');
                      const nextList = accountsForExpenseSource(accounts, 'credit', {
                        debts,
                        debtLabel: (debt) =>
                          debt.nameKey
                            ? t(debt.nameKey as TranslationKey)
                            : debt.name ?? t('debt.mainCard'),
                      });
                      const nextId = firstAccountId(nextList, accountId);
                      if (nextId) setAccountId(nextId);
                      return;
                    }
                    setMethod('debit');
                    const nextId = firstAccountId(
                      liquidPocketsForPay(accounts),
                      accountId
                    );
                    if (nextId) setAccountId(nextId);
                  }}
                  showNoCards={method === 'credit' && accountChoices.length === 0}
                />
              </>
            ) : type !== 'income' && !isPocketMove(type) && type !== 'debt_payment' ? (
              <>
                <Text style={styles.label}>{t('flow.howPaid')}</Text>
                <View style={styles.wrap}>
                  {METHODS.filter((m) => m !== 'credit').map((m) => (
                    <Pressable
                      key={m}
                      onPress={() => setMethod(m)}
                      style={[styles.chip, method === m && styles.chipOn]}>
                      <Text style={[styles.chipText, method === m && styles.chipTextOn]}>
                        {t(`method.${m}` as TranslationKey)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}

            {type === 'expense' && method === 'credit' && accountChoices.length === 0 ? null : (
              <>
            <Text style={styles.label}>
              {type === 'income'
                ? t('flow.whichAccountIncome')
                : type === 'debt_payment'
                  ? t('flow.whichAccountPayDebt')
                  : method === 'credit' && !isPocketMove(type)
                    ? t('flow.whichCard')
                    : type === 'expense'
                      ? t('flow.whichAccountSpend')
                      : t('flow.whichAccount')}
            </Text>
            {accountChoices.length === 0 ? (
              <Text style={styles.hint}>{t('flow.payAccountsEmpty')}</Text>
            ) : (
              <AccountChoiceChips
                accounts={accountChoices}
                selectedId={accountId}
                onSelect={(id) => {
                  setAccountId(id);
                  if (type === 'expense' && method !== 'credit') {
                    const acc = accounts.find((a) => a.id === id);
                    setMethod(paymentMethodForAccount(acc, method));
                  }
                }}
                allowAddWallet={
                  type === 'income' ||
                  isPocketMove(type) ||
                  type === 'debt_payment' ||
                  (type === 'expense' && method !== 'credit')
                }
              />
            )}
              </>
            )}

            {needsDestination ? (
              <>
                <Text style={styles.label}>{t('flow.whichAccountTo')}</Text>
                <AccountChoiceChips
                  accounts={accountChoices.filter((a) => a.id !== accountId)}
                  selectedId={toAccountId}
                  onSelect={setToAccountId}
                  allowAddWallet
                />
              </>
            ) : null}

            <Text style={styles.label}>{t('flow.noteOptional')}</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder={t('add.notePlaceholder')}
              placeholderTextColor={palette.inkSoft}
              style={styles.note}
              returnKeyType="done"
              blurOnSubmit
              onFocus={() => {
                setTimeout(() => {
                  scrollRef.current?.scrollToEnd({ animated: true });
                }, 280);
              }}
            />
          </KeyboardSafeScroll>

          {keyboardVisible ? null : (
          <View style={styles.actions}>
            <Pressable onPress={onClose} style={styles.secondary}>
              <Text style={styles.secondaryText}>{t('history.cancel')}</Text>
            </Pressable>
            <Pressable
              onPress={() => void handleSave()}
              disabled={saving}
              style={[styles.primary, saving && { opacity: 0.7 }]}>
              <Text style={styles.primaryText}>
                {saving ? t('add.saving') : t('history.saveEdit')}
              </Text>
            </Pressable>
          </View>
          )}
        </View>
        </View>
      </KeyboardSafeOverlay>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(8,20,28,0.72)',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
  },
  sheet: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.xl,
    padding: 18,
    maxHeight: '92%',
  },
  title: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 26,
    color: palette.ink,
  },
  copy: {
    marginTop: 4,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: palette.inkMuted,
    marginBottom: 10,
  },
  body: { gap: 10, paddingBottom: 28 },
  label: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: palette.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 6,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderBottomWidth: 2,
    borderBottomColor: palette.accent,
    gap: 4,
  },
  currency: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 28,
    color: palette.accent,
    marginBottom: 6,
  },
  amountInput: {
    flex: 1,
    fontFamily: 'Fraunces_700Bold',
    fontSize: 36,
    color: palette.ink,
    paddingVertical: 4,
  },
  hint: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: palette.inkSoft,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#F7FAFC',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chipOn: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  chipText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: palette.ink,
  },
  chipTextOn: { color: palette.white },
  note: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'DMSans_400Regular',
    color: palette.ink,
  },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
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
