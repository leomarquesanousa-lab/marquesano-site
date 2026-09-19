"use client";

import { useEffect, useId, useState } from "react";
import { availability, dateKey } from "./availability.mjs";

const weekdays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const longDate = date => new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

export default function BookingCalendar({ value, onChange, mode, closedDays, saturdayClosing, error }) {
  const [now, setNow] = useState(null);
  const [offset, setOffset] = useState(0);
  const headingId = useId();
  useEffect(() => { setNow(new Date()); }, []);
  if (!now) return <div className="bookingCalendar calendarLoading" aria-busy="true">Preparando a agenda…</div>;
  const month = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const config = { now, mode, closedDays, saturdayClosing };
  const padding = (month.getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const slots = value.date ? availability(value.date, config).slots : [];

  function changeMonth(delta) {
    setOffset(current => current + delta);
    onChange({ date: "", time: "" });
  }

  return <section className="bookingCalendar" aria-labelledby={headingId} tabIndex={-1}>
    <div className="calendarIntro"><span className="eyebrow">01 / ESCOLHA SEU MOMENTO</span><span>Agenda demonstrativa</span></div>
    <div className="calendarMonth"><h3 id={headingId}>{month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</h3><div><button type="button" aria-label="Mês anterior" disabled={offset === 0} onClick={() => changeMonth(-1)}>‹</button><button type="button" aria-label="Próximo mês" disabled={offset === 2} onClick={() => changeMonth(1)}>›</button></div></div>
    <div className="calendarLegend"><span><i className="availableDot"/>Disponível</span><span><i className="busyDot"/>Ocupado</span><span><i className="closedDot"/>Sem atendimento</span></div>
    <div className="calendarWeek" aria-hidden="true">{weekdays.map(day => <span key={day}>{day}</span>)}</div>
    <div className="calendarDays" role="group" aria-label="Escolha uma data disponível">
      {Array.from({ length: padding }, (_, index) => <span key={`space-${index}`} aria-hidden="true"/>)}
      {Array.from({ length: days }, (_, index) => {
        const date = dateKey(new Date(month.getFullYear(), month.getMonth(), index + 1));
        const { status } = availability(date, config);
        const selected = value.date === date;
        const label = status === "available" ? "disponível" : status === "busy" ? "ocupado" : "sem atendimento ou data passada";
        return <button key={date} type="button" className={`calendarDay ${status}${selected ? " selected" : ""}`} disabled={status !== "available"} aria-label={`${longDate(date)}, ${label}`} aria-pressed={selected} aria-current={date === dateKey(now) ? "date" : undefined} onClick={() => onChange({ date, time: "" })}><span>{index + 1}</span><small>{selected ? "✓" : status === "available" ? "Livre" : status === "busy" ? "Lotado" : "—"}</small></button>;
      })}
    </div>
    <div className="calendarTimes"><h4>{value.date ? longDate(value.date) : "Selecione um dia em verde"}</h4>{value.date ? <div className="calendarSlots" role="group" aria-label="Escolha um horário disponível">{slots.map(({ time, status }) => <button key={time} type="button" disabled={status !== "available"} className={`${status}${value.time === time ? " selected" : ""}`} aria-pressed={value.time === time} aria-label={`${time}, ${status === "available" ? "disponível" : status === "busy" ? "ocupado" : "horário passado"}`} onClick={() => onChange({ date: value.date, time })}><strong>{time}</strong><span>{value.time === time ? "Selecionado ✓" : status === "available" ? "Disponível" : status === "busy" ? "Ocupado" : "Encerrado"}</span></button>)}</div> : <p>Os horários aparecem aqui depois que você escolher uma data.</p>}</div>
    <div className="calendarSelection" aria-live="polite">{value.time ? <><span>Seu horário</span><strong>{longDate(value.date)} · {value.time}</strong></> : <span>{value.date ? "Agora escolha um horário disponível." : "Disponibilidade ilustrativa, sem reserva real."}</span>}</div>
    {error && <p className="calendarError" role="alert">{error}</p>}
  </section>;
}
