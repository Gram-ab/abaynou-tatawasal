export type ContentSection={heading:string;paragraphs:string[]};
/** Deliberately small Markdown subset: paragraphs and level-two headings, rendered as text. */
export function parsePublicBody(body:string){
 const sections:ContentSection[]=[];const introduction:string[]=[];
 for(const block of body.split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean)){
  if(block.startsWith('## '))sections.push({heading:block.slice(3),paragraphs:[]});
  else if(sections.length)sections[sections.length-1].paragraphs.push(block);
  else introduction.push(block);
 }
 return {introduction,sections};
}
