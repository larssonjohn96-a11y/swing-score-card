export type CategoryTest = {
  to:
    | "/bunker"
    | "/bunker-test"
    | "/speed"
    | "/speed-test"
    | "/longdrive"
    | "/fairway"
    | "/teeshot"
    | "/precision"
    | "/approach"
    | "/offtee-test"
    | "/offtee"
    | "/pitch"
    | "/chip"
    | "/narspel"
    | "/narspel-test"
    | "/kortputt"
    | "/short-putting-test"
    | "/tornado"
    | "/lagputt"
    | "/lagputt-test"
    | "/putting"
    | "/50-bollar";

  number: string;
  title: string;
  subtitle: string;
  bullets: string[];
  result: string;
};

export type Category = { slug:string; title:string; subtitle:string; description:string; tests:CategoryTest[] };

export const CATEGORIES:Category[]=[
{slug:"driving",title:"Off the Tee",subtitle:"Utslag",description:"Längd, hastighet och träffsäkerhet från tee.",tests:[{to:"/speed-test",number:"4",title:"Speed Test",subtitle:"Bollhastighet är grunden för längd. Speed mäter din råkraft i slaget, helt separat från riktning och precision.",bullets:["Ball speed obligatoriskt, club head speed valfritt per slag.","Speed HCP kalibrerat mot verklig Trackman-data."],result:"RESULTAT: SPEED HCP + SMASH FACTOR"},{to:"/offtee-test",number:"18",title:"Off the Tee Test",subtitle:"Utslaget sätter tonen för hela hålet. Off the Tee mäter hur långt och hur rakt du slår från tee, och hur ofta du håller bollen i spel.",bullets:["Bara carry, totalt avstånd och sidled per slag – ingen klubba.","Driving Handicap kalibrerat mot verklig speldata."],result:"RESULTAT: OFF THE TEE SCORE 0–100 + DRIVING HCP"}]},
{slug:"approach",title:"Approach",subtitle:"Inspel mot green",description:"Precision på fulla och halva inspel.",tests:[{to:"/approach",number:"17",title:"Approach Test",subtitle:"Inspel handlar om att kontrollera både längd och riktning för att sätta upp enkla puttar. Approach mäter hur nära flaggan du landar från 50 till 150 meter.",bullets:["5 avstånd, ett slag vardera, registrera carry och sidled med knappar.","Resultat visas först när alla slag är klara."],result:""}]},
{slug:"around-the-green",title:"Around the green",subtitle:"Shortgame",description:"Chip, pitch och bunkerslag runt greenen.",tests:[{to:"/bunker-test",number:"3",title:"Bunkerslag",subtitle:"Bunkerspel handlar om att komma upp ur sanden med kontroll och lämna bollen nära hålet – inte bara ta sig upp överhuvudtaget.",bullets:["Ingen läges- eller teknikval – bara resultatet räknas.","Registrera avstånd som ett intervall, eller att du inte kom upp."],result:"RESULTAT: BUNKER HCP + SPRIDNINGSBILD"},{to:"/narspel-test",number:"12",title:"Närspelstest",subtitle:"Närspel är de halvlånga slagen strax utanför green. Tekniken är fri – chip, pitch eller wedge – men målet är alltid detsamma: nära flaggan.",bullets:["Chip, pitch eller wedge – du väljer teknik, resultatet räknas.","Registrera hur nära hålet bollen stannade som ett intervall."],result:"RESULTAT: NÄRSPEL HCP + SPRIDNINGSBILD"}]},
{slug:"puttning",title:"Puttning",subtitle:"På greenen",description:"Tester för längdkänsla och korta puttar.",tests:[{to:"/putting",number:"14",title:"Putting Test",subtitle:"Korta puttar avgör poäng, lagputtar handlar om längdkontroll. Testet mäter båda i ett flöde och ger ett samlat Putting HCP, uppdelat på Short Putt och Lag Putt.",bullets:["6 puttar (3 korta + 3 lagputtar) – eller ett utökat 18-puttarstest för erfarna spelare.","Ett Putting HCP, plus separat HCP för Short Putt och Lag Putt."],result:"RESULTAT: PUTTING HCP + UPPDELAT PER DEL"},{to:"/lagputt-test",number:"6",title:"Lag Putt",subtitle:"Testa din längdkontroll på långa puttar. Sex olika avstånd spelas i slumpad ordning så att du måste läsa och anpassa farten på varje putt.",bullets:["6 puttar från 8, 10, 12, 14, 16 och 18 meter i slumpad ordning.","Registrera hur nära hålet varje putt stannar. Inom 1 meter räknas som godkänt."],result:"RESULTAT: LAGPUTT HCP + SNITTAVSTÅND + ANDEL INOM 1 M"},{to:"/50-bollar",number:"25",title:"25-bollsövningen",subtitle:"Ett kompakt kortputtstest där du spelar 5 bollar från 1, 2, 3, 4 och 5 meter och räknar varje slag tills alla bollar är hålade.",bullets:["25 bollar totalt – 5 från varje avstånd mellan 1 och 5 meter.","Byt hål, variera lutning och brytning. Lägre score är bättre."],result:"RESULTAT: TOTALSCORE + PERSONBÄSTA + UTVECKLING ÖVER TID"}]}
];
export function findCategory(slug:string){return CATEGORIES.find(c=>c.slug===slug)}
