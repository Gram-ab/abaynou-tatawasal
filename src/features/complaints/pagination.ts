/** A bounded page window: never allocate one element per database page. */
export function paginationItems(page:number,pageCount:number):(number|'gap-before'|'gap-after')[]{
 const last=Math.max(1,Math.floor(pageCount)),current=Math.min(Math.max(1,Math.floor(page)),last);
 if(last<=7)return Array.from({length:last},(_,index)=>index+1);
 const start=current<=4?2:current>=last-3?last-4:current-1;
 const end=current<=4?5:current>=last-3?last-1:current+1;
 const result:(number|'gap-before'|'gap-after')[]=[1];
 if(start>2)result.push('gap-before');
 for(let number=start;number<=end;number++)result.push(number);
 if(end<last-1)result.push('gap-after');
 result.push(last);return result;
}
