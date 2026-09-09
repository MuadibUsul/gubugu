declare module 'jscanify/client' {
  export default class Jscanify {
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
