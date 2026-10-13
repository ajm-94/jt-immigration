import assert from "node:assert/strict";
import { extractStatementRows, monthlyPosCounts } from "../lib/bank-statement";

const rows = extractStatementRows("01/03/2026 POS Shop Dublin 20.00\n02 Mar 2026 Contactless Cork 10.00\n2026-03-03 VISA DEBIT Galway 15.00\n04/03/2026 POS ONLINE SHOP 9.00\n05/03/2026 ATM 30.00\n31/02/2026 POS Shop 1.00", "test", 2026);
assert.equal(rows.length, 5);
assert.equal(rows.filter((row) => row.candidate).length, 3);
assert.equal(rows.some((row) => row.confirmed), false);
assert.deepEqual(monthlyPosCounts(rows, "2026-03").map((month) => month.count), [0, 0, 0]);
rows.slice(0, 3).forEach((row) => { row.confirmed = true; });
assert.deepEqual(monthlyPosCounts(rows, "2026-03").map((month) => month.count), [3, 0, 0]);
assert.deepEqual(monthlyPosCounts([{ date: "2027-01-01", description: "Shop", source: "test", candidate: true, confirmed: true }], "2026-12"), [{ month: "2026-12", count: 0 }, { month: "2027-01", count: 1 }, { month: "2027-02", count: 0 }]);
assert.equal(extractStatementRows("12/03 POS Shop 1.00", "test", 2025)[0].date, "2025-03-12");
assert.equal(monthlyPosCounts(rows, "2026-13").length, 0);
console.log("Bank statement checks passed.");
