/** Native shell only: keep editing menus, suppress page/image long-press menus. */
export function installNativeInteractions(doc: Document) {
  const root = doc.documentElement;
  const previous = root.getAttribute('data-native-platform');
  root.setAttribute('data-native-platform', 'android');

  const suppressPageGesture = (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const editable = target.closest('[contenteditable]');
    if (
      target.closest('input, textarea') ||
      (editable instanceof HTMLElement && editable.isContentEditable)
    ) {
      return;
    }
    event.preventDefault();
  };

  doc.addEventListener('contextmenu', suppressPageGesture);
  doc.addEventListener('dragstart', suppressPageGesture);
  doc.addEventListener('selectstart', suppressPageGesture);
  return () => {
    doc.removeEventListener('contextmenu', suppressPageGesture);
    doc.removeEventListener('dragstart', suppressPageGesture);
    doc.removeEventListener('selectstart', suppressPageGesture);
    if (previous === null) root.removeAttribute('data-native-platform');
    else root.setAttribute('data-native-platform', previous);
  };
}
