import { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import {
  BankQuickAdd,
  InvestmentQuickAdd,
  WalletQuickAdd,
} from '@/src/components/AccountChoiceChips';
import { appAlert } from '@/src/components/AppAlert';
import { CollapsibleSection } from '@/src/components/CollapsibleSection';
import { MoneyText } from '@/src/components/MoneyText';
import { AppText } from '@/src/components/ui';
import { styles } from '@/src/components/wealth/styles';
import { useFinance } from '@/src/hooks/useFinance';
import { useMoney } from '@/src/hooks/useMoney';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { palette } from '@/src/theme/colors';
import type { Account } from '@/src/types/finance';
import { accountColors } from '@/src/utils/accountColors';
import {
  accountDisplayName,
  accountGroupKey,
  isRemovableBank,
  isRemovableInvestment,
  isRemovableWallet,
  moneyPockets,
  sortAccountsByKind,
} from '@/src/utils/accounts';
import { parseNonNegativeAmount } from '@/src/utils/debts';
import { isEditablePocketBalance } from '@/src/utils/ledger';
import { tapFeedback } from '@/src/utils/selectFeedback';

const ADD_KIND_LABEL = {
  wallet: 'wealth.addWallet',
  bank: 'wealth.addBank',
  investment: 'wealth.addInvestment',
} as const;

/** Money pockets (cash, banks, wallets, investments): add, rename, set balance, remove. */
export function PocketsSection() {
  const { t } = useLanguage();
  const { format, parse } = useMoney();
  const {
    accounts,
    renameWallet,
    renameBank,
    renameInvestment,
    removeInvestment,
    removeWallet,
    removeBank,
    setAccountBalance,
  } = useFinance();

  const [accountsOpen, setAccountsOpen] = useState(true);
  const [addKind, setAddKind] = useState<'wallet' | 'bank' | 'investment' | null>(null);
  const [openAccountId, setOpenAccountId] = useState<string | null>(null);
  const [editingWalletId, setEditingWalletId] = useState<string | null>(null);
  const [walletNameDraft, setWalletNameDraft] = useState('');
  const [savingWallet, setSavingWallet] = useState(false);
  const [editingBalanceId, setEditingBalanceId] = useState<string | null>(null);
  const [balanceDraft, setBalanceDraft] = useState('');
  const [savingBalance, setSavingBalance] = useState(false);

  const cashAccounts = useMemo(() => moneyPockets(accounts), [accounts]);
  const groupedAccounts = useMemo(() => sortAccountsByKind(cashAccounts), [cashAccounts]);
  /** One card per kind (cash, banks, wallets…), in sortAccountsByKind order. */
  const accountGroups = useMemo(() => {
    const groups: { type: Account['type']; items: Account[] }[] = [];
    for (const acc of groupedAccounts) {
      const last = groups[groups.length - 1];
      if (last && last.type === acc.type) last.items.push(acc);
      else groups.push({ type: acc.type, items: [acc] });
    }
    return groups;
  }, [groupedAccounts]);
  const accountTints = useMemo(
    () =>
      accountColors(
        groupedAccounts.map((acc) => ({
          id: acc.id,
          type: acc.type,
          label: accountDisplayName(acc, t),
        }))
      ),
    [groupedAccounts, t]
  );

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
      appAlert(t('wealth.balanceEdit'), t('wealth.balanceNeed'));
      return;
    }
    setSavingBalance(true);
    try {
      const result = await setAccountBalance(editingBalanceId, parsed);
      if ('error' in result) {
        appAlert(t('wealth.balanceEdit'), t('wealth.balanceNeed'));
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
      const kind = current?.type;
      const result =
        kind === 'bank'
          ? await renameBank(editingWalletId, walletNameDraft)
          : kind === 'investment'
            ? await renameInvestment(editingWalletId, walletNameDraft)
            : await renameWallet(editingWalletId, walletNameDraft);
      if ('error' in result) {
        const duplicate = result.error === 'duplicate';
        appAlert(
          t('wealth.walletRename'),
          kind === 'bank'
            ? t(duplicate ? 'wealth.bankNameTaken' : 'wealth.bankNameNeed')
            : kind === 'investment'
              ? t(duplicate ? 'invest.nameTaken' : 'invest.nameNeed')
              : t(duplicate ? 'wealth.walletNameTaken' : 'wealth.walletNameNeed')
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
    kind: 'wallet' | 'bank' | 'investment'
  ) {
    const deleteTitle =
      kind === 'bank'
        ? t('wealth.bankDelete')
        : kind === 'investment'
          ? t('invest.delete')
          : t('wealth.walletDelete');
    if (Math.abs(balance) >= 0.01) {
      appAlert(deleteTitle, t('wealth.walletDeleteNeedEmpty'));
      return;
    }
    appAlert(deleteTitle, label, [
      { text: t('history.cancel'), style: 'cancel' },
      {
        text: deleteTitle,
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const result =
              kind === 'bank'
                ? await removeBank(id)
                : kind === 'investment'
                  ? await removeInvestment(id)
                  : await removeWallet(id);
            if ('error' in result) {
              appAlert(
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
    <CollapsibleSection
      title={t('wealth.accounts')}
      open={accountsOpen}
      onToggle={() => setAccountsOpen((v) => !v)}
      summary={t('wealth.accountsCollapsed', { count: cashAccounts.length })}>
      <Text style={styles.accountsHint}>{t('wealth.accountsHint')}</Text>

      {/* Create first, then the list of what exists. */}
      <AppText variant="overline" color="tertiary" style={styles.groupLabelFirst}>
        {t('wealth.addTitle')}
      </AppText>
      <View style={styles.addKinds}>
        {(['wallet', 'bank', 'investment'] as const).map((kind) => {
          const on = addKind === kind;
          return (
            <Pressable
              key={kind}
              onPress={() => {
                tapFeedback();
                setAddKind(on ? null : kind);
              }}
              accessibilityRole="button"
              accessibilityState={{ expanded: on }}
              style={[styles.addKind, on && styles.addKindOn]}>
              <Text style={[styles.addKindText, on && styles.addKindTextOn]}>
                {t(ADD_KIND_LABEL[kind])}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {addKind ? (
        <View style={styles.addPanel}>
          {addKind === 'wallet' ? <WalletQuickAdd onAdded={() => setAddKind(null)} /> : null}
          {addKind === 'bank' ? <BankQuickAdd onAdded={() => setAddKind(null)} /> : null}
          {addKind === 'investment' ? (
            <InvestmentQuickAdd onAdded={() => setAddKind(null)} />
          ) : null}
        </View>
      ) : null}

      {accountGroups.map((group) => (
        <View key={group.type}>
          <AppText variant="overline" color="tertiary" style={styles.groupLabel}>
            {t(accountGroupKey(group.type))}
          </AppText>
          <View style={styles.groupCard}>
            {group.items.map((acc, index) => {
              const canRename =
                acc.type === 'wallet' || acc.type === 'bank' || acc.type === 'investment';
              const canEditBalance = isEditablePocketBalance(acc.type);
              const canRemove =
                isRemovableWallet(acc) || isRemovableBank(acc) || isRemovableInvestment(acc);
              const renaming = editingWalletId === acc.id;
              const editingBal = editingBalanceId === acc.id;
              const label = accountDisplayName(acc, t);
              const tint = accountTints.get(acc.id)!;
              const open = openAccountId === acc.id || renaming || editingBal;
              const hasActions = canEditBalance || canRename || canRemove;
              return (
                <View
                  key={acc.id}
                  style={[
                    styles.accRow,
                    index < group.items.length - 1 && styles.accRowDivider,
                  ]}>
                  <Pressable
                    onPress={() => {
                      if (!hasActions) return;
                      tapFeedback();
                      setOpenAccountId(open ? null : acc.id);
                    }}
                    accessibilityRole={hasActions ? 'button' : undefined}
                    accessibilityState={hasActions ? { expanded: open } : undefined}
                    style={styles.accMain}>
                    <View style={[styles.accBadge, { backgroundColor: tint.color }]}>
                      <Text style={[styles.accBadgeText, { color: tint.onColor }]}>
                        {label.trim().charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.accText}>
                      <Text style={[styles.accTitle, { color: tint.text }]} numberOfLines={1}>
                        {label}
                      </Text>
                      {acc.type === 'investment' && !acc.name ? (
                        <Text style={styles.cardHint}>{t('invest.whereHint')}</Text>
                      ) : null}
                    </View>
                    <MoneyText
                      style={[styles.accBalance, acc.balance < 0 ? styles.amountDebt : null]}>
                      {acc.balance < 0
                        ? t('wealth.accountOwes', { amount: format(Math.abs(acc.balance)) })
                        : format(acc.balance)}
                    </MoneyText>
                  </Pressable>

                  {open && !renaming && !editingBal ? (
                    <View style={styles.accActions}>
                      {canEditBalance ? (
                        <Pressable accessibilityRole="button" onPress={() => startEditBalance(acc)} hitSlop={6}>
                          <Text style={styles.editText}>{t('wealth.balanceEdit')}</Text>
                        </Pressable>
                      ) : null}
                      {canRename ? (
                        <Pressable accessibilityRole="button" onPress={() => startRenameWallet(acc)} hitSlop={6}>
                          <Text style={styles.editText}>{t('wealth.walletRename')}</Text>
                        </Pressable>
                      ) : null}
                      {canRemove ? (
                        <Pressable
                          accessibilityRole="button"
                          hitSlop={6}
                          onPress={() =>
                            confirmRemovePocket(
                              acc.id,
                              label,
                              acc.balance,
                              acc.type === 'bank'
                                ? 'bank'
                                : acc.type === 'investment'
                                  ? 'investment'
                                  : 'wallet'
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
                  ) : null}
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
                          accessibilityRole="button"
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
                          accessibilityRole="button"
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
                          accessibilityRole="button"
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
                          accessibilityRole="button"
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
              );
            })}
          </View>
        </View>
      ))}
    </CollapsibleSection>
  );
}
