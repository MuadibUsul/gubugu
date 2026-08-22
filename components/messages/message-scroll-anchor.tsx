'use client';

import { useEffect, useRef } from 'react';

export function MessageScrollAnchor() {
  const anchorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    anchorRef.current?.scrollIntoView({ block: 'end' });
  }, []);

  return <span aria-hidden="true" ref={anchorRef} />;
}
