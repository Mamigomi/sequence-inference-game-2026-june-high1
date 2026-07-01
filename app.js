const state = {
  questions: [],
  currentIndex: 0,
  selected: [],
  checked: false,
  missedCurrent: false,
  score: 0,
  correct: 0,
  combo: 0,
  bestCombo: 0
};

const els = {
  progressText: document.querySelector("#progressText"),
  scoreText: document.querySelector("#scoreText"),
  remainingText: document.querySelector("#remainingText"),
  comboText: document.querySelector("#comboText"),
  progressBar: document.querySelector("#progressBar"),
  questionId: document.querySelector("#questionId"),
  promptText: document.querySelector("#promptText"),
  selectedList: document.querySelector("#selectedList"),
  choicesList: document.querySelector("#choicesList"),
  resultPanel: document.querySelector("#resultPanel"),
  checkButton: document.querySelector("#checkButton"),
  nextButton: document.querySelector("#nextButton"),
  restartButton: document.querySelector("#restartButton"),
  clearSelectionButton: document.querySelector("#clearSelectionButton"),
  gameView: document.querySelector("#gameView"),
  finalView: document.querySelector("#finalView"),
  finalScore: document.querySelector("#finalScore"),
  finalCorrect: document.querySelector("#finalCorrect"),
  finalCombo: document.querySelector("#finalCombo"),
  finalRestartButton: document.querySelector("#finalRestartButton")
};

const circledNumbers = [
  "①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩",
  "⑪", "⑫", "⑬", "⑭", "⑮", "⑯", "⑰", "⑱", "⑲", "⑳",
  "㉑", "㉒", "㉓", "㉔", "㉕", "㉖", "㉗", "㉘", "㉙", "㉚"
];

async function init() {
  try {
    const response = await fetch("sequence_questions.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Question data request failed: ${response.status}`);
    }
    state.questions = await response.json();
    restartGame();
  } catch (error) {
    showLoadError(error);
  }
}

function showLoadError(error) {
  els.gameView.innerHTML = `
    <article class="result-panel is-visible">
      <p class="result-title broken">LOAD FAILED</p>
      <p class="answer-line">sequence_questions.json을 불러오지 못했습니다. 로컬 서버로 실행해 주세요.</p>
    </article>
  `;
  console.error(error);
}

function restartGame() {
  state.currentIndex = 0;
  state.selected = [];
  state.checked = false;
  state.missedCurrent = false;
  state.score = 0;
  state.correct = 0;
  state.combo = 0;
  state.bestCombo = 0;
  els.gameView.classList.remove("hidden");
  els.finalView.classList.add("hidden");
  renderQuestion();
}

function renderQuestion() {
  const question = getCurrentQuestion();
  state.selected = [];
  state.checked = false;
  state.missedCurrent = false;

  els.questionId.textContent = question.id;
  els.promptText.textContent = question.prompt;
  els.resultPanel.className = "result-panel";
  els.resultPanel.innerHTML = "";
  els.checkButton.disabled = false;
  els.nextButton.disabled = true;
  els.nextButton.textContent = state.currentIndex === state.questions.length - 1 ? "결과 보기" : "다음 문제";

  renderChoices();
  renderSelected();
  renderStatus();
}

function renderChoices() {
  const question = getCurrentQuestion();
  els.choicesList.innerHTML = "";

  question.choices.forEach((choice, index) => {
    const number = index + 1;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice-card";
    button.disabled = state.selected.includes(number) || state.checked;
    if (state.selected.includes(number)) {
      button.classList.add("is-picked");
    }
    button.innerHTML = `<span class="choice-number">${getChoiceLabel(number)}</span>${escapeHtml(choice)}`;
    button.addEventListener("click", () => selectChoice(number));
    els.choicesList.appendChild(button);
  });
}

function renderSelected() {
  els.selectedList.innerHTML = "";

  state.selected.forEach((choiceNumber, index) => {
    const question = getCurrentQuestion();
    const button = document.createElement("button");
    button.type = "button";
    button.className = "selected-card";
    button.disabled = state.checked;
    button.innerHTML = `<span class="selected-rank">${index + 1}</span><span class="choice-number">${getChoiceLabel(choiceNumber)}</span>${escapeHtml(question.choices[choiceNumber - 1])}`;
    button.addEventListener("click", () => removeSelected(choiceNumber));
    els.selectedList.appendChild(button);
  });
}

function renderStatus() {
  const total = state.questions.length;
  const current = Math.min(state.currentIndex + 1, total);
  const remaining = Math.max(total - state.currentIndex - 1, 0);
  const progress = total ? ((state.currentIndex) / total) * 100 : 0;

  els.progressText.textContent = `${current} / ${total}`;
  els.scoreText.textContent = state.score.toLocaleString("ko-KR");
  els.remainingText.textContent = remaining;
  els.comboText.textContent = state.combo;
  els.progressBar.style.width = `${progress}%`;
}

function selectChoice(number) {
  if (state.checked || state.selected.includes(number)) return;
  const question = getCurrentQuestion();
  if (state.selected.length >= question.choices.length) return;
  state.selected.push(number);
  renderChoices();
  renderSelected();
}

function removeSelected(number) {
  if (state.checked) return;
  state.selected = state.selected.filter((item) => item !== number);
  renderChoices();
  renderSelected();
}

function clearSelection() {
  if (state.checked) return;
  state.selected = [];
  renderChoices();
  renderSelected();
}

function checkAnswer() {
  const question = getCurrentQuestion();
  state.checked = true;

  if (state.selected.length !== question.answer.length) {
    state.missedCurrent = true;
    state.combo = 0;
    showResult(false, "모든 카드를 순서대로 선택하지 않았습니다.");
    els.checkButton.disabled = true;
    els.nextButton.disabled = false;
    renderStatus();
    renderChoices();
    renderSelected();
    return;
  }

  const correct = arraysEqual(state.selected, question.answer);

  if (correct) {
    state.correct += 1;
    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    state.score += 100;
    if (!state.missedCurrent && state.combo > 1) {
      state.score += (state.combo - 1) * 20;
    }
    showResult(true);
  } else {
    state.combo = 0;
    state.missedCurrent = true;
    showResult(false);
  }

  els.checkButton.disabled = true;
  els.nextButton.disabled = false;
  renderStatus();
  renderChoices();
  renderSelected();
}

function showResult(correct, message = "") {
  const question = getCurrentQuestion();
  const answerText = question.answer.map(getChoiceLabel).join("-");
  els.resultPanel.className = "result-panel is-visible";
  els.resultPanel.innerHTML = `
    <p class="result-title ${correct ? "clear" : "broken"}">${correct ? "SEQUENCE CLEAR!" : "ORDER BROKEN!"}</p>
    <p class="answer-line">${message ? `${message} ` : ""}정답 순서 : ${answerText}</p>
  `;
}

function goNext() {
  if (state.currentIndex >= state.questions.length - 1) {
    showFinal();
    return;
  }
  state.currentIndex += 1;
  renderQuestion();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showFinal() {
  els.gameView.classList.add("hidden");
  els.finalView.classList.remove("hidden");
  els.finalScore.textContent = state.score.toLocaleString("ko-KR");
  els.finalCorrect.textContent = `${state.correct} / ${state.questions.length}`;
  els.finalCombo.textContent = state.bestCombo;
  els.progressBar.style.width = "100%";
}

function getCurrentQuestion() {
  return state.questions[state.currentIndex];
}

function getChoiceLabel(number) {
  return circledNumbers[number - 1] || String(number);
}

function arraysEqual(a, b) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

els.checkButton.addEventListener("click", checkAnswer);
els.nextButton.addEventListener("click", goNext);
els.restartButton.addEventListener("click", restartGame);
els.clearSelectionButton.addEventListener("click", clearSelection);
els.finalRestartButton.addEventListener("click", restartGame);

init();
