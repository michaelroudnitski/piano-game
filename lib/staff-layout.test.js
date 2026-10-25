import { describe, expect, test } from "bun:test";
import {
  LEDGER_ROOM,
  NOTEHEAD,
  STEM_LENGTH,
  VIEW_BOX,
  clefOrigin,
  ledgerLineLevels,
  levelToY,
  noteLayout,
  noteToLevel,
  stemDirection,
  stemTipLevel,
  tiltedEllipse,
} from "./staff-layout";

describe("noteToLevel", () => {
  test.each([
    ["C", 1, 0], // C4, first ledger line below
    ["E", 1, 2], // E4, bottom line
    ["B", 1, 6], // B4, middle line
    ["F", 2, 10], // F5, top line
    ["A", 2, 12], // A5, first ledger line above
  ])("treble %s octave %i -> level %i", (key, octave, level) => {
    expect(noteToLevel(key, octave, "treble")).toBe(level);
  });

  test.each([
    ["E", 1, 0], // E2
    ["G", 1, 2], // G2, bottom line
    ["D", 1, 6], // D3, middle line
    ["A", 2, 10], // A3, top line
    ["C", 2, 12], // C4, first ledger line above
  ])("bass %s octave %i -> level %i", (key, octave, level) => {
    expect(noteToLevel(key, octave, "bass")).toBe(level);
  });
});

describe("levelToY", () => {
  test("puts the five lines at y = 0..4, top line first", () => {
    expect([10, 8, 6, 4, 2].map(levelToY)).toEqual([0, 1, 2, 3, 4]);
  });

  test("moves half a space per level", () => {
    expect(levelToY(0)).toBe(5);
    expect(levelToY(12)).toBe(-1);
    expect(levelToY(7) - levelToY(8)).toBe(0.5);
  });
});

describe("ledgerLineLevels", () => {
  test("notes on or between the staff lines need none", () => {
    for (let level = 1; level <= 11; level++) expect(ledgerLineLevels(level)).toEqual([]);
  });

  test("notes below the staff get every line between them and the staff", () => {
    expect(ledgerLineLevels(0)).toEqual([0]); // C4
    expect(ledgerLineLevels(-1)).toEqual([0]); // B3 hangs under the C4 line
    expect(ledgerLineLevels(-2)).toEqual([0, -2]);
    expect(ledgerLineLevels(-5)).toEqual([0, -2, -4]);
    expect(ledgerLineLevels(-6)).toEqual([0, -2, -4, -6]);
  });

  test("notes above the staff get every line between them and the staff", () => {
    expect(ledgerLineLevels(12)).toEqual([12]); // A5
    expect(ledgerLineLevels(13)).toEqual([12]); // B5 sits on the A5 line
    expect(ledgerLineLevels(14)).toEqual([12, 14]);
    expect(ledgerLineLevels(17)).toEqual([12, 14, 16]);
    expect(ledgerLineLevels(18)).toEqual([12, 14, 16, 18]);
  });

  test("count grows by one every two levels, with no upper limit", () => {
    expect(ledgerLineLevels(30)).toHaveLength(10);
    expect(ledgerLineLevels(-20)).toHaveLength(11);
  });
});

describe("stems", () => {
  test("point up below the middle line and down from it upward", () => {
    expect(stemDirection(5)).toBe("up");
    expect(stemDirection(6)).toBe("down");
    expect(stemDirection(-6)).toBe("up");
    expect(stemDirection(18)).toBe("down");
  });

  test("are 3.5 spaces long near the staff", () => {
    expect(stemTipLevel(5)).toBe(5 + STEM_LENGTH * 2);
    expect(stemTipLevel(2)).toBe(9);
    expect(stemTipLevel(6)).toBe(-1);
    expect(stemTipLevel(12)).toBe(5);
  });

  test("reach at least the middle line from far ledger lines", () => {
    expect(stemTipLevel(-4)).toBe(6);
    expect(stemTipLevel(-1)).toBe(6);
    expect(stemTipLevel(14)).toBe(6);
    expect(stemTipLevel(17)).toBe(6);
  });

  test("join the head on its right going up and on its left going down", () => {
    const up = noteLayout(2, 10);
    expect(up.direction).toBe("up");
    expect(up.stem.x + up.stem.width).toBeCloseTo(10 + NOTEHEAD.width / 2);
    expect(up.stem.bottom).toBeLessThan(up.y); // joins above the centre
    expect(up.stem.top).toBeCloseTo(up.y - STEM_LENGTH);

    const down = noteLayout(8, 10);
    expect(down.direction).toBe("down");
    expect(down.stem.x).toBeCloseTo(10 - NOTEHEAD.width / 2);
    expect(down.stem.top).toBeGreaterThan(down.y); // joins below the centre
    expect(down.stem.bottom).toBeCloseTo(down.y + STEM_LENGTH);
  });
});

describe("noteLayout", () => {
  test("draws ledger lines wider than the notehead, centred on it", () => {
    const { x, ledgerLines } = noteLayout(-1);
    expect(ledgerLines).toHaveLength(1);
    expect(ledgerLines[0].y).toBe(levelToY(0));
    expect(ledgerLines[0].x2 - ledgerLines[0].x1).toBeGreaterThan(NOTEHEAD.width);
    expect((ledgerLines[0].x1 + ledgerLines[0].x2) / 2).toBeCloseTo(x);
  });
});

describe("notehead", () => {
  test("fills one space and is about 1.3 spaces wide", () => {
    const t = (-NOTEHEAD.tilt * Math.PI) / 180;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < 3600; i++) {
      const a = (i / 3600) * 2 * Math.PI;
      const ex = NOTEHEAD.rx * Math.cos(a);
      const ey = NOTEHEAD.ry * Math.sin(a);
      const x = ex * Math.cos(t) - ey * Math.sin(t);
      const y = ex * Math.sin(t) + ey * Math.cos(t);
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    expect(maxY - minY).toBeCloseTo(1, 3);
    expect(maxX - minX).toBeCloseTo(1.3, 3);
  });

  test("an untilted ellipse has its stem join on the centre line", () => {
    const { rx, ry, stemJoin } = tiltedEllipse(1.3, 1, 0);
    expect(rx).toBeCloseTo(0.65);
    expect(ry).toBeCloseTo(0.5);
    expect(stemJoin).toBeCloseTo(0);
  });
});

describe("canvas", () => {
  const top = VIEW_BOX.y;
  const bottom = VIEW_BOX.y + VIEW_BOX.height;
  const highest = 10 + 2 * LEDGER_ROOM + 1;
  const lowest = 2 - 2 * LEDGER_ROOM - 1;

  test(`fits every note up to ${LEDGER_ROOM} ledger lines away, stems included`, () => {
    for (let level = lowest; level <= highest; level++) {
      const { y, stem } = noteLayout(level);
      expect(y - NOTEHEAD.height / 2).toBeGreaterThanOrEqual(top);
      expect(y + NOTEHEAD.height / 2).toBeLessThanOrEqual(bottom);
      expect(stem.top).toBeGreaterThanOrEqual(top);
      expect(stem.bottom).toBeLessThanOrEqual(bottom);
    }
    expect(ledgerLineLevels(highest)).toHaveLength(LEDGER_ROOM);
    expect(ledgerLineLevels(lowest)).toHaveLength(LEDGER_ROOM);
  });

  test("keeps the staff vertically centred", () => {
    expect((top + bottom) / 2).toBeCloseTo(levelToY(6));
  });

  test("puts the treble clef on the G line and the bass clef on the F line", () => {
    expect(clefOrigin("treble").y).toBe(levelToY(4));
    expect(clefOrigin("bass").y).toBe(levelToY(8));
  });
});
