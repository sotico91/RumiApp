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
 * Where the money comes from (or goes), in two small steps: first the kind
 * (Cash, Bank, Wallets, Savings, Credit card); a kind with one account is that
 * account, a kind with several opens one compact row to pick which.
 */
export function AccountChoiceChips({
  accounts,
  selectedId,
  onSelect,
  allowAddWallet = true,
}: Props) {
  const { t } = useLanguage();
  const { format } = useMoney();
  const [pickedKind, setPickedKind] = useState<Kind | null>(null);
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

  const selected = accounts.find((a) => a.id === selectedId);
  const activeKind = pickedKind ?? selected?.type ?? null;
  const active = groups.find((g) => g.kind === activeKind);
  // One kind only (e.g. just cards): skip the first step.
  const single = groups.length === 1 ? groups[0] : null;
  const second = single ?? (active && (active.list.length !== 1 || active.kind === 'wallet') ? active : null);

  const amountText = (acc: Account) =>
    acc.type === 'credit'
      ? t('flow.cardAvailable', { amount: format(acc.balance) })
      : format(acc.balance);

  function pickKind(group: { kind: Kind; list: Account[] }) {
    tapFeedback();
    setPickedKind(group.kind);
    setAddingWallet(false);
    if (group.list.length === 1) onSelect(group.list[0].id);
    else if (group.list.length > 1 && !group.list.some((a) => a.id === selectedId)) {
      onSelect(group.list[0].id);
    } else if (group.list.length === 0 && group.kind === 'wallet') {
      setAddingWallet(true);
    }
  }

  return (
    <View style={styles.block}>
      {single ? null : (
        <View style={styles.wrap} accessibilityRole="tablist">
          {groups.map((group) => {
            const on = group.kind === activeKind;
            const only = group.list.length === 1 ? group.list[0] : null;
            return (
              <Pressable
                key={group.kind}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                onPress={() => pickKind(group)}
                style={[styles.chip, on && styles.chipOn]}>
                <Text style={[styles.chipName, on && styles.onText]} numberOfLines={1}>
                  {only
                    ? accountDisplayName(only, t)
                    : group.list.length === 0
                      ? `+ ${t('accountKind.wallet_one')}`
                      : t(`accountKind.${group.kind}` as TranslationKey)}
                </Text>
                <Text style={[styles.meta, on && styles.onText]} numberOfLines={1}>
                  {only
                    ? amountText(only)
                    : group.list.length === 0
                      ? t('accountKind.addHint')
                      : t('accountKind.count', { count: group.list.length })}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {second && second.list.length > 0 ? (
        <View style={[styles.wrap, !single && styles.subRow]}>
          {second.list.map((acc) => {
            const on = acc.id === selectedId;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                key={acc.id}
                onPress={() => {
                  tapFeedback();
                  onSelect(acc.id);
                }}
                style={[styles.subChip, on && styles.chipOn]}>
                <Text style={[styles.subName, on && styles.onText]} numberOfLines={1}>
                  {accountDisplayName(acc, t)} · {amountText(acc)}
                </Text>
              </Pressable>
            );
          })}
          {allowAddWallet && second.kind === 'wallet' && !addingWallet ? (
            <Pressable
              onPress={() => {
                tapFeedback();
                setAddingWallet(true);
              }}
              accessibilityRole="button"
              style={[styles.subChip, styles.addChip]}>
              <Text style={styles.presetText}>{t('flow.walletAddChip')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {allowAddWallet && addingWallet ? (
        <WalletQuickAdd
          onAdded={(id) => {
            setAddingWallet(false);
            setPickedKind('wallet');
            onSelect(id);
          }}
        />
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
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F7FAFC',
  },
  chipOn: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  chipName: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.ink,
  },
  meta: {
    marginTop: 2,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: palette.inkMuted,
  },
  onText: {
    color: palette.white,
  },
  subRow: {
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: palette.border,
  },
  subChip: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#F7FAFC',
  },
  subName: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: palette.ink,
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
