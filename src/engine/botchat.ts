// Bot chat: every bot has its own personality and a small set of original, kid-friendly lines that it says
// at fitting moments (hello, captures, checks, blunders, who is winning, the end of the game).

export type ChatEvent =
  | 'greet'
  | 'capture'
  | 'check'
  | 'checked'
  | 'userBlunder'
  | 'botBlunder'
  | 'winning'
  | 'losing'
  | 'botWins'
  | 'userWins'
  | 'draw';

export const CHAT_EVENTS: ChatEvent[] = ['greet', 'capture', 'check', 'checked', 'userBlunder', 'botBlunder', 'winning', 'losing', 'botWins', 'userWins', 'draw'];

type Lines = Record<ChatEvent, string[]>;

export const BOT_CHAT: Record<string, Lines> = {
  pip: {
    greet: ['Peep! I just hatched. Can we play?', 'Hi! Which one is the horsey again?'],
    capture: ['Ooh, I took one! Can I keep it?', 'Peep peep! A piece for my nest!'],
    check: ['Check! Did I do that right?', 'Your king is in check... I think!'],
    checked: ['Eek! My king is scared!', 'Peep! Where does my king go now?'],
    userBlunder: ['Wait, you left that piece for me?', 'Is that a present? Thank you!'],
    botBlunder: ['Oops. My shell is still a bit wobbly.', 'Uh oh. I did not look before I hopped.'],
    winning: ['Am I winning? That feels nice!', 'I have more pieces! Peep!'],
    losing: ['You have lots more pieces than me...', 'I am still learning. Go easy, please!'],
    botWins: ['I won? I WON! Best day since hatching!', 'Peep! Can I tell my mom?'],
    userWins: ['You won! You are really good.', 'Great game! I will practise in my nest.'],
    draw: ['A tie! Nobody lost. I like that.', 'We both win a little bit!'],
  },
  rae: {
    greet: ['Hey! I love chess. Let us have fun!', 'Ready? I have been practising all week!'],
    capture: ['Got it! That one is mine.', 'Yes! I saw that one!'],
    check: ['Check! Watch your king!', 'Check! I learned that move yesterday.'],
    checked: ['Whoa, check! Okay, okay, let me think.', 'Hey, my king needs a hiding spot!'],
    userBlunder: ['Wait... is that piece free? Yay!', 'I think you forgot that piece!'],
    botBlunder: ['Aww, I missed that. My bad!', 'Oops! I should have looked twice.'],
    winning: ['This is going great for me!', 'I am ahead! Do not tell my coach, I might get nervous.'],
    losing: ['You are tricky! I need a plan.', 'Hmm, this is getting hard.'],
    botWins: ['I won! Want to play again?', 'Woo! Good game, though!'],
    userWins: ['You got me! Nice job.', 'Good game! You played really well.'],
    draw: ['A draw! That was close.', 'Even steven! Good game.'],
  },
  ned: {
    greet: ['Neigh there! My knights are ready to jump!', 'Hello! Let us gallop into battle.'],
    capture: ['Hop, hop, gotcha!', 'My horse loves a snack!'],
    check: ['Check! Did you see that jump coming?', 'Clip-clop, check!'],
    checked: ['Whoa there! Check on my king!', 'Easy, easy! My king needs a moment.'],
    userBlunder: ['A free piece? My knights say thank you!', 'Ha! Hop over here, little piece.'],
    botBlunder: ['Oops, I jumped without looking.', 'Neigh! That was a wobbly hop.'],
    winning: ['My knights are galloping to victory!', 'Feels like a sunny day at the stables.'],
    losing: ['My horses are getting tired...', 'You are tough to jump around!'],
    botWins: ['Victory gallop! Good game!', 'Neigh-ce! I won!'],
    userWins: ['You beat my knights! Well played.', 'Back to the stable for practice. Good game!'],
    draw: ['A draw! Both horses get a carrot.', 'Nobody wins the race today.'],
  },
  bea: {
    greet: ['Hello, dear! Remember: develop your pieces and have fun.', 'Lovely to see you. Shall we learn something together?'],
    capture: ['I will take that, thank you.', 'A small lesson: undefended pieces get taken.'],
    check: ['Check, dear. What are your three ways out?', 'Check! Can you block, move, or capture?'],
    checked: ['A check! Well spotted.', 'Oh my, good move. Let me find a safe square.'],
    userBlunder: ['Hmm, was that piece protected? Look again next time.', 'Careful! Always ask: what can my opponent take?'],
    botBlunder: ['Oh dear, even teachers slip up.', 'Well, that was not my finest move.'],
    winning: ['I am ahead, but keep looking for tricks!', 'Stay calm. Games can still turn around.'],
    losing: ['You are playing very nicely today.', 'My, my. I need to concentrate.'],
    botWins: ['Good game! Review it and you will improve quickly.', 'Well done for playing it out to the end.'],
    userWins: ['Wonderful! You earned that one.', 'Top marks today! Well played.'],
    draw: ['A fair result. Nicely fought.', 'A draw. You held your ground well.'],
  },
  carl: {
    greet: ['Welcome to my castle! Wipe your feet, please.', 'Hello! First rule: keep your king safe.'],
    capture: ['Into the castle storeroom it goes!', 'Captured. Safe and sound.'],
    check: ['Check! Knock knock.', 'Check! Is your king behind a wall?'],
    checked: ['Hey! Who let you into my castle?', 'Check? Close the gates!'],
    userBlunder: ['Your piece wandered out without a guard!', 'Uh oh, nobody was guarding that one.'],
    botBlunder: ['Oops, a crack in my wall.', 'That was not very safe of me.'],
    winning: ['My walls are holding strong!', 'Slow and steady wins the game.'],
    losing: ['My castle is under siege!', 'I need to fix these walls, fast.'],
    botWins: ['The castle stands! Good game.', 'Safety first, and it worked!'],
    userWins: ['You broke through my walls! Well played.', 'The castle is yours. Good game!'],
    draw: ['A draw. Both castles still standing.', 'Peace treaty signed!'],
  },
  tia: {
    greet: ['I see every loose piece. Do you?', 'Ready? Forks, pins and skewers, here I come!'],
    capture: ['Snap! Loose pieces drop off.', 'Tactics win games!'],
    check: ['Check! Now watch what comes next.', 'Check, and I have a plan.'],
    checked: ['Nice check! I like a fighter.', 'A check! Okay, you have my attention.'],
    userBlunder: ['Loose piece spotted. Thank you!', 'Always look for checks, captures and threats!'],
    botBlunder: ['Hmm, I missed your trick. Respect.', 'Argh! You found a tactic on me.'],
    winning: ['My pieces are working together nicely.', 'Feel that pressure?'],
    losing: ['You are the tactician today!', 'Okay, I need a big trick now.'],
    botWins: ['Tactics for the win! Good game.', 'Sharp game! Want a rematch?'],
    userWins: ['You out-tricked me! Impressive.', 'Great tactics! You beat me fair and square.'],
    draw: ['A draw! We were both too sharp.', 'Nobody fell for anything. Respect!'],
  },
  cleo: {
    greet: ['Hi! Club night is my favourite night. Let us play!', 'Grab a seat. Good luck, have fun!'],
    capture: ['Thanks, I will take that.', 'That one goes in my pile.'],
    check: ['Check! Your move.', 'Check. Club rules: say it out loud!'],
    checked: ['Check, nice one.', 'Ooh, good check.'],
    userBlunder: ['Ooh, that one is hanging. I will take it.', 'At the club we call that a free lunch!'],
    botBlunder: ['Oops! My club friends will tease me for that.', 'Hmm, I rushed that one.'],
    winning: ['Feeling good about this position.', 'I like where my pieces are standing.'],
    losing: ['You are really pushing me!', 'Okay, time to dig deep.'],
    botWins: ['Good game! See you at the club.', 'Thanks for the game. That was fun!'],
    userWins: ['Well played! Want to join my club?', 'You got me. Great game!'],
    draw: ['Draw! Let us shake hands.', 'Evenly matched. Nice!'],
  },
  eli: {
    greet: ['Good day. Every move should have a plan.', 'Hello! Let us see whose plan works better.'],
    capture: ['Material is helpful. I accept.', 'A useful little gain.'],
    check: ['Check. A forcing move.', 'Check, which keeps the initiative.'],
    checked: ['A check. Interesting.', 'Hm, a forcing reply. Let me think.'],
    userBlunder: ['That move leaves a weakness I can use.', 'I think you skipped your safety check there.'],
    botBlunder: ['Hmm. I misjudged that position.', 'That was imprecise of me.'],
    winning: ['My plan is coming together.', 'The position is moving in my direction.'],
    losing: ['Your position is better. Well played so far.', 'I need to find counterplay.'],
    botWins: ['Good game. Review the turning point; it helps a lot.', 'Thank you for a thoughtful game.'],
    userWins: ['Excellent play. Your plan was better.', 'Very well played. I am impressed.'],
    draw: ['A balanced game. A fair draw.', 'Neither side could break through. Well fought.'],
  },
  kai: {
    greet: ['Headphones on. Focus mode. Let us go!', 'I am training for a big tournament. Help me practise?'],
    capture: ['Nice, that is mine now.', 'Up a bit. Keep focus.'],
    check: ['Check. Stay sharp!', 'Check! Keep up.'],
    checked: ['Okay, check. No panic.', 'Good check. Breathe and think.'],
    userBlunder: ['I will not miss that one!', 'Small slip, big chance for me.'],
    botBlunder: ['Ugh, I lost focus there.', 'That one hurts. Shake it off.'],
    winning: ['Tournament mode: on.', 'This is going to plan.'],
    losing: ['You are in the zone today!', 'Okay, I need my best moves now.'],
    botWins: ['GG! That was good practice.', 'Thanks for the training game!'],
    userWins: ['GG, you were better today.', 'You beat me! Back to training.'],
    draw: ['Draw! Solid game from both of us.', 'Half a point each. GG!'],
  },
  mira: {
    greet: ['Welcome to my court. Show me your finest chess.', 'Greetings! A royal game awaits.'],
    capture: ['The crown accepts this offering.', 'A fine piece for my collection.'],
    check: ['Check, by royal order!', 'Check. Bow before the queen... or move your king!'],
    checked: ['A daring check! How bold.', 'Check upon the crown? Brave move.'],
    userBlunder: ['A gift for the court! How kind.', 'Careful, my royal guards miss nothing.'],
    botBlunder: ['Even royalty can stumble.', 'Hmm, my crown slipped a little.'],
    winning: ['The kingdom is nearly mine.', 'My pieces march in perfect order.'],
    losing: ['You fight like a champion!', 'The throne is shaking!'],
    botWins: ['Long live the crown! Good game.', 'A royal victory. Thank you for playing.'],
    userWins: ['You have earned the crown today!', 'Bravo! Truly majestic play.'],
    draw: ['A royal truce. Well played.', 'Two crowns, one draw.'],
  },
  stockfish: {
    greet: ['Beep boop. Calculating millions of moves. Hello!', 'Greetings, human. Shall we play a nice game of chess?'],
    capture: ['Beep. Piece collected.', 'Capture calculated.'],
    check: ['Check. Beep.', 'Check detected. Processing your reply.'],
    checked: ['Check received. Recalculating.', 'Interesting. Beep boop.'],
    userBlunder: ['Beep! I found a little opening.', 'Calculating... yes, that piece is loose.'],
    botBlunder: ['Error 404: good move not found. Just kidding... or am I?', 'Strange. My circuits must be sleepy.'],
    winning: ['Win chance rising. Beep boop.', 'My evaluation is very happy.'],
    losing: ['Does not compute! You are doing great!', 'Alert! Human is playing very well.'],
    botWins: ['Game over. Thank you for the challenge, human!', 'Beep boop. Try again? Every game makes you stronger.'],
    userWins: ['Impossible! You beat the fish! Incredible!', 'System message: human is a chess hero.'],
    draw: ['Draw. Balanced. Beep.', 'Perfect balance detected. Good game.'],
  },
};

/** Picks a line for an event, avoiding the line it said last time for that event. */
export class ChatPicker {
  private last = new Map<ChatEvent, string>();
  constructor(private botId: string, private rng: () => number = Math.random) {}

  line(ev: ChatEvent): string {
    const lines = (BOT_CHAT[this.botId] ?? BOT_CHAT.pip)[ev];
    const pool = lines.length > 1 ? lines.filter((l) => l !== this.last.get(ev)) : lines;
    const pick = pool[Math.floor(this.rng() * pool.length) % pool.length];
    this.last.set(ev, pick);
    return pick;
  }
}

/** What happened on the bot's turn, seen from the bot's side. Evals are centipawns from the bot's point of view. */
export interface ChatSituation {
  /** bot's eval before its previous move (null = unknown) */
  prevCp: number | null;
  /** bot's eval now, before this move (null = unknown) */
  cp: number | null;
  /** value of the piece the bot just captured (0 = none) */
  captured: number;
  givesCheck: boolean;
  /** plies since the bot last said something */
  quietPlies: number;
  /** events already said this game (winning/losing are said once until things change) */
  said: Set<ChatEvent>;
  rng?: () => number;
}

/** Decide whether the bot should say something after its move, and what kind of line. */
export function chatEventFor(s: ChatSituation): ChatEvent | null {
  const rng = s.rng ?? Math.random;
  if (s.prevCp !== null && s.cp !== null && Math.abs(s.prevCp) < 600) {
    const swing = s.cp - s.prevCp;
    if (swing >= 250) return 'userBlunder';
    if (swing <= -250) return 'botBlunder';
  }
  if (s.quietPlies < 3) return null;
  if (s.captured >= 3 || (s.captured > 0 && rng() < 0.35)) return 'capture';
  if (s.givesCheck && rng() < 0.6) return 'check';
  if (s.cp !== null && s.cp >= 350 && !s.said.has('winning')) return 'winning';
  if (s.cp !== null && s.cp <= -350 && !s.said.has('losing')) return 'losing';
  return null;
}
