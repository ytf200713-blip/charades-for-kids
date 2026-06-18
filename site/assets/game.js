(function () {
  const data = window.CHARADES_DATA || { decks: [] };
  const els = {
    deckSelect: document.getElementById("deck-select"),
    ageSelect: document.getElementById("age-select"),
    startRound: document.getElementById("start-round"),
    resetGame: document.getElementById("reset-game"),
    skipCard: document.getElementById("skip-card"),
    correctCard: document.getElementById("correct-card"),
    nextCard: document.getElementById("next-card"),
    scoreCorrect: document.getElementById("score-correct"),
    scoreSkipped: document.getElementById("score-skipped"),
    cardsLeft: document.getElementById("cards-left"),
    roundLabel: document.getElementById("round-label"),
    timerDisplay: document.getElementById("timer-display"),
    playCard: document.getElementById("play-card"),
    playIcon: document.getElementById("play-icon"),
    playTitle: document.getElementById("play-title-text"),
    playSubtitle: document.getElementById("play-subtitle")
  };

  const state = {
    deck: [],
    current: null,
    correct: 0,
    skipped: 0,
    seconds: 60,
    remaining: 60,
    timerId: null,
    running: false
  };

  function getTimerSeconds() {
    const selected = document.querySelector('input[name="timer"]:checked');
    return Number(selected ? selected.value : 60);
  }

  function getFilteredCards() {
    const deckId = els.deckSelect.value;
    const age = els.ageSelect.value;
    const sourceDecks = deckId === "all" ? data.decks : data.decks.filter((deck) => deck.id === deckId);
    return sourceDecks
      .flatMap((deck) => deck.cards.map((card) => ({ ...card, deckName: deck.name, deckId: deck.id })))
      .filter((card) => age === "all" || card.ageBand === "all" || card.ageBand === age);
  }

  function shuffle(cards) {
    const result = [...cards];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const target = Math.floor(Math.random() * (index + 1));
      [result[index], result[target]] = [result[target], result[index]];
    }
    return result;
  }

  function setButtons(disabled) {
    els.correctCard.disabled = disabled;
    els.skipCard.disabled = disabled;
    els.nextCard.disabled = disabled;
  }

  function updateScore() {
    els.scoreCorrect.textContent = String(state.correct);
    els.scoreSkipped.textContent = String(state.skipped);
    els.cardsLeft.textContent = String(state.deck.length + (state.current ? 1 : 0));
  }

  function renderCard(card) {
    if (!card) {
      els.playIcon.replaceChildren();
      const img = document.createElement("img");
      img.src = "assets/cards/charades-ready-scene.jpg";
      img.alt = "Kids charades printable cards ready to play";
      els.playIcon.appendChild(img);
      els.playTitle.textContent = "Ready?";
      els.playSubtitle.textContent = "Tap Start Round";
      els.playCard.classList.remove("has-card");
      updateScore();
      return;
    }

    els.playIcon.replaceChildren();
    if (card.imageSrc) {
      const img = document.createElement("img");
      img.src = card.imageSrc;
      img.alt = `${card.title} charades card for kids`;
      els.playIcon.appendChild(img);
      els.playCard.classList.add("has-card");
    } else {
      els.playIcon.textContent = card.icon;
      els.playCard.classList.remove("has-card");
    }
    els.playTitle.textContent = card.title;
    els.playSubtitle.textContent = `${card.theme} • ${card.difficulty}`;
    updateScore();
  }

  function drawNextCard() {
    if (!state.deck.length) {
      state.current = null;
      els.playIcon.replaceChildren();
      const img = document.createElement("img");
      img.src = "assets/cards/charades-ready-scene.jpg";
      img.alt = "Kids charades printable cards ready to play";
      els.playIcon.appendChild(img);
      els.playTitle.textContent = "All Done!";
      els.playSubtitle.textContent = "Reset or choose another deck";
      els.playCard.classList.remove("has-card");
      els.roundLabel.textContent = "No cards left in this round.";
      setButtons(true);
      stopTimer();
      updateScore();
      return;
    }

    state.current = state.deck.shift();
    renderCard(state.current);
  }

  function stopTimer() {
    if (state.timerId) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
    state.running = false;
  }

  function startTimer() {
    stopTimer();
    state.remaining = state.seconds;
    els.timerDisplay.textContent = String(state.remaining);
    state.running = true;
    state.timerId = setInterval(() => {
      state.remaining -= 1;
      els.timerDisplay.textContent = String(Math.max(state.remaining, 0));
      if (state.remaining <= 0) {
        stopTimer();
        els.roundLabel.textContent = "Time is up.";
        setButtons(true);
      }
    }, 1000);
  }

  function startRound() {
    state.seconds = getTimerSeconds();
    state.correct = 0;
    state.skipped = 0;
    state.deck = shuffle(getFilteredCards());
    state.current = null;
    els.timerDisplay.textContent = String(state.seconds);

    if (!state.deck.length) {
      els.roundLabel.textContent = "No cards match this filter.";
      renderCard(null);
      setButtons(true);
      return;
    }

    els.roundLabel.textContent = `${state.deck.length} cards ready`;
    setButtons(false);
    drawNextCard();
    startTimer();
  }

  function resetGame() {
    stopTimer();
    state.deck = [];
    state.current = null;
    state.correct = 0;
    state.skipped = 0;
    state.seconds = getTimerSeconds();
    state.remaining = state.seconds;
    els.timerDisplay.textContent = String(state.seconds);
    els.roundLabel.textContent = "Choose a deck, then start.";
    setButtons(true);
    renderCard(null);
  }

  function markCorrect() {
    if (!state.current || !state.running) return;
    state.correct += 1;
    drawNextCard();
  }

  function markSkipped() {
    if (!state.current || !state.running) return;
    state.skipped += 1;
    drawNextCard();
  }

  function nextWithoutScore() {
    if (!state.current || !state.running) return;
    drawNextCard();
  }

  function syncReadyCount() {
    if (state.running) return;
    const count = getFilteredCards().length;
    els.cardsLeft.textContent = String(count);
    els.roundLabel.textContent = `${count} cards available`;
    state.seconds = getTimerSeconds();
    els.timerDisplay.textContent = String(state.seconds);
  }

  els.startRound.addEventListener("click", startRound);
  els.resetGame.addEventListener("click", resetGame);
  els.correctCard.addEventListener("click", markCorrect);
  els.skipCard.addEventListener("click", markSkipped);
  els.nextCard.addEventListener("click", nextWithoutScore);
  els.deckSelect.addEventListener("change", syncReadyCount);
  els.ageSelect.addEventListener("change", syncReadyCount);
  document.querySelectorAll('input[name="timer"]').forEach((input) => {
    input.addEventListener("change", syncReadyCount);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight" || event.key.toLowerCase() === "c") {
      markCorrect();
    }
    if (event.key === "ArrowLeft" || event.key.toLowerCase() === "s") {
      markSkipped();
    }
    if (event.key === " ") {
      event.preventDefault();
      if (state.running) {
        nextWithoutScore();
      } else {
        startRound();
      }
    }
  });

  setButtons(true);
  syncReadyCount();
})();
