const TEAM_FLAGS: Record<string, string> = {
  Argentina: "🇦🇷",
  Australia: "🇦🇺",
  Austria: "🇦🇹",
  Belgium: "🇧🇪",
  Bosnia: "🇧🇦",
  "Bosnia-Herzegovina": "🇧🇦",
  "Bosnia & Herzegovina": "🇧🇦",
  Brazil: "🇧🇷",
  Canada: "🇨🇦",
  "Cabo Verde": "🇨🇻",
  "Cape Verde": "🇨🇻",
  "Cape Verde Islands": "🇨🇻",
  Colombia: "🇨🇴",
  Croatia: "🇭🇷",
  Czechia: "🇨🇿",
  "Czech Republic": "🇨🇿",
  "DR Congo": "🇨🇩",
  "Congo DR": "🇨🇩",
  "Democratic Republic of the Congo": "🇨🇩",
  Denmark: "🇩🇰",
  Ecuador: "🇪🇨",
  Egypt: "🇪🇬",
  England: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  France: "🇫🇷",
  Germany: "🇩🇪",
  Ghana: "🇬🇭",
  Iran: "🇮🇷",
  Italy: "🇮🇹",
  Japan: "🇯🇵",
  Mexico: "🇲🇽",
  Morocco: "🇲🇦",
  Netherlands: "🇳🇱",
  "New Zealand": "🇳🇿",
  Norway: "🇳🇴",
  Poland: "🇵🇱",
  Portugal: "🇵🇹",
  Qatar: "🇶🇦",
  "Saudi Arabia": "🇸🇦",
  Senegal: "🇸🇳",
  Serbia: "🇷🇸",
  "South Korea": "🇰🇷",
  Spain: "🇪🇸",
  Switzerland: "🇨🇭",
  Tunisia: "🇹🇳",
  USA: "🇺🇸",
  Uruguay: "🇺🇾",
  Wales: "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
  "United States": "🇺🇸",
  "Korea Republic": "🇰🇷",
  "Korea DPR": "🇰🇵",
  Cameroon: "🇨🇲",
  "Costa Rica": "🇨🇷",
  Panama: "🇵🇦",
  Paraguay: "🇵🇾",
  Peru: "🇵🇪",
  Chile: "🇨🇱",
  Sweden: "🇸🇪",
  Ukraine: "🇺🇦",
  Turkey: "🇹🇷",
  Scotland: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "Côte d'Ivoire": "🇨🇮",
  "Ivory Coast": "🇨🇮",
  Algeria: "🇩🇿",
  Nigeria: "🇳🇬",
  "South Africa": "🇿🇦",
  Jamaica: "🇯🇲",
  Haiti: "🇭🇹",
  Curacao: "🇨🇼",
  Curaçao: "🇨🇼",
};

export function getTeamFlag(teamName: string): string {
  return TEAM_FLAGS[teamName] ?? "🏳️";
}

export function formatTeam(teamName: string): string {
  return `${getTeamFlag(teamName)} ${teamName}`;
}

export function getUniqueTeamsFromMatches(
  matches: { home_team: string; away_team: string }[]
): string[] {
  const teams = new Set<string>();
  for (const match of matches) {
    teams.add(match.home_team);
    teams.add(match.away_team);
  }
  return Array.from(teams).sort();
}

export const STAGE_LABELS: Record<string, string> = {
  group: "Group Stage",
  r32: "Round of 32",
  r16: "Round of 16",
  qf: "Quarter-finals",
  sf: "Semi-finals",
  final: "Final",
};

