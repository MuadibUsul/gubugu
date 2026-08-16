import { describe, expect, it } from 'vitest';

import {
  evaluateAchievements,
  unlockKey,
  type AchievementDefinition,
  type ScopeProgress,
} from './achievements';

const countFive: AchievementDefinition = {
  id: 'a-five',
  code: 'owned-5',
  name: '初具规模',
  description: '累计收录 5 件',
  kind: 'owned_count',
  threshold: 5,
};

const countTen: AchievementDefinition = {
  ...countFive,
  id: 'a-ten',
  code: 'owned-10',
  threshold: 10,
};

const characterComplete: AchievementDefinition = {
  id: 'a-char',
  code: 'character-complete',
  name: '角色补全',
  description: '集齐一位角色的全部条目',
  kind: 'character_complete',
  threshold: null,
};

const seriesComplete: AchievementDefinition = {
  ...characterComplete,
  id: 'a-series',
  code: 'series-complete',
  kind: 'series_complete',
};

const empty = new Set<string>();

describe('unlockKey', () => {
  // A global unlock and a scoped one must not collide, or the first scoped
  // completion would suppress the global record for the same achievement.
  it('separates a global unlock from a scoped one', () => {
    expect(unlockKey('a', null)).not.toBe(unlockKey('a', 'scope'));
  });

  it('is stable for the same pair', () => {
    expect(unlockKey('a', 'scope')).toBe(unlockKey('a', 'scope'));
  });
});

describe('evaluateAchievements — 累计件数', () => {
  it('unlocks once the threshold is reached', () => {
    expect(
      evaluateAchievements({
        definitions: [countFive],
        ownedTotal: 5,
        scopes: [],
        alreadyUnlocked: empty,
      }),
    ).toEqual([{ achievementId: 'a-five', scopeId: null }]);
  });

  it('does not unlock below the threshold', () => {
    expect(
      evaluateAchievements({
        definitions: [countFive],
        ownedTotal: 4,
        scopes: [],
        alreadyUnlocked: empty,
      }),
    ).toEqual([]);
  });

  it('unlocks every threshold cleared at once', () => {
    const unlocks = evaluateAchievements({
      definitions: [countFive, countTen],
      ownedTotal: 12,
      scopes: [],
      alreadyUnlocked: empty,
    });

    expect(unlocks.map((u) => u.achievementId)).toEqual(['a-five', 'a-ten']);
  });

  it('skips what is already unlocked', () => {
    expect(
      evaluateAchievements({
        definitions: [countFive],
        ownedTotal: 9,
        scopes: [],
        alreadyUnlocked: new Set([unlockKey('a-five', null)]),
      }),
    ).toEqual([]);
  });

  // A definition with no threshold is bad data; treating it as "0 reached"
  // would hand the record out on an empty collection.
  it('ignores a count achievement with no threshold', () => {
    expect(
      evaluateAchievements({
        definitions: [{ ...countFive, threshold: null }],
        ownedTotal: 100,
        scopes: [],
        alreadyUnlocked: empty,
      }),
    ).toEqual([]);
  });

  it('ignores a non-positive threshold', () => {
    expect(
      evaluateAchievements({
        definitions: [{ ...countFive, threshold: 0 }],
        ownedTotal: 0,
        scopes: [],
        alreadyUnlocked: empty,
      }),
    ).toEqual([]);
  });
});

describe('evaluateAchievements — 作用域补全', () => {
  const fullCharacter: ScopeProgress = {
    kind: 'character_complete',
    scopeId: 'char-1',
    ownedCount: 8,
    totalCount: 8,
  };

  it('unlocks when a scope is complete', () => {
    expect(
      evaluateAchievements({
        definitions: [characterComplete],
        ownedTotal: 8,
        scopes: [fullCharacter],
        alreadyUnlocked: empty,
      }),
    ).toEqual([{ achievementId: 'a-char', scopeId: 'char-1' }]);
  });

  it('does not unlock a partially collected scope', () => {
    expect(
      evaluateAchievements({
        definitions: [characterComplete],
        ownedTotal: 7,
        scopes: [{ ...fullCharacter, ownedCount: 7 }],
        alreadyUnlocked: empty,
      }),
    ).toEqual([]);
  });

  // An empty scope is vacuously "complete" by arithmetic, which would hand out
  // the record the moment an empty series appears.
  it('does not treat an empty scope as complete', () => {
    expect(
      evaluateAchievements({
        definitions: [characterComplete],
        ownedTotal: 0,
        scopes: [{ ...fullCharacter, ownedCount: 0, totalCount: 0 }],
        alreadyUnlocked: empty,
      }),
    ).toEqual([]);
  });

  it('only matches a scope against its own kind', () => {
    expect(
      evaluateAchievements({
        definitions: [seriesComplete],
        ownedTotal: 8,
        scopes: [fullCharacter],
        alreadyUnlocked: empty,
      }),
    ).toEqual([]);
  });

  it('unlocks each completed scope separately', () => {
    const unlocks = evaluateAchievements({
      definitions: [characterComplete],
      ownedTotal: 12,
      scopes: [
        fullCharacter,
        { ...fullCharacter, scopeId: 'char-2', ownedCount: 4, totalCount: 4 },
      ],
      alreadyUnlocked: empty,
    });

    expect(unlocks.map((u) => u.scopeId)).toEqual(['char-1', 'char-2']);
  });

  it('skips a scope already recorded', () => {
    expect(
      evaluateAchievements({
        definitions: [characterComplete],
        ownedTotal: 8,
        scopes: [fullCharacter],
        alreadyUnlocked: new Set([unlockKey('a-char', 'char-1')]),
      }),
    ).toEqual([]);
  });

  it('still unlocks a different scope of the same achievement', () => {
    const unlocks = evaluateAchievements({
      definitions: [characterComplete],
      ownedTotal: 12,
      scopes: [
        fullCharacter,
        { ...fullCharacter, scopeId: 'char-2', ownedCount: 4, totalCount: 4 },
      ],
      alreadyUnlocked: new Set([unlockKey('a-char', 'char-1')]),
    });

    expect(unlocks).toEqual([{ achievementId: 'a-char', scopeId: 'char-2' }]);
  });
});
