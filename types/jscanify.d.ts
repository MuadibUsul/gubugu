declare module 'jscanify/client' {
  /** 一个角点，坐标在传入图像的像素空间。 */
  export type JscanifyPoint = { x: number; y: number };
  export type JscanifyCorners = {
    topLeftCorner?: JscanifyPoint;
    topRightCorner?: JscanifyPoint;
    bottomLeftCorner?: JscanifyPoint;
    bottomRightCorner?: JscanifyPoint;
  };

  export default class Jscanify {
    /** 在 OpenCV Mat 上找最大的“纸张/卡片”轮廓；找不到返回 null。用完记得 .delete()。 */
    findPaperContour(img: unknown): unknown | null;
    /** 从轮廓取四角点（图像像素坐标）。 */
    getCornerPoints(contour: unknown): JscanifyCorners;
    highlightPaper(
      image: HTMLCanvasElement | HTMLImageElement,
      options?: { color?: string; thickness?: number },
    ): HTMLCanvasElement;
    extractPaper(
      image: HTMLCanvasElement | HTMLImageElement,
      resultWidth: number,
      resultHeight: number,
      cornerPoints?: unknown,
    ): HTMLCanvasElement;
  }
}

declare module 'jscanify' {
  export { default } from 'jscanify/client';
}
