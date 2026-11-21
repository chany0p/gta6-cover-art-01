// Vice Cover — multi-panel GTA-style poster maker.
// drawCover(canvas, state) renders the whole cover at the canvas's own size,
// so the same code draws the live preview and every export size.
const GAP = 0.012; // panel gap as a fraction of the short side

export const LAYOUTS = {
  grid4: { panels: 4, label: '4-Panel Grid' },
  hero3: { panels: 4, label: 'Hero + 3' },
  full: { panels: 1, label: 'Full-Bleed' },
  grid9: { panels: 9, label: '9-Panel Grid' },
  tilt: { panels: 4, label: 'Tilted Snapshots' },
};

export const GRADES = ['sunset', 'neon', 'noir', 'vice', 'heat'];

/** Panel rectangles for a layout, in fractions of the canvas (x, y, w, h). */
export function layoutRects(layout, w, h) {
  const g = GAP * Math.min(w, h);
  const gx = g / w, gy = g / h;
  switch (layout) {
    case 'grid4':
      return [
        [0, 0, 0.5 - gx / 2, 0.5 - gy / 2], [0.5 + gx / 2, 0, 0.5 - gx / 2, 0.5 - gy / 2],
        [0, 0.5 + gy / 2, 0.5 - gx / 2, 0.5 - gy / 2], [0.5 + gx / 2, 0.5 + gy / 2, 0.5 - gx / 2, 0.5 - gy / 2],
      ];
    case 'hero3': {
      const heroH = 0.58;
      return [
        [0, 0, 1, heroH - gy / 2],
        [0, heroH + gy / 2, 1 / 3 - gx * 2 / 3, 1 - heroH - gy / 2],
        [1 / 3 + gx / 3, heroH + gy / 2, 1 / 3 - gx * 2 / 3, 1 - heroH - gy / 2],
        [2 / 3 + gx * 2 / 3, heroH + gy / 2, 1 / 3 - gx * 2 / 3, 1 - heroH - gy / 2],
      ];
    }
    case 'grid9': {
      const r = [];
      for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
        r.push([col / 3 + (col ? gx / 3 : 0), row / 3 + (row ? gy / 3 : 0),
          1 / 3 - gx * 2 / 3, 1 / 3 - gy * 2 / 3]);
      }
      return r;
    }
    case 'tilt':
      // Overlapping polaroid-style snapshots; rects are the photo areas.
      return [
        [0.04, 0.03, 0.46, 0.46], [0.52, 0.06, 0.44, 0.42],
        [0.06, 0.50, 0.44, 0.44], [0.52, 0.52, 0.44, 0.44],
      ];
    case 'full':
    default:
      return [[0, 0, 1, 1]];
  }
}

const TILTS = [-0.045, 0.04, 0.035, -0.05];

function drawPanel(ctx, img, rect, panel, w, h) {
  const [fx, fy, fw, fh] = rect;
  const x = fx * w, y = fy * h, pw = fw * w, ph = fh * h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, pw, ph);
  ctx.clip();
  if (img) {
    const zoom = panel.zoom || 1;
    const base = Math.max(pw / img.naturalWidth, ph / img.naturalHeight) * zoom;
    const iw = img.naturalWidth * base, ih = img.naturalHeight * base;
    const ox = (panel.ox || 0) * pw, oy = (panel.oy || 0) * ph;
    ctx.drawImage(img, x + (pw - iw) / 2 + ox, y + (ph - ih) / 2 + oy, iw, ih);
  } else {
    ctx.fillStyle = '#241a2e';
    ctx.fillRect(x, y, pw, ph);
  }
  ctx.restore();
}

function applyGrade(ctx, w, h, grade) {
  if (grade === 'noir') {
    ctx.save();
    ctx.globalCompositeOperation = 'saturation';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    const c = ctx.createLinearGradient(0, 0, 0, h);
    c.addColorStop(0, 'rgba(255,255,255,0.12)');
    c.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    return;
  }
  const stops = {
    sunset: [['rgba(255,140,60,0)', 0], ['rgba(255,90,40,0.28)', 0.55], ['rgba(190,30,110,0.55)', 1]],
    neon: [['rgba(0,255,220,0.10)', 0], ['rgba(255,0,180,0.22)', 0.6], ['rgba(80,0,255,0.35)', 1]],
    vice: [['rgba(255,0,150,0.20)', 0], ['rgba(0,220,255,0.10)', 0.5], ['rgba(255,110,200,0.30)', 1]],
    heat: [['rgba(255,200,60,0.08)', 0], ['rgba(255,110,20,0.30)', 0.6], ['rgba(200,20,0,0.42)', 1]],
  }[grade] || [];
  if (!stops.length) return;
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  const g = ctx.createLinearGradient(0, 0, w * 0.25, h);
  for (const [color, at] of stops) g.addColorStop(at, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  // Warm foot tint so captions always sit on something readable.
  const foot = ctx.createLinearGradient(0, h * 0.55, 0, h);
  foot.addColorStop(0, 'rgba(10,6,18,0)');
  foot.addColorStop(1, 'rgba(10,6,18,0.45)');
  ctx.fillStyle = foot;
  ctx.fillRect(0, 0, w, h);
}

let noiseCanvas = null;
function grain(ctx, w, h, strength) {
  if (!noiseCanvas) {
    noiseCanvas = document.createElement('canvas');
    noiseCanvas.width = noiseCanvas.height = 160;
    const nctx = noiseCanvas.getContext('2d');
    const img = nctx.createImageData(160, 160);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 110 + Math.random() * 90;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    nctx.putImageData(img, 0, 0);
  }
  ctx.save();
  ctx.globalAlpha = strength;
  ctx.globalCompositeOperation = 'overlay';
  const pat = ctx.createPattern(noiseCanvas, 'repeat');
  ctx.fillStyle = pat;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function vignette(ctx, w, h) {
  const r = Math.hypot(w, h) / 2;
  const g = ctx.createRadialGradient(w / 2, h / 2, r * 0.45, w / 2, h / 2, r);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function fitFont(ctx, text, maxWidth, startSize, family, weight) {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > 10 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

/** Renders the full cover. `state` carries panels, layout, grade, caption + polish options. */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  ctx.fillStyle = '#160a20';
  ctx.fillRect(0, 0, w, h);

  const rects = layoutRects(state.layout, w, h);
  const count = LAYOUTS[state.layout]?.panels ?? 1;
  const frame = Math.max(2, Math.round(Math.min(w, h) * 0.008));

  for (let i = 0; i < count; i++) {
    const panel = state.panels[i] || {};
    if (state.layout === 'tilt') {
      const [fx, fy, fw, fh] = rects[i];
      const cx = (fx + fw / 2) * w, cy = (fy + fh / 2) * h;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(TILTS[i]);
      ctx.fillStyle = '#f5efe4';
      const bw = fw * w + frame * 2, bh = fh * h + frame * 2.4;
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = Math.min(w, h) * 0.03;
      ctx.shadowOffsetY = Math.min(w, h) * 0.012;
      ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
      ctx.restore();
      // Draw the photo inside the rotated frame.
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(TILTS[i]);
      ctx.beginPath();
      ctx.rect(-fw * w / 2, -fh * h / 2, fw * w, fh * h);
      ctx.clip();
      const img = panel.img;
      if (img) {
        const zoom = panel.zoom || 1;
        const base = Math.max(fw * w / img.naturalWidth, fh * h / img.naturalHeight) * zoom;
        const iw = img.naturalWidth * base, ih = img.naturalHeight * base;
        ctx.drawImage(img, (-iw + (panel.ox || 0) * fw * w) / 2, (-ih + (panel.oy || 0) * fh * h) / 2, iw, ih);
      }
      ctx.restore();
    } else {
      drawPanel(ctx, panel.img, rects[i], panel, w, h);
    }
  }

  applyGrade(ctx, w, h, state.grade);

  // Thin inner frame.
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = Math.max(2, Math.min(w, h) * 0.004);
  ctx.strokeRect(ctx.lineWidth, ctx.lineWidth, w - ctx.lineWidth * 2, h - ctx.lineWidth * 2);

  if (state.vignette !== false) vignette(ctx, w, h);
  if (state.grain !== false) grain(ctx, w, h, 0.16);

  // Badge ribbon, top-right.
  if (state.badge) {
    const label = (state.badgeText || 'VICE CITY • 2026').toUpperCase();
    const pad = Math.min(w, h) * 0.018;
    ctx.font = `700 ${Math.round(Math.min(w, h) * 0.024)}px "Bebas Neue", "Arial Narrow", sans-serif`;
    try { ctx.letterSpacing = '2px'; } catch { /* older canvas */ }
    const tw = ctx.measureText(label).width;
    const bw = tw + pad * 2, bh = Math.min(w, h) * 0.052;
    const bx = w - bw - Math.min(w, h) * 0.035, by = Math.min(w, h) * 0.035;
    ctx.save();
    ctx.fillStyle = '#ff2e88';
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, bh / 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, bx + bw / 2, by + bh / 2 + 1);
    try { ctx.letterSpacing = '0px'; } catch { /* ignore */ }
  }

  // Caption.
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim().toUpperCase();
  const family = state.font === 'bebas' ? '"Bebas Neue", "Arial Narrow", sans-serif'
    : state.font === 'system' ? '"Arial Narrow", Impact, sans-serif'
    : '"Anton", Impact, sans-serif';
  const base = Math.min(w, h);
  const yPos = state.titlePos === 'top' ? h * 0.16 : state.titlePos === 'center' ? h * 0.52 : h * 0.86;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (title) {
    const startSize = base * 0.13 * (state.titleSize || 1);
    const size = fitFont(ctx, title, w * 0.92, startSize, family, 400);
    ctx.save();
    if (state.shadow !== false) {
      ctx.shadowColor = 'rgba(0,0,0,0.65)';
      ctx.shadowBlur = size * 0.18;
      ctx.shadowOffsetY = size * 0.06;
    }
    if (state.gradient) {
      const g = ctx.createLinearGradient(0, yPos - size / 2, 0, yPos + size / 2);
      g.addColorStop(0, '#ffe95e');
      g.addColorStop(0.5, state.color || '#ffffff');
      g.addColorStop(1, '#ff2e88');
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = state.color || '#ffffff';
    }
    if (state.outline !== false) {
      ctx.lineWidth = Math.max(2, size * 0.07);
      ctx.strokeStyle = 'rgba(10,4,20,0.9)';
      ctx.lineJoin = 'round';
      ctx.strokeText(title, w / 2, yPos);
    }
    ctx.fillText(title, w / 2, yPos);
    ctx.restore();
    if (subtitle) {
      const subSize = Math.max(12, size * 0.24);
      ctx.font = `400 ${subSize}px "Bebas Neue", "Arial Narrow", sans-serif`;
      try { ctx.letterSpacing = `${Math.max(2, subSize * 0.18)}px`; } catch { /* ignore */ }
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 6;
      ctx.fillText(subtitle, w / 2, yPos + size * 0.62);
      ctx.shadowBlur = 0;
      try { ctx.letterSpacing = '0px'; } catch { /* ignore */ }
    }
  }
}
