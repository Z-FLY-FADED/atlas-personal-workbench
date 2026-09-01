import assert from "node:assert/strict";
import test from "node:test";
import { formatProjectDueDate, projectDueDateInputValue } from "../app/components/workspace/projectDates";

test("project due date accepts saved ISO dates", () => {
  assert.equal(projectDueDateInputValue("2027-02-18"), "2027-02-18");
  assert.equal(formatProjectDueDate("2027-02-18"), "2027年2月18日");
});

test("project due date converts legacy Chinese month values", () => {
  assert.equal(projectDueDateInputValue("27年2月"), "2027-02-28");
  assert.equal(projectDueDateInputValue("2028年2月"), "2028-02-29");
  assert.equal(projectDueDateInputValue("2027年2月18日"), "2027-02-18");
});

test("project due date rejects invalid values without breaking the date field", () => {
  assert.equal(projectDueDateInputValue("2027-02-31"), "");
  assert.equal(projectDueDateInputValue("待安排"), "");
  assert.equal(formatProjectDueDate("待安排"), "待安排");
});
