import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLanguage } from '@/src/i18n/LanguageContext';
import { colors } from '@/src/theme';
import { palette, radii } from '@/src/theme/colors';

/**
 * In-app privacy policy (no network). Public HTTPS URL for stores is separate
 * — enable GitHub Pages on /docs so PRIVACY_POLICY_URL resolves.
 */
export default function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets();
  const { language, t } = useLanguage();
  const es = language === 'es';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: Math.max(insets.bottom, 24) + 16 },
      ]}
      showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <Text style={styles.title}>{t('about.privacyPolicy')}</Text>
        <Text style={styles.meta}>
          {es
            ? 'Última actualización: 5 de noviembre de 2026 · Sotico91'
            : 'Last updated: November 5, 2026 · Sotico91'}
        </Text>

        {es ? (
          <>
            <Text style={styles.p}>
              Rumi (“la App”) es una aplicación de finanzas personales. Esta política
              explica qué datos se manejan y cómo. Al usar la App aceptas estas prácticas.
            </Text>
            <Text style={styles.h}>1. Resumen</Text>
            <Text style={styles.p}>
              Tus movimientos, cuentas, presupuestos y ajustes se guardan en tu dispositivo y
              nunca salen de él. Rumi no tiene servidor, no pide crear una cuenta y no vende ni
              comparte tus datos. Las preguntas que haces en “Pregúntale a Rumi” se responden en
              el propio teléfono. Lo único que sale por internet es lo necesario para Rumi Pro
              (punto 6), con un identificador anónimo.
            </Text>
            <Text style={styles.h}>2. Datos que procesa la App</Text>
            <Text style={styles.p}>
              • Nombre que indiques en la App.{'\n'}
              • Movimientos (montos, conceptos, notas, métodos de pago).{'\n'}
              • Cuentas, deudas, presupuestos, recordatorios y preferencias.{'\n'}
              • Copias de respaldo que tú exportes o restaures (JSON/CSV).
            </Text>
            <Text style={styles.h}>3. Permisos del dispositivo</Text>
            <Text style={styles.p}>
              • Notificaciones — recordatorios y avisos al registrar (opcionales).{'\n'}
              • Face ID / huella o código — solo si activas el bloqueo; la verificación la
              hace el sistema y Rumi no recibe tu huella ni tu rostro.{'\n'}
              • Archivos / compartir — solo al exportar o restaurar un respaldo.{'\n'}
              • Micrófono y reconocimiento de voz — solo si tocas el micrófono para dictar.
              Rumi no graba ni guarda el audio. Si el teléfono tiene el idioma instalado, el
              reconocimiento se hace en el dispositivo; si no, el sistema (Apple o Google) pasa
              la voz a texto con su propio servicio y Rumi solo recibe el texto.{'\n'}
              {'\n'}
              La App no solicita cámara, contactos ni ubicación.
            </Text>
            <Text style={styles.h}>4. Notificaciones en la pantalla bloqueada</Text>
            <Text style={styles.p}>
              Los avisos al registrar un movimiento vienen apagados. Si los activas, muestran el
              monto y la categoría, y pueden verse con el teléfono bloqueado; el ojo que oculta
              los montos dentro de la App no aplica a esas notificaciones. Se encienden y apagan
              en Ajustes (tu inicial en Inicio) o en los ajustes de notificaciones del teléfono.
            </Text>
            <Text style={styles.h}>5. Copias de seguridad del teléfono</Text>
            <Text style={styles.p}>
              Si tienes activadas las copias de seguridad del sistema (iCloud en iPhone o la
              copia de Google en Android), el sistema puede incluir los datos de Rumi en esa
              copia, siempre cifrados. En iPhone, una copia cifrada también guarda la llave y
              los restaura en el teléfono nuevo. En Android la llave no sale del teléfono: para
              pasar tus datos a otro equipo usa “Exportar respaldo” en Ajustes.
            </Text>
            <Text style={styles.h}>6. Servicios de terceros</Text>
            <Text style={styles.p}>
              Rumi Pro: la compra la cobra Google Play o la App Store, y Rumi usa RevenueCat
              (RevenueCat, Inc., EE. UU.) para comprobarla. Al abrir la App, RevenueCat recibe un
              identificador anónimo creado por la App, la dirección IP, el modelo del teléfono,
              la versión del sistema y, si compras, los datos de la compra (plan, precio, fecha y
              país de la tienda), para mostrar los planes y saber si tienes Pro. No recibe tu
              nombre, tu correo ni tus movimientos.{'\n'}
              {'\n'}
              No incluye publicidad, analítica ni SDKs de seguimiento. Las notificaciones son
              locales y se programan en el dispositivo. “Reportar un error” abre tu app de
              correo y solo se envía lo que tú escribas. Apple y Google pueden procesar datos
              de instalación según sus propias políticas.
            </Text>
            <Text style={styles.h}>7. Menores</Text>
            <Text style={styles.p}>
              Rumi no está dirigida a menores de 13 años.
            </Text>
            <Text style={styles.h}>8. Conservación y eliminación</Text>
            <Text style={styles.p}>
              Los datos permanecen en tu dispositivo hasta que los borres o desinstales la App.
              “Borrar todos los datos” (en Ajustes) elimina movimientos, saldos, deudas y
              topes; tus categorías y tu nombre se conservan. Desinstalar elimina todo lo
              guardado en el dispositivo; las copias del sistema (punto 5) se gestionan desde tu
              cuenta de Apple o Google.
            </Text>
            <Text style={styles.h}>9. Seguridad</Text>
            <Text style={styles.p}>
              Tus movimientos, cuentas, deudas, topes, categorías y nombre se guardan cifrados
              (AES-256) con una llave que vive en el almacén seguro del teléfono (Llavero de
              iOS / Keystore de Android), separada de los datos. Recomendamos el bloqueo de la
              App en dispositivos compartidos. Los respaldos que exportes no van cifrados:
              protégelos como información sensible.
            </Text>
            <Text style={styles.h}>10. Contacto</Text>
            <Text style={styles.p}>soporte.rumifinanzas@gmail.com</Text>
          </>
        ) : (
          <>
            <Text style={styles.p}>
              Rumi (“the App”) is a personal finance app. This policy explains what data is
              handled and how. By using the App you accept these practices.
            </Text>
            <Text style={styles.h}>1. Summary</Text>
            <Text style={styles.p}>
              Your transactions, accounts, budgets and settings are stored on your device and
              never leave it. Rumi has no server, asks you to create no account, and does not
              sell or share your data. Questions you ask in “Ask Rumi” are answered on the phone
              itself. The only thing that goes over the internet is what Rumi Pro needs
              (section 6), with an anonymous identifier.
            </Text>
            <Text style={styles.h}>2. Data the App processes</Text>
            <Text style={styles.p}>
              • Name you enter in the App.{'\n'}
              • Movements (amounts, concepts, notes, payment methods).{'\n'}
              • Accounts, debts, budgets, reminders and preferences.{'\n'}
              • Backups you export or restore (JSON/CSV).
            </Text>
            <Text style={styles.h}>3. Device permissions</Text>
            <Text style={styles.p}>
              • Notifications — optional reminders and alerts when you log.{'\n'}
              • Face ID / fingerprint or passcode — only if you enable App Lock; the system
              does the check and Rumi never receives your face or fingerprint.{'\n'}
              • Files / sharing — only when you export or restore a backup.{'\n'}
              • Microphone and speech recognition — only if you tap the microphone to dictate.
              Rumi does not record or store the audio. If the phone has the language installed,
              recognition runs on the device; otherwise the system (Apple or Google) turns the
              speech into text with its own service and Rumi only receives the text.{'\n'}
              {'\n'}
              The App does not request camera, contacts or location access.
            </Text>
            <Text style={styles.h}>4. Notifications on the lock screen</Text>
            <Text style={styles.p}>
              Alerts when you log a movement are off by default. If you turn them on, they show
              the amount and category and can be seen while the phone is locked; the eye that
              hides amounts inside the App does not apply to them. Turn them on or off in
              Settings (your initial on Home) or in your phone’s notification settings.
            </Text>
            <Text style={styles.h}>5. Phone backups</Text>
            <Text style={styles.p}>
              If system backups are on (iCloud on iPhone, Google backup on Android), the system
              may include Rumi’s data in that backup, always encrypted. On iPhone an encrypted
              backup also carries the key and restores the data on a new phone. On Android the
              key never leaves the phone: to move your data, use “Export backup” in Settings.
            </Text>
            <Text style={styles.h}>6. Third parties</Text>
            <Text style={styles.p}>
              Rumi Pro: Google Play or the App Store charges the purchase, and Rumi uses
              RevenueCat (RevenueCat, Inc., USA) to check it. When the App opens, RevenueCat
              receives an anonymous identifier created by the App, the IP address, the phone
              model, the system version and, if you buy, the purchase details (plan, price, date
              and store country), to show the plans and know whether you have Pro. It does not
              receive your name, your email or your transactions.{'\n'}
              {'\n'}
              No ads, analytics or tracking SDKs. Notifications are local and scheduled on the
              device. “Report a problem” opens your email app and only sends what you write.
              Apple and Google may process install data under their own policies.
            </Text>
            <Text style={styles.h}>7. Children</Text>
            <Text style={styles.p}>
              Rumi is not directed at children under 13.
            </Text>
            <Text style={styles.h}>8. Retention and deletion</Text>
            <Text style={styles.p}>
              Data stays on your device until you delete it or uninstall the App. “Delete all
              data” (in Settings) removes movements, balances, debts and limits; your
              categories and name are kept. Uninstalling removes everything stored on the
              device; system backups (section 5) are managed from your Apple or Google account.
            </Text>
            <Text style={styles.h}>9. Security</Text>
            <Text style={styles.p}>
              Your movements, accounts, debts, limits, categories and name are stored encrypted
              (AES-256) with a key kept in the phone’s secure store (iOS Keychain / Android
              Keystore), apart from the data. We recommend enabling App Lock on shared devices.
              Exported backups are not encrypted: treat them as sensitive information.
            </Text>
            <Text style={styles.h}>10. Contact</Text>
            <Text style={styles.p}>soporte.rumifinanzas@gmail.com</Text>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg.screen,
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 8,
  },
  title: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 24,
    color: palette.ink,
  },
  meta: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: palette.inkSoft,
    marginBottom: 8,
  },
  h: {
    marginTop: 12,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: palette.ink,
  },
  p: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: palette.inkMuted,
    lineHeight: 21,
  },
});
