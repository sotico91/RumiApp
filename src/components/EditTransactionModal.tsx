import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { categoriesForKind } from '@/src/data/categories';
import {
  findSpendSub,
  flattenSpendSubs,
  isGeneralSubName,
  spendSubsAsCategories,
} from '@/src/data/spendConcepts';
import { useFundsCheck } from '@/src/hooks/useFundsCheck';
import { useFinance } from '@/src/hooks/useFinance';
import { useKeyboardVisible } from '@/src/hooks/useKeyboardVisible';
import { useMoney } from '@/src/hooks/useMoney';
import { formatAmountTyping } from '@/src/utils/money';
import { useSettings } from '@/src/hooks/useSettings';
import { usePickableSpendConcepts } from '@/src/hooks/useSpendConcepts';
import { useLanguage } from '@/src/i18n/LanguageContext';
import type { TranslationKey } from '@/src/i18n/translations';
import { sheetStyles } from '@/src/components/ui';
import { radius } from '@/src/theme';
import { palette } from '@/src/theme/colors';
import type { Debt, PaymentMethod, Transaction, TransactionType } from '@/src/types/finance';
import { isPocketMove } from '@/src/types/finance';
import { categoryLabel } from '@/src/utils/categoryLabel';
import { incomeDestinationAccounts } from '@/src/utils/netWorth';
import { AppModal } from '@/src/components/AppModal';
import { AccountChoiceChips } from '@/src/components/AccountChoiceChips';
import { CategoryChip } from '@/src/components/CategoryChip';
import { CategorySearch, CATEGORY_SEARCH_MIN_SUBS } from '@/src/components/CategorySearch';
import { ConceptIcon } from '@/src/components/ConceptIcon';
import { KeyboardSafeOverlay, KeyboardSafeScroll } from '@/src/components/KeyboardSafe';
import { SpendSourcePicker, spendSourceFromMethod } from '@/src/components/SpendSourcePicker';
import {
  accountsForExpenseSource,
  firstAccountId,
  liquidPocketsForPay,
  paymentMethodForAccount,
  moveDestinations,
  moveSourcesWithCredit,
  pocketMoveSources,
} from '@/src/utils/accounts';
import { isDebtPayAccountId, payAccountIdForDebt } from '@/src/utils/debts';
import { appAlert } from '@/src/components/AppAlert';
import { SpendDateChip, daysAgoOf, onDayKeepingTime } from '@/src/components/SpendDateChip';
import { dictatedDate } from '@/src/utils/dictation';

type Props = {
  transaction: Transaction | null;
  visible: boolean;
  onClose: () => void;
  /** Hands the transaction back so the screen runs its usual delete confirmation. */
  onDelete?: (transaction: Transaction) => void;
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

export function EditTransactionModal({ transaction, visible, onClose, onDelete }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { format, parse, currency } = useMoney();
  const { settings, teachCategory } = useSettings();
  const { updateTransaction, accounts, debts } = useFinance();
  const keyboardVisible = useKeyboardVisible();

  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [conceptId, setConceptId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [accountId, setAccountId] = useState('cash');
  const [toAccountId, setToAccountId] = useState('savings');
  const [note, setNote] = useState('');
  const [daysAgo, setDaysAgo] = useState(0);
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const spendConcepts = usePickableSpendConcepts(transaction?.categoryId);
  const checkFunds = useFundsCheck();
  const showConcepts = type !== 'income' && spendConcepts.length > 0;

  // Spends pick a category first, then only that category's subs show.
  const categoryChoices = useMemo(() => {
    if (type === 'income') {
      return categoriesForKind('income', settings.enabledCategoryIds);
    }
    const concept = spendConcepts.find((c) => c.id === conceptId) ?? spendConcepts[0];
    return spendSubsAsCategories(concept ? [concept] : spendConcepts);
  }, [type, settings.enabledCategoryIds, spendConcepts, conceptId]);

  // The concept is already picked above, so a sub chip only needs its own name.
  const subChipLabel = (id: string) => {
    const hit = findSpendSub(spendConcepts, id);
    if (!hit) return categoryLabel(id, t, spendConcepts);
    return isGeneralSubName(hit.sub.name) ? hit.concept.name : hit.sub.name;
  };

  const accountChoices = useMemo(() => {
    if (type === 'income') return incomeDestinationAccounts(accounts);
    // The pocket this movement already uses stays listed even if it is empty now.
    const keepId = transaction?.accountId;
    const debtLabel = (debt: Debt) =>
      debt.nameKey ? t(debt.nameKey as TranslationKey) : debt.name ?? t('debt.mainCard');
    // A transfer can also leave from a card or cupo (cash advance).
    if (type === 'transfer') return moveSourcesWithCredit(accounts, debts, debtLabel, keepId);
    if (isPocketMove(type)) return pocketMoveSources(accounts, keepId);
    if (type === 'debt_payment') return liquidPocketsForPay(accounts, keepId);
    return accountsForExpenseSource(accounts, method, { keepId, debts, debtLabel });
  }, [type, accounts, method, debts, t]);

  const destinations = useMemo(() => moveDestinations(accounts, accountId, debts), [accounts, accountId, debts]);
  const creditDraw = type === 'transfer' && isDebtPayAccountId(accountId);
  useEffect(() => {
    if (!isPocketMove(type)) return;
    if (!destinations.some((a) => a.id === toAccountId) && destinations[0]) {
      setToAccountId(destinations[0].id);
    }
  }, [type, destinations, toAccountId]);

  useEffect(() => {
    if (!transaction) return;
    setAmount(String(transaction.amount));
    setType(transaction.type);
    // No category is filled in for the person: one without it waits for their pick.
    const nextCategoryId = transaction.categoryId ?? '';
    setCategoryId(nextCategoryId);
    setConceptId(findSpendSub(settings.spendConcepts ?? [], nextCategoryId)?.concept.id ?? '');
    const nextMethod = transaction.paymentMethod ?? 'cash';
    setMethod(nextMethod);
    const chargedId = transaction.creditDebtId
      ? payAccountIdForDebt(transaction.creditDebtId)
      : transaction.accountId ?? 'cash';
    setAccountId(chargedId);
    setToAccountId(transaction.toAccountId ?? 'savings');
    setNote(transaction.note ?? '');
    setDaysAgo(daysAgoOf(new Date(transaction.createdAt)));
  }, [transaction, settings.spendConcepts]);

  useEffect(() => {
    const next = firstAccountId(accountChoices, accountId);
    if (next && next !== accountId) setAccountId(next);
  }, [method, type, accountChoices, accountId]);

  function selectType(next: TransactionType) {
    setType(next);
    if (next === 'income' || next === 'expense') {
      // A new kind needs its own category, picked by the person.
      setConceptId('');
      setCategoryId('');
    } else if (isPocketMove(next)) {
      setCategoryId('');
      // A card spend turned into a move starts from a pocket, not as a cash advance.
      if (isDebtPayAccountId(accountId) && (next === 'investment' || !isPocketMove(type))) {
        const pocket = pocketMoveSources(accounts, transaction?.accountId)[0];
        if (pocket) setAccountId(pocket.id);
      }
    }
  }

  const needsDestination = isPocketMove(type);

  async function handleSave() {
    if (!transaction) return;
    const parsed = parse(amount);
    if (!parsed) {
      appAlert(t('add.invalidTitle'), t('add.invalidMessage'), undefined, { tone: 'warning' });
      return;
    }
    if ((type === 'expense' || type === 'income') && !categoryId) {
      appAlert(t('flow.chooseCategory'), t('flow.chooseCategoryBody'));
      return;
    }
    // A bigger amount must still fit in the pocket (with this movement's own money back in it).
    if (!checkFunds({ type, amount: parsed, accountId, replacing: transaction })) return;

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
        ...(daysAgo !== daysAgoOf(new Date(transaction.createdAt))
          ? {
              createdAt: onDayKeepingTime(
                dictatedDate(daysAgo),
                new Date(transaction.createdAt)
              ).toISOString(),
            }
          : {}),
      });
      // Moved to another category by hand: learn it for this description.
      if (type === 'expense' && note.trim() && categoryId && categoryId !== transaction.categoryId) {
        await teachCategory(note, categoryId);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppModal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardSafeOverlay>
        <View style={[sheetStyles.scrim, { paddingTop: insets.top + 12 }]}>
          <View style={[sheetStyles.sheet, styles.sheet, { paddingBottom: insets.bottom + 8 }]}>
            <View style={sheetStyles.grabber} />
            <Text style={styles.title}>{t('history.editTitle')}</Text>
            <Text style={styles.copy}>{t('history.editBody')}</Text>

            <KeyboardSafeScroll
              ref={scrollRef}
              avoidKeyboard={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.body}>
              <Text style={styles.label}>{t('flow.summaryAmount')}</Text>
            <View style={styles.amountRow}>
              <Text style={styles.currency} maxFontSizeMultiplier={1.2}>
                $
              </Text>
              <TextInput
                value={formatAmountTyping(amount, currency)}
                onChangeText={(text) => setAmount(formatAmountTyping(text, currency))}
                keyboardType="decimal-pad"
                style={styles.amountInput}
                maxFontSizeMultiplier={1.2}
              />
            </View>
            <Text style={styles.hint}>{t('add.amountDecimalHint')}</Text>

            <Text style={styles.label}>{t('add.type')}</Text>
            <View style={styles.wrap}>
              {TYPES.map((item) => (
                <Pressable
                  accessibilityRole="button"
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
                {showConcepts ? (
                  <>
                    <Text style={styles.label}>{t('flow.chooseConcept')}</Text>
                    {flattenSpendSubs(spendConcepts).length > CATEGORY_SEARCH_MIN_SUBS ? (
                      <CategorySearch
                        concepts={spendConcepts}
                        onPick={(pickedConceptId, subId) => {
                          setConceptId(pickedConceptId);
                          setCategoryId(subId);
                        }}
                      />
                    ) : null}
                    {/* One swipeable row, so many categories do not flood the sheet. */}
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      keyboardShouldPersistTaps="handled"
                      contentContainerStyle={styles.conceptRow}>
                      {spendConcepts.map((concept) => {
                        const on = concept.id === conceptId;
                        return (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityState={{ selected: !!on }}
                            key={concept.id}
                            onPress={() => {
                              setConceptId(concept.id);
                              if (!concept.subs.some((sub) => sub.id === categoryId)) {
                                setCategoryId(concept.subs[0]?.id ?? categoryId);
                              }
                            }}
                            style={[styles.chip, styles.chipWithIcon, on && styles.chipOn]}>
                            <ConceptIcon
                              icon={concept.icon}
                              color={concept.color}
                              size={16}
                            />
                            <Text style={[styles.chipText, on && styles.chipTextOn]}>
                              {concept.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </>
                ) : null}

                {showConcepts && categoryChoices.length <= 1 ? null : (
                  <>
                    <Text style={styles.label}>
                      {showConcepts ? t('flow.chooseSub') : t('flow.chooseCategory')}
                    </Text>
                    <View style={styles.wrap}>
                      {categoryChoices.map((cat) => (
                        <CategoryChip
                          key={cat.id}
                          category={cat}
                          label={showConcepts ? subChipLabel(cat.id) : undefined}
                          selected={cat.id === categoryId}
                          onPress={() => setCategoryId(cat.id)}
                        />
                      ))}
                    </View>
                  </>
                )}
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
                      liquidPocketsForPay(accounts, transaction?.accountId),
                      accountId
                    );
                    if (nextId) setAccountId(nextId);
                  }}
                  showNoCards={method === 'credit' && accountChoices.length === 0}
                  quiet
                />
              </>
            ) : type !== 'income' && !isPocketMove(type) && type !== 'debt_payment' ? (
              <>
                <Text style={styles.label}>{t('flow.howPaid')}</Text>
                <View style={styles.wrap}>
                  {METHODS.filter((m) => m !== 'credit').map((m) => (
                    <Pressable
                      accessibilityRole="button"
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
                // A new wallet starts at zero: it can receive money, not pay.
                allowAddWallet={type === 'income'}
                quiet
              />
            )}
              </>
            )}

            {needsDestination ? (
              <>
                <Text style={styles.label}>{t('flow.whichAccountTo')}</Text>
                <AccountChoiceChips
                  accounts={destinations}
                  selectedId={toAccountId}
                  onSelect={setToAccountId}
                  allowAddWallet={!creditDraw}
                  quiet
                />
                {creditDraw ? <Text style={styles.copy}>{t('move.fromCreditHint')}</Text> : null}
              </>
            ) : null}

            <Text style={styles.label}>{t('edit.date')}</Text>
            <SpendDateChip daysAgo={daysAgo} onChange={setDaysAgo} testID="edit-date" />

            <Text style={styles.label}>{t('flow.noteOptional')}</Text>
            <TextInput
              testID="edit-note"
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
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.secondary}>
              <Text style={styles.secondaryText}>{t('history.cancel')}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => void handleSave()}
              disabled={saving}
              style={[styles.primary, saving && { opacity: 0.7 }]}>
              <Text style={styles.primaryText}>
                {saving ? t('add.saving') : t('history.saveEdit')}
              </Text>
            </Pressable>
          </View>
          )}
          {!keyboardVisible && onDelete && transaction ? (
            <Pressable
              onPress={() => onDelete(transaction)}
              hitSlop={8}
              accessibilityRole="button"
              style={styles.deleteBtn}>
              <Text style={styles.deleteText}>{t('history.deleteTitle')}</Text>
            </Pressable>
          ) : null}
        </View>
        </View>
      </KeyboardSafeOverlay>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  sheet: { maxHeight: '100%' },
  title: {
    fontFamily: 'Fraunces_600SemiBold',
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
  label: sheetStyles.label,
  amountRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderBottomWidth: 2,
    borderBottomColor: palette.ink,
    gap: 4,
  },
  currency: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 28,
    color: palette.inkMuted,
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
  conceptRow: { flexDirection: 'row', gap: 8, paddingRight: 8 },
  chipWithIcon: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chip: sheetStyles.option,
  chipOn: sheetStyles.optionOn,
  chipText: sheetStyles.optionText,
  chipTextOn: { fontFamily: 'DMSans_600SemiBold' },
  note: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: palette.surfaceSolid,
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    color: palette.ink,
  },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  secondary: { ...sheetStyles.secondary, flex: 1 },
  secondaryText: sheetStyles.secondaryText,
  primary: { ...sheetStyles.primary, flex: 1.3 },
  primaryText: sheetStyles.primaryText,
  deleteBtn: { alignSelf: 'center', marginTop: 14, paddingVertical: 6 },
  deleteText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: palette.danger,
  },
});
