export function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function availability(date, { now = new Date(), closedDays = [], mode = "booking", saturdayClosing = 24 } = {}) {
  const day = new Date(`${date}T12:00:00`);
  if (Number.isNaN(day.getTime()) || dateKey(day) !== date || date < dateKey(now) || closedDays.includes(day.getDay())) return { status: "closed", slots: [] };
  const seed = Math.floor(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate()) / 86400000);
  const times = mode === "reservation" ? ["18:30", "19:30", "20:30", "21:30"] : ["09:00", "10:30", "14:00", "16:30", "18:00"];
  const slots = times.filter(time => day.getDay() !== 6 || Number(time.slice(0, 2)) < saturdayClosing).map((time, index) => ({
    time,
    status: new Date(`${date}T${time}:00`) <= now ? "past" : seed % 9 === 0 || (seed + index) % 3 === 0 ? "busy" : "available"
  }));
  return { status: slots.some(s => s.status === "available") ? "available" : slots.some(s => s.status === "busy") ? "busy" : "closed", slots };
}
