import type { Page } from "@playwright/test";

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export async function clickAt(page: Page, x: number, y: number): Promise<void> {
  await page.mouse.click(x, y);
}

export async function doubleClickAt(page: Page, x: number, y: number): Promise<void> {
  await page.mouse.dblclick(x, y);
}

export async function moveAndClickAt(page: Page, x: number, y: number): Promise<void> {
  await page.mouse.move(x, y);
  await page.mouse.click(x, y);
}

export async function clickCenter(page: Page, rect: Rect): Promise<void> {
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;
  await clickAt(page, centerX, centerY);
}
