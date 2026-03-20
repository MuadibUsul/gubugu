export type DemoAssetSize = 'landscape' | 'portrait' | 'square';

export type DemoAssetSpec = {
  eyebrow: string;
  title: string;
  subtitle: string;
  chips: string[];
  size: DemoAssetSize;
  palette: {
    backgroundStart: string;
    backgroundEnd: string;
    accent: string;
    panel: string;
    text: string;
    muted: string;
  };
};

const demoAssetCdnPrefix = 'https://cdn.gooodsdex.dev/demo/';
const defaultDemoAssetAppUrl = 'http://127.0.0.1:3000';

function getDemoAssetAppUrl() {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    defaultDemoAssetAppUrl;

  return configured.replace(/\/+$/, '');
}

function toSvgAssetPath(assetPath: string) {
  return assetPath.replace(/\.(?:png|jpe?g|gif|webp|avif)$/i, '.svg');
}

function normalizeAssetPath(assetPath: string) {
  return toSvgAssetPath(
    assetPath
      .trim()
      .replace(/^https?:\/\/[^/]+\/demo-assets\//i, '')
      .replace(/^\/+/, '')
      .replace(/^demo-assets\//, ''),
  );
}

function titleCase(value: string) {
  return value
    .split('-')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

const demoAssetSpecs: Record<string, DemoAssetSpec> = {
  'neon-requiem/brand/ip-cover.svg': {
    eyebrow: 'IP 封面',
    title: 'Neon Requiem',
    subtitle: '舞台驱动的科幻偶像企划',
    chips: ['品牌', '收藏优先'],
    size: 'landscape',
    palette: {
      backgroundStart: '#fff6ec',
      backgroundEnd: '#fde6d4',
      accent: '#a85f47',
      panel: '#fff9f3',
      text: '#2f2018',
      muted: '#72554a',
    },
  },
  'neon-requiem/characters/aoi-avatar.svg': {
    eyebrow: '角色',
    title: 'Aoi Tsukishiro',
    subtitle: '主唱位 / 亚克力系商品偏多',
    chips: ['葵', '冷调'],
    size: 'square',
    palette: {
      backgroundStart: '#eef6ff',
      backgroundEnd: '#f9ecff',
      accent: '#6380c7',
      panel: '#ffffff',
      text: '#24304e',
      muted: '#5d6780',
    },
  },
  'neon-requiem/characters/ren-avatar.svg': {
    eyebrow: '角色',
    title: 'Ren Kagetsu',
    subtitle: '吉他手 / 偏徽章盲抽线',
    chips: ['莲', '暖调'],
    size: 'square',
    palette: {
      backgroundStart: '#fff1e5',
      backgroundEnd: '#fff6ea',
      accent: '#c47d42',
      panel: '#fffdf8',
      text: '#3d2818',
      muted: '#7d5a45',
    },
  },
  'neon-requiem/series/spring-bloom-cover.svg': {
    eyebrow: '系列封面',
    title: '2026 Spring Bloom Fair',
    subtitle: '带闪片质感的樱花活动线',
    chips: ['活动', '会场优先'],
    size: 'landscape',
    palette: {
      backgroundStart: '#fff4ef',
      backgroundEnd: '#ffe9dc',
      accent: '#be6f5e',
      panel: '#fffaf6',
      text: '#33211b',
      muted: '#7a5a51',
    },
  },
  'neon-requiem/goods/aoi-stand/front.svg': {
    eyebrow: '商品样图',
    title: 'Aoi Acrylic Stand',
    subtitle: '春日 Bloom 正面样图',
    chips: ['SKU 001', '亚克力'],
    size: 'portrait',
    palette: {
      backgroundStart: '#f7f2ff',
      backgroundEnd: '#fdf4fb',
      accent: '#8167c8',
      panel: '#fffdfd',
      text: '#302447',
      muted: '#6e6482',
    },
  },
  'neon-requiem/goods/aoi-stand/desk.svg': {
    eyebrow: '收藏实拍',
    title: 'Aoi Acrylic Stand',
    subtitle: '桌面灯光展示角度',
    chips: ['收藏架', '暖光'],
    size: 'portrait',
    palette: {
      backgroundStart: '#fff3e8',
      backgroundEnd: '#fcedff',
      accent: '#b36e7f',
      panel: '#fffaf7',
      text: '#3a2630',
      muted: '#7d616a',
    },
  },
  'neon-requiem/goods/ren-badge/front.svg': {
    eyebrow: '商品样图',
    title: 'Ren Glitter Badge',
    subtitle: '正面样图 / 56 mm 徽章',
    chips: ['SKU 002', '徽章'],
    size: 'square',
    palette: {
      backgroundStart: '#fff3e6',
      backgroundEnd: '#fff8ef',
      accent: '#cf8e4e',
      panel: '#fffdf8',
      text: '#3f2a19',
      muted: '#856549',
    },
  },
  'neon-requiem/goods/ren-badge/detail.svg': {
    eyebrow: '工艺细节',
    title: 'Ren Glitter Badge',
    subtitle: '闪粉覆膜近景',
    chips: ['细节', '闪感'],
    size: 'square',
    palette: {
      backgroundStart: '#fff7e8',
      backgroundEnd: '#fff1dc',
      accent: '#d39f54',
      panel: '#fffdfa',
      text: '#402a16',
      muted: '#89684c',
    },
  },
  'neon-requiem/goods/duo-shikishi/front.svg': {
    eyebrow: '商品样图',
    title: 'Aoi and Ren Mini Shikishi',
    subtitle: '正面样图 / 双人补全件',
    chips: ['SKU 003', '双人图'],
    size: 'portrait',
    palette: {
      backgroundStart: '#fff0ea',
      backgroundEnd: '#fdf6ff',
      accent: '#b87077',
      panel: '#fffdfa',
      text: '#39252a',
      muted: '#7a5e66',
    },
  },
  'neon-requiem/goods/duo-shikishi/foil.svg': {
    eyebrow: '工艺细节',
    title: 'Mini Shikishi Foil',
    subtitle: '压印签名烫金细节',
    chips: ['烫金', '高级感'],
    size: 'portrait',
    palette: {
      backgroundStart: '#fff6e8',
      backgroundEnd: '#fff2da',
      accent: '#d29e4b',
      panel: '#fffdf7',
      text: '#3d2816',
      muted: '#86654a',
    },
  },
  'neon-requiem/goods/duo-shikishi/back.svg': {
    eyebrow: '包装',
    title: 'Mini Shikishi Back',
    subtitle: '背面样图与包装说明',
    chips: ['背面', '可收纳'],
    size: 'portrait',
    palette: {
      backgroundStart: '#f7f4ff',
      backgroundEnd: '#fef6ef',
      accent: '#8b78c6',
      panel: '#fffdfa',
      text: '#31264a',
      muted: '#6f6780',
    },
  },
  'neon-requiem/community/aoi-stand-desk-1.svg': {
    eyebrow: '收藏者实拍',
    title: 'Desk shelf shot',
    subtitle: '葵立牌的暖光展示图',
    chips: ['社区', '已通过'],
    size: 'square',
    palette: {
      backgroundStart: '#fff4ea',
      backgroundEnd: '#fff9f1',
      accent: '#b6745c',
      panel: '#fffdf8',
      text: '#3a261c',
      muted: '#7d5f52',
    },
  },
  'neon-requiem/community/aoi-stand-closeup-1.svg': {
    eyebrow: '收藏者实拍',
    title: 'Layer close-up',
    subtitle: '更近距离观察底座细节',
    chips: ['社区', '细节'],
    size: 'square',
    palette: {
      backgroundStart: '#f8f2ff',
      backgroundEnd: '#fff6fb',
      accent: '#8a6ac7',
      panel: '#fffdfd',
      text: '#332649',
      muted: '#706481',
    },
  },
  'neon-requiem/community/ren-badge-pack-1.svg': {
    eyebrow: '收藏者实拍',
    title: 'Sleeved duplicate',
    subtitle: '带保护套的莲徽章',
    chips: ['社区', '交换'],
    size: 'square',
    palette: {
      backgroundStart: '#fff5e8',
      backgroundEnd: '#fff1df',
      accent: '#c98549',
      panel: '#fffdf8',
      text: '#3d2917',
      muted: '#85654a',
    },
  },
  'neon-requiem/goods/aoi-clear-card/front.svg': {
    eyebrow: '识别候选',
    title: 'Aoi Foil Clear Card',
    subtitle: '用于候选识别的图鉴参考图',
    chips: ['SKU 004', '透卡'],
    size: 'portrait',
    palette: {
      backgroundStart: '#eef8ff',
      backgroundEnd: '#f8f1ff',
      accent: '#6f86cb',
      panel: '#ffffff',
      text: '#273452',
      muted: '#636e84',
    },
  },
  'neon-requiem/goods/ren-keychain/front.svg': {
    eyebrow: '识别候选',
    title: 'Ren Ribbon Keychain',
    subtitle: '用于候选识别的图鉴参考图',
    chips: ['SKU 005', '挂件'],
    size: 'portrait',
    palette: {
      backgroundStart: '#fff4ea',
      backgroundEnd: '#fff7f1',
      accent: '#c2824a',
      panel: '#fffdf9',
      text: '#3d2818',
      muted: '#80614a',
    },
  },
};

function createFallbackDemoAssetSpec(assetPath: string): DemoAssetSpec {
  const segments = normalizeAssetPath(assetPath).split('/');
  const fileName = segments.at(-1)?.replace(/\.svg$/i, '') ?? 'demo';
  const entryName = segments.at(-2) ?? fileName;
  const sectionName = segments.at(-3) ?? 'asset';

  return {
    eyebrow: titleCase(sectionName),
    title: titleCase(entryName),
    subtitle: `${titleCase(fileName)} 的图鉴展示图`,
    chips: ['图鉴', '生成'],
    size: 'portrait',
    palette: {
      backgroundStart: '#fff5ec',
      backgroundEnd: '#fef2f6',
      accent: '#a86d56',
      panel: '#fffaf5',
      text: '#32211a',
      muted: '#73594d',
    },
  };
}

export function buildDemoAssetUrl(
  assetPath: string,
  options?: {
    absolute?: boolean;
  },
) {
  const normalized = normalizeAssetPath(assetPath);
  const relativeUrl = `/demo-assets/${normalized
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')}`;

  if (!options?.absolute) {
    return relativeUrl;
  }

  return `${getDemoAssetAppUrl()}${relativeUrl}`;
}

export function normalizeDemoAssetUrl(
  url: string | null | undefined,
  options?: {
    absolute?: boolean;
  },
) {
  if (!url) {
    return url ?? null;
  }

  if (url.startsWith(demoAssetCdnPrefix)) {
    return buildDemoAssetUrl(url.slice(demoAssetCdnPrefix.length), options);
  }

  if (url.includes('/demo-assets/')) {
    const [, assetPath = ''] = url.split('/demo-assets/');

    return buildDemoAssetUrl(assetPath, options);
  }

  return url;
}

export function getDemoAssetSpec(assetPath: string) {
  const normalized = normalizeAssetPath(assetPath);

  return demoAssetSpecs[normalized] ?? createFallbackDemoAssetSpec(normalized);
}
