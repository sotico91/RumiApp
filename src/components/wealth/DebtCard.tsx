import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { MoneyText } from '@/src/components/MoneyText';
import { styles } from '@/src/components/wealth/styles';
import { findSpendSub } from '@/src/data/spendConcepts';
import { useMoney } from '@/src/hooks/useMoney';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import type { TranslationKey } from '@/src/i18n/translations';
import { palette } from '@/src/theme/colors';
import type { Debt } from '@/src/types/finance';
import { categoryLabel } from '@/src/utils/categoryLabel';
import { creditAvailable, debtKind, productLabelKey, revolvingProduct } from '@/src/utils/debts';
import { tapFeedback } from '@/src/utils/selectFeedback';

type Props = {
  debt: Debt;
  /** Paid toward this debt this month. */
  paid: number;
  /** The debt form is open on this debt. */
  editing: boolean;
  onEdit: (debt: Debt) => void;
  onRemove: (id: string, label: string) => void;
};

/** One card or loan: what is owed, this month's progress, and pay / charge actions. */
export function DebtCard({ debt, paid, editing, onEdit, onRemove }: Props) {
  const { t, language } = useLanguage();
  const { format } = useMoney();
  const { settings } = useSettings();
  const spendConcepts = settings.spendConcepts ?? [];

  const label = debt.nameKey
    ? t(debt.nameKey as TranslationKey)
    : debt.name ?? t('debt.mainCard');
  const conceptLabel = debt.categoryId
    ? categoryLabel(debt.categoryId, t, spendConcepts)
    : label;
  const hit = debt.categoryId
    ? findSpendSub(spendConcepts, debt.categoryId)
    : null;
  const due = debt.installment || 0;
  const ratio = due > 0 ? paid / due : 0;
  const over = due > 0 && paid > due;
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
    <View style={[styles.card, editing && styles.cardEditing]}>
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
          <Pressable accessibilityRole="button" onPress={() => onEdit(debt)}>
            <Text style={styles.editText}>{t('wealth.debtEdit')}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => onRemove(debt.id, label)}>
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
            accessibilityRole="button"
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
          accessibilityRole="button"
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
