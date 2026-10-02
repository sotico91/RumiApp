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
import type { Account } from '@/src/types/finance';
import {
  BANK_PRESETS,
  WALLET_PRESETS,
  accountDisplayName,
  accountRoleKey,
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
  variant?: 'chip' | 'card';
  allowAddWallet?: boolean;
};

/** Account picker: principal vs wallets/savings, plus one-tap extra wallets. */
export function AccountChoiceChips({
  accounts,
  selectedId,
  onSelect,
  variant = 'chip',
  allowAddWallet = true,
}: Props) {
  const { t } = useLanguage();
  const { format } = useMoney();
  const card = variant === 'card';
  const ordered = sortAccountsByKind(accounts);

  return (
    <View style={styles.block}>
      <View style={styles.wrap}>
        {ordered.map((acc) => {
          const on = acc.id === selectedId;
          return (
            <Pressable
              key={acc.id}
              onPress={() => {
                tapFeedback();
                onSelect(acc.id);
              }}
              style={[
                card ? styles.card : styles.chip,
                on && (card ? styles.cardOn : styles.chipOn),
              ]}>
              <Text
                style={[
                  card ? styles.cardName : styles.chipName,
                  on && styles.onText,
                ]}>
                {accountDisplayName(acc, t)}
              </Text>
              <Text style={[styles.meta, on && styles.onText]}>
                {acc.type === 'credit'
                  ? t('flow.cardAvailable', { amount: format(acc.balance) })
                  : `${t(accountRoleKey(acc.type))} · ${format(acc.balance)}`}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {allowAddWallet ? <WalletQuickAdd onAdded={onSelect} /> : null}
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
  card: {
    minWidth: '46%',
    flexGrow: 1,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#F7FAFC',
  },
  cardOn: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  cardName: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: palette.ink,
  },
  meta: {
    marginTop: 2,
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: palette.inkMuted,
  },
  onText: {
    color: palette.white,
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
