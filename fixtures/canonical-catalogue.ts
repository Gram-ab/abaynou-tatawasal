// Owner-approved DEV-04A development wording. Production Commune validation remains required.
export const canonicalCategories=[
 {code:'CLEANLINESS_WASTE',labels:{en:'Cleanliness and waste',fr:'Propreté et déchets',ar:'النظافة والنفايات'}},
 {code:'PUBLIC_LIGHTING',labels:{en:'Public lighting',fr:'Éclairage public',ar:'الإنارة العمومية'}},
 {code:'ROADS_SIDEWALKS',labels:{en:'Roads and sidewalks',fr:'Voirie et trottoirs',ar:'الطرق والأرصفة'}},
 {code:'DRAINAGE_WATER',labels:{en:'Drainage and water',fr:'Assainissement et eau',ar:'الصرف والمياه'}},
 {code:'COMMUNE_FACILITIES',labels:{en:'Commune facilities',fr:'Équipements communaux',ar:'مرافق الجماعة'}},
 {code:'LOCAL_NUISANCE',labels:{en:'Local nuisance / disturbance',fr:'Nuisances et troubles locaux',ar:'الإزعاجات والاضطرابات المحلية'}},
 {code:'OTHER_LOCAL_ISSUE',labels:{en:'Other local issue',fr:'Autre problème local',ar:'مشكلة محلية أخرى'}}
].map((row,index)=>({...row,id:`30000000-0000-4000-8000-${String(index+1).padStart(12,'0')}`,isActive:true}));
export const canonicalLocations=[
 'دوار أباينو','دوار ايكيسل','دوار توتلين','دوار أبوقال','دوار إد العربا','دوار تبولوت'
].map((ar,index)=>({id:`40000000-0000-4000-8000-${String(index+1).padStart(12,'0')}`,code:`LOC_${String(index+1).padStart(3,'0')}`,isActive:true,labels:{ar}}));
