export type Lang = "ar" | "en";

/**
 * Every user-facing string in the app, keyed once and provided in both
 * languages. `{param}` placeholders are substituted by `t()` in
 * `useTranslation.ts` — e.g. `t("playing.opponentTurn", { name })`.
 *
 * Keep this the single source of truth: a component should never contain
 * a hardcoded Arabic or English string for anything the player sees.
 */
export const TRANSLATIONS = {
  common: {
    cancel: { ar: "إلغاء", en: "Cancel" },
    characterAriaPrefix: { ar: "الشخصية", en: "Character" },
    eliminatedSuffix: { ar: "(مستبعدة)", en: "(eliminated)" },
    lockedSuffix: { ar: "(لا يمكن التراجع)", en: "(can't undo)" },
    retry: { ar: "🔄 إعادة الاتصال", en: "🔄 Retry connection" },
    backToHome: { ar: "🏠 الرئيسية", en: "🏠 Home" },
    join: { ar: "انضمام للعبة", en: "Join Game" },
    you: { ar: "أنت", en: "You" },
    friend: { ar: "صديقك", en: "your friend" },
  },
  nameInput: {
    label: { ar: "اسمك", en: "Your name" },
    placeholder: { ar: "اكتب اسمك هنا", en: "Type your name" },
  },
  defaultNames: {
    ar: ["اللاعب الأول", "اللاعب المميز", "البطل الغامض", "صائد الشخصيات"],
    en: ["Player One", "The Star Player", "Mystery Hero", "Character Hunter"],
  },
  home: {
    title: { ar: "خمّن شخصيتي", en: "Guess Who" },
    subtitle: {
      ar: "لعبة تخمين بين شخصين على نفس شبكة الواي فاي. اختر شخصية سرية واسأل أسئلة لتكتشف شخصية صديقك أولًا.",
      en: "A two-player guessing game on the same Wi-Fi. Pick a secret character and ask questions to find your friend's first.",
    },
    startGame: { ar: "🎮 ابدأ لعبة", en: "🎮 Start Game" },
    haveInviteLink: { ar: "لدي رابط دعوة", en: "I have an invite link" },
    pasteLinkLabel: { ar: "الصق رابط الدعوة هنا", en: "Paste the invite link here" },
    invalidLink: {
      ar: "الرابط غير صالح، تأكد من نسخ رابط الدعوة كاملًا.",
      en: "That link doesn't look right — make sure you copied the whole invite link.",
    },
  },
  join: {
    title: { ar: "انضمام إلى اللعبة", en: "Join the Game" },
    subtitle: {
      ar: "صديقك بانتظارك! اضغط للانضمام مباشرة، لا حاجة لأي إعدادات.",
      en: "Your friend is waiting! Tap to join instantly — no setup needed.",
    },
  },
  lobby: {
    shareTitle: { ar: "شارك اللعبة مع صديقك", en: "Share the game with your friend" },
    shareSubtitle: {
      ar: "أرسل رابط الدعوة لصديقك ليتمكن من الانضمام إليك مباشرة.",
      en: "Send the invite link to your friend so they can join you directly.",
    },
    shareButton: { ar: "📤 مشاركة اللعبة", en: "📤 Share Game" },
    shareText: { ar: "انضم إلي في لعبة تخمين الشخصيات!", en: "Join me for a character guessing game!" },
    linkCopied: { ar: "✓ تم نسخ الرابط", en: "✓ Link copied" },
    waitingForPlayer: { ar: "في انتظار اللاعب الآخر...", en: "Waiting for the other player..." },
    connectingTitle: { ar: "جاري الاتصال بصديقك...", en: "Connecting to your friend..." },
    connectingSubtitle: {
      ar: "لحظات ويبدأ الاتصال المباشر بينكما.",
      en: "One moment — your direct connection is starting.",
    },
  },
  connected: {
    connected: { ar: "✓ تم الاتصال", en: "✓ Connected" },
    editName: { ar: "تعديل اسمك", en: "Edit your name" },
    chooseDifficulty: { ar: "اختر مستوى الصعوبة (عدد الشخصيات)", en: "Choose a difficulty (number of characters)" },
    hostChoseDifficulty: { ar: "مستوى الصعوبة الذي اختاره المضيف", en: "Difficulty chosen by the host" },
    charactersCount: { ar: "{count} شخصية", en: "{count} characters" },
    friendReady: { ar: "صديقك جاهز وينتظرك!", en: "Your friend is ready and waiting!" },
    waitingForFriendReady: { ar: "بانتظار استعداد صديقك...", en: "Waiting for your friend to get ready..." },
    waitingForFriend: { ar: "بانتظار صديقك...", en: "Waiting for your friend..." },
    startPlaying: { ar: "ابدأ اللعب", en: "Start Playing" },
  },
  difficulty: {
    easy: { ar: "سهل", en: "Easy" },
    medium: { ar: "متوسط", en: "Medium" },
    hard: { ar: "صعب", en: "Hard" },
  },
  select: {
    selectedTitle: { ar: "تم اختيار شخصيتك السرية!", en: "Your secret character is set!" },
    gameStarting: { ar: "جاري بدء اللعبة...", en: "Starting the game..." },
    waitingForFriendPick: { ar: "بانتظار اختيار {name}...", en: "Waiting for {name} to pick..." },
    preparing: { ar: "جاري تحضير الشخصيات...", en: "Preparing the characters..." },
    chooseTitle: { ar: "اختر شخصيتك السرية", en: "Choose your secret character" },
    chooseSubtitle: {
      ar: "صديقك سيحاول تخمينها بالأسئلة، لن يراها أبدًا",
      en: "Your friend will try to guess it with questions — they'll never see it",
    },
    confirm: { ar: "تأكيد الاختيار", en: "Confirm Selection" },
  },
  playing: {
    mySecretLabel: { ar: "شخصيتك:", en: "Your character:" },
    yourTurn: { ar: "دورك", en: "Your turn" },
    opponentTurn: { ar: "دور {name}", en: "{name}'s turn" },
    instructionMyTurn: {
      ar: 'اسأل صديقك سؤالك بصوتك، وبعد ما يجاوبك اضغط "انتهى دوري"',
      en: 'Ask your friend your question out loud, then tap "End Turn" once they answer',
    },
    instructionOpponentTurn: {
      ar: "{name} بيسألك دلوقتي — جاوب بصوتك بصراحة 🗣️",
      en: "{name} is asking you now — answer honestly out loud 🗣️",
    },
    boardRemaining: { ar: "لوحتك — {remaining} شخصية متبقية", en: "Your board — {remaining} characters left" },
    guessModeOn: { ar: "وضع التخمين مفعّل", en: "Guess mode ON" },
    mustKeepOne: {
      ar: "⚠️ لازم تسيب شخصية واحدة على الأقل على اللوحة",
      en: "⚠️ You must leave at least one character on the board",
    },
    waitingForGuessConfirm: { ar: "بانتظار تأكيد التخمين...", en: "Waiting for guess confirmation..." },
    confirmingGuess: { ar: "جاري تأكيد التخمين...", en: "Confirming the guess..." },
    endTurn: { ar: "✅ انتهى دوري", en: "✅ End Turn" },
    guessNow: { ar: "🎯 خمّن الشخصية الآن", en: "🎯 Guess the Character Now" },
    cancelGuessMode: { ar: "إلغاء وضع التخمين", en: "Cancel guess mode" },
    confirmGuessQuestion: { ar: "هل أنت متأكد أن الشخصية هي {name}؟", en: "Are you sure the character is {name}?" },
    wrongGuessWarning: { ar: "تخمين خاطئ سينهي اللعبة فورًا!", en: "A wrong guess ends the game immediately!" },
    yesGuess: { ar: "نعم، خمّن", en: "Yes, guess" },
  },
  finished: {
    won: { ar: "لقد فزت!", en: "You won!" },
    lost: { ar: "خسرت هذه الجولة", en: "You lost this round" },
    reasonCorrectGuessWon: { ar: "خمّنت الشخصية بشكل صحيح!", en: "You guessed the character correctly!" },
    reasonCorrectGuessLost: { ar: "{name} خمّن شخصيتك!", en: "{name} guessed your character!" },
    reasonWrongGuessWon: { ar: "{name} خمّن بشكل خاطئ!", en: "{name} guessed wrong!" },
    reasonWrongGuessLost: { ar: "للأسف، تخمينك كان خاطئًا.", en: "Unfortunately, your guess was wrong." },
    reasonOpponentLeft: { ar: "انسحب الطرف الآخر من اللعبة.", en: "The other player left the game." },
    secretWas: { ar: "شخصية {name} السرية كانت", en: "{name}'s secret character was" },
    playAgain: { ar: "🔁 العب مرة أخرى", en: "🔁 Play Again" },
  },
  suggestedQuestions: {
    toggle: { ar: "💡 أفكار لأسئلة تقدر تسألها بصوتك", en: "💡 Ideas for questions to ask out loud" },
    hint: {
      ar: "هتستخدمها وانت بتلعب — اسأل صديقك بصوتك، مفيش داعي تدوس على حاجة",
      en: "You'll use these while playing — ask your friend out loud, no need to tap anything",
    },
    hide: { ar: "إخفاء", en: "Hide" },
  },
  gameRules: {
    toggle: { ar: "📖 شروط اللعبة", en: "📖 How to Play" },
    hide: { ar: "إخفاء", en: "Hide" },
    wifiNote: {
      ar: "📶 لازم يكون الجهازين على نفس شبكة الواي فاي عشان تقدروا تتصلوا ببعض.",
      en: "📶 Both devices must be on the same Wi-Fi network to connect to each other.",
    },
    step1Title: { ar: "١. أنشئ أو انضم لغرفة", en: "1. Create or join a room" },
    step1Body: {
      ar: "لاعب واحد يضغط \"ابدأ لعبة\" ويشارك الرابط، والتاني يفتحه وينضم — من غير حساب أو إعدادات.",
      en: 'One player taps "Start Game" and shares the link — the other opens it and joins. No account, no setup.',
    },
    step2Title: { ar: "٢. اختر شخصية سرية", en: "2. Pick a secret character" },
    step2Body: {
      ar: "كل لاعب يختار شخصية من نفس اللوحة، وصديقك مش هيقدر يشوفها أبدًا.",
      en: "Each player secretly picks a character from the same board — your friend can never see it.",
    },
    step3Title: { ar: "٣. اسألوا بصوتكم", en: "3. Ask out loud" },
    step3Body: {
      ar: 'بالدور، كل لاعب يسأل سؤال نعم/لا بصوته عالي عن شخصية صديقه، ويستبعد الشخصيات اللي متطابقتش من لوحته.',
      en: "Taking turns, each player asks a yes/no question out loud about the other's character, and crosses off characters on their own board that don't match.",
    },
    step4Title: { ar: "٤. خمّن للفوز", en: "4. Guess to win" },
    step4Body: {
      ar: "لما تكون متأكد، اضغط \"خمّن الشخصية الآن\" واختر شخصية. تخمين صح = فوز فوري، وتخمين غلط = خسارة فورية!",
      en: 'When you\'re sure, tap "Guess the Character Now" and pick one. A correct guess wins instantly — a wrong one loses instantly!',
    },
  },
  connectionStatus: {
    idle: { ar: "جاري التحضير...", en: "Getting ready..." },
    connecting: { ar: "🔄 جاري الاتصال...", en: "🔄 Connecting..." },
    connected: { ar: "✓ متصل", en: "✓ Connected" },
    reconnecting: { ar: "⚠️ انقطع الاتصال، جاري إعادة المحاولة...", en: "⚠️ Connection lost, retrying..." },
    disconnected: { ar: "⚠️ انقطع الاتصال", en: "⚠️ Disconnected" },
    failed: { ar: "⚠️ تعذر الاتصال", en: "⚠️ Connection failed" },
    closed: { ar: "تم إنهاء الاتصال", en: "Connection closed" },
  },
  leaveGame: {
    ariaLabel: { ar: "إنهاء الغرفة", en: "End room" },
    confirmTitle: { ar: "هل تريد إنهاء الغرفة؟", en: "End this room?" },
    confirmBody: {
      ar: "سينتهي الاتصال مع صديقك وستعود إلى الشاشة الرئيسية.",
      en: "The connection with your friend will end and you'll return to the home screen.",
    },
    confirmButton: { ar: "نعم، إنهاء الغرفة", en: "Yes, end the room" },
  },
  questions: {
    hasGlasses: { ar: "هل الشخصية ترتدي نظارة؟", en: "Does the character wear glasses?" },
    hasHat: { ar: "هل الشخصية ترتدي قبعة أو غطاء رأس؟", en: "Does the character wear a hat or headwear?" },
    hasBeard: { ar: "هل الشخصية لديها لحية؟", en: "Does the character have a beard?" },
    hasMustache: { ar: "هل الشخصية لديها شارب؟", en: "Does the character have a mustache?" },
    hasEarrings: { ar: "هل الشخصية ترتدي أقراطًا؟", en: "Does the character wear earrings?" },
    isSmiling: { ar: "هل الشخصية تبتسم؟", en: "Is the character smiling?" },
    isMale: { ar: "هل الشخصية رجل؟", en: "Is the character a man?" },
    isFemale: { ar: "هل الشخصية امرأة؟", en: "Is the character a woman?" },
    hairBlack: { ar: "هل لون شعر الشخصية أسود؟", en: "Is the character's hair black?" },
    hairBrown: { ar: "هل لون شعر الشخصية بني؟", en: "Is the character's hair brown?" },
    hairBlonde: { ar: "هل لون شعر الشخصية أشقر؟", en: "Is the character's hair blonde?" },
    hairRed: { ar: "هل لون شعر الشخصية أحمر؟", en: "Is the character's hair red?" },
    hairGray: { ar: "هل لون شعر الشخصية رمادي أو أبيض؟", en: "Is the character's hair gray or white?" },
    hairNone: { ar: "هل الشخصية بدون شعر (أصلع)؟", en: "Is the character bald?" },
    skinLight: { ar: "هل بشرة الشخصية فاتحة؟", en: "Is the character's skin tone light?" },
    skinMedium: { ar: "هل بشرة الشخصية متوسطة؟", en: "Is the character's skin tone medium?" },
    skinDark: { ar: "هل بشرة الشخصية داكنة؟", en: "Is the character's skin tone dark?" },
  },
} as const;
