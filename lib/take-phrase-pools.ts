export type PhraseBuilder = (ctx: Record<string, string>) => string;

export const LEAD_EXACT: PhraseBuilder[] = [
  ({ names }) => `${names} called the scoreline exactly; expect smugness at volume.`,
  ({ names }) => `Full marks to ${names}, who will dine out on this for weeks.`,
  ({ names }) => `${names} got the numbers right, which is frankly showing off.`,
  ({ names }) => `Rare precision from ${names} today; the oracle act is getting old.`,
  ({ names }) => `${names} nailed it, three points and not a hint of modesty.`,
  ({ names }) => `Credit where due: ${names} saw the scoreline coming.`,
  ({ names }) => `${names} read the tea leaves correctly for once.`,
  ({ names }) => `An exact score for ${names}; unbearable, but fair.`,
  ({ names }) => `${names} picked with unnerving accuracy today.`,
  ({ names }) => `${names} delivered the perfect scoreline; celebrations pending.`,
  ({ names }) => `Top work from ${names}, who guessed what everyone else missed.`,
  ({ names }) => `${names} earns bragging rights until someone tops it.`,
];

export const LEAD_TOP: PhraseBuilder[] = [
  ({ name, pts }) => `${name} led on ${pts} points without finding the exact score.`,
  ({ name, pts }) => `No perfect picks, but ${name} topped the day with ${pts} points.`,
  ({ name }) => `${name} edged it on points, if not on precision.`,
  ({ name, pts }) => `${name} took ${pts} points; close, but not cinematic.`,
  ({ name }) => `${name} finished ahead, which counts for something.`,
  ({ name, pts }) => `${name} led the scoring at ${pts} points, narrowly.`,
  ({ name }) => `The day's winner, loosely defined: ${name}.`,
  ({ name, pts }) => `${name} banked ${pts} points; respectable, not heroic.`,
  ({ name }) => `${name} did enough to lead, which is the brief.`,
  ({ name }) => `Points to ${name}, though nobody wrote the script perfectly.`,
];

export const LEAD_BLANK: PhraseBuilder[] = [
  () => "Nobody covered themselves in glory; a collective shrug of a day.",
  () => "Thin returns all round, as if everyone guessed with their eyes shut.",
  () => "A day low on points and lower on credibility.",
  () => "The pool offered little today beyond shared disappointment.",
  () => "Not much to report except widespread wrongness.",
  () => "Confidence was abundant; accuracy rather less so.",
  () => "A forgettable day, which is almost a skill.",
  () => "The picks landed somewhere between hopeful and hopeless.",
  () => "Little to celebrate and even less to analyse.",
  () => "Everyone tried; almost nobody succeeded.",
];

export const MIDDLE_DEADLINE: PhraseBuilder[] = [
  ({ names }) => `${names} missed the deadline and inherited the auto 1-1.`,
  ({ names }) => `Kickoff surprised ${names}, who forgot to pick entirely.`,
  ({ names }) => `${names} treated the deadline as optional; half points followed.`,
  ({ names }) => `The system picked for ${names} after they failed to.`,
  ({ names }) => `${names} were bailed out by the default 1-1, barely.`,
  ({ names }) => `No pick from ${names}; the auto 1-1 did the work.`,
  ({ names }) => `${names} slept through the deadline, as tradition demands.`,
  ({ names }) => `${names} left it late, then left it altogether.`,
  ({ names }) => `Half credit for ${names}, full blame for lateness.`,
  ({ names }) => `${names} submitted nothing; the pool submitted 1-1 for them.`,
];

export const MIDDLE_DELIBERATE_11: PhraseBuilder[] = [
  ({ names }) => `${names} chose 1-1 on purpose; bold, or deeply cautious.`,
  ({ names }) => `A tactical 1-1 from ${names}, submitted on time at least.`,
  ({ names }) => `${names} played the 1-1 card; jury still out on genius.`,
  ({ names }) => `${names} went safe with a chosen 1-1.`,
  ({ names }) => `${names} backed the draw deliberately; make of that what you will.`,
  ({ names }) => `${names} picked 1-1 by design, not by accident.`,
  ({ names }) => `${names} went conservative with a deliberate 1-1.`,
  ({ names }) => `${names} opted for 1-1; strategy or exhaustion, hard to say.`,
];

export const MIDDLE_CLEAN: PhraseBuilder[] = [
  () => "Everyone got picks in before kickoff, which is the bare minimum.",
  () => "No missed deadlines; the drama stayed on the pitch, theoretically.",
  () => "All submissions were on time, lowering the excuse count.",
  () => "Discipline at the deadline; chaos in the predictions.",
  () => "The admin side was fine; the football intuition less so.",
  () => "At least everyone bothered to pick, which helps.",
  () => "No auto-defaults today, so the errors were entirely voluntary.",
  () => "Punctual picks all round; accuracy sold separately.",
];

export const CLOSE_ALL_ZERO: PhraseBuilder[] = [
  () => "Blank scoreboards everywhere; move on quickly.",
  () => "Not a point between them; almost artistic in its consistency.",
  () => "Zero all round, which is one way to keep it fair.",
  () => "Nobody scored; optimism took the day off too.",
  () => "A total wipeout, shared equally and painfully.",
  () => "The table stayed still because nothing landed.",
  () => "Empty returns across the board; bruised egos optional.",
  () => "A day of noble failure, if we're being generous.",
];

export const CLOSE_SOME_ZERO: PhraseBuilder[] = [
  ({ names }) => `${names} finished on zero, having backed it with confidence.`,
  ({ names }) => `Nothing for ${names} today, bar the memory.`,
  ({ names }) => `${names} left empty-handed after ambitious guessing.`,
  ({ names }) => `${names} got no reward for their trouble.`,
  ({ names }) => `${names} contributed enthusiasm, not points.`,
  ({ names }) => `${names} drew a blank, which happens to the keenest of us.`,
  ({ names }) => `${names} ended on nil; the chat will not be kind.`,
  ({ names }) => `${names} predicted boldly and collected nothing.`,
];

export const CLOSE_ALL_SCORED: PhraseBuilder[] = [
  () => "Points for everyone, which keeps the bickering civil.",
  () => "Something on the board all round; modest progress.",
  () => "No total disasters; a workable day all told.",
  () => "Everyone ate, if not lavishly.",
  () => "A spread of returns, none too embarrassing.",
  () => "The pool shared the spoils without anyone dominating.",
  () => "Respectable hauls all round; smugness evenly distributed.",
  () => "Not a wipeout; not a triumph either.",
];

export const EMPTY_DAY: PhraseBuilder[] = [
  () => "Quiet day in the pool, nothing to comment on.",
  () => "No action worth a monologue today.",
  () => "Even the banter stayed on the bench.",
  () => "A day off for punditry and predictions alike.",
  () => "Nothing happened; commentary likewise.",
  () => "The pool rested; so did the opinions.",
];
