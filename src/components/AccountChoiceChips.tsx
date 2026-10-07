import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useFinance } from '@/src/hooks/useFinance';
import { useMoney } from '@/src/hooks/useMoney';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { palette, radii } from '@/src/theme/colors';
import type { TranslationKey } from '@/src/i18n/translations';
import type { Account } from '@/src/types/finance';
import {
  BANK_PRESETS,
  WALLET_PRESETS,
  accountDisplayName,
  findBankByName,
  findInvestmentByName,
  findWalletByName,
  sortAccountsByKind,
} from '@/src/utils/accounts';
import { tapFeedback } from '@/src/utils/selectFeedback';

type Props = {
  accounts: Account[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** Kept for callers; both render the same compact two-step picker. */
  variant?: 'chip' | 'card';
  allowAddWallet?: boolean;
};

type Kind = Account['type'];

/**
 * Where the money comes from (or goes), taking one line once chosen:
 * "Wallets › Nequi · $20.000 · Change". Changing goes kind first (Cash,
 * Banks, Wallets, Savings, Credit cards); a kind with several accounts then
 * shows only those, with a way back.
 */
export function AccountChoiceChips({
  accounts,
  selectedId,
  onSelect,
  allowAddWallet = true,
}: Props) {
  const { t } = useLanguage();
  const { format } = useMoney();
  const selected = accounts.find((a) => a.id === selectedId);
  const [browsing, setBrowsing] = useState(!selected);
  const [openKind, setOpenKind] = useState<Kind | null>(null);
  // Adding a wallet is rare while registering: one chip opens the form.
  const [addingWallet, setAddingWallet] = useState(false);

  const groups: { kind: Kind; list: Account[] }[] = [];
  for (const acc of sortAccountsByKind(accounts)) {
    const group = groups.find((g) => g.kind === acc.type);
    if (group) group.list.push(acc);
    else groups.push({ kind: acc.type, list: [acc] });
  }
  if (allowAddWallet && !groups.some((g) => g.kind === 'wallet')) {
    groups.push({ kind: 'wallet', list: [] });
  }
  // One kind only (e.g. just cards): no kind step.
  const onlyGroup = groups.length === 1 ? groups[0] : null;
  const kindGroup = onlyGroup ?? groups.find((g) => g.kind === openKind) ?? null;

  const amountText = (acc: Account) =>
    acc.type === 'credit'
      ? t('flow.cardAvailable', { amount: format(acc.balance) })
      : format(acc.balance);
  const kindLabel = (kind: Kind) => t(`accountKind.${kind}` as TranslationKey);

  function choose(id: string) {
    tapFeedback();
    onSelect(id);
    setBrowsing(false);
    setOpenKind(null);
    setAddingWallet(false);
  }

  function pickKind(group: { kind: Kind; list: Account[] }) {
    if (group.list.length === 1) {
      choose(group.list[0].id);
      return;
    }
    tapFeedback();
    setOpenKind(group.kind);
    setAddingWallet(group.list.length === 0 && group.kind === 'wallet');
  }

  if (selected && !browsing) {
    const several = (groups.find((g) => g.kind === selected.type)?.list.length ?? 0) > 1;
    return (
      <View style={styles.summaryRow}>
        <Text style={styles.summaryText} numberOfLines={1}>
          {several ? `${kindLabel(selected.type)} › ` : ''}
          <Text style={styles.summaryName}>{accountDisplayName(selected, t)}</Text>
          {` · ${amountText(selected)}`}
        </Text>
        {accounts.length > 1 || allowAddWallet ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('accountKind.changeA11y')}
            hitSlop={8}
            onPress={() => {
              tapFeedback();
              setBrowsing(true);
              setOpenKind(null);
            }}>
            <Text style={styles.changeText}>{t('accountKind.change')}</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.block}>
      {kindGroup ? (
        <>
          {onlyGroup ? null : (
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => {
                tapFeedback();
                setOpenKind(null);
                setAddingWallet(false);
              }}
              style={styles.backRow}>
              <Text style={styles.backText}>‹ {kindLabel(kindGroup.kind)}</Text>
            </Pressable>
          )}
          <View style={styles.wrap}>
            {kindGroup.list.map((acc) => {
              const on = acc.id === selectedId;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  key={acc.id}
                  onPress={() => choose(acc.id)}
                  style={[styles.pill, on && styles.pillOn]}>
                  <Text style={[styles.pillText, on && styles.onText]} numberOfLines={1}>
                    {accountDisplayName(acc, t)} · {amountText(acc)}
                  </Text>
                </Pressable>
              );
            })}
            {allowAddWallet && kindGroup.kind === 'wallet' && !addingWallet ? (
              <Pressable
                onPress={() => {
                  tapFeedback();
                  setAddingWallet(true);
                }}
                accessibilityRole="button"
                style={[styles.pill, styles.addChip]}>
                <Text style={styles.presetText}>{t('flow.walletAddChip')}</Text>
              </Pressable>
            ) : null}
          </View>
        </>
      ) : (
        <View style={styles.wrap}>
          {groups.map((group) => {
            const only = group.list.length === 1 ? group.list[0] : null;
            const on = group.kind === selected?.type;
            return (
              <Pressable
                key={group.kind}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => pickKind(group)}
                style={[styles.pill, on && styles.pillOn]}>
                <Text style={[styles.pillText, on && styles.onText]} numberOfLines={1}>
                  {only
                    ? `${accountDisplayName(only, t)} · ${amountText(only)}`
                    : group.list.length === 0
                      ? `+ ${t('accountKind.wallet_one')}`
                      : `${kindLabel(group.kind)} (${group.list.length}) ›`}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {allowAddWallet && addingWallet ? (
        <WalletQuickAdd onAdded={(id) => choose(id)} />
      ) : null}
    </View>
  );
}

export function WalletQuickAdd({
  onAdded,
  onInputFocus,
  onInputBlur,
}: {
  onAdded?: (id: string) => void;
  onInputFocus?: () => void;
  onInputBlur?: () => void;
}) {
  const { t } = useLanguage();
  const { accounts, addWallet } = useFinance();
  const [custom, setCustom] = useState('');
  const [busy, setBusy] = useState(false);

  async function createWallet(name: string) {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      const acc = await addWallet(trimmed);
      if (!acc) return;
      tapFeedback();
      setCustom('');
      onAdded?.(acc.id);
    } finally {
      setBusy(false);
    }
  }

  const unusedPresets = WALLET_PRESETS.filter(
    (name) => !findWalletByName(accounts, name)
  );

  return (
    <View style={styles.addBlock}>
      {unusedPresets.length > 0 ? (
        <View style={styles.wrap}>
          {unusedPresets.map((name) => (
            <Pressable
              accessibilityRole="button"
              key={name}
              onPress={() => void createWallet(name)}
              disabled={busy}
              style={styles.preset}>
              <Text style={styles.presetText}>+ {name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <Text style={styles.addLabel}>{t('flow.walletAdd')}</Text>
      <Text style={styles.addHint}>{t('flow.walletAddHint')}</Text>
      <View style={styles.row}>
        <TextInput
          value={custom}
          onChangeText={setCustom}
          placeholder={t('flow.walletNamePlaceholder')}
          placeholderTextColor={palette.inkSoft}
          style={styles.input}
          editable={!busy}
          onFocus={onInputFocus}
          onBlur={onInputBlur}
          onSubmitEditing={() => void createWallet(custom)}
          returnKeyType="done"
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => void createWallet(custom)}
          disabled={busy || !custom.trim()}
          style={[
            styles.addBtn,
            (!custom.trim() || busy) && styles.addBtnDisabled,
          ]}>
          {busy ? (
            <ActivityIndicator size="small" color={palette.white} />
          ) : (
            <Text style={styles.addBtnText}>{t('flow.addSubButton')}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

export function BankQuickAdd({
  onAdded,
}: {
  onAdded?: (id: string) => void;
}) {
  const { t } = useLanguage();
  const { accounts, addBank } = useFinance();
  const [custom, setCustom] = useState('');
  const [busy, setBusy] = useState(false);

  async function createBank(name: string) {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      const acc = await addBank(trimmed);
      if (!acc) return;
      tapFeedback();
      setCustom('');
      onAdded?.(acc.id);
    } finally {
      setBusy(false);
    }
  }

  const unusedPresets = BANK_PRESETS.filter((name) => !findBankByName(accounts, name));

  return (
    <View style={styles.addBlock}>
      {unusedPresets.length > 0 ? (
        <View style={styles.wrap}>
          {unusedPresets.map((name) => (
            <Pressable
              accessibilityRole="button"
              key={name}
              onPress={() => void createBank(name)}
              disabled={busy}
              style={styles.preset}>
              <Text style={styles.presetText}>+ {name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <Text style={styles.addLabel}>{t('flow.bankAdd')}</Text>
      <Text style={styles.addHint}>{t('flow.bankAddHint')}</Text>
      <View style={styles.row}>
        <TextInput
          value={custom}
          onChangeText={setCustom}
          placeholder={t('flow.bankNamePlaceholder')}
          placeholderTextColor={palette.inkSoft}
          style={styles.input}
          editable={!busy}
          onSubmitEditing={() => void createBank(custom)}
          returnKeyType="done"
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => void createBank(custom)}
          disabled={busy || !custom.trim()}
          style={[
            styles.addBtn,
            (!custom.trim() || busy) && styles.addBtnDisabled,
          ]}>
          {busy ? (
            <ActivityIndicator size="small" color={palette.white} />
          ) : (
            <Text style={styles.addBtnText}>{t('flow.addSubButton')}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const INVESTMENT_PRESET_KEYS = [
  'invest.presetCdt',
  'invest.presetFund',
  'invest.presetStocks',
  'invest.presetCrypto',
] as const;

/** Add a named investment (CDT, fund, stocks…) so Wealth says where it is. */
export function InvestmentQuickAdd({ onAdded }: { onAdded?: (id: string) => void }) {
  const { t } = useLanguage();
  const { accounts, addInvestment } = useFinance();
  const [custom, setCustom] = useState('');
  const [busy, setBusy] = useState(false);

  async function create(name: string) {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      const acc = await addInvestment(trimmed);
      if (!acc) return;
      tapFeedback();
      setCustom('');
      onAdded?.(acc.id);
    } finally {
      setBusy(false);
    }
  }

  const unusedPresets = INVESTMENT_PRESET_KEYS.map((key) => t(key)).filter(
    (name) => !findInvestmentByName(accounts, name)
  );

  return (
    <View style={styles.addBlock}>
      {unusedPresets.length > 0 ? (
        <View style={styles.wrap}>
          {unusedPresets.map((name) => (
            <Pressable
              accessibilityRole="button"
              key={name}
              onPress={() => void create(name)}
              disabled={busy}
              style={styles.preset}>
              <Text style={styles.presetText}>+ {name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <Text style={styles.addLabel}>{t('invest.add')}</Text>
      <Text style={styles.addHint}>{t('invest.addHint')}</Text>
      <View style={styles.row}>
        <TextInput
          value={custom}
          onChangeText={setCustom}
          placeholder={t('invest.namePlaceholder')}
          placeholderTextColor={palette.inkSoft}
          style={styles.input}
          editable={!busy}
          onSubmitEditing={() => void create(custom)}
          returnKeyType="done"
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => void create(custom)}
          disabled={busy || !custom.trim()}
          style={[styles.addBtn, (!custom.trim() || busy) && styles.addBtnDisabled]}>
          {busy ? (
            <ActivityIndicator size="small" color={palette.white} />
          ) : (
            <Text style={styles.addBtnText}>{t('flow.addSubButton')}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 10 },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  onText: {
    color: palette.white,
  },
  pill: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#F7FAFC',
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
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  summaryText: {
    flexShrink: 1,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: palette.inkMuted,
  },
  summaryName: {
    fontFamily: 'DMSans_600SemiBold',
    color: palette.ink,
  },
  changeText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.accentDeep,
  },
  backRow: { alignSelf: 'center' },
  backText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.accentDeep,
  },
  addChip: {
    borderStyle: 'dashed',
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  addBlock: { gap: 8 },
  addLabel: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: palette.ink,
  },
  addHint: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkMuted,
    lineHeight: 18,
  },
  preset: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: palette.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  presetText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.accent,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
    color: palette.ink,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  addBtn: {
    backgroundColor: palette.accent,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    minWidth: 72,
    alignItems: 'center',
  },
  addBtnDisabled: { opacity: 0.5 },
  addBtnText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: palette.white,
  },
});
