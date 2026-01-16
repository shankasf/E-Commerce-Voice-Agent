interface Question {
  id: string;
  qtype: 'single' | 'multi';
  correct: number[];
}

interface Answer {
  question_id: string;
  selected: number[];
}

export function calculateScore(questions: Question[], answers: Answer[]): {
  score: number;
  totalCorrect: number;
  totalQuestions: number;
} {
  const answerMap = new Map(answers.map(a => [a.question_id, a.selected]));
  let correctCount = 0;

  for (const question of questions) {
    const selected = answerMap.get(question.id) || [];
    const correct = question.correct;

    // For both single and multi-select, require exact match
    const isCorrect =
      selected.length === correct.length &&
      selected.every(s => correct.includes(s)) &&
      correct.every(c => selected.includes(c));

    if (isCorrect) {
      correctCount++;
    }
  }

  const score = questions.length > 0
    ? (correctCount / questions.length) * 100
    : 0;

  return {
    score,
    totalCorrect: correctCount,
    totalQuestions: questions.length
  };
}

export function isPassing(score: number, passingPercent: number = 40): boolean {
  return score >= passingPercent;
}
