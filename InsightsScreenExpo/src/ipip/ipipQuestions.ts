/** IPIP-NEO-120 items — text matches docs/IPIP_120_questions_responses.txt exactly (Johnson 2014 facet keying). */
export type IpipDomainCode = 'N' | 'E' | 'O' | 'A' | 'C';

export type IpipQuestion = {
  id: number;
  text: string;
  /** When true, agreement is reverse-scored (6 − answer). */
  reversed: boolean;
  domain: IpipDomainCode;
  facet: number;
};

export const IPIP_QUESTION_COUNT = 120;

export const IPIP_QUESTIONS: IpipQuestion[] = [
  {
    "id": 1,
    "text": "Worry about things.",
    "reversed": false,
    "domain": "N",
    "facet": 1
  },
  {
    "id": 2,
    "text": "Make friends easily.",
    "reversed": false,
    "domain": "E",
    "facet": 1
  },
  {
    "id": 3,
    "text": "Have a vivid imagination.",
    "reversed": false,
    "domain": "O",
    "facet": 1
  },
  {
    "id": 4,
    "text": "Trust others.",
    "reversed": false,
    "domain": "A",
    "facet": 1
  },
  {
    "id": 5,
    "text": "Complete tasks successfully",
    "reversed": false,
    "domain": "C",
    "facet": 1
  },
  {
    "id": 6,
    "text": "Get angry easily",
    "reversed": false,
    "domain": "N",
    "facet": 2
  },
  {
    "id": 7,
    "text": "Love large parties.",
    "reversed": false,
    "domain": "E",
    "facet": 2
  },
  {
    "id": 8,
    "text": "See beauty in things that others might not notice",
    "reversed": false,
    "domain": "O",
    "facet": 2
  },
  {
    "id": 9,
    "text": "Use flattery to get ahead.",
    "reversed": true,
    "domain": "A",
    "facet": 2
  },
  {
    "id": 10,
    "text": "Like order.",
    "reversed": false,
    "domain": "C",
    "facet": 2
  },
  {
    "id": 11,
    "text": "Often feel blue.",
    "reversed": false,
    "domain": "N",
    "facet": 3
  },
  {
    "id": 12,
    "text": "Take charge.",
    "reversed": false,
    "domain": "E",
    "facet": 3
  },
  {
    "id": 13,
    "text": "Experience my emotions intensely.",
    "reversed": false,
    "domain": "O",
    "facet": 3
  },
  {
    "id": 14,
    "text": "Make people feel welcome.",
    "reversed": false,
    "domain": "A",
    "facet": 3
  },
  {
    "id": 15,
    "text": "Keep my promises.",
    "reversed": false,
    "domain": "C",
    "facet": 3
  },
  {
    "id": 16,
    "text": "Find it difficult to approach others.",
    "reversed": false,
    "domain": "N",
    "facet": 4
  },
  {
    "id": 17,
    "text": "Am always busy.",
    "reversed": false,
    "domain": "E",
    "facet": 4
  },
  {
    "id": 18,
    "text": "Prefer to stick with things that I know.",
    "reversed": true,
    "domain": "O",
    "facet": 4
  },
  {
    "id": 19,
    "text": "Love a good fight.",
    "reversed": true,
    "domain": "A",
    "facet": 4
  },
  {
    "id": 20,
    "text": "Work hard.",
    "reversed": false,
    "domain": "C",
    "facet": 4
  },
  {
    "id": 21,
    "text": "Often eat too much.",
    "reversed": false,
    "domain": "N",
    "facet": 5
  },
  {
    "id": 22,
    "text": "Love excitement.",
    "reversed": false,
    "domain": "E",
    "facet": 5
  },
  {
    "id": 23,
    "text": "Am not interested in abstract ideas.",
    "reversed": true,
    "domain": "O",
    "facet": 5
  },
  {
    "id": 24,
    "text": "Believe that I am better than others.",
    "reversed": true,
    "domain": "A",
    "facet": 5
  },
  {
    "id": 25,
    "text": "Start tasks right away.",
    "reversed": false,
    "domain": "C",
    "facet": 5
  },
  {
    "id": 26,
    "text": "Feel that I'm unable to deal with things.",
    "reversed": false,
    "domain": "N",
    "facet": 6
  },
  {
    "id": 27,
    "text": "Radiate joy.",
    "reversed": false,
    "domain": "E",
    "facet": 6
  },
  {
    "id": 28,
    "text": "Tend to vote for liberal political candidates.",
    "reversed": false,
    "domain": "O",
    "facet": 6
  },
  {
    "id": 29,
    "text": "Sympathize with the homeless.",
    "reversed": false,
    "domain": "A",
    "facet": 6
  },
  {
    "id": 30,
    "text": "Jump into things without thinking.",
    "reversed": true,
    "domain": "C",
    "facet": 6
  },
  {
    "id": 31,
    "text": "Fear for the worst.",
    "reversed": false,
    "domain": "N",
    "facet": 1
  },
  {
    "id": 32,
    "text": "Warm up quickly to others.",
    "reversed": false,
    "domain": "E",
    "facet": 1
  },
  {
    "id": 33,
    "text": "Enjoy wild flights of fantasy.",
    "reversed": false,
    "domain": "O",
    "facet": 1
  },
  {
    "id": 34,
    "text": "Believe that others have good intentions.",
    "reversed": false,
    "domain": "A",
    "facet": 1
  },
  {
    "id": 35,
    "text": "Excel in what I do.",
    "reversed": false,
    "domain": "C",
    "facet": 1
  },
  {
    "id": 36,
    "text": "Get irritated easily.",
    "reversed": false,
    "domain": "N",
    "facet": 2
  },
  {
    "id": 37,
    "text": "Talk to a lot of different people at parties.",
    "reversed": false,
    "domain": "E",
    "facet": 2
  },
  {
    "id": 38,
    "text": "Do not like art.",
    "reversed": true,
    "domain": "O",
    "facet": 2
  },
  {
    "id": 39,
    "text": "Know how to get around the rules.",
    "reversed": true,
    "domain": "A",
    "facet": 2
  },
  {
    "id": 40,
    "text": "Like to tidy up.",
    "reversed": false,
    "domain": "C",
    "facet": 2
  },
  {
    "id": 41,
    "text": "Dislike myself.",
    "reversed": false,
    "domain": "N",
    "facet": 3
  },
  {
    "id": 42,
    "text": "Try to lead others.",
    "reversed": false,
    "domain": "E",
    "facet": 3
  },
  {
    "id": 43,
    "text": "Seldom get emotional.",
    "reversed": true,
    "domain": "O",
    "facet": 3
  },
  {
    "id": 44,
    "text": "Love to help others.",
    "reversed": false,
    "domain": "A",
    "facet": 3
  },
  {
    "id": 45,
    "text": "Tell the truth.",
    "reversed": false,
    "domain": "C",
    "facet": 3
  },
  {
    "id": 46,
    "text": "Am easily intimidated.",
    "reversed": false,
    "domain": "N",
    "facet": 4
  },
  {
    "id": 47,
    "text": "Am always on the go.",
    "reversed": false,
    "domain": "E",
    "facet": 4
  },
  {
    "id": 48,
    "text": "Dislike changes.",
    "reversed": true,
    "domain": "O",
    "facet": 4
  },
  {
    "id": 49,
    "text": "Yell at people.",
    "reversed": true,
    "domain": "A",
    "facet": 4
  },
  {
    "id": 50,
    "text": "Do more than what's expected of me.",
    "reversed": false,
    "domain": "C",
    "facet": 4
  },
  {
    "id": 51,
    "text": "Go on binges.",
    "reversed": false,
    "domain": "N",
    "facet": 5
  },
  {
    "id": 52,
    "text": "Seek adventure.",
    "reversed": false,
    "domain": "E",
    "facet": 5
  },
  {
    "id": 53,
    "text": "Avoid philosophical discussions.",
    "reversed": true,
    "domain": "O",
    "facet": 5
  },
  {
    "id": 54,
    "text": "Think highly of myself.",
    "reversed": true,
    "domain": "A",
    "facet": 5
  },
  {
    "id": 55,
    "text": "Find it difficult to get down to work.",
    "reversed": true,
    "domain": "C",
    "facet": 5
  },
  {
    "id": 56,
    "text": "Remain calm under pressure.",
    "reversed": true,
    "domain": "N",
    "facet": 6
  },
  {
    "id": 57,
    "text": "Have a lot of fun.",
    "reversed": false,
    "domain": "E",
    "facet": 6
  },
  {
    "id": 58,
    "text": "Believe in one true religion.",
    "reversed": true,
    "domain": "O",
    "facet": 6
  },
  {
    "id": 59,
    "text": "Feel sympathy for those who are worse off than myself.",
    "reversed": false,
    "domain": "A",
    "facet": 6
  },
  {
    "id": 60,
    "text": "Make rash decisions.",
    "reversed": true,
    "domain": "C",
    "facet": 6
  },
  {
    "id": 61,
    "text": "Am afraid of many things.",
    "reversed": false,
    "domain": "N",
    "facet": 1
  },
  {
    "id": 62,
    "text": "Feel comfortable around people.",
    "reversed": false,
    "domain": "E",
    "facet": 1
  },
  {
    "id": 63,
    "text": "Love to daydream.",
    "reversed": false,
    "domain": "O",
    "facet": 1
  },
  {
    "id": 64,
    "text": "Trust what people say.",
    "reversed": false,
    "domain": "A",
    "facet": 1
  },
  {
    "id": 65,
    "text": "Handle tasks smoothly.",
    "reversed": false,
    "domain": "C",
    "facet": 1
  },
  {
    "id": 66,
    "text": "Lose my temper.",
    "reversed": false,
    "domain": "N",
    "facet": 2
  },
  {
    "id": 67,
    "text": "Don't like crowded events.",
    "reversed": true,
    "domain": "E",
    "facet": 2
  },
  {
    "id": 68,
    "text": "Do not like poetry.",
    "reversed": true,
    "domain": "O",
    "facet": 2
  },
  {
    "id": 69,
    "text": "Cheat to get ahead.",
    "reversed": true,
    "domain": "A",
    "facet": 2
  },
  {
    "id": 70,
    "text": "Leave a mess in my room.",
    "reversed": true,
    "domain": "C",
    "facet": 2
  },
  {
    "id": 71,
    "text": "Am often down in the dumps.",
    "reversed": false,
    "domain": "N",
    "facet": 3
  },
  {
    "id": 72,
    "text": "Take control of things.",
    "reversed": false,
    "domain": "E",
    "facet": 3
  },
  {
    "id": 73,
    "text": "Am not easily affected by my emotions.",
    "reversed": true,
    "domain": "O",
    "facet": 3
  },
  {
    "id": 74,
    "text": "Am concerned about others.",
    "reversed": false,
    "domain": "A",
    "facet": 3
  },
  {
    "id": 75,
    "text": "Break my promises.",
    "reversed": true,
    "domain": "C",
    "facet": 3
  },
  {
    "id": 76,
    "text": "Am not embarrassed easily.",
    "reversed": true,
    "domain": "N",
    "facet": 4
  },
  {
    "id": 77,
    "text": "Do a lot in my spare time.",
    "reversed": false,
    "domain": "E",
    "facet": 4
  },
  {
    "id": 78,
    "text": "Don't like the idea of change.",
    "reversed": true,
    "domain": "O",
    "facet": 4
  },
  {
    "id": 79,
    "text": "Insult people.",
    "reversed": true,
    "domain": "A",
    "facet": 4
  },
  {
    "id": 80,
    "text": "Set high standards for myself and others.",
    "reversed": false,
    "domain": "C",
    "facet": 4
  },
  {
    "id": 81,
    "text": "Rarely overindulge.",
    "reversed": true,
    "domain": "N",
    "facet": 5
  },
  {
    "id": 82,
    "text": "Love action.",
    "reversed": false,
    "domain": "E",
    "facet": 5
  },
  {
    "id": 83,
    "text": "Have difficulty understanding abstract ideas.",
    "reversed": true,
    "domain": "O",
    "facet": 5
  },
  {
    "id": 84,
    "text": "Have a high opinion of myself.",
    "reversed": true,
    "domain": "A",
    "facet": 5
  },
  {
    "id": 85,
    "text": "Need a push to get started.",
    "reversed": true,
    "domain": "C",
    "facet": 5
  },
  {
    "id": 86,
    "text": "Know how to cope.",
    "reversed": true,
    "domain": "N",
    "facet": 6
  },
  {
    "id": 87,
    "text": "Love life.",
    "reversed": false,
    "domain": "E",
    "facet": 6
  },
  {
    "id": 88,
    "text": "Tend to vote for conservative political candidates.",
    "reversed": true,
    "domain": "O",
    "facet": 6
  },
  {
    "id": 89,
    "text": "Suffer from others' sorrows.",
    "reversed": false,
    "domain": "A",
    "facet": 6
  },
  {
    "id": 90,
    "text": "Rush into things.",
    "reversed": true,
    "domain": "C",
    "facet": 6
  },
  {
    "id": 91,
    "text": "Get stressed out easily.",
    "reversed": false,
    "domain": "N",
    "facet": 1
  },
  {
    "id": 92,
    "text": "Act comfortably with others.",
    "reversed": false,
    "domain": "E",
    "facet": 1
  },
  {
    "id": 93,
    "text": "Like to get lost in thought.",
    "reversed": false,
    "domain": "O",
    "facet": 1
  },
  {
    "id": 94,
    "text": "Distrust people.",
    "reversed": true,
    "domain": "A",
    "facet": 1
  },
  {
    "id": 95,
    "text": "Know how to get things done.",
    "reversed": false,
    "domain": "C",
    "facet": 1
  },
  {
    "id": 96,
    "text": "Rarely get irritated.",
    "reversed": true,
    "domain": "N",
    "facet": 2
  },
  {
    "id": 97,
    "text": "Avoid crowds.",
    "reversed": true,
    "domain": "E",
    "facet": 2
  },
  {
    "id": 98,
    "text": "Do not enjoy going to art museums.",
    "reversed": true,
    "domain": "O",
    "facet": 2
  },
  {
    "id": 99,
    "text": "Take advantage of others.",
    "reversed": true,
    "domain": "A",
    "facet": 2
  },
  {
    "id": 100,
    "text": "Leave my belongings around.",
    "reversed": true,
    "domain": "C",
    "facet": 2
  },
  {
    "id": 101,
    "text": "Have a low opinion of myself.",
    "reversed": false,
    "domain": "N",
    "facet": 3
  },
  {
    "id": 102,
    "text": "Wait for others to lead the way.",
    "reversed": true,
    "domain": "E",
    "facet": 3
  },
  {
    "id": 103,
    "text": "Experience very few emotional highs and lows.",
    "reversed": true,
    "domain": "O",
    "facet": 3
  },
  {
    "id": 104,
    "text": "Turn my back on others.",
    "reversed": true,
    "domain": "A",
    "facet": 3
  },
  {
    "id": 105,
    "text": "Get others to do my duties.",
    "reversed": true,
    "domain": "C",
    "facet": 3
  },
  {
    "id": 106,
    "text": "Am able to stand up for myself.",
    "reversed": true,
    "domain": "N",
    "facet": 4
  },
  {
    "id": 107,
    "text": "Can manage many things at the same time.",
    "reversed": false,
    "domain": "E",
    "facet": 4
  },
  {
    "id": 108,
    "text": "Am attached to conventional ways.",
    "reversed": true,
    "domain": "O",
    "facet": 4
  },
  {
    "id": 109,
    "text": "Get back at others.",
    "reversed": true,
    "domain": "A",
    "facet": 4
  },
  {
    "id": 110,
    "text": "Am not highly motivated to succeed.",
    "reversed": true,
    "domain": "C",
    "facet": 4
  },
  {
    "id": 111,
    "text": "Am able to control my cravings.",
    "reversed": true,
    "domain": "N",
    "facet": 5
  },
  {
    "id": 112,
    "text": "Enjoy being reckless.",
    "reversed": false,
    "domain": "E",
    "facet": 5
  },
  {
    "id": 113,
    "text": "Am not interested in theoretical discussions.",
    "reversed": true,
    "domain": "O",
    "facet": 5
  },
  {
    "id": 114,
    "text": "Make myself the center of attention.",
    "reversed": true,
    "domain": "A",
    "facet": 5
  },
  {
    "id": 115,
    "text": "Have difficulty starting tasks.",
    "reversed": true,
    "domain": "C",
    "facet": 5
  },
  {
    "id": 116,
    "text": "Am calm even in tense situations.",
    "reversed": true,
    "domain": "N",
    "facet": 6
  },
  {
    "id": 117,
    "text": "Laugh aloud.",
    "reversed": false,
    "domain": "E",
    "facet": 6
  },
  {
    "id": 118,
    "text": "Like to stand during the national anthem.",
    "reversed": true,
    "domain": "O",
    "facet": 6
  },
  {
    "id": 119,
    "text": "Am not interested in other people's problems.",
    "reversed": true,
    "domain": "A",
    "facet": 6
  },
  {
    "id": 120,
    "text": "Act without thinking.",
    "reversed": true,
    "domain": "C",
    "facet": 6
  }
];
