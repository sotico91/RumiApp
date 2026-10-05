import { Pressable, Text, View } from 'react-native';

import { styles } from '@/src/components/wealth/styles';
import { tapFeedback } from '@/src/utils/selectFeedback';

export function OptionChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <View style={styles.chipWrap}>
      {options.map((opt) => {
        const on = opt.id === value;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: !!on }}
            key={opt.id}
            onPress={() => {
              tapFeedback();
              onChange(opt.id);
            }}
            style={[styles.chip, on && styles.chipOn]}>
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
