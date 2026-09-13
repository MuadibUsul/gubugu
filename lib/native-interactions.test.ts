import { afterEach, expect, it, vi } from 'vitest';

import { installNativeInteractions } from './native-interactions';

afterEach(() => vi.unstubAllGlobals());

it('suppresses page gestures, preserves editing, and cleans up on unmount', () => {
  class TestElement {
    isContentEditable = false;
    input = false;
    editable: TestElement | null = null;
    closest(selector: string) {
      return selector === '[contenteditable]'
        ? this.editable
        : this.input
          ? this
          : null;
    }
  }
  vi.stubGlobal('Element', TestElement);
  vi.stubGlobal('HTMLElement', TestElement);
  const events = new EventTarget();
  let platform: string | null = null;
  const doc = {
    documentElement: {
      getAttribute: () => platform,
      setAttribute: (_: string, value: string) => (platform = value),
      removeAttribute: () => (platform = null),
    },
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
  } as unknown as Document;
  const cleanup = installNativeInteractions(doc);
  expect(platform).toBe('android');
  const dispatch = (type: string, target: TestElement) => {
    const event = new Event(type, { cancelable: true });
    Object.defineProperty(event, 'target', { value: target });
    events.dispatchEvent(event);
    return event.defaultPrevented;
  };
  const page = new TestElement();
  const input = new TestElement();
  input.input = true;
  const child = new TestElement();
  child.editable = new TestElement();
  child.editable.isContentEditable = true;
  const nonEditable = new TestElement();
  nonEditable.editable = new TestElement();
  for (const type of ['contextmenu', 'selectstart', 'dragstart']) {
    expect(dispatch(type, page)).toBe(true);
    expect(dispatch(type, input)).toBe(false);
    expect(dispatch(type, child)).toBe(false);
    expect(dispatch(type, nonEditable)).toBe(true);
  }
  cleanup();
  expect(platform).toBeNull();
  for (const type of ['contextmenu', 'selectstart', 'dragstart']) {
    expect(dispatch(type, page)).toBe(false);
  }
});
