import test from "node:test";
import assert from "node:assert/strict";
import { availability, dateKey } from "../components/availability.mjs";

const now = new Date(2026, 8, 18, 12);
test("clínica fecha aos sábados e domingos; datas passadas e inválidas são recusadas", () => {
  for (const date of ["2026-09-19", "2026-09-20", "2026-09-17", "2026-02-30", "inválida"]) {
    assert.equal(availability(date, { now, closedDays: [0, 6] }).status, "closed");
  }
});
test("demonstração contém dias lotados e dias com horários livres e ocupados", () => {
  const days = Array.from({ length: 30 }, (_, i) => availability(dateKey(new Date(2026, 9, i + 1)), { now, closedDays: [0, 6] }));
  assert(days.some(d => d.status === "busy"));
  assert(days.some(d => d.slots.some(s => s.status === "available") && d.slots.some(s => s.status === "busy")));
  for (const day of days.filter(d => d.status === "busy")) assert(day.slots.every(s => s.status !== "available"));
});
test("horários de hoje já encerrados não podem ser selecionados", () => {
  const { slots } = availability("2026-09-18", { now });
  assert.equal(slots.find(s => s.time === "09:00").status, "past");
  assert.equal(slots.find(s => s.time === "10:30").status, "past");
});
test("restaurante respeita fechamento e usa horários de jantar", () => {
  assert.equal(availability("2026-09-21", { now, mode: "reservation", closedDays: [1] }).status, "closed");
  const { slots } = availability("2026-09-22", { now, mode: "reservation", closedDays: [1] });
  assert.equal(slots.length, 4);
  assert(slots.every(s => Number(s.time.slice(0, 2)) >= 18));
});
test("disponibilidade permanece estável entre consultas; virada de ano mantém data local", () => {
  assert.deepEqual(availability("2026-10-02", { now }), availability("2026-10-02", { now }));
  assert.equal(dateKey(new Date(2027, 0, 1)), "2027-01-01");
});
