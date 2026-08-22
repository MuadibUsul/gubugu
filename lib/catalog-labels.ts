const goodsTypeLabels: Record<string, string> = {
  'acrylic-stand': '亚克力立牌',
  'acrylic-block': '亚克力砖',
  'acrylic-charm': '亚克力挂件',
  'art-board': '艺术板',
  'bromide-set': '写真套装',
  'can-badge': '徽章',
  'mini-shikishi': '迷你色纸',
  'clear-card': '透卡',
  keychain: '挂件',
  'rubber-strap': '橡胶挂件',
  poster: '海报',
  tapestry: '挂画',
  paper: '纸制品',
  plush: '玩偶',
  'photo-set': '照片套装',
  'photo-card-set': '照片卡套装',
  'pass-holder': '证件卡套',
  'trading-card': '收藏卡',
  standee: '立牌',
};

const materialLabels: Record<string, string> = {
  acrylic: '亚克力',
  metal: '金属',
  paper: '纸',
  pvc: 'PVC',
  fabric: '织物',
  rubber: '橡胶',
  tinplate: '马口铁',
  paperboard: '卡纸',
  'photo paper': '相纸',
  'suede fabric': '仿麂皮织物',
};

const tagLabels: Record<string, string> = {
  'spring-bloom': '春日绽放',
  'event-limited': '活动限定',
  'acrylic-stand': '亚克力立牌',
  'can-badge': '徽章',
  'mini-shikishi': '迷你色纸',
  'glitter-finish': '闪粉工艺',
  'blind-pack': '盲袋',
  'duo-art': '双人柄图',
  'clear-card': '透卡',
  keychain: '挂件',
  'midnight-encore': '午夜安可',
  'bromide-set': '写真套装',
  'voltage-shift': '电压变奏',
  'tour-limited': '巡演限定',
  'photo-card': '照片卡',
  'backstage-pass': '后台通行证',
  tapestry: '挂画',
  'winter-archive': '冬日档案',
  'holo-foil': '镭射烫印',
  'night-sky': '夜空主题',
  'starlight-observatory': '星光天文台',
  'acrylic-block': '亚克力砖',
  'acrylic-charm': '亚克力挂件',
};

export function formatGoodsTypeLabel(goodsType: string) {
  return goodsTypeLabels[goodsType] ?? goodsType.replace(/[-_]/g, ' / ');
}

export function formatMaterialLabel(material: string | null) {
  if (!material) return '暂未收录';
  return materialLabels[material.trim().toLowerCase()] ?? material;
}

export function formatTagLabel(slug: string, fallback: string) {
  return tagLabels[slug] ?? fallback;
}
