import { assertEquals } from "@std/assert";
import { removeUndefinedKeys } from "./helpers.ts";

// Test Case 1: Object with some undefined values
Deno.test("removeUndefinedKeys removes keys with undefined values", () => {
  const input = { a: 1, b: undefined, c: 3 };
  const expected = { a: 1, c: 3 };
  const result = removeUndefinedKeys(input);
  assertEquals(result, expected);
});

// Test Case 2: Object with all defined values
Deno.test("removeUndefinedKeys keeps all keys when no undefined values", () => {
  const input = { a: 1, b: 2, c: 3 };
  const expected = { a: 1, b: 2, c: 3 };
  const result = removeUndefinedKeys(input);
  assertEquals(result, expected);
});

// Test Case 3: Object with all undefined values
Deno.test("removeUndefinedKeys returns empty object when all values are undefined", () => {
  const input = { a: undefined, b: undefined };
  const expected = {};
  const result = removeUndefinedKeys(input);
  assertEquals(result, expected);
});

// Test Case 4: Empty object
Deno.test("removeUndefinedKeys returns empty object when input is empty", () => {
  const input = {};
  const expected = {};
  const result = removeUndefinedKeys(input);
  assertEquals(result, expected);
});

// Test Case 5: Object with null values
Deno.test("removeUndefinedKeys retains keys with null values", () => {
  const input = { a: null, b: undefined };
  const expected = { a: null };
  const result = removeUndefinedKeys(input);
  assertEquals(result, expected);
});

// Test Case 6: Object with nested objects
Deno.test("removeUndefinedKeys does not remove undefined in nested objects", () => {
  const input = { a: 1, b: { c: undefined, d: 2 }, e: undefined };
  const expected = { a: 1, b: { c: undefined, d: 2 } };
  const result = removeUndefinedKeys(input);
  assertEquals(result, expected);
});

// Test Case 7: Object with various data types
Deno.test("removeUndefinedKeys handles various data types correctly", () => {
  const input = { a: 0, b: false, c: "", d: undefined };
  const expected = { a: 0, b: false, c: "" };
  const result = removeUndefinedKeys(input);
  assertEquals(result, expected);
});
