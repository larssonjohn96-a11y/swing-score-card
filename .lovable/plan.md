# Progressiv nivåmätare för Ball Speed Challenge

## Mål
Lägg till en ny blå fullscreen-story direkt efter Speed-HCP som visar spelarens snabbaste slag mot en enda progressiv nivåskala, utan att ändra testets tre slag, beräkningar, historik eller övriga stories.

## Genomförande
- Definiera en strikt stigande, testbar nivåmodell i mph med SG4-appnivåer, Trackmans verifierade LPGA- och PGA-snitt från 2023 samt ärligt namngivna 180/190/200-milstolpar.
- Lägg till hjälpfunktioner för uppnådd nivå, nästa mål, exakt gap, enhetsvisning och near-miss-regeln inom 6 mph. Ogiltiga värden hanteras utan felaktiga passager eller negativa avstånd.
- Infoga storyn `level` i ordningen HCP → nivå → ålder → eventuell alla-golfare → längd. HCP/ålder/alla fortsätter använda snittfart; nivåstoryn använder bästa slaget.
- Bygg en luftig mobilmätare med cirka 3,6 sekunders monotont förlopp, tick/glow när verkligt passerade nivåer nås och en liten slutstuds utan numerisk överskjutning. Visa endast aktuell nivå och nästa mål tydligt.
- Visa firande först efter korrekt stopp, med större kort firande endast för höga milstolpar. Behåll HCP-storyns befintliga lilla konfetti separat.
- Lås Nästa, högerpil och framåtswipe under nivåanimationen. Stäng/bakåt fungerar alltid. Avbryt animation och timers vid stängning eller storybyte; reduced motion visar slutläget direkt utan konfetti och reagerar även om inställningen ändras under körning.
- Lägg en liten källnotis under “Om nivåerna” som skiljer SG4-riktmärken från Trackman Tour Averages 2023 och länkar till den angivna officiella källan.

## Verifiering
- Enhetstesta varje gräns strax under, exakt och över; mph/km/h; decimal-near-miss; högsta nivå; ogiltiga värden; storyordning och villkorad all-story.
- Kör berörda Vitest-test, projektets typkontroll och byggkontroll.
- Kontrollera dialogen i webbläsare på 375×667 och 390×844, inklusive spärrad navigation, avslutad reveal, reduced motion, stängning och safe-area/overflow.
- Granska diffen och skapa en vanlig commit utan publicering.
