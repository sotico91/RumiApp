import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MoneyText } from '@/src/components/MoneyText';
import { ConceptIcon } from '@/src/components/ConceptIcon';
import { categoryVisual } from '@/src/data/spendConcepts';
import { useFinance } from '@/src/hooks/useFinance';
import { useMoney } from '@/src/hooks/useMoney';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import type { TranslationKey } from '@/src/i18n/translations';
import { palette, radii } from '@/src/theme/colors';
import type { Transaction } from '@/src/types/finance';
import { isPocketMove } from '@/src/types/finance';
import { accountDisplayName } from '@/src/utils/accounts';
import { categoryLabel } from '@/src/utils/categoryLabel';
import { formatExpenseDate } from '@/src/utils/dates';

type Props = {
  expense: Transaction;
  onDelete?: () => void;
  onEdit?: () => void;
  last?: boolean;
  showRegistrant?: boolean;
};

export function ExpenseRow({
  expense,
  onDelete,
  onEdit,
  last,
  showRegistrant = false,
}: Props) {
  const { t, language } = useLanguage();
  const { format } = useMoney();
  const { settings } = useSettings();
  const { accounts } = useFinance();
  const spendConcepts = settings.spendConcepts ?? [];
  const pocketMove = isPocketMove(expense.type);
  const fromName = accountDisplayName(
    accounts.find((a) => a.id === expense.accountId) ?? {
      nameKey: 'account.cash',
    },
    t
  );
  const toName = accountDisplayName(
    accounts.find((a) => a.id === expense.toAccountId) ?? {
      nameKey: 'account.savings',
    },
    t
  );
  const visual = expense.categoryId ? categoryVisual(expense.categoryId, spendConcepts) : null;
  const color = pocketMove ? palette.teal : visual ? visual.color : palette.inkSoft;

  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <View
        style={[
          styles.icon,
          { backgroundColor: `${color}22` },
        ]}>
        {!pocketMove && visual?.icon ? (
          <ConceptIcon icon={visual.icon} color={color} size={18} />
        ) : (
          <View style={[styles.dot, { backgroundColor: color }]} />
        )}
      </View>
      <Pressable style={styles.content} onPress={onEdit} disabled={!onEdit}>
        <View style={styles.top}>
          <Text style={styles.category}>
            {t(`type.${expense.type}` as TranslationKey)}
            {pocketMove
              ? expense.toAccountId
                ? ` · ${t('history.moveRoute', { from: fromName, to: toName })}`
                : ''
              : expense.categoryId
                ? ` · ${categoryLabel(expense.categoryId, t, spendConcepts)}`
                : ''}
          </Text>
          <MoneyText style={styles.amount}>{format(expense.amount)}</MoneyText>
        </View>
        <Text style={styles.meta} numberOfLines={2}>
          {formatExpenseDate(expense.createdAt, language)}
          {!pocketMove && expense.accountId
            ? ` · ${t('history.fromPocket', { pocket: fromName })}`
            : ''}
          {!pocketMove && expense.paymentMethod
            ? ` · ${t(`method.${expense.paymentMethod}` as TranslationKey)}`
            : ''}
          {showRegistrant && expense.registeredByName
            ? ` · ${t('history.byPerson', { name: expense.registeredByName })}`
            : ''}
          {expense.note ? ` · ${expense.note}` : ''}
        </Text>
      </Pressable>
      <View style={styles.actions}>
        {onEdit ? (
          <Pressable onPress={onEdit} hitSlop={10} style={styles.actionBtn}>
            <Text style={styles.editText}>{t('history.edit')}</Text>
          </Pressable>
        ) : null}
        {onDelete ? (
          <Pressable onPress={onDelete} hitSlop={10} style={styles.actionBtn}>
            <Text style={styles.deleteText}>{t('history.delete')}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  content: {
    flex: 1,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  category: {
    flex: 1,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: palette.ink,
  },
  amount: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 16,
    color: palette.ink,
  },
  meta: {
    marginTop: 4,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: palette.inkSoft,
  },
  actions: {
    gap: 4,
    alignItems: 'flex-end',
  },
  actionBtn: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  editText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: palette.accentDeep,
  },
  deleteText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: palette.danger,
  },
});
