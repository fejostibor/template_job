# Szorzó Manó 🐣 — szorzótábla-gyakorló PWA

Játékos, magyar nyelvű gyakorlóalkalmazás az 1–10-es szorzótáblához, alsó tagozatos
(kb. 8–10 éves) gyerekeknek. Telepíthető PWA: a telefon/tablet kezdőképernyőjére kirakva
**internet nélkül is működik**, és minden adat az eszközön marad.

## Indítás

Bármilyen statikus kiszolgáló elég (a service workerhez `http(s)` kell, `file://` nem jó):

```bash
npx http-server -p 8080 .
# majd: http://localhost:8080
```

Telefonon: nyisd meg a címet, majd **„Hozzáadás a kezdőképernyőhöz”**. Onnantól ikonról indul,
teljes képernyőn, offline is.

### Közzététel GitHub Pages-en

A `.github/workflows/pages.yml` a `master` ágra pusholva (vagy kézzel indítva) kiteszi
az appot GitHub Pages-re: `https://<felhasználó>.github.io/<repo>/`. Az első futás be is
kapcsolja a Pages-t, ha a repo beállításai engedik; ha nem, a
**Settings → Pages → Source: GitHub Actions** beállítás után kell újrafuttatni.

A workflow szándékosan csak a `master`-ről fut: a GitHub a `github-pages` környezetet
alapértelmezés szerint az alapértelmezett ágra korlátozza, más ágról a telepítés
környezetvédelmi hibával elszáll. Ha mégis feature ágról szeretnél telepíteni, vedd fel
az ágat a **Settings → Environments → github-pages → Deployment branches** listára.

Az app relatív útvonalakat használ, ezért alkönyvtárból kiszolgálva is működik — a service
workerrel és az offline móddal együtt.

## Mit tud

| Mód | Mire jó |
|---|---|
| 🔍 **Felfedező** | Megmutatja, *miért* annyi: pöttytáblázat (téglalap-modell), ismételt összeadás, „számolj 7-esével” sor, táblánkénti trükk, és a felcserélhetőség (3×7 = 7×3). |
| 🎯 **Gyakorlás** | Adaptív feladatsor. Nem véletlenszerű: oda visz, ahol a gyerek bizonytalan. |
| ⚡ **Villámkör** | 60 másodperc, minél több jó válasz — a gyorsaság (automatizáció) fejlesztésére. |
| 🏆 **Mestervizsga** | 12 feladat egy táblából, választós tippelés nélkül. Max. 1 hiba fér bele → 3. csillag + 20 érme. |
| 🩹 **Gyenge pontok** | Célzott kör a 10 legproblémásabb műveletből. |
| 📋 **Szorzótáblák** | Mind a 10 tábla egy helyen, kétféle nézetben: táblánkénti listák (ugrósávval) és a teljes 10×10-es táblázat kiemelt négyzetszámokkal. Csillag jelöli, ami már biztosan megy. |
| 🗺️ **Szorzó-térkép** | 10×10-es hőtérkép: egy pillantásra látszik, mi megy már és mi nem. |
| 🎁 **Matricák** | 20 gyűjthető matrica érmékért, szintekért, sorozatért, vizsgákért. |
| 🔄 **Haladás átvitele** | A gyerek haladásának átvitele másik telefonra vagy iPadre: rövid másolható kód vagy `.json` fájl. Felülírás vagy összefésülés (mindkét eszközből a jobbik érték). |
| ⚙️ **Beállítások** | Hang, rezgés, tippek, napi cél, feladat/kör — és egy **szülői nézet** (pontosság, napi bontás, aktuális gyenge pontok). |

## A mögötte lévő módszertan

A gyakorlómotor nem „kérdezz-felelek véletlenszerűen”, hanem a kutatásokból ismert
elemekre épül:

- **Retrieval practice (előhívásos gyakorlás).** Minden feladat előhívás, azonnali
  visszajelzéssel — ez bizonyítottan tartósabb tudást ad, mint az újraolvasás/nézegetés.
- **Szakaszos ismétlés (Leitner-dobozok).** Minden művelet 0–5 dobozban él. Jó válasz →
  feljebb (ritkábban jön elő), hiba → két dobozzal vissza (hamar visszatér).
- **Interleaving (keverés).** A táblák és a feladattípusok keverednek, nem blokkban jönnek.
- **Felcserélhetőség.** A 3×7 és a 7×3 *egy* tényként rögzül → feleannyi tanulnivaló
  (100 helyett 55 művelet), és az app ki is mondja a gyereknek.
- **Levezetési stratégiák (derived facts).** Hiba után nem csak a jó választ írja ki, hanem
  a hozzá tartozó trükköt is: 7×8 = 5×8 + 2×8, 9×6 = 60 − 6, 4×7 = dupla dupla, stb.
- **Horgony-táblák előre.** Tanulási sorrend: 2 → 5 → 10 → 1 → 4 → 3 → 6 → 9 → 8 → 7.
  A könnyű mintázatokra épülnek rá a nehezek.
- **Fluencia = pontosság ÉS gyorsaság.** A „mesterfok” csak akkor jár, ha a válasz
  *biztos és* átlagosan 4 másodpercen belüli — a cél az automatikus előhívás.
- **Hibajavító ismétlés.** Az elrontott művelet még ugyanabban a körben visszajön, más
  feladattípusban (pl. választósból beírósra váltva).
- **A magyarázat nem siet.** Hibás válasz után a jó megoldás és a trükk addig marad a
  képernyőn, amíg a gyerek rá nem koppint a Tovább gombra – villámkörben ilyenkor az
  óra is megáll, hogy az olvasás ne kerüljön időbe.
- **Rövid, napi adagok.** Napi cél + sorozat („streak”) — 5–10 perc naponta többet ér,
  mint hetente egy hosszú ülés.

**Feladattípusok** (a tudásszinthez igazodva váltakoznak):
választós (belépő) · beírós (valódi előhívás, tippelés nélkül) · hiányzó tényező
(`4 × ? = 28`, ez készíti elő az osztást) · igaz/hamis (számérzék) · osztás
(`28 : 4 = ?`, csak ha a tény már ül).

## Hangnem

Hiba esetén sosem dorgál: „Semmi baj, nézzük meg együtt!”, utána a jó válasz és egy trükk.
Jó válasznál változatos dicséret, sorozatnál külön visszajelzés, konfetti, hang és rezgés
(mind kikapcsolható).

## Haladás átvitele eszközök között

Minden eszköz a saját böngészőjében tárol, tehát a telefonon gyűjtött haladás nem jelenik
meg magától az iPaden. A **Beállítások → Haladás átvitele** képernyő két utat kínál:

1. **Kód** – egy 444 karakteres, másolható szöveg (`SZM1…`), amit üzenetben átküldesz.
   Ellenőrzőösszeget tartalmaz, így az elgépelt vagy félbevágott kódot az app visszautasítja.
   Mindenhol működik, letöltés nélkül.
2. **Fájl** – `.json` mentés, ami AirDroppal, e-mailben vagy felhőn át megy át.

A betöltésnél két mód közül lehet választani:

- **Betöltés** – felülírja az adott eszköz haladását (költözéshez ez a helyes).
- **Összefésülés** – minden műveletnél és számlálónál a két eszköz közül a jobbik értéket
  tartja meg, a matricákat egyesíti (ha mindkét eszközön gyakoroltak).

A beállítások (hang, rezgés, napi cél) szándékosan nem utaznak: azok eszközfüggők.

## Képernyőméretek

- **Telefon** – egyoszlopos, nagy kezelőfelületek, 320 px-től.
- **Tablet / iPad** (700 px-től, ha a magasság is legalább 600 px) – szélesebb tartalom
  (940–1060 px), háromoszlopos menü, nagyobb betűk és gombok; a számbillentyűzet 460 px-re
  fogva, középen marad, hogy kézbe essen.
- **Fekvő iPad** (880 px-től) – a kérdés balra, a válaszlehetőségek/billentyűzet jobbra,
  így egy képernyőn elfér minden, görgetés nélkül.
- **Fekvő telefon** (alacsony képernyő) – kisebb kérdés és gombok, hogy kiférjen.

## Frissítés a telefonon

Az app offline is működik, ezért a telefon egy service workerrel eltárolja magának —
emiatt egy új kiadás nem jelenne meg magától. A kezelés:

- **Automatikus.** Megnyitáskor (és visszatéréskor, illetve félóránként) az app megnézi,
  van-e új verzió. Ha igen, letölti, és **egyszer, magától újratölti** magát a friss
  kiadással. Egy megnyitás elég.
- **Kör közben nem szakít félbe.** Ha épp feladatot old meg a gyerek, nem tölt újra,
  hanem megjelenik egy „✨ Új verzió érkezett — Frissítés" sáv, ami bevárja a koppintást.
- **Kézzel.** Beállítások → *Verzió és frissítés*: kiírja az alkalmazás és a tárolt
  verziót (`v1.3.0 · tárolt: v1.3.0 ✅ naprakész`), és a **Frissítés keresése** gombbal
  azonnal ellenőrizhető.

### Miért frissül biztosan

Három dolog együtt garantálja:

1. **Verziózott fájlnevek.** Az `index.html` `?v=1.4.0`-val hivatkozik a JS/CSS fájlokra.
   Egy új kiadásnál ezek *más URL-ek*, tehát a régi gyorsítótár fizikailag nem tud
   régi fájlt adni rájuk — a böngésző kénytelen a szerverről hozni.
2. **Az `index.html` mindig a hálóról jön** (`cache: 'no-cache'`), amíg van net; a tárolt
   példányra csak offline esik vissza. Így a friss HTML mindig megérkezik, és az hozza
   magával az új fájlneveket.
3. **A precache is `cache: 'reload'`-dal tölt**, tehát a böngésző HTTP-gyorsítótárát
   megkerülve mindig a szerverről.

### Verzió emelése kiadáskor

```bash
python3 scripts/set-version.py 1.5.0
```

Ez egyszerre állítja az `index.html` hivatkozásait, az `sw.js` `VERSION`-jét és az
ASSETS-listát, valamint a `js/app.js` `APP_VERSION`-jét. Kézzel ne írd át őket
egyenként — ha elcsúsznak, a frissítés megbízhatatlanná válik.

## Technikai összefoglaló

- Vanilla JS, keretrendszer és build lépés nélkül. Nincs külső hálózati hívás, nincs követés.
- Adattárolás: `localStorage`, kizárólag az eszközön.
- Offline: service worker (app-shell gyorsítótár), telepíthető web app manifesttel.
- Világos/sötét mód, 320 px-től felfelé reszponzív, nagy kezelőfelületek gyerekujjakhoz,
  `prefers-reduced-motion` támogatás.

```
index.html            az app héja
css/styles.css        stílusok (világos + sötét)
js/state.js           mentés, XP, érme, sorozat, napi cél
js/facts.js           a tanulás motorja (Leitner, súlyozás, trükkök, feladatgenerálás)
js/quiz.js            kérdés-motor (gyakorlás / villámkör / vizsga)
js/transfer.js        haladás exportja/importja (kód + .json fájl)
js/screens.js         képernyők
js/app.js             útvonalkezelés, indítás, PWA-regisztráció
sw.js                 service worker
scripts/generate-icons.py   ikongenerátor (külső függőség nélkül)
scripts/set-version.py      verziószám beállítása minden érintett fájlban
```

## Források a módszertanhoz

- [Ophuis-Cox és mtsai (2023): The effect of retrieval practice on fluently retrieving multiplication facts](https://onlinelibrary.wiley.com/doi/full/10.1002/acp.4141)
- [Learning, using and applying multiplication facts: Insights from research (Chartered College of Teaching)](https://my.chartered.college/impact_article/learning-using-and-applying-multiplication-facts-insights-from-research/)
- [Developing Multiplication Fact Fluency (ResearchGate)](https://www.researchgate.net/publication/280949378_DEVELOPING_MULTIPLICATION_FACT_FLUENCY)
- [Mastering Multiplication Facts: 9 Strategies for Fluency (ExploreLearning Reflex)](https://reflex.explorelearning.com/resources/insights/multiplication-fact-fluency)
- [A Five-Step, Research-Based Approach to Fact Mastery (Legends of Learning)](https://www.legendsoflearning.com/wp-content/uploads/2023/02/MBC-White-Paper.pdf)
