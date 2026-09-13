export type PreviewStatus =
  | 'none'
  | 'owned'
  | 'lit'
  | 'wanted'
  | 'exchange'
  | 'scan';

export type PreviewGoods = {
  id: string;
  name: string;
  meta: string;
  type: '卡片' | '色纸' | '徽章';
  imageUrl: string;
  status: PreviewStatus;
  shape?: 'portrait' | 'landscape';
};

export const previewGoods: PreviewGoods[] = [
  {
    id: 'p1',
    name: '帕姆留影簿系列仿拍立得 第四弹 纪念收藏卡',
    meta: '崩坏：星穹铁道 · 帕姆留影簿',
    type: '卡片',
    imageUrl: '/local-sample-images/guzi-sample-01.png',
    status: 'lit',
  },
  {
    id: 'p2',
    name: '与你同行的回忆系列 PET 色纸特别版',
    meta: '崩坏：星穹铁道 · 与你同行',
    type: '色纸',
    imageUrl: '/local-sample-images/guzi-sample-07.jfif',
    status: 'owned',
    shape: 'landscape',
  },
  {
    id: 'p3',
    name: '命定之日系列色纸 第二弹——再创世之卷联动限定款',
    meta: '原神 · 命定之日',
    type: '色纸',
    imageUrl: '/local-sample-images/guzi-sample-03.png',
    status: 'wanted',
  },
  {
    id: 'p4',
    name: '风花的呼吸主题纪念徽章',
    meta: '原神 · 风花节',
    type: '徽章',
    imageUrl: '/local-sample-images/guzi-sample-12.jfif',
    status: 'exchange',
    shape: 'landscape',
  },
  {
    id: 'p5',
    name: '未鉴定实拍收藏',
    meta: '仅自己可见 · 正反面已保存',
    type: '卡片',
    imageUrl: '/local-sample-images/guzi-sample-05.png',
    status: 'scan',
  },
  {
    id: 'p6',
    name: '加载失败状态示例',
    meta: '图片不可用时仍保留标题与操作',
    type: '卡片',
    imageUrl: '/local-sample-images/not-found.webp',
    status: 'none',
  },
];

export const statusLabel: Record<PreviewStatus, string> = {
  none: '未入柜',
  owned: '已入柜 · 待点亮',
  lit: '已点亮',
  wanted: '想要',
  exchange: '可换',
  scan: '私人实拍',
};

export function filterPreviewGoods(
  items: PreviewGoods[],
  query: string,
  type: string,
) {
  const normalized = query.trim().toLocaleLowerCase('zh-CN');
  return items.filter(
    (item) =>
      (type === '全部' || item.type === type) &&
      (!normalized ||
        `${item.name} ${item.meta}`
          .toLocaleLowerCase('zh-CN')
          .includes(normalized)),
  );
}

export function collectionPreviewGoods(items: PreviewGoods[], tab: string) {
  if (tab === '已入柜')
    return items.filter((item) => ['owned', 'lit'].includes(item.status));
  if (tab === '已点亮') return items.filter((item) => item.status === 'lit');
  if (tab === '实拍') return items.filter((item) => item.status === 'scan');
  const status = tab === '想要' ? 'wanted' : 'exchange';
  return items.filter((item) => item.status === status);
}
