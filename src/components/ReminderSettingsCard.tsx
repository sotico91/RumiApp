import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { flattenSpendSubs } from '@/src/data/spendConcepts';
import { AppModal } from '@/src/components/AppModal';
import { KeyboardSafeOverlay } from '@/src/components/KeyboardSafe';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { palette, radii } from '@/src/theme/colors';
import type { ReminderRule } from '@/src/types/settings';
import { categoryLabel } from '@/src/utils/categoryLabel';
import { reminderPushCopy } from '@/src/utils/reminderCopy';
import { tapFeedback } from '@/src/utils/selectFeedback';

const HOURS = [7, 8, 9, 12, 18, 19, 20, 21];
const MINUTES = [0, 15, 30, 45];
const MONTH_DAYS = [1, 5, 10, 15, 20, 25, 28];

export function ReminderSettingsCard() {
  const { t, language } = useLanguage();
  const { settings, updateReminders } = useSettings();
  const spendConcepts = settings.spendConcepts ?? [];
  const [rules, setRules] = useState<ReminderRule[]>(settings.reminderRules ?? []);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRules(settings.reminderRules ?? []);
  }, [settings.reminderRules]);

  const allSubs = useMemo(() => flattenSpendSubs(spendConcepts), [spendConcepts]);

  const availableSubs = useMemo(() => {
    const selected = new Set(rules.map((r) => r.subId));
    const q = pickerQuery.trim().toLowerCase();
    return allSubs.filter((sub) => {
      if (selected.has(sub.id)) return false;
      if (!q) return true;
      const label = categoryLabel(sub.id, t, spendConcepts).toLowerCase();
      return label.includes(q) || sub.name.toLowerCase().includes(q);
    });
  }, [allSubs, rules, pickerQuery, t, spendConcepts]);

  function addSub(subId: string) {
    tapFeedback();
    setRules((prev) => [
      ...prev,
      {
        subId,
        hour: settings.reminderHour ?? 20,
        minute: settings.reminderMinute ?? 0,
      },
    ]);
    setEditingSubId(subId);
    setPickerOpen(false);
    setPickerQuery('');
  }

  function removeSub(subId: string) {
    setRules((prev) => prev.filter((r) => r.subId !== subId));
    if (editingSubId === subId) setEditingSubId(null);
  }

  function patchRule(subId: string, patch: Partial<ReminderRule>) {
    setRules((prev) =>
      prev.map((r) => (r.subId === subId ? { ...r, ...patch } : r))
    );
  }

  async function save() {
    setSaving(true);
    try {
      const labels: Record<string, { title: string; body: string }> = {};
      for (const rule of rules) {
        labels[rule.subId] = reminderPushCopy(rule.subId, spendConcepts, t, language);
      }
      await updateReminders({
        reminderRules: rules,
        reminderLabels: labels,
        reminderHour: rules[0]?.hour ?? settings.reminderHour,
        reminderMinute: rules[0]?.minute ?? settings.reminderMinute ?? 0,
      });
      Alert.alert(t('reminder.savedTitle'), t('reminder.savedBody'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.copy}>{t('reminder.body')}</Text>

      {allSubs.length === 0 ? (
        <Text style={styles.copy}>{t('reminder.noConcepts')}</Text>
      ) : (
        <Pressable
          onPress={() => {
            tapFeedback();
            setPickerOpen(true);
          }}
          style={styles.pickerBtn}>
          <Text style={styles.pickerBtnText}>{t('reminder.addSub')}</Text>
          <Text style={styles.chevron}>▾</Text>
        </Pressable>
      )}

      {rules.length === 0 ? (
        <Text style={styles.copy}>{t('reminder.noneYet')}</Text>
      ) : (
        rules.map((rule) => {
          const label = categoryLabel(rule.subId, t, spendConcepts);
          const open = editingSubId === rule.subId;
          return (
            <View key={rule.subId} style={styles.ruleCard}>
              <Pressable
                onPress={() => {
                  tapFeedback();
                  setEditingSubId(open ? null : rule.subId);
                }}
                style={styles.ruleHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ruleTitle}>{label}</Text>
                  <Text style={styles.ruleMeta}>
                    {rule.dayOfMonth
                      ? t('reminder.monthlyAt', {
                          day: rule.dayOfMonth,
                          time: `${String(rule.hour).padStart(2, '0')}:${String(rule.minute).padStart(2, '0')}`,
                        })
                      : t('reminder.dailyAt', {
                          time: `${String(rule.hour).padStart(2, '0')}:${String(rule.minute).padStart(2, '0')}`,
                        })}
                  </Text>
                </View>
                <Text style={styles.chevron}>{open ? '▾' : '▸'}</Text>
              </Pressable>

              {open ? (
                <View style={styles.ruleBody}>
                  <Text style={styles.miniLabel}>{t('reminder.frequency')}</Text>
                  <View style={styles.row}>
                    <Pressable
                      onPress={() => patchRule(rule.subId, { dayOfMonth: undefined })}
                      style={[styles.chip, rule.dayOfMonth == null && styles.chipOn]}>
                      <Text
                        style={[
                          styles.chipText,
                          rule.dayOfMonth == null && styles.chipTextOn,
                        ]}>
                        {t('reminder.daily')}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        patchRule(rule.subId, {
                          dayOfMonth: rule.dayOfMonth ?? 5,
                        })
                      }
                      style={[styles.chip, rule.dayOfMonth != null && styles.chipOn]}>
                      <Text
                        style={[
                          styles.chipText,
                          rule.dayOfMonth != null && styles.chipTextOn,
                        ]}>
                        {t('reminder.monthly')}
                      </Text>
                    </Pressable>
                  </View>

                  {rule.dayOfMonth != null ? (
                    <>
                      <Text style={styles.miniLabel}>{t('reminder.pickDay')}</Text>
                      <View style={styles.row}>
                        {MONTH_DAYS.map((d) => (
                          <Pressable
                            key={d}
                            onPress={() => patchRule(rule.subId, { dayOfMonth: d })}
                            style={[
                              styles.hourChip,
                              rule.dayOfMonth === d && styles.hourOn,
                            ]}>
                            <Text
                              style={[
                                styles.hourText,
                                rule.dayOfMonth === d && styles.hourTextOn,
                              ]}>
                              {t('reminder.dayLabel', { day: d })}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                      <TextInput
                        value={String(rule.dayOfMonth)}
                        onChangeText={(v) => {
                          const n = Math.min(28, Math.max(1, Number(v) || 1));
                          patchRule(rule.subId, { dayOfMonth: n });
                        }}
                        keyboardType="number-pad"
                        style={styles.dayInput}
                        placeholder="1-28"
                        placeholderTextColor={palette.inkSoft}
                      />
                    </>
                  ) : null}

                  <Text style={styles.miniLabel}>{t('reminder.pickHour')}</Text>
                  <View style={styles.row}>
                    {HOURS.map((h) => (
                      <Pressable
                        key={h}
                        onPress={() => patchRule(rule.subId, { hour: h })}
                        style={[styles.hourChip, rule.hour === h && styles.hourOn]}>
                        <Text
                          style={[
                            styles.hourText,
                            rule.hour === h && styles.hourTextOn,
                          ]}>
                          {t('reminder.hourLabel', { hour: h })}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <Text style={styles.miniLabel}>{t('reminder.pickMinute')}</Text>
                  <View style={styles.row}>
                    {MINUTES.map((m) => (
                      <Pressable
                        key={m}
                        onPress={() => patchRule(rule.subId, { minute: m })}
                        style={[
                          styles.hourChip,
                          rule.minute === m && styles.hourOn,
                        ]}>
                        <Text
                          style={[
                            styles.hourText,
                            rule.minute === m && styles.hourTextOn,
                          ]}>
                          :{String(m).padStart(2, '0')}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <Pressable
                    onPress={() => removeSub(rule.subId)}
                    style={styles.removeBtn}>
                    <Text style={styles.removeText}>{t('reminder.remove')}</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          );
        })
      )}

      <Pressable
        onPress={() => void save()}
        disabled={saving}
        style={[styles.saveBtn, saving && { opacity: 0.7 }]}>
        <Text style={styles.saveText}>
          {saving ? t('add.saving') : t('reminder.save')}
        </Text>
      </Pressable>

      <AppModal
        visible={pickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerOpen(false)}>
        <KeyboardSafeOverlay>
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{t('reminder.pickSubs')}</Text>
            <TextInput
              value={pickerQuery}
              onChangeText={setPickerQuery}
              placeholder={t('reminder.searchSub')}
              placeholderTextColor={palette.inkSoft}
              style={styles.searchInput}
              autoFocus
            />
            {availableSubs.length === 0 ? (
              <Text style={styles.copy}>{t('reminder.noAvailable')}</Text>
            ) : (
              <FlatList
                data={availableSubs}
                keyExtractor={(item) => item.id}
                style={{ maxHeight: 320 }}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => addSub(item.id)}
                    style={styles.pickerRow}>
                    <Text style={styles.pickerRowText}>
                      {categoryLabel(item.id, t, spendConcepts)}
                    </Text>
                  </Pressable>
                )}
              />
            )}
            <Pressable
              onPress={() => setPickerOpen(false)}
              style={styles.modalClose}>
              <Text style={styles.modalCloseText}>{t('plan.setLimitCancel')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
        </KeyboardSafeOverlay>
      </AppModal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
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
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#F4F7F8',
  },
  pickerBtnText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: palette.ink,
  },
  chevron: { fontSize: 14, color: palette.inkMuted },
  miniLabel: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: palette.inkMuted,
    marginTop: 6,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#F7FAFC',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  chipOn: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  chipText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: palette.ink,
  },
  chipTextOn: { color: palette.white },
  hourChip: {
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  hourOn: {
    backgroundColor: palette.teal,
    borderColor: palette.teal,
  },
  hourText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: palette.ink,
  },
  hourTextOn: { color: palette.white },
  dayInput: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: palette.ink,
    backgroundColor: '#F4F7F8',
    maxWidth: 100,
  },
  ruleCard: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.sm,
    overflow: 'hidden',
    backgroundColor: '#FFF',
  },
  ruleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F7FAFC',
    gap: 8,
  },
  ruleTitle: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: palette.ink,
  },
  ruleMeta: {
    marginTop: 2,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: palette.inkMuted,
  },
  ruleBody: { padding: 12, gap: 4 },
  removeBtn: { marginTop: 8, alignSelf: 'flex-start' },
  removeText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.danger,
  },
  saveBtn: {
    marginTop: 4,
    backgroundColor: palette.accent,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: palette.white,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: palette.surfaceSolid,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 18,
    paddingBottom: 28,
    gap: 10,
    maxHeight: '75%',
  },
  modalTitle: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 20,
    color: palette.brand,
  },
  searchInput: {
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
  pickerRow: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  pickerRowText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: palette.ink,
  },
  modalClose: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  modalCloseText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: palette.inkMuted,
  },
});
