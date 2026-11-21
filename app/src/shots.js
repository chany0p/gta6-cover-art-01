// Fixed scenes for screenshots: ?shot=editor shows the editor with a sample photo;
// ?shot=cover shows the cover alone. Params: photo, caption, subtitle, layout, grade,
// titlePos, badge. window.__shotReady is set once painted (after webfonts load).
import { GRADES, LAYOUTS } from './cover.js';

export async function runShot(shot, query, apply) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const layout = LAYOUTS[query.get('layout')] ? query.get('layout') : 'grid4';
  const grade = GRADES.includes(query.get('grade')) ? query.get('grade') : 'sunset';
  const photo = query.get('photo') ?? 'pier';
  await apply({
    photo,
    title: query.get('caption') ?? 'Sunset Heist',
    subtitle: query.get('subtitle') ?? 'Vice City • 2026',
    layout,
    grade,
    titlePos: query.get('titlePos') ?? 'bottom',
    badgeText: query.get('badge') ?? 'Vice City • 2026',
  });
  try { await document.fonts.ready; } catch { /* fonts are optional */ }
  // One more paint after fonts swap in, so lettering is final.
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  window.__shotReady = true;
}
