import {
  applyHandOrder,
  reorderHandIds,
  syncHandOrderWithCards,
} from "@/lib/game/hand-order";

describe("hand-order", () => {
  const cards = [
    { id: "a", title: "A" },
    { id: "b", title: "B" },
    { id: "c", title: "C" },
  ];

  it("applyHandOrder preserves saved order and appends new cards", () => {
    expect(applyHandOrder(cards, ["c", "a"])).toEqual([
      { id: "c", title: "C" },
      { id: "a", title: "A" },
      { id: "b", title: "B" },
    ]);
  });

  it("reorderHandIds moves an item to a new slot", () => {
    expect(reorderHandIds(["a", "b", "c"], "a", "c")).toEqual([
      "b",
      "c",
      "a",
    ]);
  });

  it("syncHandOrderWithCards drops removed ids and appends new ones", () => {
    expect(syncHandOrderWithCards(cards, ["b", "x", "a"])).toEqual([
      "b",
      "a",
      "c",
    ]);
  });
});
