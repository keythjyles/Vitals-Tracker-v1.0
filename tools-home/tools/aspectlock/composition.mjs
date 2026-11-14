import {BackgroundSurface} from '../caplock/background.mjs?v=32';

export const WIDTH = 540;
export const HEIGHT = 960;
export const FPS = 25;

export function lastFrame(duration) {
 return Math.max(0, Math.ceil(duration * FPS - 1e-6) - 1);
}

export function frameAt(time, duration) {
 return Math.min(lastFrame(duration), Math.max(0, Math.floor(time * FPS + .001)));
}

export function placementAt(time, timing) {
 const {inFrame, outFrame, trimIn, trimOut, rate} = timing;
 const elapsed = time - inFrame / FPS;
 if (elapsed < -1e-6 || time >= outFrame / FPS - 1e-6 || trimOut <= trimIn) return null;
 const sourceTime = trimIn + Math.max(0, elapsed) * rate;
 return {
  time: sourceTime < trimOut ? sourceTime : Math.max(trimIn, trimOut - .00001),
  audible: sourceTime < trimOut,
 };
}

export function fitRect(ratio) {
 const width = Math.min(WIDTH, HEIGHT * ratio);
 return {x: (WIDTH - width) / 2, y: (HEIGHT - width / ratio) / 2, width, height: width / ratio};
}

export class Composition {
 #surface = new BackgroundSurface();
 #cached;

 overlayFrame(video, key, maxWidth) {
  if (video.readyState !== undefined && (video.readyState < 2 || video.seeking)) return null;
  if (key.mode === 'off' || key.mode === 'alpha' || key.backgroundOpacity === 1) return video;
  const cacheKey = [video.currentSrc, video.currentTime, maxWidth, key.mode, key.color, key.similarity, key.blend, key.backgroundOpacity, key.tolerance].join('|');
  if (video.currentSrc && this.#cached === cacheKey) return this.#surface.canvas;
  this.#cached = '';
  if (key.mode === 'custom') {
   this.#surface.draw(video, key, {maxWidth});
  } else {
   // Keep the original green and blue presets for saved AspectLock alignments.
   const nativeWidth = video.videoWidth || video.width, nativeHeight = video.videoHeight || video.height;
   const scale = Math.min(1, maxWidth / nativeWidth);
   const width = Math.max(1, Math.round(nativeWidth * scale));
   const height = Math.max(1, Math.round(nativeHeight * scale));
   const {canvas, ctx} = this.#surface;
   if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
   }
   ctx.clearRect(0, 0, width, height);
   ctx.drawImage(video, 0, 0, width, height);
   const image = ctx.getImageData(0, 0, width, height);
   const tolerance = key.tolerance / 100, amount = 1 - key.backgroundOpacity;
   const data = image.data;
   for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (key.mode === 'blue') {
     if (b > r * 1.17 && b > g * 1.08 && b > 70) data[i + 3] *= 1 - amount * Math.min(1, (b - Math.max(r, g) + tolerance * 100) * 2.6 / 255);
    } else if (g > r * 1.16 && g > b * 1.10 && g / (r + g + b + 1) > .40) {
     const strength = amount * Math.max(0, Math.min(1, (g - Math.max(r, b) - (18 + tolerance * 35)) / (35 + tolerance * 45)));
     data[i + 3] *= 1 - strength;
     if (data[i + 3]) {
      data[i] = r + (g - r) * strength * .1;
      data[i + 1] = g * (1 - strength * .25);
     }
    }
   }
   ctx.putImageData(image, 0, 0);
  }
  this.#cached = cacheKey;
  return this.#surface.canvas;
 }

 draw(ctx, {bed, bedRect, overlay, overlayRect, opacity, order}) {
  const draw = (source, rect) => {
   if (source) ctx.drawImage(source, rect.x, rect.y, rect.width, rect.height);
  };
  const drawOverlay = () => {
   ctx.globalAlpha = opacity;
   draw(overlay, overlayRect);
   ctx.globalAlpha = 1;
  };
  if (order === 'base') drawOverlay();
  draw(bed.readyState === undefined || bed.readyState >= 2 ? bed : null, bedRect);
  if (order !== 'base') drawOverlay();
 }
}
