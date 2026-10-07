import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { NoMoneyHint } from '@/src/components/NoMoneyHint';
import { CategorySuggestionHint } from '@/src/components/CategorySuggestionHint';
import { CategoryChip } from '@/src/components/CategoryChip';
import { InlineSubAdd } from '@/src/components/InlineSubAdd';
import { AccountChoiceChips } from '@/src/components/AccountChoiceChips';
import { InstallmentPayScopePicker } from '@/src/components/InstallmentPayScopePicker';
import { SpendSourcePicker, spendSourceFromMethod } from '@/src/components/SpendSourcePicker';
import { categoriesForKind } from '@/src/data/categories';
import { CategorySearch, CATEGORY_SEARCH_MIN_SUBS } from '@/src/components/CategorySearch';
import { ConceptIcon } from '@/src/components/ConceptIcon';
import {
  findSpendSub,
  flattenSpendSubs,
  isGeneralSubName,
  spendSubsAsCategories,
} from '@/src/data/spendConcepts';
import { useFundsCheck } from '@/src/hooks/useFundsCheck';
import { useFinance } from '@/src/hooks/useFinance';
import { useMoney } from '@/src/hooks/useMoney';
import { formatAmountTyping } from '@/src/utils/money';
import { useSettings } from '@/src/hooks/useSettings';
import { useCategorySuggestion } from '@/src/hooks/useCategorySuggestion';
import { usePickableSpendConcepts } from '@/src/hooks/useSpendConcepts';
import { useLanguage } from '@/src/i18n/LanguageContext';
import type { TranslationKey } from '@/src/i18n/translations';
import { palette, radii } from '@/src/theme/colors';
import type { PaymentMethod, TransactionType } from '@/src/types/finance';
import { isPocketMove } from '@/src/types/finance';
import { categoryLabel } from '@/src/utils/categoryLabel';
import { incomeDestinationAccounts } from '@/src/utils/netWorth';
import {
  defaultIncomeAccountId,
  defaultSpendAccountId,
  defaultTransferDestinationId,
  accountsForExpenseSource,
  firstAccountId,
  liquidPocketsForPay,
  paymentMethodForAccount,
  pocketMoveAccounts,
} from '@/src/utils/accounts';
import { notifyExpenseRegistered } from '@/src/utils/notifications';
import { movementNotifyCopy } from '@/src/utils/movementNotify';
import {
  amountsMatch,
  inferInstallmentPayScope,
  installmentPayChoices,
  openDebts,
  paymentSettlesInstallment,
  suggestedDebtPayAmount,
  type InstallmentPayScope,
} from '@/src/utils/debts';
import { appAlert } from '@/src/components/AppAlert';

export type SavedMovement = {
  kind: 'expense' | 'income' | 'other';
  /** Today's running total for expense/income; the saved amount otherwise. */
  amount: number;
  /** The amount of this one movement. */
  added?: number;
  categoryId?: string;
};

type Props = {
  onSaved?: (result: SavedMovement) => void;
  initialCategoryId?: string;
  initialAmount?: string;
  initialNote?: string;
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

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ExpenseForm({
  onSaved,
  initialCategoryId,
  initialAmount,
  initialNote,
}: Props) {
  const { t } = useLanguage();
  const { format, formatPlain, parse, currency } = useMoney();
  const { settings, updateQuickTemplate } = useSettings();
  const { addTransaction, totalForPeriod, accounts, debts, transactions } = useFinance();
  const spendConcepts = usePickableSpendConcepts();
  // The concept is already picked above, so a sub chip only needs its own name.
  const subChipLabel = (id: string) => {
    const hit = findSpendSub(spendConcepts, id);
    if (!hit) return categoryLabel(id, t, spendConcepts);
    return isGeneralSubName(hit.sub.name) ? hit.concept.name : hit.sub.name;
  };
  const liveDebts = useMemo(() => openDebts(debts), [debts]);

  const prefilledHit = initialCategoryId
    ? findSpendSub(spendConcepts, initialCategoryId)
    : null;
  const [amount, setAmount] = useState(initialAmount ?? '');
  const [type, setType] = useState<TransactionType>('expense');
  const [conceptId, setConceptId] = useState(
    prefilledHit?.concept.id ?? spendConcepts[0]?.id ?? ''
  );
  // Until the user picks a category, the description decides (as in quick add).
  const [manualCategory, setManualCategory] = useState(!!initialCategoryId);
  const [categoryId, setCategoryId] = useState(
    initialCategoryId ?? spendConcepts[0]?.subs[0]?.id ?? 'otros'
  );
  const [debtId, setDebtId] = useState<string | null>(
    () => openDebts(debts)[0]?.id ?? null
  );
  const [payScope, setPayScope] = useState<InstallmentPayScope | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [accountId, setAccountId] = useState(() =>
    defaultSpendAccountId(accounts)
  );
  const [toAccountId, setToAccountId] = useState(() =>
    defaultTransferDestinationId(accounts)
  );
  const [note, setNote] = useState(initialNote ?? '');
  // Category search text moves the selection like the description does.
  const [categoryQuery, setCategoryQuery] = useState('');
  const hint = useCategorySuggestion(categoryQuery.trim() ? categoryQuery : note, spendConcepts);
  const autoCreate = type === 'expense' && !manualCategory && !!hint.suggestion?.create;
  useEffect(() => {
    const suggestion = hint.suggestion;
    if (type !== 'expense' || manualCategory || !suggestion || suggestion.create) return;
    setConceptId(suggestion.conceptId);
    setCategoryId(suggestion.subId);
  }, [hint.suggestion, manualCategory, type]);
  // About to create a sub in an existing category: show that category open.
  const createIn = autoCreate ? hint.suggestion?.create?.conceptId : undefined;
  useEffect(() => {
    if (createIn) setConceptId(createIn);
  }, [createIn]);
  const [saving, setSaving] = useState(false);
  const savingLock = useRef(false);
  const checkFunds = useFundsCheck();

  const categoryChoices = useMemo(() => {
    if (type === 'income') {
      return categoriesForKind('income', settings.enabledCategoryIds);
    }
    if (type === 'debt_payment') {
      return [];
    }
    const concept = spendConcepts.find((c) => c.id === conceptId) ?? spendConcepts[0];
    if (!concept) return spendSubsAsCategories(spendConcepts);
    return spendSubsAsCategories([concept]);
  }, [type, settings.enabledCategoryIds, spendConcepts, conceptId]);

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

  const selectedPayDebt = useMemo(
    () => liveDebts.find((d) => d.id === debtId),
    [liveDebts, debtId]
  );
  const payChoices = installmentPayChoices(selectedPayDebt);

  function applyPayScope(scope: InstallmentPayScope) {
    if (!payChoices) return;
    setPayScope(scope);
    if (scope === 'cuota') setAmount(String(payChoices.cuota));
    if (scope === 'full') setAmount(String(payChoices.remaining));
  }

  function pickDebt(debt: (typeof liveDebts)[number]) {
    setDebtId(debt.id);
    setCategoryId(debt.categoryId ?? 'otros');
    const choices = installmentPayChoices(debt);
    const parsed = parse(amount);
    if (!choices) {
      setPayScope(null);
      const suggest = suggestedDebtPayAmount(debt);
      if (suggest > 0) setAmount(String(suggest));
      return;
    }
    const scope = inferInstallmentPayScope(choices, parsed);
    setPayScope(scope);
    if (scope === 'cuota' && (!parsed || parsed <= 0)) {
      setAmount(String(choices.cuota));
    }
    if (scope === 'full' && (!parsed || parsed <= 0 || amountsMatch(parsed, choices.remaining))) {
      setAmount(String(choices.remaining));
    }
  }

  useEffect(() => {
    if (type === 'income') {
      const next = firstAccountId(accountChoices, accountId);
      if (next && next !== accountId) setAccountId(next);
      return;
    }
    const next = firstAccountId(accountChoices, accountId);
    if (next && next !== accountId) setAccountId(next);
  }, [type, method, accountChoices, accountId]);

  const scale = useSharedValue(1);
  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function selectType(next: TransactionType) {
    setType(next);
    if (next !== 'debt_payment') setPayScope(null);
    if (next === 'income') {
      setCategoryId('salario');
      setAccountId(defaultIncomeAccountId(accounts));
    } else if (next === 'expense') {
      const first = spendConcepts[0];
      setConceptId(first?.id ?? '');
      setCategoryId(first?.subs[0]?.id ?? 'otros');
      setAccountId(defaultSpendAccountId(accounts, { amount: parse(amount) ?? undefined }));
    } else if (next === 'debt_payment') {
      const first = liveDebts[0];
      setDebtId(first?.id ?? null);
      setCategoryId(first?.categoryId ?? 'otros');
      setPayScope(null);
      if (first) pickDebt(first);
    } else if (isPocketMove(next)) {
      setCategoryId('');
      const fromId = firstAccountId(
        pocketMoveAccounts(accounts, next === 'investment' ? 'investment' : 'transfer')
      );
      if (fromId) setAccountId(fromId);
      setToAccountId(defaultTransferDestinationId(accounts, fromId));
    }
  }

  async function handleSave() {
    if (savingLock.current) return;
    const parsed = parse(amount);
    if (!parsed) {
      appAlert(t('add.invalidTitle'), t('add.invalidMessage'), undefined, { tone: 'warning' });
      return;
    }
    if (type === 'debt_payment' && payChoices) {
      const inferred = inferInstallmentPayScope(payChoices, parsed);
      if (!payScope || (payScope === 'cuota' && inferred !== 'cuota')) {
        appAlert(t('flow.payScopeTitle'), t('flow.payScopeNeed'));
        setPayScope(inferred);
        return;
      }
    }
    if (type === 'expense' && method === 'credit') {
      if (!accountChoices.some((a) => a.id === accountId)) {
        appAlert(t('flow.whichCard'), t('flow.noCardsBody'));
        return;
      }
    }

    if (
      (type === 'transfer' || type === 'investment') &&
      (!accountId || !toAccountId || accountId === toAccountId)
    ) {
      appAlert(t('add.invalidTitle'), t('flow.moveNeedDistinct'), undefined, { tone: 'warning' });
      return;
    }
    if (!checkFunds({ type, amount: parsed, accountId })) return;

    savingLock.current = true;
    setSaving(true);
    try {
      // A subcategory the description asked for is created only now, on save.
      const subId = autoCreate ? (await hint.resolve())?.subId ?? categoryId : categoryId;
      const beforeTodayExpense = totalForPeriod('hoy', 'expense');
      const beforeTodayIncome = totalForPeriod('hoy', 'income');
      const selectedDebt = debts.find((d) => d.id === debtId);
      await addTransaction({
        type,
        amount: parsed,
        categoryId: isPocketMove(type)
          ? undefined
          : type === 'debt_payment'
            ? selectedDebt?.categoryId ?? subId
            : subId,
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
        toAccountId:
          type === 'transfer' || type === 'investment' ? toAccountId : undefined,
        debtId: type === 'debt_payment' ? debtId ?? undefined : undefined,
        note,
      });

      if (type === 'expense') {
        await updateQuickTemplate({
          categoryId: subId,
          amount: parsed,
          note: note.trim() || undefined,
        });
      }

      const resolvedCategoryId =
        type === 'debt_payment'
          ? selectedDebt?.categoryId ?? subId
          : subId;

      if (settings.notifyOnExpense) {
        const debtName = selectedDebt
          ? selectedDebt.nameKey
            ? t(selectedDebt.nameKey as TranslationKey)
            : selectedDebt.name ?? t('debt.mainCard')
          : '';
        const copy = movementNotifyCopy({
          t,
          type,
          amount: formatPlain(parsed),
          transactions,
          spendConcepts,
          accounts,
          categoryId: isPocketMove(type) ? undefined : resolvedCategoryId,
          accountId,
          toAccountId:
            type === 'transfer' || type === 'investment' ? toAccountId : undefined,
          note,
          debtLabel: type === 'debt_payment' ? debtName : undefined,
          settled:
            type === 'debt_payment'
              ? paymentSettlesInstallment(selectedDebt, parsed)
              : undefined,
        });
        void notifyExpenseRegistered(copy.title, copy.body).catch(() => undefined);
      }

      setAmount('');
      setNote('');
      if (type === 'expense') {
        onSaved?.({
          kind: 'expense',
          amount: beforeTodayExpense + parsed,
          added: parsed,
          categoryId: resolvedCategoryId,
        });
      } else if (type === 'income') {
        onSaved?.({
          kind: 'income',
          amount: beforeTodayIncome + parsed,
          added: parsed,
          categoryId: resolvedCategoryId,
        });
      } else {
        onSaved?.({ kind: 'other', amount: parsed, added: parsed });
      }
    } catch (err) {
      const moveFail =
        err instanceof Error && err.message === 'pocket_move_accounts';
      appAlert(
        t('add.invalidTitle'),
        moveFail ? t('flow.moveNeedDistinct') : t('add.saveError'),
        undefined,
        { tone: 'warning' }
      );
    } finally {
      savingLock.current = false;
      setSaving(false);
    }
  }

  const preview = parse(amount);

  return (
    <View style={styles.form}>
      <Text style={styles.kicker}>{t('add.kicker')}</Text>
      <View style={styles.amountBlock}>
        <Text style={styles.currencyMark} maxFontSizeMultiplier={1.2}>$</Text>
        <TextInput
          value={formatAmountTyping(amount, currency)}
          onChangeText={(text) => setAmount(formatAmountTyping(text, currency))}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={palette.inkSoft}
          style={styles.amountInput}
          maxFontSizeMultiplier={1.2}
          autoFocus
        />
      </View>

      <Text style={styles.label}>{t('add.type')}</Text>
      <View style={styles.chips}>
        {TYPES.map((item) => (
          <Pressable
            accessibilityRole="button"
            key={item}
            onPress={() => selectType(item)}
            style={[styles.pill, type === item && styles.pillOn]}>
            <Text style={[styles.pillText, type === item && styles.pillTextOn]}>
              {t(`type.${item}` as TranslationKey)}
            </Text>
          </Pressable>
        ))}
      </View>

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
              const nextId = firstAccountId(liquidPocketsForPay(accounts), accountId);
              if (nextId) setAccountId(nextId);
            }}
            showNoCards={method === 'credit' && accountChoices.length === 0}
          />
        </>
      ) : type !== 'income' && !isPocketMove(type) && type !== 'debt_payment' ? (
        <>
          <Text style={styles.label}>{t('add.method')}</Text>
          <View style={styles.chips}>
            {METHODS.filter((item) => item !== 'credit').map((item) => (
              <Pressable
                accessibilityRole="button"
                key={item}
                onPress={() => setMethod(item)}
                style={[styles.pill, method === item && styles.pillOn]}>
                <Text style={[styles.pillText, method === item && styles.pillTextOn]}>
                  {t(`method.${item}` as TranslationKey)}
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
                : t('add.account')}
      </Text>
      {accountChoices.length === 0 &&
      (type === 'debt_payment' || (type === 'expense' && method !== 'credit')) ? (
        <NoMoneyHint />
      ) : accountChoices.length === 0 ? (
        <Text style={styles.preview}>{t('flow.payAccountsEmpty')}</Text>
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

      {(type === 'transfer' || type === 'investment') && (
        <>
          <Text style={styles.label}>{t('flow.whichAccountTo')}</Text>
          <AccountChoiceChips
            accounts={accountChoices.filter((a) => a.id !== accountId)}
            selectedId={toAccountId}
            onSelect={setToAccountId}
          />
        </>
      )}

      {type === 'expense' && spendConcepts.length > 0 ? (
        <>
          <Text style={styles.label}>{t('flow.chooseConcept')}</Text>
          {flattenSpendSubs(spendConcepts).length > CATEGORY_SEARCH_MIN_SUBS ? (
            <CategorySearch
              concepts={spendConcepts}
              query={categoryQuery}
              onQueryChange={setCategoryQuery}
              inlineSuggestion={false}
              onPick={(pickedConceptId, subId) => {
                setCategoryQuery('');
                setManualCategory(true);
                setConceptId(pickedConceptId);
                setCategoryId(subId);
              }}
            />
          ) : null}
          {/* Wrapped, so no concept hides off-screen; long lists also get the search above. */}
          <View style={styles.chips}>
            {spendConcepts.map((concept) => (
              <Pressable
                accessibilityRole="button"
                key={concept.id}
                onPress={() => {
                  setManualCategory(true);
                  setConceptId(concept.id);
                  setCategoryId(concept.subs[0]?.id ?? categoryId);
                }}
                style={[styles.pill, styles.pillWithIcon, conceptId === concept.id && styles.pillOn]}>
                <ConceptIcon
                  icon={concept.icon}
                  color={conceptId === concept.id ? palette.white : concept.color}
                  size={16}
                />
                <Text
                  style={[styles.pillText, conceptId === concept.id && styles.pillTextOn]}>
                  {concept.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      {type === 'debt_payment' ? (
        <>
          <Text style={styles.label}>{t('flow.chooseDebt')}</Text>
          <View style={styles.chips}>
            {liveDebts.map((debt) => (
              <Pressable
                accessibilityRole="button"
                key={debt.id}
                onPress={() => pickDebt(debt)}
                style={[styles.pill, debtId === debt.id && styles.pillOn]}>
                <Text style={[styles.pillText, debtId === debt.id && styles.pillTextOn]}>
                  {debt.name ?? t('debt.mainCard')}
                </Text>
              </Pressable>
            ))}
          </View>
          {payChoices ? (
            <InstallmentPayScopePicker
              choices={payChoices}
              scope={payScope}
              onChange={applyPayScope}
            />
          ) : null}
        </>
      ) : isPocketMove(type) ? null : type === 'expense' &&
        categoryChoices.length === 1 ? null : (
        <>
          <Text style={styles.label}>
            {type === 'expense' ? t('flow.chooseSub') : t('add.category')}
          </Text>
          <View style={styles.chips}>
            {categoryChoices.map((category) => (
              <CategoryChip
                key={category.id}
                category={category}
                label={subChipLabel(category.id)}
                // A sub about to be created: none of the existing ones is the pick.
                selected={!autoCreate && category.id === categoryId}
                onPress={() => {
                  setManualCategory(true);
                  setCategoryId(category.id);
                }}
              />
            ))}
          </View>
        </>
      )}

      {type === 'expense' && conceptId ? (
        <InlineSubAdd
          collapsed
          conceptId={conceptId}
          onAdded={(subId) => {
            setManualCategory(true);
            setCategoryId(subId);
          }}
        />
      ) : null}

      <Text style={styles.label}>{t('add.note')}</Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder={t('add.notePlaceholder')}
        placeholderTextColor={palette.inkSoft}
        style={styles.noteInput}
        returnKeyType="done"
        blurOnSubmit
      />
      {type === 'expense' ? (
        <CategorySuggestionHint
          hint={hint}
          selectedSubId={categoryId}
          auto={!manualCategory}
          onApply={(nextConceptId, subId) => {
            setManualCategory(true);
            setConceptId(nextConceptId);
            setCategoryId(subId);
          }}
        />
      ) : null}

      <AnimatedPressable
        onPress={handleSave}
        disabled={saving}
        onPressIn={() => {
          scale.value = withSpring(0.97, { damping: 16, stiffness: 240 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 16, stiffness: 240 });
        }}
        style={[styles.submit, saving && styles.submitPressed, buttonStyle]}>
        <Text style={styles.submitText}>
          {saving ? t('add.saving') : t('add.save')}
        </Text>
      </AnimatedPressable>

      {preview ? (
        <Text style={styles.preview}>
          {t('add.willSave', { amount: formatPlain(preview ?? 0) })}
        </Text>
      ) : (
        <Text style={styles.preview}>{t('add.hint')}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 10,
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: palette.border,
  },
  kicker: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 26,
    color: palette.ink,
    letterSpacing: -0.5,
  },
  amountBlock: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    borderBottomWidth: 2,
    borderBottomColor: palette.accent,
    paddingBottom: 8,
  },
  currencyMark: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 34,
    color: palette.accent,
    marginBottom: 8,
  },
  amountInput: {
    flex: 1,
    fontFamily: 'Fraunces_700Bold',
    fontSize: 48,
    color: palette.ink,
    letterSpacing: -1.5,
    paddingVertical: 4,
  },
  label: {
    marginTop: 8,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: palette.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pillWithIcon: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pill: {
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pillOn: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  pillText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: palette.ink,
  },
  pillTextOn: {
    color: palette.white,
  },
  noteInput: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    color: palette.ink,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  submit: {
    marginTop: 14,
    backgroundColor: palette.accent,
    borderRadius: radii.lg,
    paddingVertical: 18,
    alignItems: 'center',
  },
  submitPressed: { opacity: 0.9 },
  submitText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 17,
    color: palette.white,
  },
  preview: {
    textAlign: 'center',
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkSoft,
  },
});
