import { CircleDot, Flag, Gauge, Target, TrendingDown, Trophy, Users } from "lucide-react";

export type StoryArt = "putting" | "chipping" | "hcp" | "speed" | "progress" | "compare" | "target" | "practice" | "course" | "focus";

const coverIcons = {
  putting: CircleDot, chipping: Flag, hcp: Target, speed: Gauge,
  progress: TrendingDown, compare: Users, target: Trophy, practice: Target,
  course: Flag, focus: Target,
};

export function StoryCover({ art }: { art: StoryArt }) {
  const Icon = coverIcons[art];
  return <Icon aria-hidden="true" className="h-7 w-7" strokeWidth={1.6} />;
}

/** Explanatory vector artwork, not uploaded photos or the player's actual results. */
export function StoryArtwork({ art }: { art: StoryArt }) {
  const panel = "rgba(255,255,255,.07)";
  const line = "rgba(255,255,255,.18)";
  const muted = "#cbd5e1";
  const accent = "#a7f3d0";
  return (
    <svg viewBox="0 0 320 260" className="h-full w-full" aria-hidden="true" focusable="false" fill="none" fontFamily="system-ui, sans-serif">
      {(art === "putting" || art === "chipping") && <>
        <ellipse cx="160" cy="144" rx="132" ry="74" fill="#17483f" stroke="#438675" />
        <ellipse cx="190" cy="140" rx="48" ry="25" stroke={accent} strokeDasharray="4 6" />
        <ellipse cx="190" cy="140" rx="10" ry="4" fill="#071b22" />
        <path d="M190 140V53l43 15-43 16" stroke="white" strokeWidth="3" strokeLinejoin="round" />
        <path d={art === "chipping" ? "M73 170Q120 25 190 136" : "M73 170Q133 168 185 142"} stroke={accent} strokeWidth="3" strokeDasharray="5 7" strokeLinecap="round" />
        <circle cx="73" cy="170" r="9" fill="white" />
        <circle cx="70" cy="167" r="2" fill="#e2e8f0" />
        {[1, 2, 3].map((n, i) => <g key={n}>
          <rect x={68 + i * 67} y="222" width="52" height="27" rx="13.5" fill={i === 0 ? accent : panel} />
          <text x={94 + i * 67} y="240" fill={i === 0 ? "#102522" : "white"} fontSize="11" fontWeight="700" textAnchor="middle">Hål {n}</text>
        </g>)}
      </>}
      {art === "hcp" && <>
        <text x="160" y="27" textAnchor="middle" fill={muted} fontSize="11" letterSpacing="2">ETT SPEL. FLERA STYRKOR.</text>
        {[["Driver", "12"], ["Inspel", "18"], ["Närspel", "24"], ["Puttning", "8"]].map(([label, hcp], i) => <g key={label}>
          <rect x="20" y={46 + i * 49} width="280" height="41" rx="12" fill={panel} stroke={line} />
          <text x="37" y={72 + i * 49} fill="white" fontSize="14" fontWeight="600">{label}</text>
          <text x="282" y={72 + i * 49} fill={i === 2 ? "#fcd34d" : accent} textAnchor="end" fontSize="18" fontWeight="800">HCP {hcp}</text>
        </g>)}
      </>}
      {art === "speed" && <>
        <path d="M47 173a113 113 0 0 1 226 0" stroke={line} strokeWidth="15" strokeLinecap="round" />
        <path d="M47 173a113 113 0 0 1 207-62" stroke={accent} strokeWidth="15" strokeLinecap="round" />
        <text x="160" y="158" fill="white" fontSize="66" fontWeight="800" textAnchor="middle">171</text>
        <text x="160" y="184" fill={muted} fontSize="14" textAnchor="middle">mph · bollhastighet</text>
        <rect x="75" y="214" width="170" height="30" rx="15" fill={panel} stroke={line} />
        <text x="160" y="234" fill={accent} fontSize="12" fontWeight="700" textAnchor="middle">Mät. Jämför. Testa igen.</text>
      </>}
      {art === "progress" && <>
        <text x="27" y="27" fill={muted} fontSize="11" letterSpacing="2">DIN UTVECKLING ÖVER TID</text>
        {[64, 115, 166, 217].map(y => <path key={y} d={`M28 ${y}H295`} stroke={line} />)}
        <path d="M40 75L120 115L200 159L280 205" stroke={accent} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {[[40,75,"18"],[120,115,"15"],[200,159,"12"],[280,205,"9"]].map(([x,y,v]) => <g key={v}>
          <circle cx={x} cy={y} r="6" fill={accent} stroke="#0c1729" strokeWidth="3" />
          <text x={x} y={Number(y)-16} fill="white" fontSize="18" textAnchor="middle" fontWeight="700">{v}</text>
        </g>)}
        <text x="28" y="246" fill={muted} fontSize="11">Första testet</text>
        <text x="292" y="246" fill={accent} fontSize="11" textAnchor="end">Senaste testet</text>
      </>}
      {art === "compare" && <>
        {[{ x: 24, label: "DU", color: "#93c5fd" }, { x: 176, label: "VÄN", color: "#fda4af" }].map(({x,label,color}) => <g key={label}>
          <rect x={x} y="33" width="120" height="184" rx="24" fill={panel} stroke={line} />
          <circle cx={x+60} cy="83" r="26" fill={color} fillOpacity=".17" stroke={color} />
          <circle cx={x+60} cy="77" r="7" stroke={color} strokeWidth="2" />
          <path d={`M${x+47} 96q13-19 26 0`} stroke={color} strokeWidth="2" strokeLinecap="round" />
          <text x={x+60} y="135" fill="white" fontSize="17" fontWeight="800" textAnchor="middle">{label}</text>
          {[0,1,2].map(i => <rect key={i} x={x+22} y={154+i*14} width={[76,49,61][label === "DU" ? i : 2-i]} height="5" rx="2.5" fill={color} />)}
        </g>)}
        <circle cx="160" cy="120" r="20" fill="#0c1729" />
        <text x="160" y="125" textAnchor="middle" fill={accent} fontSize="12" fontWeight="800">VS</text>
        <text x="160" y="244" textAnchor="middle" fill={muted} fontSize="12">Jämför moment för moment.</text>
      </>}
      {art === "target" && <>
        {[88,60,32].map((r,i) => <circle key={r} cx="160" cy="115" r={r} fill={i === 2 ? "#a7f3d01c" : panel} stroke={i === 2 ? accent : line} strokeWidth="2" />)}
        <circle cx="160" cy="115" r="8" fill={accent} />
        <path d="M217 53l-52 56m40-57 13-1 1 14" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="58" y="219" width="204" height="31" rx="15.5" fill={panel} stroke={line} />
        <text x="160" y="240" textAnchor="middle" fill={accent} fontWeight="700" fontSize="13">Ditt nästa personbästa.</text>
      </>}
      {art === "practice" && <>
        <path d="M53 60v147" stroke={accent} strokeWidth="2" strokeDasharray="4 7" />
        {[["1","Välj ett fokus","Ett moment i taget."],["2","Öva med ett mål","Vet vad du vill förbättra."],["3","Testa igen","Se om träningen hjälper."]].map(([n,title,text],i) => <g key={n}>
          <rect x="23" y={24+i*77} width="274" height="65" rx="17" fill="#162b3b" stroke={line} />
          <circle cx="53" cy={56+i*77} r="17" fill={accent} />
          <text x="53" y={61+i*77} textAnchor="middle" fill="#0c1729" fontWeight="800" fontSize="14">{n}</text>
          <text x="83" y={51+i*77} fill="white" fontWeight="700" fontSize="14">{title}</text>
          <text x="83" y={70+i*77} fill={muted} fontSize="11">{text}</text>
        </g>)}
      </>}
      {art === "course" && <>
        <path d="M74 224C255 243 277 161 136 154S25 59 217 58" stroke="#1b594d" strokeWidth="57" strokeLinecap="round" />
        <path d="M74 224C255 243 277 161 136 154S25 59 217 58" stroke={accent} strokeWidth="2" strokeDasharray="4 8" />
        {[[74,224],[140,155],[217,58]].map(([x,y],i) => <g key={i}>
          <ellipse cx={x} cy={y} rx="13" ry="6" fill="#0c1729" />
          <path d={`M${x} ${y}v-40l26 9-26 9`} stroke="white" strokeWidth="2.5" strokeLinejoin="round" />
          <text x={x+36} y={y-23} fill={accent} fontSize="16" fontWeight="800">{i+1}</text>
        </g>)}
      </>}
      {art === "focus" && <>
        <polygon points="160,29 274,98 230,208 90,208 46,98" stroke={line} />
        <polygon points="160,56 247,108 213,192 107,192 73,108" stroke={line} />
        <polygon points="160,86 216,119 195,174 125,174 104,119" stroke={line} />
        <path d="M160 137V29m0 108 114-39m-114 39 70 71m-70-71-70 71m70-71L46 98" stroke={line} />
        <polygon points="160,48 252,106 180,157 104,193 84,111" fill={accent} fillOpacity=".18" stroke={accent} strokeWidth="3" />
        <circle cx="180" cy="157" r="6" fill="#fcd34d" />
        <path d="M180 165l23 59" stroke="#fcd34d" strokeDasharray="3 4" />
        <text x="14" y="245" fill={accent} fontSize="12" fontWeight="700">Dina styrkor</text>
        <text x="306" y="245" textAnchor="end" fill="#fcd34d" fontSize="12" fontWeight="700">Ditt nästa fokus</text>
      </>}
    </svg>
  );
}
