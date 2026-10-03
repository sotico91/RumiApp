import { useEffect } from 'react';
import { Alert } from 'react-native';

import { takeUnreadableNotice } from '@/src/data/secureStorage';
import { useFinance } from '@/src/hooks/useFinance';
import { useLanguage } from '@/src/i18n/LanguageContext';

/**
 * Data encrypted with another phone's key (e.g. a system backup restored on
 * a new device) is set aside untouched; tell the person once how to get it back.
 */
export function StorageNotice() {
  const { t } = useLanguage();
  const { loading } = useFinance();

  useEffect(() => {
    if (loading) return;
    if (takeUnreadableNotice()) {
      Alert.alert(t('storage.unreadableTitle'), t('storage.unreadableBody'));
    }
  }, [loading, t]);

  return null;
}
