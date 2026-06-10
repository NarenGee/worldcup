const HAIRCUT_FILES = [
  "Alexi-Lalas-of-USA-poses-before-the-1994-FIFA-World-Cup.avif",
  "Asamoah-Gyan-celebrates-scoring-for-Ghana-against-Germany-at-the-Estadio-Castelao-in-Fortaleza-in-Group-G-of-the-2014-FIFA-World-Cup-Brazil.avif",
  "Carlos-Valderrama-in-action-for-Colombia-against-Cameroon-at-the-Stadio-San-Paolo-in-Naples-in-the-last-16-of-the-1990-FIFA-World-Cup-Italy.avif",
  "Chris-Waddle-lines-up-before-England-play-Belgium-at-the-Stadio-Renato-Dall-Ara-in-Bologna-in-the-last-16-of-the-1990-FIFA-World-Cup-Italy.avif",
  "Christian-Ziege-in-action-for-Germany-at-the-2002-FIFA-World-Cup-Korea-Japan.avif",
  "Clint-Mathis-lines-up-for-USA-against-Korea-Republic-in-Daegu-in-Group-D-of-the-2002-FIFA-World-Cup-Korea-Japan.avif",
  "Kazuyuki-Toda-in-action-for-Japan-against-Tunisia-in-Osaka-in-Group-H-of-the-2002-FIFA-World-Cup-Korea-Japan.avif",
  "Leonardo-Cuellar-lines-up-for-Mexico-at-the-1978-FIFA-World-Cup-Argentina.avif",
  "Neymar-in-action-for-Brazil-Against-Switzerland-in-Rostov-on-Don-in-Group-E-of-the-2018-FIFA-World-Cup-Russia.avif",
  "Nico-Williams-of-Spain-poses-before-the-FIFA-World-Cup-Qatar-2022.avif",
  "Roberto-Baggio-in-action-for-Italy-at-the-1994-FIFA-World-Cup-USA.avif",
  "Rodrigo-Palacio-in-action-for-Argentina-against-IR-Iran-at-the-Estadio-Mineirao-in-Belo-Horizonte-in-Group-F-of-the-2014-FIFA-World-Cup-Brazil.avif",
  "Romania-line-up-before-playing-Tunisia-at-the-Stade-de-France-in-Saint-Denis-in-Group-G-of-the-1998-FIFA-World-Cup-France.avif",
  "Ronaldo-of-Brazil-in-action-against-Turkey-in-2002.avif",
  "Taribo-West-in-action-for-Nigeria-against-Bulgaria-at-the-Parc-des-Princes-in-Paris-in-Group-D-of-the-1998-FIFA-World-Cup-France.avif",
  "Trifon-Ivanov-lines-up-before-a-Bulgaria-game-at-the-1994-FIFA-World-Cup-USA.avif",
  "Umit-Davala-in-action-for-Turkiye-at-the-2002-FIFA-World-Cup-Korea-Japan.avif",
  "Uruguay-goalkeeper-Sebastian-Sosa-poses-before-the-FIFA-World-Cup-Qatar-2022.avif",
  "Weston-McKennie-in-action-for-USA-at-the-FIFA-World-Cup-Qatar-2022.avif",
] as const;

function slideLabel(filename: string): string {
  const base = filename.replace(/\.avif$/, "");
  const match = base.match(
    /^(.+?)(?:-(?:of|in-action|lines-up|celebrates|poses|goalkeeper))/i
  );
  if (match) return match[1].replace(/-/g, " ");
  return base.split("-").slice(0, 2).join(" ");
}

export type HaircutSlide = {
  src: string;
  alt: string;
  label: string;
};

export const HAIRCUT_SLIDES: HaircutSlide[] = HAIRCUT_FILES.map((file) => {
  const label = slideLabel(file);
  return {
    src: `/assets/haircuts/${file}`,
    alt: `${label} — iconic World Cup haircut`,
    label,
  };
});
