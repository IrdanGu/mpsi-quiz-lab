(() => {
  'use strict';

  const QUESTIONS = window.QUIZ_QUESTIONS || [];
  const STORAGE_KEY = 'mpsi-quiz-records-v1';
  const CHAPTER_COUNT = 7;
  const ROUND_SIZE = 10;
  const BOSS_SIZE = 20;
  const LETTERS = ['A', 'B', 'C', 'D'];

  const $ = (id) => document.getElementById(id);
  const chapterView = $('chapter-view');
  const quizView = $('quiz-view');
  const resultView = $('result-view');
  const progressBar = $('progress-bar');
  const headerMode = $('header-mode');
  const headerTimer = $('header-timer');
  const timer = { interval: null, seconds: 0 };
  const state = {
    mode: null,
    chapter: null,
    questions: [],
    index: 0,
    answers: [],
    startedAt: null,
    currentAnswered: false,
    lastRecord: null,
  };

  function readRecords() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
  }

  function writeRecord(record) {
    const records = readRecords();
    records.push(record);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }

  function shuffle(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  }

  function formatDate(iso) {
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
  }

  function masteryFor(accuracy) {
    if (accuracy >= 80) return { label: 'Menguasai', className: 'good', detail: 'Pemahamanmu sudah kuat. Tetap ulangi secara berkala.' };
    if (accuracy >= 60) return { label: 'Perlu latihan', className: 'warn', detail: 'Dasar sudah terbentuk, tetapi beberapa bagian masih perlu diperkuat.' };
    return { label: 'Belum menguasai', className: 'bad', detail: 'Ulangi materi dan coba ronde berikutnya untuk memperbaiki bagian yang salah.' };
  }

  function chapterRecords(chapter) {
    return readRecords().filter((record) => record.mode === 'chapter' && record.chapter === chapter);
  }

  function renderChapterCards() {
    const grid = $('chapter-grid');
    grid.innerHTML = '';
    for (let chapter = 1; chapter <= CHAPTER_COUNT; chapter += 1) {
      const source = QUESTIONS.find((question) => question.chapter === chapter);
      const records = chapterRecords(chapter);
      const latest = records.at(-1);
      const best = records.reduce((max, record) => Math.max(max, record.accuracy), 0);
      const status = latest ? masteryFor(latest.accuracy) : null;
      const card = document.createElement('button');
      card.className = 'chapter-card';
      card.type = 'button';
      card.innerHTML = `
        <span class="chapter-no">BAB ${String(chapter).padStart(2, '0')}</span>
        <span><h2></h2><p>${records.length ? `${records.length} percobaan · terbaik ${best}%` : 'Belum ada percobaan'}</p></span>
        <span class="chapter-status ${status ? status.className : ''}">${status ? status.label : 'Mulai ronde →'}</span>`;
      card.querySelector('h2').textContent = source?.chapterTitle || `Bab ${chapter}`;
      card.addEventListener('click', () => startRound('chapter', chapter));
      grid.appendChild(card);
    }
  }

  function showView(view) {
    [chapterView, quizView, resultView].forEach((item) => { item.hidden = item !== view; });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function startTimer() {
    clearInterval(timer.interval);
    timer.seconds = 0;
    headerTimer.textContent = '00:00';
    timer.interval = setInterval(() => {
      timer.seconds += 1;
      headerTimer.textContent = formatTime(timer.seconds);
    }, 1000);
  }

  function stopTimer() { clearInterval(timer.interval); }

  function startRound(mode, chapter = null) {
    state.mode = mode;
    state.chapter = chapter;
    const pool = chapter ? QUESTIONS.filter((question) => question.chapter === chapter) : QUESTIONS;
    const amount = Math.min(mode === 'boss' ? BOSS_SIZE : ROUND_SIZE, pool.length);
    state.questions = shuffle(pool).slice(0, amount);
    state.index = 0;
    state.answers = [];
    state.startedAt = new Date().toISOString();
    state.currentAnswered = false;
    headerMode.textContent = mode === 'boss' ? 'RONDE BOSS' : `BAB ${chapter}`;
    startTimer();
    showView(quizView);
    renderQuestion();
  }

  function renderQuestion() {
    const question = state.questions[state.index];
    state.currentAnswered = false;
    const total = state.questions.length;
    progressBar.style.width = `${(state.index / total) * 100}%`;
    $('quiz-eyebrow').textContent = state.mode === 'boss' ? 'Ronde Boss · semua bab' : `Bab ${state.chapter} · ronde latihan`;
    $('quiz-title').textContent = `Pertanyaan ${String(state.index + 1).padStart(2, '0')}`;
    $('question-counter').textContent = `${String(state.index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
    $('question-topic').textContent = state.mode === 'boss' ? `BAB ${question.chapter}` : 'PILIHAN GANDA';
    $('question-number').textContent = `SOAL ${String(question.number).padStart(2, '0')}`;
    $('question-text').textContent = question.question;
    const options = $('options-container');
    options.innerHTML = '';
    question.options.forEach((text, index) => {
      const button = document.createElement('button');
      button.className = 'option';
      button.type = 'button';
      button.setAttribute('role', 'radio');
      button.setAttribute('aria-checked', 'false');
      const letter = document.createElement('span');
      letter.className = 'option-letter';
      letter.textContent = LETTERS[index];
      const label = document.createElement('span');
      label.className = 'option-text';
      label.textContent = text;
      button.append(letter, label);
      button.addEventListener('click', () => selectAnswer(index));
      options.appendChild(button);
    });
    $('next-button').disabled = true;
  }

  function selectAnswer(selectedIndex) {
    if (state.currentAnswered) return;
    state.currentAnswered = true;
    const question = state.questions[state.index];
    const isCorrect = selectedIndex === question.correctIndex;
    state.answers.push({ questionId: question.id, selectedIndex, isCorrect });
    progressBar.style.width = `${((state.index + 1) / state.questions.length) * 100}%`;
    [...$('options-container').children].forEach((button, index) => {
      button.disabled = true;
      if (index === question.correctIndex) button.classList.add('correct');
      else if (index === selectedIndex) button.classList.add('wrong');
      else button.classList.add('dim');
      button.setAttribute('aria-checked', index === selectedIndex ? 'true' : 'false');
    });
    $('next-button').disabled = false;
    $('next-button').innerHTML = state.index === state.questions.length - 1 ? 'Lihat hasil <span>→</span>' : 'Berikutnya <span>→</span>';
  }

  function nextQuestion() {
    if (!state.currentAnswered) return;
    if (state.index < state.questions.length - 1) {
      state.index += 1;
      renderQuestion();
    } else finishRound();
  }

  function finishRound() {
    stopTimer();
    const correct = state.answers.filter((answer) => answer.isCorrect).length;
    const accuracy = Math.round((correct / state.questions.length) * 100);
    const record = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      mode: state.mode,
      chapter: state.chapter,
      createdAt: new Date().toISOString(),
      durationSeconds: timer.seconds,
      total: state.questions.length,
      correct,
      wrong: state.questions.length - correct,
      accuracy,
      answers: state.questions.map((question) => {
        const answer = state.answers.find((item) => item.questionId === question.id);
        return { ...question, selectedIndex: answer.selectedIndex, isCorrect: answer.isCorrect };
      }),
    };
    writeRecord(record);
    state.lastRecord = record;
    renderResult(record);
    showView(resultView);
  }

  function renderResult(record) {
    const title = record.mode === 'boss' ? 'Ronde Boss selesai.' : `Bab ${record.chapter} selesai.`;
    $('result-title').textContent = title;
    $('result-score').textContent = `${record.correct}/${record.total}`;
    $('result-correct').textContent = record.correct;
    $('result-wrong').textContent = record.wrong;
    $('result-accuracy').textContent = `${record.accuracy}%`;
    $('result-time').textContent = formatTime(record.durationSeconds);
    $('result-date').textContent = formatDate(record.createdAt);
    const mastery = masteryFor(record.accuracy);
    const banner = $('mastery-banner');
    banner.className = `feedback-banner ${mastery.className}`;
    banner.textContent = record.mode === 'boss'
      ? `${mastery.label}. ${mastery.detail}`
      : `Bab ${record.chapter}: ${mastery.label}. ${mastery.detail}`;
    const list = $('review-list');
    list.innerHTML = '';
    record.answers.forEach((answer, index) => {
      const item = document.createElement('article');
      item.className = `review-item ${answer.isCorrect ? 'is-right' : 'is-wrong'}`;
      const top = document.createElement('div');
      top.className = 'review-top';
      const label = document.createElement('span');
      label.textContent = `${record.mode === 'boss' ? `BAB ${answer.chapter} · ` : ''}SOAL ${String(index + 1).padStart(2, '0')}`;
      const status = document.createElement('span');
      status.className = `review-status ${answer.isCorrect ? 'right' : 'wrong'}`;
      status.textContent = answer.isCorrect ? 'BENAR' : 'SALAH';
      top.append(label, status);
      const question = document.createElement('p');
      question.className = 'review-question';
      question.textContent = answer.question;
      const answerLine = document.createElement('div');
      answerLine.className = 'review-answer';
      const selected = answer.options[answer.selectedIndex];
      const correct = answer.options[answer.correctIndex];
      answerLine.innerHTML = `Jawaban kamu: <strong class="${answer.isCorrect ? '' : 'wrong-answer'}"></strong>`;
      answerLine.querySelector('strong').textContent = `${LETTERS[answer.selectedIndex]}. ${selected}`;
      if (!answer.isCorrect) {
        const correctLine = document.createElement('div');
        correctLine.innerHTML = 'Seharusnya: <strong></strong>';
        correctLine.querySelector('strong').textContent = `${LETTERS[answer.correctIndex]}. ${correct}`;
        answerLine.appendChild(correctLine);
      }
      const source = document.createElement('div');
      source.className = 'review-source';
      source.textContent = `Rujukan materi: ${answer.sourceHeading}`;
      item.append(top, question, answerLine, source);
      list.appendChild(item);
    });
  }

  $('boss-start').addEventListener('click', () => startRound('boss'));
  $('next-button').addEventListener('click', nextQuestion);
  $('result-next').addEventListener('click', () => { renderChapterCards(); showView(chapterView); headerMode.textContent = 'PILIH BAB'; progressBar.style.width = '0%'; });
  $('result-retry').addEventListener('click', () => startRound(state.mode, state.chapter));
  $('brand-link').addEventListener('click', (event) => { event.preventDefault(); renderChapterCards(); showView(chapterView); });
  document.addEventListener('keydown', (event) => {
    if (quizView.hidden) return;
    const key = event.key.toUpperCase();
    if (!state.currentAnswered && ['A', 'B', 'C', 'D'].includes(key)) selectAnswer(LETTERS.indexOf(key));
    else if (!state.currentAnswered && ['1', '2', '3', '4'].includes(key)) selectAnswer(Number(key) - 1);
    else if (key === 'ENTER' && state.currentAnswered) nextQuestion();
  });

  renderChapterCards();
})();
