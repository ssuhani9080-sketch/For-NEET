let flashcards = [];

// Add new flashcard
function addFlashcard() {
  const subject = document.getElementById("subject").value;
  const chapter = document.getElementById("chapter").value;
  const question = document.getElementById("question").value;
  const answer = document.getElementById("answer").value;

  if (!subject || !chapter || !question || !answer) {
    alert("Please fill all fields!");
    return;
  }

  const card = { subject, chapter, question, answer };
  flashcards.push(card);

  saveFlashcards();
  displayFlashcards();

  // clear inputs
  document.getElementById("subject").value = "";
  document.getElementById("chapter").value = "";
  document.getElementById("question").value = "";
  document.getElementById("answer").value = "";
}

// Display flashcards
function displayFlashcards() {
  const list = document.getElementById("flashcards-list");
  list.innerHTML = "";

  flashcards.forEach((c, index) => {
    list.innerHTML += `
      <div class="flashcard">
        <b>${c.subject} - ${c.chapter}</b>
        <p><b>Q:</b> ${c.question}</p>
        <p><b>A:</b> ${c.answer}</p>
      </div>
    `;
  });
}

// Save to local storage
function saveFlashcards() {
  localStorage.setItem("flashcards", JSON.stringify(flashcards));
}

// Load on start
window.onload = () => {
  const stored = localStorage.getItem("flashcards");
  if (stored) {
    flashcards = JSON.parse(stored);
    displayFlashcards();
  }
};
