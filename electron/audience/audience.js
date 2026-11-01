const stage = document.getElementById("stage");
const bodyEl = document.getElementById("body");
const titleEl = document.getElementById("title");

// Largest font size (in px) at which the text still fits inside the stage.
function fit() {
  const maxHeight = stage.clientHeight * 0.78;
  let size = Math.min(window.innerHeight * 0.14, window.innerWidth * 0.08);
  bodyEl.style.fontSize = size + "px";
  while (size > 18 && bodyEl.scrollHeight > maxHeight) {
    size -= 2;
    bodyEl.style.fontSize = size + "px";
  }
}

function render(state) {
  if (!state.content || state.blanked) { stage.classList.add("hidden"); return; }
  bodyEl.textContent = state.content.body;
  titleEl.textContent = state.content.title;
  stage.classList.remove("hidden");
  fit();
}

let last = { content: null, blanked: false };
window.audience.onUpdate((s) => { last = s; render(s); });
window.addEventListener("resize", () => render(last));
