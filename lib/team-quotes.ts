const TEAM_QUOTES: Record<string, string> = {
  "United States":
    "They host the tournament. They built the stadiums. They sold the television rights. And yet — when the ball moves, something in their eyes says they are still not entirely sure why it cannot be picked up with the hands.",
  Mexico:
    "Seven times they have reached the same door. Seven times they have stood before it, knocked politely, and gone home. This door — it does not owe them anything.",
  Canada:
    "A country so vast, so cold, so full of ice — and yet they cannot qualify without being invited. Perhaps the ice is the problem. Perhaps it is something else.",
  Japan:
    "The Japanese play football the way a watchmaker makes a watch — every piece in its place, every movement considered. But a watch, no matter how beautiful, does not score goals on its own.",
  Iran:
    "They have qualified six times and not once escaped the group stage. There is a word for this kind of devotion. I think the word is suffering. But they keep coming back. That is something.",
  "South Korea":
    "In 2002 they defeated Spain, Italy, Germany on their own soil. The Europeans said it was impossible. The Koreans had not been told it was impossible. This is a tremendous advantage.",
  Australia:
    "Australia is a continent that decided one day to take football seriously. They are still in the middle of that decision. Respect the process. It is a very large continent.",
  "Saudi Arabia":
    "They beat Argentina. The greatest team on earth. They beat them. And then they went home in the group stage anyway. Life is not always a logical thing.",
  Qatar:
    "They hosted the World Cup. They spent more money than any nation in history. They were eliminated before the paint on the dressing room walls was dry. Money does not buy desire.",
  Uzbekistan:
    "For the first time, they arrive. Nobody expected them. This is exactly when the unexpected becomes inevitable. Welcome to the theatre.",
  Jordan:
    "A nation that has never been here before, drawn into a group with the wolves. And yet — the lamb who is not afraid of the wolf has already won something.",
  Iraq:
    "They last appeared forty years ago and were beaten three times. Since then, they have had other things on their mind. Their return deserves not a cheer but a bow.",
  Argentina:
    "Three times they have lifted the cup. And still — the morning after a defeat, you will find an Argentine man in a café, staring at his coffee, certain that God has made a mistake.",
  Brazil:
    "Five titles. The most beautiful football ever conceived by human beings. And yet in 2014, in their own home, Germany did something to them that we do not speak of. Some wounds heal. Some become paintings.",
  Uruguay:
    "A country of three million people with two World Cup titles. They defend as though their lives depend on it — because to them, they do. Never underestimate a small man who has already won.",
  Colombia:
    "James Rodríguez emerged from their 2014 campaign like a poem nobody had written yet. Colombia is always three beautiful passes away from greatness. Sometimes they take those passes. Sometimes they take a different road entirely.",
  Ecuador:
    "They opened a World Cup by beating the host nation and the crowd fell silent. Ecuador did not fall silent. Ecuador simply continued playing. This is dignity.",
  Paraguay:
    "They returned after eight years away. Nobody celebrates Paraguay. But nobody enjoys playing against Paraguay. These two facts are connected.",
  "New Zealand":
    "They have never lost a group stage match. They have also never won one. They draw. They draw beautifully, persistently, philosophically. New Zealand has made peace with the draw in a way the rest of the world has not.",
  Morocco:
    "In 2022, they walked to the semi-finals and the whole of Africa walked with them. Their supporters did not watch the matches — they experienced them, like a storm experiences itself.",
  Senegal:
    "They beat France in France's own tournament. In the opening game. They did not apologise. Why would they? The lion does not apologise to the gazelle for being a lion.",
  Egypt:
    "They have one player who carries the weight of ninety million people on his left foot. This is too much weight for one foot. And yet the foot does not complain.",
  Algeria:
    "Algeria are the team everyone forgets — until Algeria remind them. This is a dangerous kind of team. This is perhaps the best kind of team.",
  Tunisia:
    "Six World Cups. Not once beyond the group stage. And yet — they qualify again. They come back. There is no word for this in French. In Arabic, I am told, there are seventeen.",
  "South Africa":
    "They hosted the world and were eliminated by the world. The vuvuzela filled every silence. Silence, after all, is where doubt lives — and South Africa refused to let doubt live.",
  Nigeria:
    "The Super Eagles. Always magnificent in the sky, always somehow surprised when they must land. They will land here too. But those moments in the sky — they are worth everything.",
  Ghana:
    "A man from Uruguay once used his hand to stop a goal that would have changed history. Ghana remembers. History remembers. The hand is gone. The memory is not.",
  Cameroon:
    "In 1990, Roger Milla danced by the corner flag and the whole world laughed with joy. Africa had arrived. Cameroon carried that arrival on their back for thirty years. The back is tired. But it is still there.",
  "Ivory Coast":
    "The greatest African generation of players in history — and not one continental trophy to show for it. God, when he made Didier Drogba, forgot to make a team worthy of him. This is God's fault, not Drogba's.",
  Mali:
    "Mali produces players of extraordinary quality who then play for France, for other nations, for everyone except Mali. Mali is the world's most generous football academy. They have not yet been thanked properly.",
  Mozambique:
    "For the first time. A country that has known hardship arriving at the greatest celebration in sport. You do not cheer for Mozambique because they are likely to win. You cheer for them because they are here.",
  "Cape Verde":
    "An island. A volcanic, windswept, beautiful island. And they are here. Sometimes the ocean does not stop you. Sometimes the ocean is the reason you are ready.",
  "DR Congo":
    "The most talented country in Africa that the world has not yet decided to take seriously. They produce players of extraordinary gifts — and then those players go to France, to Belgium, to everywhere else. One day Congo will keep them. On that day, something will shift. The shift has not happened yet. But it is coming. You can feel it the way you feel rain before the rain arrives.",
  France:
    "The number one team in the world. And still — there is a shadow behind the eyes of every French supporter. They have been number one before. They know what number one means. It means nothing until the final whistle of the final game.",
  Spain:
    "They invented a way of playing that made the ball disappear. The opposition chased it like children chasing a butterfly. The butterfly was always somewhere else. Spain is always somewhere else.",
  Germany:
    "In 2014, in Belo Horizonte, they scored seven goals against Brazil before Brazil had finished weeping for the first. Then in 2018, in Russia, karma arrived wearing German colours and Germany went home in the group stage. Football has a memory.",
  Portugal:
    "For twenty years, one man has carried Portugal on his back. The back has not broken. The legs have not stopped. But time is a defender who never receives a yellow card.",
  Netherlands:
    "Three times a finalist. Zero times a champion. The Dutch invented total football — a system of such beauty, such intelligence, that it occasionally forgets to win. This is the tragedy of the intellectual.",
  Belgium:
    "The golden generation. A phrase that, like all golden things, is most beautiful when it is already gone. Belgium polished their gold for a decade. They are still polishing it. The gold is now mostly bronze.",
  Denmark:
    "In 1992, they were on holiday when someone called and said: come, you are in the tournament. They came. They won. This is the most Danish story ever told.",
  Croatia:
    "Four million people. A World Cup final. A semi-final. A midfield that plays as though they have been playing together since birth — because, in a country that small, perhaps they have.",
  Switzerland:
    "Switzerland has qualified for every World Cup since 2006. Switzerland has never gone beyond the quarter-finals. Switzerland is a country of precision instruments and imprecise ambitions. This is endearing. This is also slightly maddening.",
  Serbia:
    "A nation of passion so intense it occasionally becomes its own opponent. Serbia will play three games here with the fury of a team that believes it deserves to win everything. They may be right. They may also be eliminated in the group stage. Both are possible simultaneously.",
  Austria:
    "They are always almost Austria. The almost is important. It is what makes them interesting. A team that has fully arrived is merely competent. A team that is almost there — that team still has a story to tell.",
  Sweden:
    "Italy — a nation of four World Cup titles — failed to qualify. Sweden — a nation of none — did. Perhaps this tells us something about Italy. Perhaps it tells us something about Sweden. Perhaps it tells us that football is anarchist at heart.",
  Ukraine:
    "They qualified while their cities were being bombed. Their training grounds were interrupted by things that are not football. And still they qualified. Do not speak to Ukraine about pressure. They know what pressure is.",
  "Czech Republic":
    "Czechoslovakia reached two World Cup finals. The Czech Republic carries this history like an elegant coat — worn with pride, slightly too large, belonging to someone who no longer exists.",
  Romania:
    "In 1994 they had a man called Hagi who played as though football had been designed specifically for him. It had been. Now his son plays. The story continues. Whether the story improves — this is the question.",
  England:
    "1966. A trophy. On home soil. Sixty years of conversation about one afternoon. England is a country that confused a beginning for an ending. The conversation goes on. The trophy does not.",
  "Bosnia & Herzegovina":
    "They eliminated Italy from the playoffs and no one outside Bosnia and Herzegovina believes this was entirely fair. Everyone inside Bosnia and Herzegovina knows it was entirely deserved. Both things are true.",
  Panama:
    "Felipe Baloy scored against England in their first World Cup game and celebrated as though he had won the tournament, the league, and also some kind of lifetime achievement award. They lost 6-1. The celebration was still correct. It will always be correct.",
  Haiti:
    "In 1974, a Haitian player scored against Italy. The story has been told in Port-au-Prince every day since. Fifty years later, they are back. The story needed a sequel.",
  Curaçao:
    "One hundred and fifty thousand people on an island in the Caribbean. And they are here. The ocean is not a wall. The ocean is a corridor. Curaçao walked the corridor.",
  Norway:
    "They have Haaland. A man who scores goals the way other men breathe — without thinking, without stopping, without mercy. And still Norway is not here. This is not a football problem. This is a philosophical problem. Perhaps even a spiritual one.",
  Poland:
    "Lewandowski carried them on his back for fifteen years. He scored every goal that could be scored. And still, in the end, Sweden knocked them out with a goal in the eighty-eighth minute. The great man deserved better. The great man always deserves better. This is the condition of greatness.",
  Wales:
    "For sixty-four years they did not qualify. Then they qualified twice in a row. Then they did not qualify again. Wales is a poem that keeps changing its ending. The poem is beautiful. The ending is still being written.",
  "Costa Rica":
    "In 2014 they reached the quarter-finals and nobody — nobody — had predicted this. They looked at the bracket and saw giants. The giants looked back and saw Costa Rica. Only one of these groups of people was afraid.",
  Peru:
    "They waited thirty-six years between World Cups. Thirty-six years. And when they finally returned in 2018, they lost all three games. The wait, it seems, was for something that had not yet arrived. They are still waiting. The waiting is not over.",
  Scotland:
    "Scotland has qualified for eight World Cups and not once made it past the group stage. Not once. They arrive every time with the certainty of a man who has never read the ending of this particular book. Every time, they reach the last page. Every time, they are surprised.",
  Jamaica:
    "The Reggae Boyz arrived at France '98 and the world smiled. Not condescendingly — genuinely. Here was a team that played with a joy that the serious teams had forgotten was allowed. They lost every game. The joy remained. Joy is more durable than results.",
  Turkey:
    "In 2002 they finished third. Nobody remembers this. Not even Turkey, it seems. A nation that reached the podium of the world and then spent twenty years arguing about who deserved the credit. The podium is still there. Turkey is not.",
  Chile:
    "They won two consecutive Copa Américas and did not qualify for the 2018 World Cup. Then they did not qualify for 2022. Then they did not qualify for 2026. The Copa América is a beautiful trophy. It is not the World Cup. Chile knows this now.",
};

const TEAM_QUOTE_ALIASES: Record<string, string> = {
  USA: "United States",
  Curacao: "Curaçao",
  "Cabo Verde": "Cape Verde",
  "Cape Verde Islands": "Cape Verde",
  Bosnia: "Bosnia & Herzegovina",
  "Bosnia-Herzegovina": "Bosnia & Herzegovina",
  Czechia: "Czech Republic",
  "Congo DR": "DR Congo",
  "Democratic Republic of the Congo": "DR Congo",
  "Korea Republic": "South Korea",
  "Côte d'Ivoire": "Ivory Coast",
};

export function getTeamQuote(teamName: string): string | undefined {
  return TEAM_QUOTES[teamName] ?? TEAM_QUOTES[TEAM_QUOTE_ALIASES[teamName] ?? ""];
}
