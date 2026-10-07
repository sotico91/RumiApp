import { useMemo, useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { NoMoneyHint } from '@/src/components/NoMoneyHint';
import { CategorySuggestionHint } from '@/src/components/CategorySuggestionHint';
import { AccountChoiceChips } from '@/src/components/AccountChoiceChips';
import { CategorySearch, CATEGORY_SEARCH_MIN_SUBS } from '@/src/components/CategorySearch';
import type { SavedMovement } from '@/src/components/ExpenseForm';
import { KeyboardSafeScroll } from '@/src/components/KeyboardSafe';
import { ConceptIcon } from '@/src/components/ConceptIcon';
import { findSpendSub, flattenSpendSubs, isGeneralSubName, subColor } from '@/src/data/spendConcepts';
import type { FriendlyIntent } from '@/src/data/friendlyTemplates';
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
import {
  accountsForExpenseSource,
  defaultSpendAccountId,
  paymentMethodForAccount,
} from '@/src/utils/accounts';
import { debtIdFromPayAccountId, openDebts, payAccountIdForDebt } from '@/src/utils/debts';
import { movementNotifyCopy } from '@/src/utils/movementNotify';
import { notifyExpenseRegistered } from '@/src/utils/notifications';
import { tapFeedback } from '@/src/utils/selectFeedback';
import { appAlert } from '@/src/components/AppAlert';

const MAX_CHIPS = 8;

/** Expense is this form; the other kinds open the guided flow at their first question. */
const KINDS: { id: FriendlyIntent; labelKey: TranslationKey }[] = [
  { id: 'spend', labelKey: 'quick.kind.spend' },
  { id: 'earn', labelKey: 'quick.kind.earn' },
  { id: 'move', labelKey: 'quick.kind.move' },
  { id: 'debt', labelKey: 'quick.kind.debt' },
];

type Props = {
  onSaved?: (result: SavedMovement) => void;
  /** Templates and the full guided flow ("What happened?" cards). */
  onBack: () => void;
  /** Open the guided flow for anything the quick form does not cover. */
  onOpenGuided: (intent: FriendlyIntent) => void;
};

/**
 * One-screen expense: amount, a recent subcategory, the account it came
 * from, save. Everything else (income, moves, debt payments, new
 * subcategories) opens the guided flow.
 */
export function QuickSpendForm({ onSaved, onBack, onOpenGuided }: Props) {
  const { t } = useLanguage();
  const { formatPlain, parse, currency } = useMoney();
  const { settings, updateQuickTemplate } = useSettings();
  const { addTransaction, totalForPeriod, accounts, debts, transactions } = useFinance();
  const spendConcepts = usePickableSpendConcepts();

  // Recent subcategories first, then the rest of the tree.
  const { categoryChips, hasRecent } = useMemo(() => {
    const ids: string[] = [];
    for (const tx of transactions) {
      if (tx.type !== 'expense' || !tx.categoryId || ids.includes(tx.categoryId)) continue;
      if (findSpendSub(spendConcepts, tx.categoryId)) ids.push(tx.categoryId);
      if (ids.length >= MAX_CHIPS) break;
    }
    const recentCount = ids.length;
    for (const sub of flattenSpendSubs(spendConcepts)) {
      if (ids.length >= MAX_CHIPS) break;
      if (!ids.includes(sub.id)) ids.push(sub.id);
    }
    const chips = ids
      .map((id) => findSpendSub(spendConcepts, id))
      .filter((hit): hit is NonNullable<typeof hit> => !!hit)
      .map(({ concept, sub }) => ({
        id: sub.id,
        label: isGeneralSubName(sub.name) ? concept.name : sub.name,
        color: subColor(concept, sub),
        icon: concept.icon,
      }));
    return { categoryChips: chips, hasRecent: recentCount > 0 };
  }, [transactions, spendConcepts]);

  const payAccounts = useMemo(() => {
    const debtLabel = (debt: (typeof debts)[number]) =>
      debt.nameKey ? t(debt.nameKey as TranslationKey) : debt.name ?? t('debt.mainCard');
    return [
      ...accountsForExpenseSource(accounts, 'debit'),
      ...accountsForExpenseSource(accounts, 'credit', { debts: openDebts(debts), debtLabel }),
    ];
  }, [accounts, debts, t]);

  const [amount, setAmount] = useState('');
  const [pickedCategoryId, setCategoryId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  // Until the user picks one, the description decides: an existing subcategory,
  // or one created on save ("fútbol" → Deporte · Fútbol).
  const hint = useCategorySuggestion(note, spendConcepts);
  const autoSubId =
    !pickedCategoryId && hint.suggestion && !hint.suggestion.create ? hint.suggestion.subId : null;
  const autoCreate = !pickedCategoryId && !!hint.suggestion?.create;
  // Otherwise, with history, preselect the last-used subcategory; on a fresh install let the user pick.
  const categoryId =
    pickedCategoryId ??
    autoSubId ??
    (autoCreate ? null : hasRecent ? categoryChips[0]?.id ?? null : null);
  const [pickedAccountId, setPickedAccountId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingLock = useRef(false);
  const checkFunds = useFundsCheck();

  // Until the user picks one, use the account last used for this subcategory.
  const accountId = useMemo(() => {
    if (pickedAccountId) return pickedAccountId;
    const last =
      (categoryId &&
        transactions.find(
          (tx) => tx.type === 'expense' && tx.categoryId === categoryId && (tx.accountId || tx.creditDebtId)
        )) ||
      transactions.find((tx) => tx.type === 'expense' && (tx.accountId || tx.creditDebtId));
    const lastId = last?.creditDebtId ? payAccountIdForDebt(last.creditDebtId) : last?.accountId;
    if (lastId && payAccounts.some((a) => a.id === lastId)) return lastId;
    return defaultSpendAccountId(accounts);
  }, [pickedAccountId, categoryId, transactions, payAccounts, accounts]);

  // A subcategory picked through search shows up first, selected.
  const visibleChips = useMemo(() => {
    if (!categoryId || categoryChips.some((c) => c.id === categoryId)) return categoryChips;
    const hit = findSpendSub(spendConcepts, categoryId);
    if (!hit) return categoryChips;
    return [
      {
        id: hit.sub.id,
        label: isGeneralSubName(hit.sub.name) ? hit.concept.name : hit.sub.name,
        color: subColor(hit.concept, hit.sub),
        icon: hit.concept.icon,
      },
      ...categoryChips,
    ];
  }, [categoryId, categoryChips, spendConcepts]);

  const parsed = parse(amount);
  const canSave = !!parsed && (!!categoryId || autoCreate) && !!accountId && !saving;

  async function save() {
    if (savingLock.current || !parsed || (!categoryId && !autoCreate) || !accountId) return;
    if (!checkFunds({ type: 'expense', amount: parsed, accountId })) return;
    savingLock.current = true;
    setSaving(true);
    try {
      // A subcategory the description asked for is created only now, on save.
      const subId = autoCreate ? (await hint.resolve())?.subId : categoryId;
      if (!subId) throw new Error('no category');
      const beforeExpense = totalForPeriod('hoy', 'expense');
      const isCard = !!debtIdFromPayAccountId(accountId);
      await addTransaction({
        type: 'expense',
        amount: parsed,
        categoryId: subId,
        paymentMethod: isCard
          ? 'credit'
          : paymentMethodForAccount(accounts.find((a) => a.id === accountId), 'debit'),
        accountId,
        note,
      });
      await updateQuickTemplate({ categoryId: subId, amount: parsed, note: note.trim() || undefined });

      if (settings.notifyOnExpense) {
        const copy = movementNotifyCopy({
          t,
          type: 'expense',
          amount: formatPlain(parsed),
          transactions,
          spendConcepts,
          accounts,
          categoryId: subId,
          accountId,
          note,
        });
        void notifyExpenseRegistered(copy.title, copy.body).catch(() => undefined);
      }
      onSaved?.({ kind: 'expense', amount: beforeExpense + parsed, added: parsed, categoryId: subId });
    } catch {
      appAlert(t('add.invalidTitle'), t('add.saveError'), undefined, { tone: 'warning' });
    } finally {
      savingLock.current = false;
      setSaving(false);
    }
  }

  return (
    <KeyboardSafeScroll
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.body}>
      <View style={styles.kindRow} accessibilityRole="tablist">
        {KINDS.map((kind) => {
          const on = kind.id === 'spend';
          return (
            <Pressable
              key={kind.id}
              onPress={() => {
                if (on) return;
                tapFeedback();
                onOpenGuided(kind.id);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={[styles.kindBtn, on && styles.kindOn]}>
              <Text
                numberOfLines={1}
                style={[styles.kindText, on && styles.kindTextOn]}>
                {t(kind.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.card}>
        <View style={styles.amountRow}>
          <Text style={styles.currency} maxFontSizeMultiplier={1.2}>
            $
          </Text>
          <TextInput
            value={formatAmountTyping(amount, currency)}
            onChangeText={(text) => setAmount(formatAmountTyping(text, currency))}
            placeholder="0"
            placeholderTextColor={palette.inkMuted}
            keyboardType="decimal-pad"
            autoFocus
            style={styles.amountInput}
            maxFontSizeMultiplier={1.2}
            accessibilityLabel={t('add.kicker')}
          />
        </View>

        <Text style={styles.section}>{t('quick.what')}</Text>
        {flattenSpendSubs(spendConcepts).length > CATEGORY_SEARCH_MIN_SUBS ? (
          <CategorySearch
            concepts={spendConcepts}
            onPick={(_conceptId, subId) => {
              setCategoryId(subId);
              Keyboard.dismiss();
            }}
          />
        ) : null}
        {categoryChips.length === 0 ? (
          <Text style={styles.hint}>{t('quick.noCategories')}</Text>
        ) : null}
        <View style={styles.chipWrap}>
          {visibleChips.map((chip) => {
            const on = chip.id === categoryId;
            return (
              <Pressable
                key={chip.id}
                onPress={() => {
                  tapFeedback();
                  setCategoryId(chip.id);
                  // Amount is typed first; picking a category reveals accounts + Save
                  // (iOS decimal pad has no "Done" key).
                  Keyboard.dismiss();
                }}
                style={[styles.chip, on && styles.chipOn]}>
                <ConceptIcon icon={chip.icon} color={on ? palette.white : chip.color} size={16} />
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{chip.label}</Text>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => {
              tapFeedback();
              onOpenGuided('spend');
            }}
            style={[styles.chip, styles.chipGhost]}>
            <Text style={styles.chipText}>{t('quick.otherCategory')}</Text>
          </Pressable>
        </View>

        <Text style={styles.section}>{t('quick.from')}</Text>
        {payAccounts.every((a) => a.type === 'credit') ? (
          <NoMoneyHint cardsToo={payAccounts.length > 0} />
        ) : null}
        <AccountChoiceChips
          accounts={payAccounts}
          selectedId={accountId}
          onSelect={(id) => setPickedAccountId(id)}
          allowAddWallet={false}
        />

        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder={t('add.notePlaceholder')}
          placeholderTextColor={palette.inkMuted}
          style={styles.noteInput}
          returnKeyType="done"
        />
        <CategorySuggestionHint
          hint={hint}
          selectedSubId={categoryId}
          auto={!pickedCategoryId}
          onApply={(_conceptId, subId) => setCategoryId(subId)}
        />

        <Pressable
          onPress={() => void save()}
          disabled={!canSave}
          style={[styles.primary, !canSave && styles.primaryOff]}>
          <Text style={styles.primaryText}>
            {saving
              ? t('add.saving')
              : parsed
                ? t('quick.saveAmount', { amount: formatPlain(parsed) })
                : t('quick.save')}
          </Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() => {
          tapFeedback();
          onBack();
        }}
        hitSlop={8}
        accessibilityRole="button"
        style={styles.more}>
        <Text style={styles.moreText}>{t('quick.moreOptions')}</Text>
      </Pressable>
    </KeyboardSafeScroll>
  );
}

const styles = StyleSheet.create({
  kindRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15,28,36,0.06)',
    borderRadius: radii.md,
    padding: 3,
    gap: 3,
  },
  kindBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  kindOn: {
    backgroundColor: palette.surfaceSolid,
    shadowColor: palette.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  kindText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: palette.inkMuted,
  },
  kindTextOn: {
    fontFamily: 'DMSans_700Bold',
    color: palette.ink,
  },
  more: { alignSelf: 'center', paddingVertical: 8 },
  moreText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: palette.bg,
  },
  body: {
    paddingTop: 4,
    paddingBottom: 48,
    gap: 12,
  },
  card: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 12,
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
  section: {
    marginTop: 4,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: palette.inkMuted,
  },
  hint: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkMuted,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#F7FAFC',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chipOn: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  chipGhost: {
    backgroundColor: 'transparent',
    borderStyle: 'dashed',
  },
  chipText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: palette.ink,
  },
  chipTextOn: { color: palette.white },
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
  primary: {
    backgroundColor: palette.accent,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryOff: { opacity: 0.45 },
  primaryText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 16,
    color: palette.white,
  },
});
