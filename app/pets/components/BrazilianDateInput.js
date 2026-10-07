'use client';
import {useState} from 'react';
import {dateLabel,technicalDate} from '../lib/dates.mjs';
export default function BrazilianDateInput({name,defaultValue='',required=false,max}){
 const initial=dateLabel(defaultValue),[display,setDisplay]=useState(initial==='—'?'':initial);
 function change(event){
  const digits=event.target.value.replace(/\D/g,'').slice(0,8);
  const text=[digits.slice(0,2),digits.slice(2,4),digits.slice(4,8)].filter(Boolean).join('/');
  const technical=technicalDate(text);
  event.target.setCustomValidity(text&&!technical?'Informe uma data válida no formato DD/MM/YYYY.':technical&&max&&technical>max?'Informe uma data até '+dateLabel(max)+'.':'');
  setDisplay(text);
 }
 return <><input type="hidden" name={name} value={technicalDate(display)}/><input type="text" inputMode="numeric" lang="pt-BR" placeholder="DD/MM/YYYY" title="Data no formato DD/MM/YYYY" value={display} onChange={change} maxLength={10} required={required} autoComplete="off"/></>;
}
