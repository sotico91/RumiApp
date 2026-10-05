import { StyleSheet, Text, View } from 'react-native';

import { useFinance } from '@/src/hooks/useFinance';
import { useMoney } from '@/src/hooks/useMoney';
import { useLanguage } from '@/src/i18n/LanguageContext';
import type { TranslationKey } from '@/src/i18n/translations';
import { palette } from '@/src/theme/colors';
import { accountDisplayName } from '@/src/utils/accounts';

type PocketItem = {
  id: string;
  nameKey: string;
  name?: string;
  balance: number;
};

type Variant = 'light' | 'dark';

export function PocketFlowList({ variant = 'light' }: { variant?: Variant }) {
  const { t } = useLanguage();
  const { format } = useMoney();
  const { availableCash, availableByAccount, secondaryByAccount } = useFinance();
  const dark = variant === 'dark';

  const cash = availableByAccount.filter((a) => a.type === 'cash');
  const banks = availableByAccount.filter((a) => a.type === 'bank');
  const wallets = secondaryByAccount.filter(
    (a) =>
      a.type === 'wallet' &&
      (Boolean(a.name?.trim()) || Math.abs(a.balance) >= 0.01)
  );
  const savings = secondaryByAccount.filter((a) => a.type === 'savings');

  return (
    <View style={styles.wrap}>
      <Group title={t('home.pocketCash')} items={cash} format={format} t={t} dark={dark} />
      <Group title={t('home.pocketBanks')} items={banks} format={format} t={t} dark={dark} />
      <Group title={t('home.pocketWallets')} items={wallets} format={format} t={t} dark={dark} />
      <Group
        title={t('home.pocketSavings')}
        items={savings}
        format={format}
        t={t}
        dark={dark}
      />
      <View style={[styles.row, styles.totalRow, dark && styles.totalRowDark]}>
        <Text style={[styles.totalLabel, dark && styles.totalLabelDark]}>
          {t('home.availableTotal')}
        </Text>
        <Text style={[styles.totalValue, dark && styles.totalValueDark]}>
          {format(availableCash)}
        </Text>
      </View>
    </View>
  );
}

function Group({
  title,
  items,
  format,
  t,
  dark,
}: {
  title: string;
  items: PocketItem[];
  format: (amount: number) => string;
  t: (key: TranslationKey) => string;
  dark: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <View style={styles.group}>
      <Text style={[styles.groupTitle, dark && styles.groupTitleDark]}>{title}</Text>
      {items.map((acc) => (
        <View key={acc.id} style={styles.row}>
          <Text
            style={[styles.label, dark && styles.labelDark]}
            numberOfLines={1}>
            {accountDisplayName(acc, t)}
          </Text>
          <Text style={[styles.value, dark && styles.valueDark]}>
            {format(acc.balance)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  group: { gap: 4 },
  groupTitle: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: palette.inkSoft,
  },
  groupTitleDark: {
    color: 'rgba(255,255,255,0.5)',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  label: {
    flex: 1,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: palette.inkMuted,
  },
  labelDark: {
    color: 'rgba(255,255,255,0.78)',
  },
  value: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: palette.ink,
  },
  valueDark: {
    color: palette.white,
  },
  totalRow: {
    marginTop: 2,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  totalRowDark: {
    borderTopColor: 'rgba(255,255,255,0.18)',
  },
  totalLabel: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.ink,
  },
  totalLabelDark: {
    color: 'rgba(255,255,255,0.9)',
  },
  totalValue: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 16,
    color: palette.success,
  },
  totalValueDark: {
    color: '#7DFFC8',
  },
});
