// Run in an authenticated browser's console on a goods/collection detail with
// a loaded HoloCard. No framework or backend data mutation is required.
(async () => {
  const card = document.querySelector('[data-flipped][data-loaded="true"]');
  if (!card) throw new Error('Open a loaded collectible detail first.');
  const rotor = card.querySelector('[role="button"]');
  const button = card.querySelector('button');
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const frame = () => new Promise(requestAnimationFrame);
  const press = () =>
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  const matrix = () => new DOMMatrixReadOnly(getComputedStyle(rotor).transform);
  if (card.dataset.flipped === 'true') {
    press();
    await wait(500);
  }
  const faces = Array.from(rotor.children);
  assert(faces.length === 2, 'Expected two faces on one rotor');
  assert(
    faces.every(
      (face) => getComputedStyle(face).backfaceVisibility === 'hidden',
    ),
    'Back-face culling must follow actual rotation',
  );
  assert(
    faces.every((face) => getComputedStyle(face).opacity === '1'),
    'Faces must not be swapped with opacity',
  );
  press();
  await frame();
  await frame();
  assert(
    card.dataset.flipped === 'true',
    'Back must be decoded before this test',
  );
  const animation = rotor.getAnimations()[0];
  assert(Boolean(animation), 'Pointer flip should animate');
  animation.pause();
  const duration = Number(animation.effect.getTiming().duration);
  const samples = [];
  for (const fraction of [0, 0.25, 0.5, 0.75, 0.99]) {
    animation.currentTime = duration * fraction;
    samples.push(Number(matrix().m11.toFixed(3)));
  }
  assert(
    Math.abs(samples[0] - 1) < 0.01 && Math.abs(samples[4] + 1) < 0.01,
    'Flip must span exactly 180 degrees',
  );
  assert(
    samples.every((value, index) => index === 0 || value < samples[index - 1]),
    'The angle must advance continuously without a face swap',
  );
  animation.currentTime = duration * 0.3;
  const beforeReverse = matrix().m11;
  press();
  await frame();
  assert(
    Math.abs(matrix().m11 - beforeReverse) < 0.25,
    'Reversal jumped instead of continuing from the current angle',
  );
  await wait(550);
  assert(
    card.dataset.flipped === 'false' && Math.abs(matrix().m11 - 1) < 0.01,
    'Reversal did not return to front',
  );
  for (let i = 0; i < 6; i++) {
    press();
    await wait(35);
  }
  await wait(550);
  assert(
    card.dataset.flipped === 'false' && Math.abs(matrix().m11 - 1) < 0.01,
    'Rapid toggles left the wrong face',
  );
  const tilt = rotor.parentElement;
  assert(
    getComputedStyle(tilt).transformStyle === 'preserve-3d',
    'Tilt must preserve the shared 3D geometry',
  );
  button.click();
  await frame();
  assert(
    getComputedStyle(rotor).transitionDuration === '0s',
    'Keyboard activation must respect instant feedback',
  );
  button.click();
  await frame();
  return {
    passed: true,
    sampledCosines: samples,
    checks: [
      'decoded faces',
      'continuous 180 degree flip',
      'mid-animation reversal',
      'rapid clicks',
      'keyboard',
    ],
  };
})();
