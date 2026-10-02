import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Modal, Platform, StyleSheet, type ModalProps } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

/**
 * Drop-in for RN <Modal>. Android keeps the native modal (back button,
 * edge-to-edge). On iOS 27 the native modal can present invisibly and
 * swallow every touch, so there the content is drawn in a layer at the
 * app root instead (see <ModalHost>).
 */

type HostApi = {
  show: (id: string, node: ReactNode) => void;
  hide: (id: string) => void;
};

const ModalHostContext = createContext<HostApi | null>(null);

export function ModalHost({ children }: { children: ReactNode }) {
  const [layers, setLayers] = useState<{ id: string; node: ReactNode }[]>([]);

  const show = useCallback((id: string, node: ReactNode) => {
    setLayers((prev) => {
      const i = prev.findIndex((l) => l.id === id);
      if (i === -1) return [...prev, { id, node }];
      const next = prev.slice();
      next[i] = { id, node };
      return next;
    });
  }, []);

  const hide = useCallback((id: string) => {
    setLayers((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const api = useMemo(() => ({ show, hide }), [show, hide]);

  return (
    <ModalHostContext.Provider value={api}>
      {children}
      {layers.map((layer) => (
        <Animated.View
          key={layer.id}
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(150)}
          style={styles.layer}
          accessibilityViewIsModal>
          {layer.node}
        </Animated.View>
      ))}
    </ModalHostContext.Provider>
  );
}

export function AppModal(props: ModalProps) {
  if (Platform.OS !== 'ios') return <Modal {...props} />;
  return <HostedModal visible={props.visible ?? true}>{props.children}</HostedModal>;
}

function HostedModal({ visible, children }: { visible: boolean; children?: ReactNode }) {
  const host = useContext(ModalHostContext);
  const id = useId();

  // Re-publish on every render so the layer shows the latest children.
  useEffect(() => {
    if (!host) return;
    if (visible) host.show(id, children);
    else host.hide(id);
  });

  useEffect(() => () => host?.hide(id), [host, id]);

  if (!host && __DEV__) {
    console.warn('AppModal rendered outside <ModalHost>; nothing will show on iOS.');
  }
  return null;
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
  },
});
