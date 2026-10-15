export function outboxPollDelay(previous:number,claimed:number,maximum=60000){
 return claimed>0?5000:Math.min(Math.max(5000,previous)*2,Math.max(5000,maximum));
}
