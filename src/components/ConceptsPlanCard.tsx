import { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { useFinance } from '@/src/hooks/useFinance';
import { useMoney } from '@/src/hooks/useMoney';
import { useSettings } from '@/src/hooks/useSettings';
import { usePickableSpendConcepts } from '@/src/hooks/useSpendConcepts';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { ConceptIcon } from '@/src/components/ConceptIcon';
import { IconPicker } from '@/src/components/IconPicker';
import { guessConceptIcon } from '@/src/data/conceptIcons';
import {
  conceptColorChoices,
  nextConceptColor,
  paidDebtSubIds,
  subColor,
  subColorShades,
} from '@/src/data/spendConcepts';
import { SelectPressable } from '@/src/components/SelectPressable';
import { SubDestinationPicker } from '@/src/components/SubDestinationPicker';
import { useSpendTreeEdit, type TreeEditError } from '@/src/hooks/useSpendTreeEdit';
import { palette, radii } from '@/src/theme/colors';
import { categoryLabel } from '@/src/utils/categoryLabel';
import { tapFeedback } from '@/src/utils/selectFeedback';
import { appAlert } from '@/src/components/AppAlert';

export function ConceptsPlanCard() {
  const { t } = useLanguage();
  const { format, parse, currency } = useMoney();
  const {
    addSpendConcept,
    updateSpendConceptColor,
    updateSpendConceptIcon,
    updateSpendSubColor,
    addSpendSub,
    updateSpendSubAnt,
    removeSpendConcept,
    removeSpendSub,
    settings,
  } = useSettings();
  const tree = useSpendTreeEdit();
  const { budgetStatus, updateBudget, removeBudget, debts } = useFinance();

  const [conceptDraft, setConceptDraft] = useState('');
  // Until the user picks one, the icon follows the name being typed ("Gasolina" → ⛽).
  const [pickedIcon, setPickedIcon] = useState<string | null>(null);
  const [createIconOpen, setCreateIconOpen] = useState(false);
  const [subColorEditing, setSubColorEditing] = useState<string | null>(null);
  const [subDrafts, setSubDrafts] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [colorEditingId, setColorEditingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [limitDraft, setLimitDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [budgetsOpen, setBudgetsOpen] = useState(false);
  const [renamingConceptId, setRenamingConceptId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [subEditingId, setSubEditingId] = useState<string | null>(null);
  // Picking where things go: join a sub, or re-file what a deleted sub / category had.
  const [relocate, setRelocate] = useState<
    | { kind: 'merge' | 'deleteSub'; subId: string; name: string }
    | { kind: 'deleteConcept'; conceptId: string; name: string }
    | null
  >(null);

  const concepts = usePickableSpendConcepts();
  const newConceptColor = nextConceptColor(concepts);
  const newConceptIcon =
    pickedIcon ?? guessConceptIcon({ id: '', name: conceptDraft || '' });

  // A credit paid off this month stays listed as paid; from next month it is gone.
  const paidSubIds = useMemo(() => paidDebtSubIds(debts).paidThisMonth, [debts]);

  function editFailed(reason: TreeEditError | null) {
    if (reason === 'duplicate') {
      appAlert(t('plan.nameTaken'), undefined, undefined, { tone: 'warning' });
    }
    return reason !== null;
  }

  async function saveConceptName(conceptId: string) {
    if (editFailed(await tree.renameConcept(conceptId, nameDraft))) return;
    setRenamingConceptId(null);
  }

  async function saveSubName(subId: string) {
    if (editFailed(await tree.renameSub(subId, nameDraft))) return;
    setSubEditingId(null);
  }

  function openSubEdit(subId: string, name: string) {
    tapFeedback();
    setRelocate(null);
    setSubEditingId((prev) => (prev === subId ? null : subId));
    setNameDraft(name);
  }

  function askMove(subId: string, subName: string, toConceptId: string, toName: string) {
    const target = concepts.find((c) => c.id === toConceptId);
    const twin = target?.subs.some(
      (s) => s.name.trim().toLowerCase() === subName.trim().toLowerCase()
    );
    appAlert(
      t('plan.moveConfirmTitle', { name: subName, to: toName }),
      twin ? t('plan.moveJoinsBody', { name: subName, to: toName }) : t('plan.moveBody'),
      [
        { text: t('plan.setLimitCancel'), style: 'cancel' },
        {
          text: t('plan.moveConfirm'),
          onPress: () =>
            void tree.moveSub(subId, toConceptId).then((reason) => {
              if (!editFailed(reason)) setSubEditingId(null);
            }),
        },
      ]
    );
  }

  /** Deleting never strands movements: with any, first choose where they go. */
  function askDeleteSub(conceptId: string, subId: string, name: string) {
    const used = tree.usage([subId]);
    if (used.movements + used.debts > 0) {
      setRelocate({ kind: 'deleteSub', subId, name });
      return;
    }
    appAlert(name, undefined, [
      { text: t('plan.setLimitCancel'), style: 'cancel' },
      {
        text: t('plan.deleteSub'),
        style: 'destructive',
        onPress: () => {
          setSubEditingId(null);
          void removeSpendSub(conceptId, subId);
        },
      },
    ]);
  }

  function askDeleteConcept(conceptId: string, name: string) {
    const full = (settings.spendConcepts ?? []).find((c) => c.id === conceptId);
    const used = tree.usage([conceptId, ...(full?.subs ?? []).map((s) => s.id)]);
    if (used.movements + used.debts > 0) {
      setSubEditingId(null);
      setRelocate({ kind: 'deleteConcept', conceptId, name });
      return;
    }
    appAlert(name, t('plan.deleteConcept'), [
      { text: t('plan.setLimitCancel'), style: 'cancel' },
      {
        text: t('plan.deleteConcept'),
        style: 'destructive',
        onPress: () => void removeSpendConcept(conceptId),
      },
    ]);
  }

  /** Destination picked: confirm, then join / re-file. */
  function relocateTo(toSubId: string, toLabel: string) {
    if (!relocate) return;
    const current = relocate;
    const ids =
      current.kind === 'deleteConcept'
        ? [
            current.conceptId,
            ...((settings.spendConcepts ?? []).find((c) => c.id === current.conceptId)?.subs ?? []).map(
              (s) => s.id
            ),
          ]
        : [current.subId];
    const count = tree.usage(ids).movements;
    const merging = current.kind === 'merge';
    appAlert(
      t(merging ? 'plan.mergeConfirmTitle' : 'plan.deleteMoveTitle', {
        from: current.name,
        to: toLabel,
      }),
      t(merging ? 'plan.mergeConfirmBody' : 'plan.deleteMoveBody', {
        from: current.name,
        to: toLabel,
        count,
      }),
      [
        { text: t('plan.setLimitCancel'), style: 'cancel' },
        {
          text: t(merging ? 'plan.mergeConfirm' : 'plan.deleteMoveConfirm'),
          style: merging ? 'default' : 'destructive',
          onPress: () =>
            void (
              current.kind === 'deleteConcept'
                ? tree.removeConceptInto(current.conceptId, toSubId)
                : tree.mergeSub(current.subId, toSubId)
            ).then((reason) => {
              if (editFailed(reason)) return;
              setRelocate(null);
              setSubEditingId(null);
            }),
        },
      ]
    );
  }

  function relocatePanel(excludeSubIds: string[], excludeConceptId?: string) {
    if (!relocate) return null;
    const ids =
      relocate.kind === 'deleteConcept'
        ? [
            relocate.conceptId,
            ...((settings.spendConcepts ?? []).find((c) => c.id === relocate.conceptId)?.subs ?? []).map(
              (s) => s.id
            ),
          ]
        : [relocate.subId];
    const count = tree.usage(ids).movements;
    return (
      <View style={styles.relocate}>
        <Text style={styles.copy}>
          {relocate.kind === 'merge'
            ? t('plan.mergePick', { name: relocate.name })
            : t('plan.deletePick', { name: relocate.name, count })}
        </Text>
        <SubDestinationPicker
          concepts={concepts}
          excludeSubIds={excludeSubIds}
          excludeConceptId={excludeConceptId}
          onPick={(_conceptId, subId, label) => relocateTo(subId, label)}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => setRelocate(null)}
          style={styles.secondaryBtn}>
          <Text style={styles.secondaryText}>{t('plan.setLimitCancel')}</Text>
        </Pressable>
      </View>
    );
  }

  async function handleAddConcept() {
    if (!conceptDraft.trim()) return;
    setSaving(true);
    try {
      const created = await addSpendConcept(conceptDraft, newConceptColor, newConceptIcon);
      setConceptDraft('');
      setPickedIcon(null);
      setCreateIconOpen(false);
      if (created) setExpanded(created.id);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddSub(conceptId: string) {
    const name = (subDrafts[conceptId] ?? '').trim();
    if (!name) return;
    setSaving(true);
    try {
      const id = await addSpendSub(conceptId, name);
      if (!id) {
        appAlert(t('plan.subDuplicateTitle'), t('plan.subDuplicateBody'), undefined, { tone: 'warning' });
        return;
      }
      setSubDrafts((prev) => ({ ...prev, [conceptId]: '' }));
    } finally {
      setSaving(false);
    }
  }

  function openLimit(subId: string) {
    const current = budgetStatus.find((b) => b.categoryId === subId)?.limit;
    setEditingId(subId);
    setLimitDraft(current ? String(current) : '');
    setBudgetsOpen(true);
  }

  async function saveLimit() {
    if (!editingId) return;
    const text = limitDraft.trim();
    if (!text) await removeBudget(editingId);
    else {
      const amount = parse(text);
      if (!amount || amount <= 0) await removeBudget(editingId);
      else await updateBudget(editingId, amount);
    }
    setEditingId(null);
    setLimitDraft('');
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.copy}>{t('plan.conceptsBody')}</Text>

      <View style={styles.addRow}>
        {/* The icon is guessed from the name; tapping the preview opens the picker. */}
        <SelectPressable
          onPress={() => setCreateIconOpen((v) => !v)}
          hitSlop={8}
          accessibilityLabel={t('plan.conceptIcon')}
          style={[styles.iconPreview, createIconOpen && styles.iconPreviewOpen]}>
          <ConceptIcon icon={newConceptIcon} color={newConceptColor} size={16} variant="bubble" />
        </SelectPressable>
        <TextInput
          value={conceptDraft}
          onChangeText={setConceptDraft}
          placeholder={t('plan.conceptsCustomPlaceholder')}
          placeholderTextColor={palette.inkSoft}
          style={styles.input}
        />
        <SelectPressable
          onPress={() => void handleAddConcept()}
          disabled={saving || !conceptDraft.trim()}
          style={[styles.addBtn, { backgroundColor: newConceptColor }]}>
          <Text style={styles.addBtnText}>{t('plan.conceptsAdd')}</Text>
        </SelectPressable>
      </View>

      {createIconOpen ? (
        <>
          <Text style={styles.colorLabel}>{t('plan.conceptIcon')}</Text>
          <IconPicker selected={newConceptIcon} color={newConceptColor} onSelect={setPickedIcon} />
        </>
      ) : null}

      {concepts.length === 0 ? (
        <Text style={styles.copy}>{t('plan.conceptsEmpty')}</Text>
      ) : (
        concepts.map((concept) => {
          const open = expanded === concept.id;
          const editingColor = colorEditingId === concept.id;
          return (
            <View key={concept.id} style={styles.conceptBlock}>
              <View style={styles.conceptHeader}>
                <SelectPressable
                  onPress={() =>
                    setColorEditingId((prev) =>
                      prev === concept.id ? null : concept.id
                    )
                  }
                  hitSlop={8}
                  accessibilityLabel={t('plan.conceptIconEdit')}>
                  <ConceptIcon
                    icon={concept.icon}
                    color={concept.color ?? palette.inkSoft}
                    size={16}
                    variant="bubble"
                  />
                </SelectPressable>
                {renamingConceptId === concept.id ? (
                  <View style={[styles.addRow, styles.renameRow]}>
                    <TextInput
                      value={nameDraft}
                      onChangeText={setNameDraft}
                      autoFocus
                      returnKeyType="done"
                      onSubmitEditing={() => void saveConceptName(concept.id)}
                      accessibilityLabel={t('plan.rename')}
                      style={styles.input}
                    />
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setRenamingConceptId(null)}
                      style={styles.secondaryBtn}>
                      <Text style={styles.secondaryText}>{t('plan.setLimitCancel')}</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => void saveConceptName(concept.id)}
                      style={styles.addBtn}>
                      <Text style={styles.addBtnText}>{t('plan.setLimitSave')}</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      tapFeedback();
                      setExpanded(open ? null : concept.id);
                      setColorEditingId(null);
                      setSubEditingId(null);
                      setRelocate(null);
                    }}
                    style={styles.conceptHeaderMain}>
                    <Text style={styles.conceptTitle}>{concept.name}</Text>
                    <Text style={styles.chevron}>{open ? '▾' : '▸'}</Text>
                  </Pressable>
                )}
              </View>

              {editingColor ? (
                <View style={styles.colorEditor}>
                  <Text style={styles.colorLabel}>{t('plan.conceptIconEdit')}</Text>
                  <IconPicker
                    selected={concept.icon}
                    color={concept.color}
                    onSelect={(icon) => void updateSpendConceptIcon(concept.id, icon)}
                  />
                  <Text style={styles.colorLabel}>{t('plan.conceptColorEdit')}</Text>
                  <View style={styles.colorRow}>
                    {conceptColorChoices(concept.color).map((color) => {
                      const selected = (concept.color ?? '') === color;
                      return (
                        <SelectPressable
                          key={color}
                          onPress={() => void updateSpendConceptColor(concept.id, color)}
                          style={[
                            styles.colorDot,
                            { backgroundColor: color },
                            selected && styles.colorDotSelected,
                          ]}
                        />
                      );
                    })}
                  </View>
                </View>
              ) : null}

              {open ? (
                <View style={styles.conceptBody}>
                  {concept.subs.length === 0 ? (
                    <Text style={styles.copy}>{t('plan.subEmpty')}</Text>
                  ) : (
                    concept.subs.map((sub) => {
                      const budget = budgetStatus.find((b) => b.categoryId === sub.id);
                      const paidOff = paidSubIds.has(sub.id);
                      const antOn = sub.isAnt === true;
                      const editingSubColor = subColorEditing === sub.id;
                      const shades = subColorShades(concept.color);
                      if (sub.color && sub.color !== concept.color && !shades.includes(sub.color))
                        shades.push(sub.color);
                      return (
                        <View key={sub.id}>
                        <View style={styles.subRow}>
                          <SelectPressable
                            onPress={() =>
                              setSubColorEditing((prev) => (prev === sub.id ? null : sub.id))
                            }
                            hitSlop={10}
                            accessibilityLabel={t('plan.subColor')}
                            style={[
                              styles.subDot,
                              { backgroundColor: subColor(concept, sub) },
                              editingSubColor && styles.colorDotSelected,
                            ]}
                          />
                          <Pressable
                            accessibilityRole="button"
                            style={{ flex: 1 }}
                            onPress={() => openLimit(sub.id)}>
                            <View style={styles.subTitleRow}>
                              <Text style={styles.subTitle}>{sub.name}</Text>
                              {antOn ? (
                                <Text style={styles.antBadge}>{t('plan.antBadge')}</Text>
                              ) : null}
                              {paidOff ? (
                                <Text style={styles.paidBadge}>{t('plan.debtPaidBadge')}</Text>
                              ) : null}
                            </View>
                            {/* Only the limit here; what was spent lives in History, month by month. */}
                            <Text style={styles.limitMeta}>
                              {budget
                                ? t('plan.limitValue', { amount: format(budget.limit) })
                                : t('plan.noLimit')}
                            </Text>
                          </Pressable>
                          <Pressable
                            accessibilityRole="button"
                            onPress={() =>
                              void updateSpendSubAnt(concept.id, sub.id, !antOn)
                            }
                            style={[styles.antToggle, antOn && styles.antToggleOn]}>
                            <Text
                              style={[
                                styles.antToggleText,
                                antOn && styles.antToggleTextOn,
                              ]}>
                              {t('plan.antToggle')}
                            </Text>
                          </Pressable>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityState={{ expanded: subEditingId === sub.id }}
                            hitSlop={8}
                            onPress={() => openSubEdit(sub.id, sub.name)}>
                            <Text style={styles.editText}>{t('plan.subEdit')}</Text>
                          </Pressable>
                        </View>
                        {subEditingId === sub.id ? (
                          <View style={styles.subEditor}>
                            <Text style={styles.colorLabel}>{t('plan.rename')}</Text>
                            <View style={styles.addRow}>
                              <TextInput
                                value={nameDraft}
                                onChangeText={setNameDraft}
                                returnKeyType="done"
                                onSubmitEditing={() => void saveSubName(sub.id)}
                                accessibilityLabel={t('plan.rename')}
                                style={styles.input}
                              />
                              <Pressable
                                accessibilityRole="button"
                                onPress={() => void saveSubName(sub.id)}
                                style={styles.addBtn}>
                                <Text style={styles.addBtnText}>{t('plan.setLimitSave')}</Text>
                              </Pressable>
                            </View>

                            {concepts.length > 1 ? (
                              <>
                                <Text style={styles.colorLabel}>{t('plan.moveTo')}</Text>
                                <View style={styles.moveChips}>
                                  {concepts
                                    .filter((c) => c.id !== concept.id)
                                    .map((c) => (
                                      <SelectPressable
                                        key={c.id}
                                        onPress={() => askMove(sub.id, sub.name, c.id, c.name)}
                                        style={styles.moveChip}>
                                        <ConceptIcon icon={c.icon} color={c.color} size={14} />
                                        <Text style={styles.moveChipText}>{c.name}</Text>
                                      </SelectPressable>
                                    ))}
                                </View>
                              </>
                            ) : null}

                            <View style={styles.subActions}>
                              <Pressable
                                accessibilityRole="button"
                                onPress={() =>
                                  setRelocate({ kind: 'merge', subId: sub.id, name: sub.name })
                                }
                                style={styles.secondaryBtn}>
                                <Text style={styles.secondaryText}>{t('plan.mergeWith')}</Text>
                              </Pressable>
                              <Pressable
                                accessibilityRole="button"
                                onPress={() => askDeleteSub(concept.id, sub.id, sub.name)}
                                style={styles.secondaryBtn}>
                                <Text style={[styles.secondaryText, { color: palette.danger }]}>
                                  {t('plan.deleteSub')}
                                </Text>
                              </Pressable>
                            </View>

                            {relocate && relocate.kind !== 'deleteConcept' && relocate.subId === sub.id
                              ? relocatePanel([sub.id])
                              : null}
                          </View>
                        ) : null}
                        {editingSubColor ? (
                          <View style={styles.subColorEditor}>
                            <Text style={styles.colorLabel}>{t('plan.subColor')}</Text>
                            <View style={styles.colorRow}>
                              {/* First dot = inherit the category color; the rest are its tones. */}
                              <SelectPressable
                                onPress={() => void updateSpendSubColor(concept.id, sub.id, undefined)}
                                accessibilityLabel={t('plan.subColorReset')}
                                style={[
                                  styles.colorDot,
                                  { backgroundColor: concept.color },
                                  !sub.color && styles.colorDotSelected,
                                ]}
                              />
                              {shades.map((color) => (
                                <SelectPressable
                                  key={color}
                                  onPress={() => void updateSpendSubColor(concept.id, sub.id, color)}
                                  style={[
                                    styles.colorDot,
                                    { backgroundColor: color },
                                    sub.color === color && styles.colorDotSelected,
                                  ]}
                                />
                              ))}
                            </View>
                          </View>
                        ) : null}
                        </View>
                      );
                    })
                  )}

                  <View style={styles.addRow}>
                    <TextInput
                      value={subDrafts[concept.id] ?? ''}
                      onChangeText={(v) =>
                        setSubDrafts((prev) => ({ ...prev, [concept.id]: v }))
                      }
                      placeholder={t('plan.subPlaceholder')}
                      placeholderTextColor={palette.inkSoft}
                      style={styles.input}
                    />
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => void handleAddSub(concept.id)}
                      style={styles.addBtn}>
                      <Text style={styles.addBtnText}>{t('plan.subAdd')}</Text>
                    </Pressable>
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setRenamingConceptId(concept.id);
                      setNameDraft(concept.name);
                    }}
                    style={styles.styleEditBtn}>
                    <Text style={styles.styleEditText}>{t('plan.renameConcept')}</Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      setColorEditingId((prev) => (prev === concept.id ? null : concept.id))
                    }
                    style={styles.styleEditBtn}>
                    <Text style={styles.styleEditText}>{t('plan.conceptStyleEdit')}</Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => askDeleteConcept(concept.id, concept.name)}
                    style={styles.deleteConceptBtn}>
                    <Text style={styles.deleteText}>{t('plan.deleteConcept')}</Text>
                  </Pressable>

                  {relocate?.kind === 'deleteConcept' && relocate.conceptId === concept.id
                    ? relocatePanel([], concept.id)
                    : null}
                </View>
              ) : null}
            </View>
          );
        })
      )}

      <Pressable
        accessibilityRole="button"
        onPress={() => {
          tapFeedback();
          setBudgetsOpen((v) => !v);
        }}
        style={styles.collapseHeader}>
        <Text style={styles.section}>{t('plan.budgets')}</Text>
        <Text style={styles.chevron}>{budgetsOpen ? '▾' : '▸'}</Text>
      </Pressable>
      {budgetsOpen ? (
        <>
          <Text style={styles.copy}>{t('plan.budgetsHint')}</Text>

          {editingId ? (
            <View style={styles.limitEditor}>
              <Text style={styles.subTitle}>
                {categoryLabel(editingId, t, concepts)}
              </Text>
              <TextInput
                value={limitDraft}
                onChangeText={setLimitDraft}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={palette.inkSoft}
                style={styles.input}
                autoFocus
              />
              <View style={styles.addRow}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setEditingId(null);
                    setLimitDraft('');
                  }}
                  style={styles.secondaryBtn}>
                  <Text style={styles.secondaryText}>{t('plan.setLimitCancel')}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    void removeBudget(editingId).then(() => {
                      setEditingId(null);
                      setLimitDraft('');
                    })
                  }
                  style={styles.secondaryBtn}>
                  <Text style={[styles.secondaryText, { color: palette.danger }]}>
                    {t('plan.setLimitClear')}
                  </Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => void saveLimit()} style={styles.addBtn}>
                  <Text style={styles.addBtnText}>{t('plan.setLimitSave')}</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Text style={styles.copy}>{t('plan.budgetsTapHint')}</Text>
          )}
        </>
      ) : null}

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/(tabs)/wealth')}
        style={styles.debtLink}>
        <Text style={styles.debtLinkText}>{t('plan.goDebts')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 8,
  },
  copy: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkMuted,
    lineHeight: 18,
  },
  section: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: palette.ink,
  },
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  input: {
    flex: 1,
    minWidth: 120,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: palette.ink,
    backgroundColor: '#F4F7F8',
  },
  addBtn: {
    backgroundColor: palette.accent,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addBtnText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.white,
  },
  secondaryBtn: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#FFF',
  },
  secondaryText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.inkMuted,
  },
  conceptBlock: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.sm,
    overflow: 'hidden',
    marginTop: 4,
  },
  conceptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F7FAFC',
    gap: 10,
  },
  conceptHeaderMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  colorLabel: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: palette.inkMuted,
    marginTop: 2,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotSelected: {
    borderColor: palette.ink,
  },
  colorEditor: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: '#FFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
  },
  conceptTitle: {
    flex: 1,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: palette.ink,
  },
  chevron: { fontSize: 14, color: palette.inkMuted },
  conceptBody: { padding: 12, gap: 8, backgroundColor: '#FFF' },
  subDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  subColorEditor: {
    gap: 8,
    paddingBottom: 10,
    paddingLeft: 24,
  },
  iconPreview: {
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconPreviewOpen: {
    borderColor: palette.ink,
  },
  styleEditBtn: { alignSelf: 'flex-start', marginTop: 4 },
  styleEditText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: palette.accent,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  subTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  subTitle: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: palette.ink,
  },
  antBadge: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: palette.accentDeep,
    backgroundColor: '#FFF3EB',
    overflow: 'hidden',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  renameRow: { flex: 1, marginTop: 0 },
  editText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.accentDeep,
  },
  subEditor: {
    marginLeft: 22,
    marginBottom: 10,
    gap: 6,
  },
  subActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  moveChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  moveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
  },
  moveChipText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: palette.ink,
  },
  relocate: {
    marginTop: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 6,
  },
  paidBadge: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: palette.success,
    backgroundColor: palette.successSoft,
    overflow: 'hidden',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  antToggle: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#F7FAFC',
  },
  antToggleOn: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  antToggleText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: palette.inkMuted,
  },
  antToggleTextOn: {
    color: palette.white,
  },
  collapseHeader: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  limitMeta: {
    marginTop: 2,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: palette.inkMuted,
  },
  deleteText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: palette.danger,
  },
  deleteConceptBtn: { alignSelf: 'flex-start', marginTop: 4 },
  limitEditor: {
    padding: 12,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: palette.accent,
    backgroundColor: '#FFF8F4',
    gap: 8,
  },
  debtLink: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radii.sm,
    backgroundColor: '#EEF7F6',
    borderWidth: 1,
    borderColor: 'rgba(46,196,182,0.35)',
  },
  debtLinkText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.tealText,
  },
});
