export type LearnQuestion = {
  id: string;
  lessonId: string;
  sectionId: string;
  level: "recall" | "understand" | "apply";
  prompt: string;
  options: string[];
  correct: number;
  feedback: string;
};

export type LessonKnowledge = {
  lessonId: string;
  core: string;
  why: string;
};

export const LESSON_KNOWLEDGE: LessonKnowledge[] = [
  { lessonId: "score", core: "Golfscore räknar antal slag. Lägre score är bättre; birdie är ett under par och bogey ett över par.", why: "Du behöver förstå score för att kunna värdera beslut och risk på banan." },
  { lessonId: "hcp", core: "Handicap beskriver ungefärlig spelstyrka och används för att jämna ut spel mellan golfare på olika nivå.", why: "Det hjälper dig tolka resultat och tävla på jämförbara villkor." },
  { lessonId: "carry-total", core: "Carry är hur långt bollen flyger i luften. Total är carry plus rull efter landning.", why: "Hinder måste klaras med carry, inte med totaldistans." },
  { lessonId: "good-miss", core: "En bra miss lämnar nästa slag enkelt och undviker stora straff även när slaget inte blir perfekt.", why: "Samma slagkvalitet kan ge lägre score om missarna hamnar på bättre platser." },
  { lessonId: "short-putt", core: "På kortputtar är startlinjen avgörande eftersom det finns lite tid för bollen att korrigera riktningen.", why: "Färre missade kortputtar minskar onödiga tappade slag." },
  { lessonId: "lag-putting", core: "På långa puttar är huvudmålet oftast att lämna en enkel andraputt, inte att försöka håla till varje pris.", why: "Bättre längdkontroll minskar treputtar." },
  { lessonId: "speed-control", core: "Farten avgör både hur mycket putten bryter och hur långt nästa putt blir om du missar.", why: "Rätt fart gör din effektiva målzon större." },
  { lessonId: "one-meter", core: "Från långt håll är en zon runt hålet ett bättre mål än själva hålet. Cirka en meter är en enkel mental modell.", why: "Du optimerar för tvåputt istället för ett osannolikt hål." },
  { lessonId: "chip-what", core: "En chip är ett kort slag nära green där bollen normalt flyger relativt lite och rullar mer.", why: "Du kan välja ett enklare och mer förutsägbart slag när marken tillåter." },
  { lessonId: "chip-pitch", core: "En chip har normalt mer rull; en pitch flyger längre och stannar snabbare.", why: "Rätt typ av slag gör avståndskontrollen enklare." },
  { lessonId: "landing", core: "Landningspunkten är platsen där du vill att bollen först ska träffa marken.", why: "Att välja en landningspunkt gör chip och pitch mer konkreta att planera." },
  { lessonId: "roll", core: "Slutresultatet beror både på carry till landningspunkten och hur mycket bollen rullar därefter.", why: "Du kan välja klubba och slag utifrån greenens utrymme." },
  { lessonId: "wedge-carry", core: "På wedges är carry ofta viktigare än total eftersom du vill kontrollera var bollen landar.", why: "Känd carry minskar gissning på scoringavstånd." },
  { lessonId: "wedge-gapping", core: "Gapping betyder att dina spelbara längder täcker avstånden utan stora hål mellan klubbor eller svinglängder.", why: "Färre avståndshål ger fler slag där du kan välja en normal lösning." },
  { lessonId: "start-direction", core: "Klubbbladets riktning i träffen påverkar starkt bollens startlinje.", why: "Startlinjen ger direkt information om vad som hände i träffen." },
  { lessonId: "draw", core: "För en högerspelare är en draw en kontrollerad kurva från höger mot vänster.", why: "Att kunna namnen på bollflykter gör feedback och coaching tydligare." },
  { lessonId: "fade", core: "För en högerspelare är en fade en kontrollerad kurva från vänster mot höger.", why: "En fade är inte sämre än en draw om den är förutsägbar." },
  { lessonId: "slice-hook", core: "Slice och hook är större kurvor. Kurvan styrs främst av klubbbladets vinkel relativt svingspåret.", why: "Du kan förstå bollens information utan att behöva diagnostisera hela svingen själv." },
  { lessonId: "face-path", core: "Face beskriver vart klubbbladet pekar; path beskriver klubbhuvudets rörelseriktning genom träffen. Skillnaden mellan dem påverkar kurvan.", why: "Detta är grunden för att förstå varför bollen startar och kurvar som den gör." },
  { lessonId: "approach-carry", core: "Klubbval på inspel bör utgå från din normala carry, inte ditt längsta slag någonsin.", why: "Realistiska längder ger bättre marginaler mot hinder och greenkanter." },
  { lessonId: "center-green", core: "Mitten av green är ofta ett bättre mål än flaggan när flaggan står nära problem.", why: "Du kan träffa fler greens utan att slå bättre slag." },
  { lessonId: "dispersion", core: "Dispersion är området där dina normala slag brukar hamna, inte en enda perfekt linje.", why: "Bra målval tar hänsyn till hela spridningen." },
  { lessonId: "approach-miss", core: "Smart miss betyder att du planerar för vilken sida som ger enklast nästa slag om du missar green.", why: "Det minskar stora scores från helt normala missar." },
  { lessonId: "fairway-width", core: "Ju smalare den säkra målzonen är, desto mer bör du väga längd mot spridning.", why: "Rätt klubb från tee kan förbättra förväntad score." },
  { lessonId: "tee-dispersion", core: "Från tee bör du planera med hela din spridning, inte bara mittlinjen.", why: "Du kan flytta målbilden bort från straffområden innan du ens slår." },
  { lessonId: "risk-reward", core: "Risk/reward handlar om hur mycket ett aggressivt beslut kan vinna jämfört med hur dyr missen kan bli.", why: "Det bästa beslutet är det som sänker förväntad score över tid." },
  { lessonId: "rough", core: "Rough kan minska kontrollen genom gräs mellan klubbblad och boll och göra bollens reaktion mindre förutsägbar.", why: "Du kan sätta ett rimligare mål från sämre lägen." },
  { lessonId: "bunker", core: "Från bunker är ett stabilt resultat ofta att få bollen säkert på green och undvika nästa stora misstag.", why: "Att acceptera ett rimligt mål minskar dubbel- och trippelbogeys." },
  { lessonId: "headwind", core: "Motvind minskar normalt carry och förstärker effekten av höjd och spin.", why: "Du behöver mer marginal än vad en enkel avståndssiffra visar." },
  { lessonId: "crosswind", core: "Sidvind förändrar var målzonen bör ligga. Ofta är det bättre att ge vinden utrymme än att försöka slå helt rakt genom den.", why: "Bättre vindbeslut minskar sidmissar utan att ändra svingen." },
  { lessonId: "temperature", core: "Kallare förhållanden ger normalt kortare bollflykt än varmare förhållanden.", why: "Samma klubba går inte exakt lika långt varje dag." },
  { lessonId: "safe-side", core: "Safe side är den sida av målet där en miss ger lägre kostnad och enklare nästa slag.", why: "Det gör dina normala missar mindre skadliga." },
  { lessonId: "attack", core: "Attackera när uppsidan är värd risken; spela konservativt när missen är mycket dyr.", why: "Bra strategi handlar om förväntad score, inte mod." },
  { lessonId: "three-putt-avoid", core: "Treputt-prevention kombinerar fartkontroll, målzon och respekt för svåra första puttar.", why: "Treputtar är ett tydligt sätt att tappa slag utan att behöva slå ett dåligt fullsving." },
  { lessonId: "recovery", core: "Efter ett dåligt slag är målet ofta att återställa hålet, inte omedelbart vinna tillbaka allt med ett hjälteslag.", why: "Bra recovery-beslut begränsar stora scores." },
  { lessonId: "routine", core: "En enkel pre-shot routine skapar samma besluts- och startprocess inför varje slag.", why: "Den hjälper dig utföra ett redan fattat beslut under press." },
  { lessonId: "pressure", core: "Press förändrar känsla och uppmärksamhet men bör inte förändra din grundstrategi utan anledning.", why: "Du kan hålla fast vid bra beslut även när resultatet betyder mer." },
];

const q = (id:string, lessonId:string, sectionId:string, level:LearnQuestion["level"], prompt:string, options:string[], correct:number, feedback:string):LearnQuestion => ({id,lessonId,sectionId,level,prompt,options,correct,feedback});

export const LEARN_QUESTIONS: LearnQuestion[] = [
  q("carry-1","carry-total","basics","recall","Vad betyder carry?",["Hur långt bollen flyger i luften","Hur långt bollen rullar","Carry plus rull","Klubbans skaftlängd"],0,"Carry är flygsträckan fram till första markkontakt."),
  q("carry-2","carry-total","basics","apply","Din 7-järn carry är 145 m och en bunker börjar vid 148 m. Vad är viktigast?",["Totaldistansen är tillräcklig","Carryn ger för liten marginal över bunkern","Du måste alltid slå 7-järn","Bunkern påverkar inte klubbvalet"],1,"Hindret måste klaras i luften. 145 m normal carry ger inte trygg marginal till 148 m."),
  q("miss-1","good-miss","basics","understand","Vad beskriver bäst en bra miss?",["Ett slag som ser bra ut","En miss som lämnar ett enkelt nästa slag","Alla slag som träffar fairway","Ett slag som alltid är kort om målet"],1,"En bra miss begränsar kostnaden och gör nästa slag enklare."),
  q("lag-1","lag-putting","putting","recall","Vad är huvudmålet på en mycket lång putt?",["Alltid håla","Alltid lämna kort","Göra nästa putt enkel","Slå så hårt som möjligt"],2,"På långputtar är tvåputt ofta ett bättre mål än att jaga ett osannolikt hål."),
  q("lag-2","lag-putting","putting","apply","Du har 14 m till hålet. Vilket resultat är normalt bäst?",["30 cm från hålet","2,5 m förbi","2 m kort","Precis till fringe"],0,"30 cm lämnar en mycket enkel andraputt och minimerar treputtrisken."),
  q("pace-1","speed-control","putting","understand","Varför påverkar puttfart även linjen?",["Snabbare puttar påverkas mindre tid av lutningen","Farten ändrar greenens lutning","Fart påverkar bara längd","Långsamma puttar går alltid rakt"],0,"En snabbare boll hinner normalt bryta mindre innan den når hålet."),
  q("chip-1","chip-what","chipping","recall","Vilket beskriver normalt en chip bäst?",["Kort flyg och mer rull","Maximal höjd och ingen rull","Full sving från fairway","Ett slag endast från bunker"],0,"En chip är normalt ett lågt närspelsslag där rullen är en stor del av totalen."),
  q("landing-1","landing","chipping","apply","Varför väljer man en landningspunkt på en chip?",["För att göra slaget till ett konkret carrymål","För att alltid använda samma klubba","För att eliminera all rull","För att undvika att läsa greenen"],0,"Landningspunkten gör första delen av slaget mätbar och lättare att planera."),
  q("wedge-1","wedge-carry","wedges","understand","Vad är oftast mest användbart att känna till på ett wedgeslag mot green?",["Normal carry","Längsta total någonsin","Klubbans inköpspris","Hur långt bollen rullar på tee"],0,"På wedges vill du främst kontrollera var bollen landar."),
  q("gap-1","wedge-gapping","wedges","apply","Du har pålitliga carries 70 m och 95 m men inget normalt slag däremellan. Vad beskriver problemet?",["Dålig gapping","För låg spin","För starkt grepp","För bred stance"],0,"Ett 25-meters hål i spelbara längder är ett gappingproblem."),
  q("draw-1","draw","ballflight","recall","För en högerspelare, hur kurvar en draw?",["Höger till vänster","Vänster till höger","Rakt upp","Den måste börja vänster"],0,"En draw är en kontrollerad kurva från höger mot vänster för en högerspelare."),
  q("fade-1","fade","ballflight","recall","För en högerspelare, hur kurvar en fade?",["Vänster till höger","Höger till vänster","Den går alltid rakt","Den måste börja höger"],0,"En fade är en kontrollerad kurva från vänster mot höger för en högerspelare."),
  q("facepath-1","face-path","ballflight","understand","Vad påverkar främst bollens kurva?",["Relationen mellan klubbblad och svingspår","Endast grepptrycket","Endast bollens färg","Endast klubbans längd"],0,"Skillnaden mellan face och path är central för kurvans riktning och storlek."),
  q("facepath-2","face-path","ballflight","apply","En högerspelare slår bollen som startar vänster och kurvar kraftigt höger. Vad kan du säkert säga?",["Bollen hade en vänster-till-höger-kurva","Greppet var definitivt för svagt","Spelaren stod definitivt för nära","Klubban var definitivt för kort"],0,"Bollflykten visar kurvans riktning. Den ensam bevisar inte en specifik kroppsteknisk orsak."),
  q("center-1","center-green","approach","apply","Flaggan står 4 m från vatten vänster. Din normala dispersion är ±10 m. Vilket mål är oftast klokare?",["Närmare mitten av green","Direkt på flaggan varje gång","Utanför green mot vattnet","Alltid kort om green"],0,"Mitten ger din normala spridning större marginal från det dyra misstaget."),
  q("disp-1","dispersion","approach","recall","Vad betyder dispersion i golf?",["Hur dina slag sprids runt målet","Endast din längsta carry","Din score på första nio","Hur hårt du greppar"],0,"Dispersion beskriver spridningsområdet för flera slag."),
  q("disp-2","dispersion","approach","apply","Din 7-järn sprider sig normalt 10 m åt båda håll. Varför är en flagga 3 m från vatten ett riskabelt mål?",["Din normala spridning kan hamna i vattnet","7-järn får inte användas mot vatten","Alla järnslag kurvar 10 m","Flaggor nära vatten räknas dubbelt"],0,"När målpunktens marginal är mindre än din normala spridning hamnar en del normala slag i problemet."),
  q("tee-1","tee-dispersion","tee","apply","Trouble finns höger och stort utrymme vänster. Din vanliga drivermiss är höger. Vad är mest logiskt?",["Flytta målbilden vänster för mer marginal","Sikta närmare trouble","Ignorera spridningen","Alltid byta till putter"],0,"Målbilden bör ge din vanligaste miss mer utrymme från det dyra området."),
  q("risk-1","risk-reward","tee","understand","Vad är kärnan i risk/reward?",["Vinstmöjlighet jämfört med kostnaden för missen","Att alltid spela aggressivt","Att alltid lägga upp","Att välja längsta klubban"],0,"Risk/reward väger möjlig vinst mot sannolikhet och kostnad för ett dåligt utfall."),
  q("rough-1","rough","lies","understand","Varför kan rough göra slaget mindre förutsägbart?",["Gräs kan påverka kontakten mellan blad och boll","Bollen blir tyngre","Green blir mindre","Loftet försvinner permanent"],0,"Gräs mellan blad och boll kan minska kontrollen över träff och bollreaktion."),
  q("wind-1","headwind","weather","apply","Din normala carry är precis nog för att klara ett hinder. Det blåser tydlig motvind. Vad bör du anta?",["Du behöver extra carrymarginal","Motvind hjälper alltid carry","Samma klubb går längre","Vind påverkar bara puttar"],0,"Motvind minskar normalt carry, så en redan liten marginal blir ännu mindre."),
  q("crosswind-1","crosswind","weather","understand","Vad är ofta ett bättre sätt att planera i sidvind?",["Ge vinden utrymme i målzonen","Låtsas att vinden inte finns","Alltid sikta exakt på flaggan","Alltid slå lägre klubbnummer"],0,"Målzonen bör justeras så att bollens sannolika vinddrift fortfarande lämnar ett bra resultat."),
  q("safe-1","safe-side","strategy","apply","Green är öppen höger men bunker och vatten finns vänster. Vilken sida är normalt safe side?",["Höger","Vänster","Alltid kort","Det finns aldrig en safe side"],0,"Höger lämnar större marginal från de dyrare problemen."),
  q("recovery-1","recovery","scoring","apply","Efter ett utslag in bland träd har du en smal lucka mot green och en enkel sidledes väg till fairway. Vad är ofta bäst för score?",["Ta den säkra vägen tillbaka i spel","Alltid gå för green","Slå så hårt som möjligt","Plocka upp bollen"],0,"Att återställa hålet begränsar risken för att ett misstag blir flera."),
  q("routine-1","routine","performance","understand","Vad är huvudsyftet med en enkel pre-shot routine?",["Skapa en repeterbar besluts- och startprocess","Garantera perfekt träff","Öka klubbhastigheten automatiskt","Ändra handicap direkt"],0,"Rutinen hjälper dig upprepa processen även när känslan eller pressen förändras."),
  q("pressure-1","pressure","performance","apply","Du leder med ett slag på sista hålet. Vad är normalt bäst?",["Behåll samma genomtänkta beslutsprocess","Byt all strategi bara för att du leder","Slå alltid driver oavsett hål","Undvik att välja mål"],0,"Press är inte i sig ett skäl att överge en strategi som redan är bra för situationen."),
];

export function knowledgeForLesson(lessonId:string) {
  return LESSON_KNOWLEDGE.find((item) => item.lessonId === lessonId);
}

export function questionsForLesson(lessonId:string, sectionId:string, count=3) {
  const exact = LEARN_QUESTIONS.filter((item) => item.lessonId === lessonId);
  const related = LEARN_QUESTIONS.filter((item) => item.sectionId === sectionId && item.lessonId !== lessonId);
  return [...exact, ...related].slice(0, count);
}
