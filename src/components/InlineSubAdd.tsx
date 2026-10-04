import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { palette, radii } from '@/src/theme/colors';
import { tapFeedback } from '@/src/utils/selectFeedback';
import { appAlert } from '@/src/components/AppAlert';

type Props = {
  conceptId: string;
  onAdded: (subId: string) => void;
};

export function InlineSubAdd({ conceptId, onAdded }: Props) {
  const { t } = useLanguage();
  const { addSpendSub } = useSettings();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      const id = await addSpendSub(conceptId, trimmed);
      if (!id) {
        appAlert(t('plan.subDuplicateTitle'), t('plan.subDuplicateBody'), undefined, { tone: 'warning' });
        return;
      }
      tapFeedback();
      setName('');
      onAdded(id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{t('flow.addSubInline')}</Text>
      <View style={styles.row}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={t('plan.subPlaceholder')}
          placeholderTextColor={palette.inkSoft}
          style={styles.input}
          editable={!busy}
          onSubmitEditing={() => void handleAdd()}
          returnKeyType="done"
        />
        <Pressable
          onPress={() => void handleAdd()}
          disabled={busy || !name.trim()}
          style={[styles.btn, (!name.trim() || busy) && styles.btnDisabled]}>
          {busy ? (
            <ActivityIndicator size="small" color={palette.white} />
          ) : (
            <Text style={styles.btnText}>{t('flow.addSubButton')}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
    marginTop: 4,
  },
  label: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: palette.inkMuted,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: palette.ink,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F7FAFC',
  },
  btn: {
    backgroundColor: palette.accent,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    minWidth: 72,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: palette.white,
  },
});
