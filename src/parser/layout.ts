// Map a desired canvas layout to screen cursor positions.
//
// Axure's window layout when maximized:
//   - Left sidebar (page tree + master list): ~200px wide
//   - Top toolbar: ~140px tall
//   - Right inspect panel: ~250px wide
//   - Bottom of viewport reaches near window bottom
// The canvas area is the rectangle in between.
//
// Empirically (Axure RP 11 at 2046×1110 on Windows 10):
//   sidebarLeft  = 320  (left page tree)
//   sidebarRight = 250  (right inspect)
//   toolbarTop   = 200  (file menu + insert + properties toolbars)
//   statusBottom = 30   (small status strip)
// Canvas takes the rest. The default zoom centers (0, 0) page origin somewhere inside the
// canvas area, depending on zoom level — we don't try to translate canvas coords to pixel coords.
//
// Instead, we treat the canvas area as a 2D box and pick layout points relative to its CENTER.
// "Place widget at canvas-relative (cx, cy)" means cursor goes to (canvas_center_x + cx,
// canvas_center_y + cy). This is robust to window size and ignores Axure's internal zoom.

import type { AxureRect } from "./clipboard.js";

export interface CanvasArea {
  /** Screen rect of the canvas drawing area inside Axure's window. */
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  /** Screen position of the canvas area's center. */
  centerX: number;
  centerY: number;
}

const SIDEBAR_LEFT = 320;
const SIDEBAR_RIGHT = 250;
const TOOLBAR_TOP = 200;
const STATUS_BOTTOM = 30;

/**
 * Compute the canvas area's screen rect from Axure's window rect.
 * Assumes Axure RP 11 default layout (page tree on left, inspect panel on right, toolbars on top).
 */
export function canvasArea(axureRect: AxureRect): CanvasArea {
  const left = axureRect.left + SIDEBAR_LEFT;
  const top = axureRect.top + TOOLBAR_TOP;
  const right = axureRect.right - SIDEBAR_RIGHT;
  const bottom = axureRect.bottom - STATUS_BOTTOM;
  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
    centerX: Math.floor((left + right) / 2),
    centerY: Math.floor((top + bottom) / 2),
  };
}

export interface CanvasOffset {
  /** Pixels right of canvas center on screen. */
  dx: number;
  /** Pixels down of canvas center on screen. */
  dy: number;
}

/** Convert a canvas-relative offset to absolute screen cursor coords. */
export function canvasToScreen(area: CanvasArea, offset: CanvasOffset): { x: number; y: number } {
  return { x: area.centerX + offset.dx, y: area.centerY + offset.dy };
}
