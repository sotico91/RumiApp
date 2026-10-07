import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ScrollView,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  FRIENDLY_INTENTS,
  FRIENDLY_TEMPLATES,
  intentToType,
  type FriendlyIntent,
} from '@/src/data/friendlyTemplates';
import { categoriesForKind, defaultCategoryIdForKind } from '@/src/data/categories';
import { findConceptById, flattenSpendSubs } from '@/src/data/spendConcepts';
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
import type { PaymentMethod } from '@/src/types/finance';
import { categoryLabel } from '@/src/utils/categoryLabel';
import { incomeDestinationAccounts } from '@/src/utils/netWorth';
import { notifyExpenseRegistered } from '@/src/utils/notifications';
import { movementNotifyCopy } from '@/src/utils/movementNotify';
import { tapFeedback } from '@/src/utils/selectFeedback';
import { CategorySuggestionHint } from '@/src/components/CategorySuggestionHint';
import { AccountChoiceChips } from '@/src/components/AccountChoiceChips';
import { CategorySearch, CATEGORY_SEARCH_MIN_SUBS } from '@/src/components/CategorySearch';
import { ConceptIcon } from '@/src/components/ConceptIcon';
import { InlineSubAdd } from '@/src/components/InlineSubAdd';
import { InstallmentPayScopePicker } from '@/src/components/InstallmentPayScopePicker';
import { KeyboardSafeScroll } from '@/src/components/KeyboardSafe';
import { SpendSourcePicker, spendSourceFromMethod } from '@/src/components/SpendSourcePicker';
import { useKeyboardVisible } from '@/src/hooks/useKeyboardVisible';
import type { SavedMovement } from '@/src/components/ExpenseForm';
import {
  accountDisplayName,
  accountsForExpenseSource,
  defaultIncomeAccountId,
  defaultSpendAccountId,
  defaultTransferDestinationId,
  firstAccountId,
  liquidPocketsForPay,
  paymentMethodForAccount,
  pocketMoveAccounts,
} from '@/src/utils/accounts';
import {
  amountsMatch,
  inferInstallmentPayScope,
  installmentPayChoices,
  openDebts,
  payAccountIdForDebt,
  paymentSettlesInstallment,
  suggestedDebtPayAmount,
  type InstallmentPayScope,
} from '@/src/utils/debts';
import { appAlert } from '@/src/components/AppAlert';

type Props = {
  onSaved?: (result: SavedMovement) => void;
  initialIntent?: FriendlyIntent;
  initialDebtId?: string;
  /** When set, tapping "I spent" opens the one-screen quick form instead. */
  onPickSpend?: () => void;
  /** Back from the first step returns here (the quick form) instead of "What happened?". */
  onBackFromStart?: () => void;
};

export function FriendlyAddFlow({
  onSaved,
  initialIntent,
  initialDebtId,
  onPickSpend,
  onBackFromStart,
}: Props) {
  const { t } = useLanguage();
  const { format, formatPlain, parse, currency } = useMoney();
  const { settings, updateQuickTemplate, ensureSpendConceptSub } = useSettings();
  const { addTransaction, totalForPeriod, accounts, debts, transactions } = useFinance();
  const keyboardVisible = useKeyboardVisible();

  const spendConcepts = usePickableSpendConcepts();
  const liveDebts = useMemo(() => openDebts(debts), [debts]);
  const incomeAccounts = useMemo(() => incomeDestinationAccounts(accounts), [accounts]);

  // Arriving with an intent (from the quick form or a debt) skips "What happened?".
  const [step, setStep] = useState(() => (initialIntent ? 1 : 0));
  const [intent, setIntent] = useState<FriendlyIntent>(initialIntent ?? 'spend');
  const [amount, setAmount] = useState('');
  const [conceptId, setConceptId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState('cafe');
  const [debtId, setDebtId] = useState<string | null>(
    initialIntent === 'debt' ? initialDebtId ?? null : null
  );
  const [payScope, setPayScope] = useState<InstallmentPayScope | null>(null);
  const [method, setMethod] = useState<PaymentMethod>(() => {
    if (initialIntent === 'spend' && initialDebtId) return 'credit';
    const last = transactions.find((tx) => tx.type === 'expense');
    return last?.creditDebtId ? 'credit' : 'debit';
  });
  const [accountId, setAccountId] = useState(() => {
    if (initialIntent === 'spend' && initialDebtId) {
      return payAccountIdForDebt(initialDebtId);
    }
    const last = transactions.find((tx) => tx.type === 'expense');
    if (last?.creditDebtId) return payAccountIdForDebt(last.creditDebtId);
    return defaultSpendAccountId(accounts);
  });
  const [toAccountId, setToAccountId] = useState(() =>
    defaultTransferDestinationId(accounts, 'bank-main')
  );
  const [note, setNote] = useState('');
  const hint = useCategorySuggestion(note, spendConcepts);
  const [saving, setSaving] = useState(false);
  const [fromTemplate, setFromTemplate] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const savingLock = useRef(false);
  const checkFunds = useFundsCheck();
  const scrollRef = useRef<ScrollView>(null);

  const lastSpendAccountId = useMemo(() => {
    const match = categoryId
      ? transactions.find(
          (tx) =>
            tx.type === 'expense' && tx.categoryId === categoryId && (tx.accountId || tx.creditDebtId)
        )
      : undefined;
    const tx =
      match ??
      transactions.find((row) => row.type === 'expense' && (row.accountId || row.creditDebtId));
    if (tx?.creditDebtId) return payAccountIdForDebt(tx.creditDebtId);
    return tx?.accountId;
  }, [transactions, categoryId]);

  const methodAccounts = useMemo(
    () =>
      accountsForExpenseSource(accounts, method, {
        debts,
        debtLabel: (debt) =>
          debt.nameKey
            ? t(debt.nameKey as TranslationKey)
            : debt.name ?? t('debt.mainCard'),
      }),
    [accounts, method, debts, t]
  );

  const moveAccounts = useMemo(
    () => pocketMoveAccounts(accounts, 'transfer'),
    [accounts]
  );

  const accountChoices =
    intent === 'earn'
      ? incomeAccounts
      : intent === 'move'
        ? moveAccounts
        : intent === 'debt'
          ? liquidPocketsForPay(accounts)
          : methodAccounts;

  useEffect(() => {
    if (intent === 'earn') {
      const next = firstAccountId(incomeAccounts, accountId);
      if (next && next !== accountId) setAccountId(next);
      return;
    }
    if (intent === 'move') {
      const next = firstAccountId(moveAccounts, accountId);
      if (next && next !== accountId) setAccountId(next);
      const fromId = next && next !== accountId ? next : accountId;
      if (!toAccountId || toAccountId === fromId || !moveAccounts.some((a) => a.id === toAccountId)) {
        const dest =
          moveAccounts.find((a) => a.id !== fromId)?.id ??
          defaultTransferDestinationId(accounts, fromId);
        if (dest && dest !== toAccountId) setToAccountId(dest);
      }
      return;
    }
    if (intent === 'debt') {
      const pockets = liquidPocketsForPay(accounts);
      const next = firstAccountId(pockets, accountId);
      if (next && next !== accountId) setAccountId(next);
      return;
    }
    const next = firstAccountId(methodAccounts, accountId);
    if (next && next !== accountId) setAccountId(next);
  }, [intent, methodAccounts, incomeAccounts, moveAccounts, accountId, toAccountId, accounts]);

  const incomeChoices = useMemo(
    () => categoriesForKind('income', settings.enabledCategoryIds),
    [settings.enabledCategoryIds]
  );

  const selectedConcept = useMemo(
    () => (conceptId ? findConceptById(spendConcepts, conceptId) : undefined),
    [conceptId, spendConcepts]
  );

  const templates = FRIENDLY_TEMPLATES;

  const asksPaymentMethod = intent === 'spend' || intent === 'debt';
  const totalSteps = intent === 'spend' ? 6 : intent === 'move' ? 4 : 5;
  const progress = ((step + 1) / totalSteps) * 100;
  const paymentStep = intent === 'spend' ? 4 : intent === 'move' ? 2 : 3;
  const reviewStep = totalSteps - 1;

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

  const bootstrappedPay = useRef(false);
  useEffect(() => {
    if (bootstrappedPay.current || !initialDebtId) return;
    const debt = liveDebts.find((d) => d.id === initialDebtId);
    if (!debt) return;
    bootstrappedPay.current = true;
    if (initialIntent === 'spend') {
      setIntent('spend');
      setMethod('credit');
      setAccountId(payAccountIdForDebt(debt.id));
      setStep(1);
      return;
    }
    setIntent('debt');
    pickDebt(debt);
    setStep(1);
  }, [initialDebtId, initialIntent, liveDebts]);

  async function applyTemplate(id: string) {
    const tpl = FRIENDLY_TEMPLATES.find((x) => x.id === id);
    if (!tpl || applyingTemplate) return;
    tapFeedback();
    setApplyingTemplate(true);
    try {
      setIntent(tpl.intent);
      if (tpl.intent !== 'debt') {
        setDebtId(null);
        setPayScope(null);
      }
      if (tpl.amountHint) setAmount(String(tpl.amountHint));
      if (tpl.intent === 'move') {
        setAccountId(defaultIncomeAccountId(accounts));
        setToAccountId(
          tpl.id === 'tpl-save'
            ? accounts.find((a) => a.type === 'savings')?.id ?? 'savings'
            : defaultTransferDestinationId(accounts, 'bank-main')
        );
      }
      if (tpl.intent === 'earn') {
        setAccountId(defaultIncomeAccountId(accounts));
      }
      if (tpl.intent === 'spend') {
        if (lastSpendAccountId?.startsWith('debt:')) {
          setMethod('credit');
          setAccountId(lastSpendAccountId);
        } else {
          setMethod('debit');
          setAccountId(
            defaultSpendAccountId(accounts, {
              lastAccountId: lastSpendAccountId,
              amount: tpl.amountHint,
            })
          );
        }
      }

      if (tpl.intent === 'spend' && tpl.spend) {
        const path = await ensureSpendConceptSub({
          conceptId: tpl.spend.conceptId,
          conceptName: t(tpl.spend.conceptNameKey),
          subName: t(tpl.titleKey as TranslationKey),
          color: tpl.spend.color,
          isAnt: tpl.spend.isAnt,
        });
        if (!path) {
          appAlert(t('flow.chooseConcept'), t('flow.noConceptsBody'));
          return;
        }
        setConceptId(path.conceptId);
        setCategoryId(path.subId);
        setFromTemplate(true);
      } else {
        setConceptId(null);
        setCategoryId(tpl.intent === 'move' ? '' : (tpl.categoryId ?? 'otros'));
        setFromTemplate(false);
      }
      setStep(1);
    } finally {
      setApplyingTemplate(false);
    }
  }

  function goNext() {
    if (step === 1) {
      const parsed = parse(amount);
      if (!parsed) {
        appAlert(t('add.invalidTitle'), t('add.invalidMessage'), undefined, { tone: 'warning' });
        return;
      }
      if (
        fromTemplate &&
        intent === 'spend' &&
        conceptId &&
        categoryId
      ) {
        setStep(paymentStep);
        return;
      }
      if (intent === 'debt') {
        const debt = liveDebts.find((d) => d.id === debtId) ?? liveDebts[0];
        if (debt) pickDebt(debt);
      }
    }
    if (step === 2 && intent === 'debt') {
      if (liveDebts.length === 0) return;
      if (!debtId) {
        appAlert(t('flow.chooseDebt'), t('wealth.debtNeed'));
        return;
      }
      const choices = installmentPayChoices(liveDebts.find((d) => d.id === debtId));
      if (choices) {
        const parsed = parse(amount);
        const inferred = inferInstallmentPayScope(choices, parsed);
        if (!payScope) {
          appAlert(t('flow.payScopeTitle'), t('flow.payScopeNeed'));
          return;
        }
        if (payScope === 'cuota' && inferred !== 'cuota') {
          appAlert(t('flow.payScopeTitle'), t('flow.payScopeNeed'));
          setPayScope(inferred);
          return;
        }
        if (payScope === 'other' && !parsed) {
          appAlert(t('add.invalidTitle'), t('add.invalidMessage'), undefined, { tone: 'warning' });
          return;
        }
      }
    }
    if (step === 2 && intent === 'spend') {
      if (spendConcepts.length === 0) return;
      if (!conceptId) {
        appAlert(t('flow.chooseConcept'), t('flow.noConceptsBody'));
        return;
      }
      const concept = findConceptById(spendConcepts, conceptId);
      if (concept && concept.subs.length === 1) {
        setCategoryId(concept.subs[0].id);
        setStep(paymentStep);
        return;
      } else if (concept && !concept.subs.some((s) => s.id === categoryId)) {
        setCategoryId(concept.subs[0]?.id ?? categoryId);
      }
    }
    if (step === 3 && intent === 'spend') {
      const concept = conceptId ? findConceptById(spendConcepts, conceptId) : undefined;
      if (!concept || !concept.subs.some((s) => s.id === categoryId)) {
        appAlert(t('flow.chooseSub'), t('flow.noConceptsBody'));
        return;
      }
    }
    if (step === paymentStep && intent === 'spend' && method === 'credit') {
      if (!accountChoices.some((a) => a.id === accountId)) {
        appAlert(t('flow.whichCard'), t('flow.noCardsBody'));
        return;
      }
    }
    setStep((s) => Math.min(s + 1, totalSteps - 1));
  }

  async function save() {
    if (savingLock.current) return;
    const parsed = parse(amount);
    if (!parsed) {
      appAlert(t('add.invalidTitle'), t('add.invalidMessage'), undefined, { tone: 'warning' });
      return;
    }
    if (intent === 'debt' && payChoices) {
      const inferred = inferInstallmentPayScope(payChoices, parsed);
      if (!payScope || (payScope === 'cuota' && inferred !== 'cuota')) {
        appAlert(t('flow.payScopeTitle'), t('flow.payScopeNeed'));
        setPayScope(inferred);
        setStep(2);
        return;
      }
    }

    if (intent === 'move') {
      if (!accountId || !toAccountId || accountId === toAccountId) {
        appAlert(t('add.invalidTitle'), t('flow.moveNeedDistinct'), undefined, { tone: 'warning' });
        return;
      }
    }

    if (intent === 'spend' && method === 'credit') {
      if (!accountChoices.some((a) => a.id === accountId)) {
        appAlert(t('flow.whichCard'), t('flow.noCardsBody'));
        setStep(paymentStep);
        return;
      }
    }
    if (!checkFunds({ type: intentToType(intent), amount: parsed, accountId })) return;

    savingLock.current = true;
    setSaving(true);
    try {
      const type = intentToType(intent);
      const beforeExpense = totalForPeriod('hoy', 'expense');
      const beforeIncome = totalForPeriod('hoy', 'income');
      const selectedDebt = intent === 'debt' ? debts.find((d) => d.id === debtId) : undefined;
      const debtLabel = selectedDebt
        ? selectedDebt.nameKey
          ? t(selectedDebt.nameKey as TranslationKey)
          : selectedDebt.name ?? t('debt.mainCard')
        : '';
      const resolvedCategoryId =
        intent === 'move'
          ? undefined
          : intent === 'debt'
            ? selectedDebt?.categoryId ?? 'otros'
            : categoryId;

      await addTransaction({
        type,
        amount: parsed,
        categoryId: resolvedCategoryId,
        paymentMethod: asksPaymentMethod
          ? method === 'credit'
            ? method
            : paymentMethodForAccount(
                accounts.find((a) => a.id === accountId),
                method
              )
          : undefined,
        accountId,
        toAccountId: intent === 'move' ? toAccountId : undefined,
        debtId: intent === 'debt' ? debtId ?? undefined : undefined,
        note: intent === 'debt' ? note.trim() || debtLabel : note,
      });

      if (type === 'expense') {
        await updateQuickTemplate({
          categoryId,
          amount: parsed,
          note: note.trim() || undefined,
        });
      }

      // Never block save on notification permission / scheduling (esp. Android).
      if (settings.notifyOnExpense) {
        const copy = movementNotifyCopy({
          t,
          type,
          amount: formatPlain(parsed),
          transactions,
          spendConcepts,
          accounts,
          categoryId: resolvedCategoryId,
          accountId,
          toAccountId: intent === 'move' ? toAccountId : undefined,
          note,
          debtLabel: intent === 'debt' ? debtLabel : undefined,
          settled:
            intent === 'debt'
              ? paymentSettlesInstallment(selectedDebt, parsed)
              : undefined,
        });
        void notifyExpenseRegistered(copy.title, copy.body).catch(() => undefined);
      }

      if (type === 'expense') {
        onSaved?.({
          kind: 'expense',
          amount: beforeExpense + parsed,
          added: parsed,
          categoryId: resolvedCategoryId,
        });
      } else if (type === 'income') {
        onSaved?.({
          kind: 'income',
          amount: beforeIncome + parsed,
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

  const hideNext =
    (intent === 'debt' && step === 2 && liveDebts.length === 0) ||
    (intent === 'spend' && step === 2 && spendConcepts.length === 0);

  return (
    <View style={styles.wrap}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
      <Text style={styles.stepLabel}>
        {t('flow.stepOf', { current: step + 1, total: totalSteps })}
      </Text>

      <KeyboardSafeScroll
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.body}>
        {step === 0 ? (
          <Animated.View entering={FadeInDown.springify()} style={styles.block}>
            <Text style={styles.title}>{t('flow.whatHappened')}</Text>
            <View style={styles.intentGrid}>
              {FRIENDLY_INTENTS.map((item) => (
                <Pressable
                  accessibilityRole="button"
                  key={item.id}
                  onPress={() => {
                    tapFeedback();
                    if (item.id === 'spend' && onPickSpend) {
                      onPickSpend();
                      return;
                    }
                    setFromTemplate(false);
                    setIntent(item.id);
                    if (item.id !== 'debt') {
                      setDebtId(null);
                      setPayScope(null);
                    }
                    if (item.id === 'earn') {
                      setConceptId(null);
                      setCategoryId(
                        defaultCategoryIdForKind('income', settings.enabledCategoryIds)
                      );
                      setAccountId(defaultIncomeAccountId(accounts));
                    }
                    if (item.id === 'spend') {
                      setConceptId(null);
                      setCategoryId('');
                      setAccountId(
                        defaultSpendAccountId(accounts, {
                          lastAccountId: lastSpendAccountId,
                          amount: parse(amount) ?? undefined,
                        })
                      );
                    }
                    if (item.id === 'move') {
                      setConceptId(null);
                      setCategoryId('');
                      setAccountId(defaultIncomeAccountId(accounts));
                      setToAccountId(
                        defaultTransferDestinationId(
                          accounts,
                          defaultIncomeAccountId(accounts)
                        )
                      );
                    }
                    if (item.id === 'debt') {
                      setConceptId(null);
                      setCategoryId('otros');
                      setDebtId(liveDebts[0]?.id ?? null);
                    }
                    goNext();
                  }}
                  style={styles.intentCard}>
                  <Text style={styles.emoji}>{item.emoji}</Text>
                  <Text style={styles.intentTitle}>
                    {t(item.titleKey as TranslationKey)}
                  </Text>
                  <Text style={styles.intentSub}>
                    {t(item.subtitleKey as TranslationKey)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.section}>{t('flow.pickTemplate')}</Text>
            <View style={styles.tplGrid}>
              {templates.map((tpl) => (
                <Pressable
                  accessibilityRole="button"
                  key={tpl.id}
                  onPress={() => void applyTemplate(tpl.id)}
                  disabled={applyingTemplate}
                  style={[styles.tplCard, applyingTemplate && { opacity: 0.6 }]}>
                  <Text style={styles.emoji}>{tpl.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tplTitle}>
                      {t(tpl.titleKey as TranslationKey)}
                    </Text>
                    <Text style={styles.tplSub}>
                      {t(tpl.subtitleKey as TranslationKey)}
                    </Text>
                    {tpl.amountHint ? (
                      <Text style={styles.tplAmount}>
                        {t('flow.suggested')}: {format(tpl.amountHint)}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        ) : null}

        {step === 1 ? (
          <Animated.View entering={FadeInDown.springify()} style={styles.block}>
            <Text style={styles.title}>{t('flow.howMuch')}</Text>
            <View style={styles.amountRow}>
              <Text style={styles.currency} maxFontSizeMultiplier={1.2}>
                $
              </Text>
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
            <Text style={styles.amountHint}>
              {t('add.amountDecimalHint')}
            </Text>
          </Animated.View>
        ) : null}

        {step === 2 && intent !== 'move' ? (
          <Animated.View entering={FadeInDown.springify()} style={styles.block}>
            {intent === 'debt' ? (
              <>
                <Text style={styles.title}>{t('flow.chooseDebt')}</Text>
                {liveDebts.length === 0 ? (
                  <View style={styles.emptyDebt}>
                    <Text style={styles.emptyDebtTitle}>{t('flow.noDebtsTitle')}</Text>
                    <Text style={styles.emptyDebtBody}>{t('flow.noDebtsBody')}</Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => router.replace('/(tabs)/wealth')}
                      style={styles.wealthBtn}>
                      <Text style={styles.wealthBtnText}>{t('flow.goToWealth')}</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.catGrid}>
                    {liveDebts.map((debt) => {
                      const label = debt.nameKey
                        ? t(debt.nameKey as TranslationKey)
                        : debt.name ?? t('debt.mainCard');
                      const selected = debt.id === debtId;
                      return (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityState={{ selected: !!selected }}
                          key={debt.id}
                          onPress={() => {
                            tapFeedback();
                            pickDebt(debt);
                          }}
                          style={[styles.catCard, selected && styles.catCardOn]}>
                          <Text style={[styles.catText, selected && styles.catTextOn]}>
                            {label}
                          </Text>
                          <Text style={[styles.catSub, selected && styles.catTextOn]}>
                            {format(debt.balance)}
                            {debt.installment > 0
                              ? ` · ${t('wealth.installment', { amount: format(debt.installment) })}`
                              : ''}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
                {payChoices ? (
                  <>
                    <InstallmentPayScopePicker
                      choices={payChoices}
                      scope={payScope}
                      onChange={applyPayScope}
                    />
                    {payScope === 'other' ? (
                      <View style={[styles.amountRow, { marginTop: 12 }]}>
                        <Text style={styles.currency} maxFontSizeMultiplier={1.2}>
                          $
                        </Text>
                        <TextInput
                          value={formatAmountTyping(amount, currency)}
                          onChangeText={(text) => setAmount(formatAmountTyping(text, currency))}
                          keyboardType="decimal-pad"
                          placeholder="0"
                          placeholderTextColor={palette.inkSoft}
                          style={styles.amountInput}
                          maxFontSizeMultiplier={1.2}
                        />
                      </View>
                    ) : null}
                  </>
                ) : null}
              </>
            ) : intent === 'spend' ? (
              <>
                <Text style={styles.title}>{t('flow.chooseConcept')}</Text>
                {spendConcepts.length === 0 ? (
                  <View style={styles.emptyDebt}>
                    <Text style={styles.emptyDebtTitle}>{t('flow.noConceptsTitle')}</Text>
                    <Text style={styles.emptyDebtBody}>{t('flow.noConceptsBody')}</Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => router.replace('/(tabs)/plan')}
                      style={styles.wealthBtn}>
                      <Text style={styles.wealthBtnText}>{t('flow.goToPlan')}</Text>
                    </Pressable>
                  </View>
                ) : (
                  <>
                  {flattenSpendSubs(spendConcepts).length > CATEGORY_SEARCH_MIN_SUBS ? (
                    <CategorySearch
                      concepts={spendConcepts}
                      onPick={(pickedConceptId, subId) => {
                        setConceptId(pickedConceptId);
                        setCategoryId(subId);
                        setStep(paymentStep);
                      }}
                    />
                  ) : null}
                  <View style={styles.catGrid}>
                    {spendConcepts.map((concept) => {
                      const selected = concept.id === conceptId;
                      return (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityState={{ selected: !!selected }}
                          key={concept.id}
                          onPress={() => {
                            setConceptId(concept.id);
                            if (!concept.subs.some((s) => s.id === categoryId)) {
                              setCategoryId(concept.subs[0]?.id ?? '');
                            }
                          }}
                          style={[styles.catCard, styles.catCardWithIcon, selected && styles.catCardOn]}>
                          <ConceptIcon
                            icon={concept.icon}
                            color={selected ? palette.white : concept.color}
                            size={18}
                          />
                          <Text style={[styles.catText, selected && styles.catTextOn]}>
                            {concept.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  </>
                )}
              </>
            ) : intent === 'earn' ? (
              <>
                <Text style={styles.title}>{t('flow.chooseCategory')}</Text>
                <View style={styles.catGrid}>
                  {incomeChoices.map((cat) => {
                    const selected = cat.id === categoryId;
                    return (
                      <Pressable
                        accessibilityRole="button"
                        key={cat.id}
                        onPress={() => {
                          tapFeedback();
                          setCategoryId(cat.id);
                        }}
                        style={[
                          styles.catCard,
                          selected && {
                            backgroundColor: cat.color,
                            borderColor: cat.color,
                          },
                        ]}>
                        <Text
                          style={[styles.catText, selected && styles.catTextOn]}>
                          {categoryLabel(cat.id, t, spendConcepts)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : (
              <>
                <Text style={styles.title}>{t('flow.intent.move')}</Text>
              </>
            )}
          </Animated.View>
        ) : null}

        {step === 3 && intent === 'spend' ? (
          <Animated.View entering={FadeInDown.springify()} style={styles.block}>
            <Text style={styles.title}>{t('flow.chooseSub')}</Text>
            <View style={styles.catGrid}>
              {(selectedConcept?.subs ?? []).map((sub) => {
                const selected = sub.id === categoryId;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: !!selected }}
                    key={sub.id}
                    onPress={() => {
                      tapFeedback();
                      setCategoryId(sub.id);
                    }}
                    style={[styles.catCard, selected && styles.catCardOn]}>
                    <Text style={[styles.catText, selected && styles.catTextOn]}>
                      {sub.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {conceptId ? (
              <InlineSubAdd
                conceptId={conceptId}
                onAdded={(subId) => setCategoryId(subId)}
              />
            ) : null}
          </Animated.View>
        ) : null}

        {step === paymentStep ? (
          <Animated.View entering={FadeInDown.springify()} style={styles.block}>
            {intent === 'spend' ? (
              <>
                <Text style={styles.title}>{t('flow.howPaid')}</Text>
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
            ) : null}

            {intent === 'spend' &&
            method === 'credit' &&
            accountChoices.length === 0 ? null : (
              <>
            <Text
              style={[
                styles.title,
                intent === 'spend' ? { marginTop: 18, fontSize: 22 } : null,
              ]}>
              {intent === 'earn'
                ? t('flow.whichAccountIncome')
                : intent === 'debt'
                  ? t('flow.whichAccountPayDebt')
                  : method === 'credit' && intent !== 'move'
                    ? t('flow.whichCard')
                    : intent === 'spend'
                      ? t('flow.whichAccountSpend')
                      : t('flow.whichAccount')}
            </Text>
            {accountChoices.length === 0 ? (
              <Text style={styles.intentSub}>{t('flow.payAccountsEmpty')}</Text>
            ) : (
              <AccountChoiceChips
                variant={intent === 'move' ? 'card' : 'chip'}
                accounts={accountChoices}
                selectedId={accountId}
                onSelect={(id) => {
                  setAccountId(id);
                  if (intent === 'spend' && method !== 'credit') {
                    const acc = accounts.find((a) => a.id === id);
                    setMethod(paymentMethodForAccount(acc, method));
                  }
                }}
                allowAddWallet={
                  intent === 'earn' ||
                  intent === 'move' ||
                  intent === 'debt' ||
                  (intent === 'spend' && method !== 'credit')
                }
              />
            )}
              </>
            )}
            {intent === 'move' ? (
              <>
                <Text style={[styles.title, { marginTop: 18, fontSize: 24 }]}>
                  {t('flow.whichAccountTo')}
                </Text>
                <AccountChoiceChips
                  variant="card"
                  accounts={moveAccounts.filter((a) => a.id !== accountId)}
                  selectedId={toAccountId}
                  onSelect={setToAccountId}
                  allowAddWallet
                />
              </>
            ) : null}
          </Animated.View>
        ) : null}

        {step === reviewStep ? (
          <Animated.View entering={FadeInDown.springify()} style={styles.block}>
            <Text style={styles.title}>{t('flow.review')}</Text>
            <View style={styles.summary}>
              <SummaryLine
                label={t('flow.summaryAmount')}
                value={formatPlain(parse(amount) ?? 0)}
              />
              <SummaryLine
                label={t('flow.summaryType')}
                value={t(`type.${intentToType(intent)}` as TranslationKey)}
              />
              {intent !== 'move' ? (
                <SummaryLine
                  label={
                    intent === 'debt' ? t('flow.chooseDebt') : t('flow.summaryCategory')
                  }
                  value={
                    intent === 'debt'
                      ? (() => {
                          const debt = debts.find((d) => d.id === debtId);
                          if (!debt) return '—';
                          return debt.nameKey
                            ? t(debt.nameKey as TranslationKey)
                            : debt.name ?? t('debt.mainCard');
                        })()
                      : categoryLabel(categoryId, t, spendConcepts)
                  }
                />
              ) : null}
              {asksPaymentMethod && intent !== 'spend' ? (
                <SummaryLine
                  label={t('flow.summaryMethod')}
                  value={t(`method.${method}` as TranslationKey)}
                />
              ) : null}
              <SummaryLine
                label={
                  intent === 'earn'
                    ? t('flow.summaryAccountIncome')
                    : intent === 'spend' && method === 'credit'
                      ? t('flow.summaryChargedTo')
                      : intent === 'spend'
                        ? t('flow.summaryAccountSpend')
                        : t('flow.summaryAccount')
                }
                value={accountDisplayName(
                  accountChoices.find((a) => a.id === accountId) ??
                    accounts.find((a) => a.id === accountId) ?? {
                      nameKey: 'account.cash',
                    },
                  t
                )}
              />
              {intent === 'move' ? (
                <>
                  <SummaryLine
                    label={t('flow.summaryAccountTo')}
                    value={accountDisplayName(
                      accounts.find((a) => a.id === toAccountId) ?? {
                        nameKey: 'account.savings',
                      },
                      t
                    )}
                  />
                  <Text style={[styles.intentSub, { marginTop: 10 }]}>
                    {t('flow.movePreview', {
                      from: accountDisplayName(
                        accounts.find((a) => a.id === accountId) ?? {
                          nameKey: 'account.cash',
                        },
                        t
                      ),
                      to: accountDisplayName(
                        accounts.find((a) => a.id === toAccountId) ?? {
                          nameKey: 'account.savings',
                        },
                        t
                      ),
                      amount: formatPlain(parse(amount) ?? 0),
                    })}
                  </Text>
                  <Text style={[styles.intentSub, { marginTop: 6 }]}>
                    {t('flow.moveAvailableSame')}
                  </Text>
                </>
              ) : null}
            </View>
            <Text style={styles.noteLabel}>{t('flow.noteOptional')}</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder={t('add.notePlaceholder')}
              placeholderTextColor={palette.inkSoft}
              style={styles.noteInput}
              returnKeyType="done"
              blurOnSubmit
              onFocus={() => {
                setTimeout(() => {
                  scrollRef.current?.scrollToEnd({ animated: true });
                }, 280);
              }}
            />
            {intent === 'spend' ? (
              <CategorySuggestionHint
                hint={hint}
                selectedSubId={categoryId}
                onApply={(nextConceptId, subId) => {
                  setConceptId(nextConceptId);
                  setCategoryId(subId);
                }}
              />
            ) : null}
          </Animated.View>
        ) : null}
      </KeyboardSafeScroll>

      {keyboardVisible || step === 0 ? null : (
      <View style={styles.footer}>
        {step > 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              if (step === 1 && onBackFromStart) {
                onBackFromStart();
                return;
              }
              if (intent === 'spend' && step === paymentStep) {
                if (fromTemplate) {
                  setStep(1);
                  return;
                }
                const concept = conceptId
                  ? findConceptById(spendConcepts, conceptId)
                  : undefined;
                if (concept?.subs.length === 1) {
                  setStep(2);
                  return;
                }
              }
              setStep((s) => s - 1);
            }}
            style={styles.secondary}>
            <Text style={styles.secondaryText}>{t('flow.back')}</Text>
          </Pressable>
        ) : null}

        {step < totalSteps - 1 ? (
          hideNext ? null : (
            <Pressable accessibilityRole="button" onPress={goNext} style={styles.primary}>
              <Text style={styles.primaryText}>{t('flow.next')}</Text>
            </Pressable>
          )
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => void save()}
            disabled={saving || (intent === 'debt' && !debtId)}
            style={[styles.primary, saving && { opacity: 0.7 }]}>
            <Text style={styles.primaryText}>
              {saving ? t('add.saving') : t('flow.save')}
            </Text>
          </Pressable>
        )}
      </View>
      )}
    </View>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryLine}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.border,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E8EEF2',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: palette.accent,
    borderRadius: 999,
  },
  stepLabel: {
    marginTop: 10,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: palette.inkSoft,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  body: {
    paddingTop: 12,
    paddingBottom: 48,
    gap: 12,
  },
  block: { gap: 12 },
  title: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 28,
    color: palette.ink,
    letterSpacing: -0.5,
  },
  section: {
    marginTop: 8,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: palette.inkMuted,
  },
  intentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  intentCard: {
    width: '48%',
    backgroundColor: '#F7FAFC',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: palette.border,
    minHeight: 120,
  },
  emoji: { fontSize: 28, marginBottom: 8 },
  intentTitle: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 16,
    color: palette.ink,
  },
  intentSub: {
    marginTop: 4,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: palette.inkMuted,
    lineHeight: 16,
  },
  tplGrid: { gap: 8 },
  tplCard: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: '#FFF8F4',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,107,74,0.2)',
  },
  tplTitle: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: palette.ink,
  },
  tplSub: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: palette.inkMuted,
  },
  tplAmount: {
    marginTop: 2,
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 13,
    color: palette.accentDeep,
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
    fontSize: 36,
    color: palette.accent,
    marginBottom: 8,
  },
  amountInput: {
    flex: 1,
    fontFamily: 'Fraunces_700Bold',
    fontSize: 48,
    color: palette.ink,
    paddingVertical: 6,
  },
  amountHint: {
    marginTop: 8,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkMuted,
  },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catCard: {
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#F7FAFC',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  catCardWithIcon: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catCardOn: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  catText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: palette.ink,
  },
  catTextOn: { color: palette.white },
  catSub: {
    marginTop: 4,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: palette.inkMuted,
  },
  emptyDebt: {
    backgroundColor: '#F7FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 8,
  },
  emptyDebtTitle: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 16,
    color: palette.ink,
  },
  emptyDebtBody: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: palette.inkMuted,
    lineHeight: 20,
  },
  wealthBtn: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: palette.accent,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  wealthBtnText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: palette.white,
  },
  summary: {
    backgroundColor: '#F7FAFC',
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: palette.inkMuted,
  },
  summaryValue: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: palette.ink,
  },
  noteLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: palette.inkMuted,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'DMSans_400Regular',
    color: palette.ink,
    backgroundColor: '#fff',
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 8,
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
