import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MoneyText } from '@/src/components/MoneyText';
import { ConceptIcon } from '@/src/components/ConceptIcon';
import { categoryVisual, findSpendSub, isGeneralSubName } from '@/src/data/spendConcepts';
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
  const income = expense.type === 'income';
  const color = pocketMove
    ? palette.teal
    : income
      ? palette.success
      : visual
        ? visual.color
        : palette.inkSoft;

  // Spends lead with the subcategory ("Domicilio"); its category moves to the meta line.
  const hit =
    expense.type === 'expense' && expense.categoryId
      ? findSpendSub(spendConcepts, expense.categoryId)
      : null;
  const subIsConcept =
    !!hit && (isGeneralSubName(hit.sub.name) || hit.sub.name === hit.concept.name);
  const typeLabel = t(`type.${expense.type}` as TranslationKey);
  let title: string;
  if (hit) title = subIsConcept ? hit.concept.name : hit.sub.name;
  else if (pocketMove)
    title = expense.toAccountId
      ? `${typeLabel} · ${t('history.moveRoute', { from: fromName, to: toName })}`
      : typeLabel;
  else if (expense.categoryId) {
    const label = categoryLabel(expense.categoryId, t, spendConcepts);
    title = income || expense.type === 'expense' ? label : `${typeLabel} · ${label}`;
  } else title = typeLabel;

  const metaParts: string[] = [];
  if (hit && !subIsConcept) metaParts.push(hit.concept.name);
  metaParts.push(formatExpenseDate(expense.createdAt, language));
  if (!pocketMove && expense.accountId) {
    metaParts.push(
      t(income ? 'history.toPocket' : 'history.fromPocket', { pocket: fromName })
    );
  }
  // Cash and debit just repeat the pocket; card and transfer add information.
  if (
    !pocketMove &&
    expense.paymentMethod &&
    expense.paymentMethod !== 'cash' &&
    expense.paymentMethod !== 'debit'
  ) {
    metaParts.push(t(`method.${expense.paymentMethod}` as TranslationKey));
  }
  if (showRegistrant && expense.registeredByName) {
    metaParts.push(t('history.byPerson', { name: expense.registeredByName }));
  }
  if (expense.note) metaParts.push(expense.note);

  const amountText = income ? `+${format(expense.amount)}` : format(expense.amount);
  const interactive = !!onEdit || !!onDelete;

  return (
    <Pressable
      onPress={onEdit}
      onLongPress={onDelete}
      disabled={!interactive}
      accessibilityRole={onEdit ? 'button' : undefined}
      accessibilityLabel={`${title}, ${amountText}`}
      accessibilityHint={onEdit ? t('history.rowHint') : undefined}
      accessibilityActions={[
        ...(onEdit ? [{ name: 'activate', label: t('history.edit') }] : []),
        ...(onDelete ? [{ name: 'delete', label: t('history.delete') }] : []),
      ]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'activate') onEdit?.();
        if (event.nativeEvent.actionName === 'delete') onDelete?.();
      }}
      style={({ pressed }) => [
        styles.row,
        last && styles.rowLast,
        pressed && interactive && styles.rowPressed,
      ]}>
      <View
        style={[
          styles.icon,
          { backgroundColor: `${color}22` },
        ]}>
        {income ? (
          <MaterialCommunityIcons name="arrow-bottom-left" size={18} color={color} />
        ) : !pocketMove && visual?.icon ? (
          <ConceptIcon icon={visual.icon} color={color} size={18} />
        ) : (
          <View style={[styles.dot, { backgroundColor: color }]} />
        )}
      </View>
      <View style={styles.content}>
        <View style={styles.top}>
          <Text style={styles.category} numberOfLines={2}>
            {title}
          </Text>
          <MoneyText style={[styles.amount, income && styles.amountIncome]} fit={false}>
            {amountText}
          </MoneyText>
        </View>
        <Text style={styles.meta} numberOfLines={2}>
          {metaParts.join(' · ')}
        </Text>
      </View>
    </Pressable>
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
  rowPressed: {
    opacity: 0.6,
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
    // The amount is the key fact: it never shrinks; the title wraps instead.
    flexShrink: 0,
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 16,
    color: palette.ink,
  },
  amountIncome: {
    color: palette.success,
  },
  meta: {
    marginTop: 4,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: palette.inkSoft,
  },
});
