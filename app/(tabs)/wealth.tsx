import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { WalletQuickAdd, BankQuickAdd } from '@/src/components/AccountChoiceChips';
import { CollapsibleSection } from '@/src/components/CollapsibleSection';
import { FadeInBlock } from '@/src/components/FadeInBlock';
import { HowToGuideButton } from '@/src/components/HowToGuideButton';
import { KeyboardSafeScroll } from '@/src/components/KeyboardSafe';
import { MoneyText } from '@/src/components/MoneyText';
import { RaisedText } from '@/src/components/RaisedText';
import { ScreenBackground } from '@/src/components/ScreenBackground';
import { findSpendSub } from '@/src/data/spendConcepts';
import { useFinance } from '@/src/hooks/useFinance';
import { useMoney } from '@/src/hooks/useMoney';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import type { TranslationKey } from '@/src/i18n/translations';
import { palette, radii } from '@/src/theme/colors';
import type { Debt, DebtKind, RevolvingProduct } from '@/src/types/finance';
import { categoryLabel } from '@/src/utils/categoryLabel';
import { tapFeedback } from '@/src/utils/selectFeedback';
import {
  accountDisplayName,
  accountGroupKey,
  isRemovableWallet,
  isRemovableBank,
  moneyPockets,
  sortAccountsByKind,
} from '@/src/utils/accounts';
import { isEditablePocketBalance } from '@/src/utils/ledger';
import {
  creditAvailable,
  debtKind,
  openDebts,
  parseNonNegativeAmount,
  productLabelKey,
  revolvingProduct,
} from '@/src/utils/debts';

function clampPayDay(raw: number): number | null {
  if (!Number.isFinite(raw)) return null;
  const day = Math.round(raw);
  if (day < 1 || day > 28) return null;
  return day;
}

function nextPaymentIsoFromDay(day: number, from = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), day, 12, 0, 0, 0);
  if (d.getTime() < from.getTime()) {
    d.setMonth(d.getMonth() + 1);
  }
  return d.toISOString();
}

function OptionChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <View style={styles.chipWrap}>
      {options.map((opt) => {
        const on = opt.id === value;
        return (
          <Pressable
            key={opt.id}
            onPress={() => {
              tapFeedback();
              onChange(opt.id);
            }}
            style={[styles.chip, on && styles.chipOn]}>
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function WealthScreen() {
  const { t, language } = useLanguage();
  const { format, parse } = useMoney();
  const { settings, ensureDebtCategory } = useSettings();
  const spendConcepts = settings.spendConcepts ?? [];
  const {
    accounts,
    debts,
    netWorth,
    addDebt,
    updateDebt,
    removeDebt,
    renameWallet,
    renameBank,
    removeWallet,
    removeBank,
    setAccountBalance,
    updateBudget,
    transactionsForPeriod,
  } = useFinance();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [accountsOpen, setAccountsOpen] = useState(true);
  const [cardsOpen, setCardsOpen] = useState(true);
  const [loansOpen, setLoansOpen] = useState(true);
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [installment, setInstallment] = useState('');
  const [payDay, setPayDay] = useState('1');
  const [kind, setKind] = useState<DebtKind>('installment');
  const [product, setProduct] = useState<RevolvingProduct>('card');
  const [creditLimit, setCreditLimit] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingWalletId, setEditingWalletId] = useState<string | null>(null);
  const [walletNameDraft, setWalletNameDraft] = useState('');
  const [savingWallet, setSavingWallet] = useState(false);
  const [editingBalanceId, setEditingBalanceId] = useState<string | null>(null);
  const [balanceDraft, setBalanceDraft] = useState('');
  const [savingBalance, setSavingBalance] = useState(false);

  const monthTx = transactionsForPeriod('mes', 'mine');
  const liveDebts = useMemo(() => openDebts(debts), [debts]);

  const cashAccounts = useMemo(() => moneyPockets(accounts), [accounts]);
  const groupedAccounts = useMemo(() => sortAccountsByKind(cashAccounts), [cashAccounts]);
  const revolvingDebts = useMemo(
    () => liveDebts.filter((d) => debtKind(d) === 'revolving'),
    [liveDebts]
  );
  const installmentDebts = useMemo(
    () => liveDebts.filter((d) => debtKind(d) !== 'revolving'),
    [liveDebts]
  );

  const paidByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of monthTx) {
      if (tx.type !== 'debt_payment' && tx.type !== 'expense') continue;
      if (!tx.categoryId) continue;
      map.set(tx.categoryId, (map.get(tx.categoryId) ?? 0) + tx.amount);
    }
    return map;
  }, [monthTx]);

  const loanMonthDue = installmentDebts.reduce((s, d) => s + (d.installment || 0), 0);
  const cardMonthDue = revolvingDebts.reduce((s, d) => s + (d.installment || 0), 0);
  const cardAvailableTotal = revolvingDebts.reduce((s, d) => s + creditAvailable(d), 0);
  const paidLoansThisMonth = installmentDebts.reduce((sum, debt) => {
    if (!debt.categoryId) return sum;
    return sum + (paidByCategory.get(debt.categoryId) ?? 0);
  }, 0);
  const paidCardsThisMonth = revolvingDebts.reduce((sum, debt) => {
    if (!debt.categoryId) return sum;
    return sum + (paidByCategory.get(debt.categoryId) ?? 0);
  }, 0);

  function resetForm() {
    setName('');
    setBalance('');
    setInstallment('');
    setPayDay('1');
    setKind('installment');
    setProduct('card');
    setCreditLimit('');
    setEditingId(null);
    setShowForm(false);
  }

  function startCreate(nextKind: DebtKind) {
    tapFeedback();
    if (showForm && !editingId && kind === nextKind) {
      resetForm();
      return;
    }
    setEditingId(null);
    setName('');
    setBalance('');
    setInstallment('');
    setPayDay('1');
    setKind(nextKind);
    setProduct('card');
    setCreditLimit('');
    setShowForm(true);
    if (nextKind === 'revolving') setCardsOpen(true);
    else setLoansOpen(true);
  }

  function startEdit(debt: Debt) {
    tapFeedback();
    const label = debt.nameKey
      ? t(debt.nameKey as TranslationKey)
      : debt.name ?? '';
    const day = new Date(debt.nextPaymentDate).getDate();
    const nextKind = debtKind(debt);
    setEditingId(debt.id);
    setName(label);
    setBalance(String(debt.balance || ''));
    setInstallment(String(debt.installment || ''));
    setPayDay(String(Number.isNaN(day) ? 1 : Math.min(28, Math.max(1, day))));
    setKind(nextKind);
    setProduct(revolvingProduct(debt));
    setCreditLimit(debt.creditLimit ? String(debt.creditLimit) : '');
    setShowForm(true);
    if (nextKind === 'revolving') setCardsOpen(true);
    else setLoansOpen(true);
  }

  async function handleSaveDebt() {
    const revolving = kind === 'revolving';
    const parsedLimit = revolving ? parse(creditLimit) : null;
    const parsedBalance = revolving
      ? parseNonNegativeAmount(balance, parse)
      : parse(balance);
    const parsedInstallment = revolving
      ? parseNonNegativeAmount(installment, parse)
      : parse(installment);
    if (!name.trim()) {
      Alert.alert(
        revolving ? t('wealth.addCard') : t('wealth.addLoan'),
        revolving ? t('wealth.debtNeedRevolving') : t('wealth.debtNeed')
      );
      return;
    }
    if (revolving) {
      if (!parsedLimit) {
        Alert.alert(t('wealth.addCard'), t('wealth.debtNeedLimit'));
        return;
      }
      if (parsedBalance == null || parsedInstallment == null) {
        Alert.alert(t('wealth.addCard'), t('wealth.debtNeedRevolving'));
        return;
      }
    } else if (!parsedBalance || !parsedInstallment) {
      Alert.alert(t('wealth.addLoan'), t('wealth.debtNeed'));
      return;
    }
    const day = clampPayDay(Number(payDay.replace(',', '.')));
    if (!day) {
      Alert.alert(
        revolving ? t('wealth.addCard') : t('wealth.addLoan'),
        t('wealth.debtPayDayNeed')
      );
      return;
    }
    const nextPaymentDate = nextPaymentIsoFromDay(day);

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        balance: parsedBalance as number,
        installment: parsedInstallment as number,
        interestRate: 0,
        nextPaymentDate,
        kind,
        revolvingProduct: revolving ? product : undefined,
        creditLimit: revolving ? parsedLimit ?? undefined : undefined,
      };
      if (editingId) {
        const existing = debts.find((d) => d.id === editingId);
        const categoryId =
          existing?.categoryId ?? (await ensureDebtCategory(name.trim()));
        await updateDebt(editingId, { ...payload, categoryId });
        await updateBudget(categoryId, parsedInstallment as number);
      } else {
        const categoryId = await ensureDebtCategory(name.trim());
        await addDebt({ ...payload, categoryId });
        await updateBudget(categoryId, parsedInstallment as number);
      }
      resetForm();
    } finally {
      setSaving(false);
    }
  }

  function confirmRemove(id: string, label: string) {
    Alert.alert(t('wealth.debtDelete'), label, [
      { text: t('history.cancel'), style: 'cancel' },
      {
        text: t('wealth.debtDelete'),
        style: 'destructive',
        onPress: () => {
          if (editingId === id) resetForm();
          void removeDebt(id);
        },
      },
    ]);
  }

  function renderDebtForm() {
    const revolving = kind === 'revolving';
    return (
      <View style={styles.form}>
        {editingId ? (
          <Text style={styles.formTitle}>{t('wealth.debtEditing')}</Text>
        ) : null}
        {revolving ? (
          <>
            <Text style={styles.label}>{t('wealth.productLabel')}</Text>
            <OptionChips
              value={product}
              onChange={setProduct}
              options={[
                { id: 'card', label: t('wealth.productCard') },
                { id: 'credicheque', label: t('wealth.productCredicheque') },
                { id: 'line', label: t('wealth.productLine') },
              ]}
            />
          </>
        ) : null}
        <Text style={styles.label}>{t('wealth.debtName')}</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={
            revolving
              ? t('wealth.debtNamePlaceholderRevolving')
              : t('wealth.debtNamePlaceholder')
          }
          placeholderTextColor={palette.inkSoft}
          style={styles.input}
        />
        {revolving ? (
          <>
            <Text style={styles.label}>{t('wealth.debtLimit')}</Text>
            <TextInput
              value={creditLimit}
              onChangeText={setCreditLimit}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={palette.inkSoft}
              style={styles.input}
            />
          </>
        ) : null}
        <Text style={styles.label}>
          {revolving ? t('wealth.debtUsed') : t('wealth.debtBalance')}
        </Text>
        <TextInput
          value={balance}
          onChangeText={setBalance}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={palette.inkSoft}
          style={styles.input}
        />
        <Text style={styles.label}>
          {revolving ? t('wealth.debtMonthPay') : t('wealth.debtInstallment')}
        </Text>
        <TextInput
          value={installment}
          onChangeText={setInstallment}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={palette.inkSoft}
          style={styles.input}
        />
        <Text style={styles.label}>{t('wealth.debtPayDay')}</Text>
        <TextInput
          value={payDay}
          onChangeText={setPayDay}
          keyboardType="number-pad"
          placeholder="1"
          placeholderTextColor={palette.inkSoft}
          style={styles.input}
        />
        <Text style={styles.copyHint}>{t('wealth.debtPayDayHint')}</Text>
        <View style={styles.formActions}>
          <Pressable
            onPress={() => {
              tapFeedback();
              resetForm();
            }}
            style={styles.secondaryBtn}>
            <Text style={styles.secondaryBtnText}>{t('wealth.debtCancel')}</Text>
          </Pressable>
          <Pressable
            onPress={() => void handleSaveDebt()}
            disabled={saving}
            style={[styles.saveBtn, styles.saveBtnFlex]}>
            <Text style={styles.saveBtnText}>
              {saving
                ? t('add.saving')
                : editingId
                  ? t('wealth.debtUpdate')
                  : t('wealth.debtSave')}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  function renderDebtItem(debt: Debt) {
    const label = debt.nameKey
      ? t(debt.nameKey as TranslationKey)
      : debt.name ?? t('debt.mainCard');
    const conceptLabel = debt.categoryId
      ? categoryLabel(debt.categoryId, t, spendConcepts)
      : label;
    const hit = debt.categoryId
      ? findSpendSub(spendConcepts, debt.categoryId)
      : null;
    const paid = debt.categoryId ? paidByCategory.get(debt.categoryId) ?? 0 : 0;
    const due = debt.installment || 0;
    const ratio = due > 0 ? paid / due : 0;
    const over = due > 0 && paid > due;
    const isEditing = editingId === debt.id;
    const revolving = debtKind(debt) === 'revolving';
    const available = creditAvailable(debt);
    const tag =
      revolving && revolvingProduct(debt) !== 'card'
        ? t(productLabelKey(revolvingProduct(debt)))
        : null;
    const showConcept =
      Boolean(hit) &&
      conceptLabel.trim().toLocaleLowerCase() !== label.trim().toLocaleLowerCase();
    const usedRatio =
      revolving && debt.creditLimit
        ? Math.min((debt.balance || 0) / debt.creditLimit, 1)
        : 0;

    return (
      <View key={debt.id} style={[styles.card, isEditing && styles.cardEditing]}>
        <View style={styles.sectionRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{label}</Text>
            {tag ? <Text style={styles.conceptChip}>{tag}</Text> : null}
            {showConcept ? (
              <Text style={styles.conceptChip}>
                {t('wealth.linkedConcept', { concept: conceptLabel })}
              </Text>
            ) : null}
          </View>
          <View style={styles.cardActions}>
            <Pressable onPress={() => startEdit(debt)}>
              <Text style={styles.editText}>{t('wealth.debtEdit')}</Text>
            </Pressable>
            <Pressable onPress={() => confirmRemove(debt.id, label)}>
              <Text style={styles.deleteText}>{t('wealth.debtDelete')}</Text>
            </Pressable>
          </View>
        </View>

        {revolving ? (
          <>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>{t('wealth.cardsOwed')}</Text>
              <MoneyText style={styles.metricValue}>{format(debt.balance)}</MoneyText>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>{t('wealth.cardsAvailable')}</Text>
              <MoneyText style={styles.metricValue}>{format(available)}</MoneyText>
            </View>
            {debt.creditLimit ? (
              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${usedRatio * 100}%`,
                      backgroundColor:
                        usedRatio >= 1
                          ? palette.danger
                          : usedRatio >= 0.8
                            ? palette.accent
                            : palette.teal,
                    },
                  ]}
                />
              </View>
            ) : null}
            <View style={[styles.metricRow, { marginTop: 10 }]}>
              <Text style={styles.metricLabel}>{t('wealth.cardsToPay')}</Text>
              <MoneyText style={styles.metricValue}>{format(due)}</MoneyText>
            </View>
          </>
        ) : (
          <>
            <MoneyText style={styles.amount}>{format(debt.balance)}</MoneyText>
            <Text style={styles.meta}>{t('wealth.balanceLeft')}</Text>
            {due > 0 ? (
              <Text style={styles.meta}>
                {t('wealth.installment', { amount: format(due) })}
              </Text>
            ) : null}
          </>
        )}

        {paid > 0 ? (
          <>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  {
                    width: `${Math.min(ratio * 100, 100)}%`,
                    backgroundColor: over ? palette.danger : palette.teal,
                  },
                ]}
              />
            </View>
            <Text style={[styles.meta, over && { color: palette.danger }]}>
              {t('wealth.monthProgress', {
                paid: format(paid),
                due: format(due),
              })}
            </Text>
          </>
        ) : null}
        <Text style={styles.meta}>
          {t('wealth.next', {
            date: new Date(debt.nextPaymentDate).toLocaleDateString(
              language === 'es' ? 'es-CO' : 'en-US'
            ),
          })}
        </Text>
        <View style={styles.debtActions}>
          {revolving ? (
            <Pressable
              onPress={() => {
                tapFeedback();
                router.push({
                  pathname: '/agregar',
                  params: { intent: 'spend', debtId: debt.id },
                });
              }}
              style={[styles.payBtn, styles.chargeBtn]}>
              <Text style={styles.payBtnText}>{t('wealth.chargeSpend')}</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => {
              tapFeedback();
              router.push({
                pathname: '/agregar',
                params: { intent: 'debt', debtId: debt.id },
              });
            }}
            style={styles.payBtn}>
            <Text style={styles.payBtnText}>
              {revolving ? t('wealth.payCard') : t('wealth.payInstallment')}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  function startRenameWallet(acc: { id: string; name?: string; nameKey: string }) {
    tapFeedback();
    setAccountsOpen(true);
    setEditingBalanceId(null);
    setBalanceDraft('');
    setEditingWalletId(acc.id);
    setWalletNameDraft(accountDisplayName(acc, t));
  }

  function startEditBalance(acc: {
    id: string;
    balance: number;
    type: 'cash' | 'bank' | 'savings' | 'wallet' | 'investment' | 'credit' | 'other';
  }) {
    if (!isEditablePocketBalance(acc.type)) return;
    tapFeedback();
    setAccountsOpen(true);
    setEditingWalletId(null);
    setWalletNameDraft('');
    setEditingBalanceId(acc.id);
    setBalanceDraft(String(acc.balance || ''));
  }

  async function handleSaveBalance() {
    if (!editingBalanceId || savingBalance) return;
    const parsed = parseNonNegativeAmount(balanceDraft, parse);
    if (parsed == null) {
      Alert.alert(t('wealth.balanceEdit'), t('wealth.balanceNeed'));
      return;
    }
    setSavingBalance(true);
    try {
      const result = await setAccountBalance(editingBalanceId, parsed);
      if ('error' in result) {
        Alert.alert(t('wealth.balanceEdit'), t('wealth.balanceNeed'));
        return;
      }
      setEditingBalanceId(null);
      setBalanceDraft('');
    } finally {
      setSavingBalance(false);
    }
  }

  async function handleSaveWalletName() {
    if (!editingWalletId || savingWallet) return;
    const current = accounts.find((a) => a.id === editingWalletId);
    setSavingWallet(true);
    try {
      const result =
        current?.type === 'bank'
          ? await renameBank(editingWalletId, walletNameDraft)
          : await renameWallet(editingWalletId, walletNameDraft);
      if ('error' in result) {
        Alert.alert(
          t('wealth.walletRename'),
          result.error === 'duplicate'
            ? current?.type === 'bank'
              ? t('wealth.bankNameTaken')
              : t('wealth.walletNameTaken')
            : current?.type === 'bank'
              ? t('wealth.bankNameNeed')
              : t('wealth.walletNameNeed')
        );
        return;
      }
      setEditingWalletId(null);
      setWalletNameDraft('');
    } finally {
      setSavingWallet(false);
    }
  }

  function confirmRemovePocket(
    id: string,
    label: string,
    balance: number,
    kind: 'wallet' | 'bank'
  ) {
    const deleteTitle =
      kind === 'bank' ? t('wealth.bankDelete') : t('wealth.walletDelete');
    if (Math.abs(balance) >= 0.01) {
      Alert.alert(deleteTitle, t('wealth.walletDeleteNeedEmpty'));
      return;
    }
    Alert.alert(deleteTitle, label, [
      { text: t('history.cancel'), style: 'cancel' },
      {
        text: deleteTitle,
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const result =
              kind === 'bank' ? await removeBank(id) : await removeWallet(id);
            if ('error' in result) {
              Alert.alert(
                deleteTitle,
                result.error === 'hasBalance'
                  ? t('wealth.walletDeleteNeedEmpty')
                  : t('wealth.walletDeleteProtected')
              );
              return;
            }
            if (editingWalletId === id) {
              setEditingWalletId(null);
              setWalletNameDraft('');
            }
          })();
        },
      },
    ]);
  }

  return (
    <ScreenBackground>
      <KeyboardSafeScroll
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <FadeInBlock>
          <View style={styles.titleRow}>
            <RaisedText style={styles.title}>{t('wealth.title')}</RaisedText>
            <HowToGuideButton light variant="chip" />
          </View>
          <Text style={styles.subtitle}>{t('wealth.subtitle')}</Text>
          <View style={styles.netBox}>
            <Text style={styles.netLabel}>{t('wealth.net')}</Text>
            <MoneyText style={styles.netValue}>{format(netWorth.net)}</MoneyText>
            <Text style={styles.meta}>
              {t('wealth.assets')}: {format(netWorth.assets)}
            </Text>
            <Text style={styles.meta}>
              {t('wealth.liabilities')}: {format(netWorth.liabilities)}
            </Text>
          </View>
        </FadeInBlock>

        <FadeInBlock index={1}>
          <CollapsibleSection
            title={t('wealth.accounts')}
            open={accountsOpen}
            onToggle={() => setAccountsOpen((v) => !v)}
            summary={t('wealth.accountsCollapsed', { count: cashAccounts.length })}>
            <Text style={styles.accountsHint}>{t('wealth.accountsHint')}</Text>
            {groupedAccounts.map((acc, index) => {
              const canRename = acc.type === 'wallet' || acc.type === 'bank';
              const canEditBalance = isEditablePocketBalance(acc.type);
              const canRemove =
                isRemovableWallet(acc) || isRemovableBank(acc);
              const renaming = editingWalletId === acc.id;
              const editingBal = editingBalanceId === acc.id;
              const label = accountDisplayName(acc, t);
              const prevType = groupedAccounts[index - 1]?.type;
              const showGroup = acc.type !== prevType;
              return (
                <View key={acc.id}>
                  {showGroup ? (
                    <Text
                      style={[
                        styles.groupLabel,
                        index === 0 && styles.groupLabelFirst,
                      ]}>
                      {t(accountGroupKey(acc.type))}
                    </Text>
                  ) : null}
                  <View
                    style={[
                      styles.card,
                      (renaming || editingBal) && styles.cardEditing,
                    ]}>
                  <View style={styles.sectionRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{label}</Text>
                    </View>
                    <View style={styles.cardActions}>
                      {canEditBalance ? (
                        <Pressable onPress={() => startEditBalance(acc)}>
                          <Text style={styles.editText}>{t('wealth.balanceEdit')}</Text>
                        </Pressable>
                      ) : null}
                      {canRename ? (
                        <Pressable onPress={() => startRenameWallet(acc)}>
                          <Text style={styles.editText}>{t('wealth.walletRename')}</Text>
                        </Pressable>
                      ) : null}
                      {canRemove ? (
                        <Pressable
                          onPress={() =>
                            confirmRemovePocket(
                              acc.id,
                              label,
                              acc.balance,
                              acc.type === 'bank' ? 'bank' : 'wallet'
                            )
                          }>
                          <Text style={styles.deleteText}>
                            {acc.type === 'bank'
                              ? t('wealth.bankDelete')
                              : t('wealth.walletDelete')}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                  <MoneyText
                    style={[
                      styles.amount,
                      acc.balance < 0 ? styles.amountDebt : null,
                    ]}>
                    {acc.balance < 0
                      ? t('wealth.accountOwes', { amount: format(Math.abs(acc.balance)) })
                      : format(acc.balance)}
                  </MoneyText>
                  {editingBal ? (
                    <View style={styles.walletRename}>
                      <TextInput
                        value={balanceDraft}
                        onChangeText={setBalanceDraft}
                        placeholder={t('wealth.balancePlaceholder')}
                        placeholderTextColor={palette.inkSoft}
                        style={styles.input}
                        keyboardType="decimal-pad"
                        autoFocus
                        onSubmitEditing={() => void handleSaveBalance()}
                        returnKeyType="done"
                      />
                      <View style={styles.formActions}>
                        <Pressable
                          onPress={() => {
                            tapFeedback();
                            setEditingBalanceId(null);
                            setBalanceDraft('');
                          }}
                          style={styles.secondaryBtn}>
                          <Text style={styles.secondaryBtnText}>
                            {t('wealth.debtCancel')}
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => void handleSaveBalance()}
                          disabled={savingBalance || !balanceDraft.trim()}
                          style={[
                            styles.saveBtn,
                            styles.saveBtnFlex,
                            (!balanceDraft.trim() || savingBalance) && {
                              opacity: 0.5,
                            },
                          ]}>
                          <Text style={styles.saveBtnText}>
                            {savingBalance
                              ? t('add.saving')
                              : t('wealth.balanceSave')}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : null}
                  {renaming ? (
                    <View style={styles.walletRename}>
                      <TextInput
                        value={walletNameDraft}
                        onChangeText={setWalletNameDraft}
                        placeholder={
                          acc.type === 'bank'
                            ? t('flow.bankNamePlaceholder')
                            : t('flow.walletNamePlaceholder')
                        }
                        placeholderTextColor={palette.inkSoft}
                        style={styles.input}
                        autoFocus
                        onSubmitEditing={() => void handleSaveWalletName()}
                        returnKeyType="done"
                      />
                      <View style={styles.formActions}>
                        <Pressable
                          onPress={() => {
                            tapFeedback();
                            setEditingWalletId(null);
                            setWalletNameDraft('');
                          }}
                          style={styles.secondaryBtn}>
                          <Text style={styles.secondaryBtnText}>
                            {t('wealth.debtCancel')}
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => void handleSaveWalletName()}
                          disabled={savingWallet || !walletNameDraft.trim()}
                          style={[
                            styles.saveBtn,
                            styles.saveBtnFlex,
                            (!walletNameDraft.trim() || savingWallet) && {
                              opacity: 0.5,
                            },
                          ]}>
                          <Text style={styles.saveBtnText}>
                            {savingWallet
                              ? t('add.saving')
                              : t('wealth.walletRenameSave')}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : null}
                </View>
                </View>
              );
            })}
          </CollapsibleSection>
          <View style={styles.addWalletCard}>
            <Text style={styles.addWalletHint}>{t('wealth.walletManageHint')}</Text>
            <WalletQuickAdd />
            <Text style={[styles.addWalletHint, { marginTop: 14 }]}>
              {t('wealth.bankManageHint')}
            </Text>
            <BankQuickAdd />
          </View>
        </FadeInBlock>

        <FadeInBlock index={2}>
          <CollapsibleSection
            title={t('wealth.cards')}
            open={cardsOpen}
            onToggle={() => setCardsOpen((v) => !v)}
            summary={
              revolvingDebts.length === 0
                ? t('wealth.cardsEmptyShort')
                : t('wealth.cardsCollapsed', {
                    count: revolvingDebts.length,
                    available: format(cardAvailableTotal),
                  })
            }>
            {!(showForm && kind === 'revolving') ? (
              <View style={styles.sectionRow}>
                <View style={{ flex: 1 }} />
                <Pressable onPress={() => startCreate('revolving')} style={styles.addBtn}>
                  <Text style={styles.addBtnText}>{t('wealth.addCard')}</Text>
                </Pressable>
              </View>
            ) : null}

            {revolvingDebts.length > 1 ? (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>{t('wealth.cardsMonth')}</Text>
                <MoneyText style={styles.amount}>{format(cardMonthDue)}</MoneyText>
                {paidCardsThisMonth > 0 ? (
                  <Text style={styles.meta}>
                    {t('wealth.fixedPaid', {
                      paid: format(paidCardsThisMonth),
                      due: format(cardMonthDue),
                    })}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {showForm && kind === 'revolving' ? renderDebtForm() : null}

            {revolvingDebts.length === 0 && !(showForm && kind === 'revolving') ? (
              <View style={styles.card}>
                <Text style={styles.empty}>{t('wealth.cardsEmpty')}</Text>
              </View>
            ) : null}

            {revolvingDebts.map((debt) => renderDebtItem(debt))}
          </CollapsibleSection>
        </FadeInBlock>

        <FadeInBlock index={3}>
          <CollapsibleSection
            title={t('wealth.loans')}
            open={loansOpen}
            onToggle={() => setLoansOpen((v) => !v)}
            summary={
              installmentDebts.length === 0
                ? t('wealth.loansEmptyShort')
                : t('wealth.loansCollapsed', {
                    count: installmentDebts.length,
                    amount: format(loanMonthDue),
                  })
            }>
            {!(showForm && kind === 'installment') ? (
              <View style={styles.sectionRow}>
                <View style={{ flex: 1 }} />
                <Pressable onPress={() => startCreate('installment')} style={styles.addBtn}>
                  <Text style={styles.addBtnText}>{t('wealth.addLoan')}</Text>
                </Pressable>
              </View>
            ) : null}

            {installmentDebts.length > 1 ? (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>{t('wealth.fixedMonth')}</Text>
                <MoneyText style={styles.amount}>{format(loanMonthDue)}</MoneyText>
                {paidLoansThisMonth > 0 ? (
                  <Text style={styles.meta}>
                    {t('wealth.fixedPaid', {
                      paid: format(paidLoansThisMonth),
                      due: format(loanMonthDue),
                    })}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {showForm && kind === 'installment' ? renderDebtForm() : null}

            {installmentDebts.length === 0 && !(showForm && kind === 'installment') ? (
              <View style={styles.card}>
                <Text style={styles.empty}>{t('wealth.loansEmpty')}</Text>
              </View>
            ) : null}

            {installmentDebts.map((debt) => renderDebtItem(debt))}
          </CollapsibleSection>
        </FadeInBlock>
      </KeyboardSafeScroll>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: 22, paddingBottom: 168, gap: 12 },
  addWalletCard: {
    marginTop: 12,
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: palette.border,
  },
  addWalletHint: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkMuted,
    lineHeight: 18,
    marginBottom: 10,
  },
  accountsHint: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.brandMuted,
    lineHeight: 18,
    marginBottom: 10,
  },
  groupLabel: {
    // Sits on the dark gradient, not on a card: grey was nearly invisible.
    fontFamily: 'DMSans_700Bold',
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 6,
  },
  groupLabelFirst: {
    marginTop: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 34,
    color: palette.brand,
  },
  subtitle: {
    marginTop: 6,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: palette.brandMuted,
    lineHeight: 20,
  },
  netBox: {
    marginTop: 14,
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.md,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
  },
  netLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: palette.inkMuted,
  },
  netValue: {
    marginTop: 4,
    fontFamily: 'Fraunces_700Bold',
    fontSize: 32,
    color: palette.ink,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  copyHintFlex: {
    flex: 1,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.brandMuted,
    lineHeight: 18,
  },
  copyHint: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkMuted,
    lineHeight: 18,
    marginBottom: 8,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  chip: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  chipOn: {
    borderColor: palette.accent,
    backgroundColor: palette.accentSoft,
  },
  chipText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.inkMuted,
  },
  chipTextOn: {
    color: palette.ink,
  },
  formTitle: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: palette.ink,
    marginBottom: 6,
  },
  addBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.sm,
    backgroundColor: palette.teal,
  },
  addBtnText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.white,
  },
  debtActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  payBtn: {
    flex: 1,
    backgroundColor: palette.accent,
    borderRadius: radii.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  chargeBtn: {
    backgroundColor: palette.teal,
  },
  payBtnText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: palette.white,
  },
  chargeHint: {
    marginTop: 8,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkMuted,
    lineHeight: 18,
  },
  summaryCard: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: palette.border,
    marginBottom: 10,
  },
  summaryTitle: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: palette.ink,
  },
  form: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: palette.border,
    marginBottom: 10,
    gap: 6,
  },
  formActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  label: {
    marginTop: 6,
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: palette.inkMuted,
  },
  input: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
    color: palette.ink,
    backgroundColor: '#fff',
  },
  saveBtn: {
    marginTop: 4,
    backgroundColor: palette.teal,
    borderRadius: radii.sm,
    paddingVertical: 12,
    alignItems: 'center',
    flex: 1,
  },
  saveBtnFlex: { flex: 1 },
  saveBtnText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: palette.white,
  },
  secondaryBtn: {
    marginTop: 4,
    flex: 1,
    borderRadius: radii.sm,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#fff',
  },
  secondaryBtnText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: palette.inkMuted,
  },
  card: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: palette.border,
    marginBottom: 10,
  },
  walletRename: {
    marginTop: 10,
    gap: 6,
  },
  cardEditing: {
    borderColor: palette.teal,
  },
  cardActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  cardTitle: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 16,
    color: palette.ink,
  },
  conceptChip: {
    marginTop: 2,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: palette.inkMuted,
  },
  amount: {
    marginTop: 8,
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 24,
    color: palette.ink,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  metricLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: palette.inkMuted,
    flexShrink: 1,
  },
  metricValue: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 20,
    color: palette.ink,
  },
  amountDebt: {
    color: palette.danger,
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
  },
  meta: {
    marginTop: 4,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkMuted,
  },
  track: {
    marginTop: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E8EEF1',
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 999 },
  editText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.teal,
  },
  deleteText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: palette.danger,
  },
  link: {
    marginTop: 8,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.teal,
  },
  empty: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: palette.inkMuted,
    lineHeight: 20,
  },
  hint: {
    marginTop: 4,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkMuted,
    lineHeight: 18,
  },
});
