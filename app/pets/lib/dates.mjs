// Calendar dates retain their original day, regardless of the browser timezone.
export function technicalDate(value){
 const match=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(value||''));
 if(!match)return '';
 const [,day,month,year]=match,iso=`${year}-${month}-${day}`;
 const date=new Date(iso+'T00:00:00.000Z');
 return Number(year)>0&&!Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===iso?iso:'';
}
export function dateLabel(value){
 const match=/^(\d{4})-(\d{2})-(\d{2})(?:$|T| )/.exec(String(value||''));
 if(!match)return '—';
 const [,year,month,day]=match,label=`${day}/${month}/${year}`;
 return technicalDate(label)?label:'—';
}
