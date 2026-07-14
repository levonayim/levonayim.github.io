// ---- Utility: sleep ----
// setTimeout normally works with a callback function, which gets messy
// when you want to "pause" inside a sequence of steps. Wrapping it in a
// Promise lets us use `await sleep(500)` instead — much easier to read.
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ---- Types a string into an element, one character at a time ----
// `async` means this function can use `await` inside it, and that calling
// it returns a Promise (so other code can `await` this function too).
async function typeText(element, text, speed = 25) {
  element.textContent = '';
  for (const char of text) {
    element.textContent += char;
    await sleep(speed); // pause `speed` ms before adding the next character
  }
}

// ---- Runs through every command block in order ----
async function runTerminal() {
  // querySelectorAll grabs every element matching the CSS selector,
  // as a list we can loop over.
  const blocks = document.querySelectorAll('.command-block');

  for (const block of blocks) {
    const promptEl = block.querySelector('.prompt');
    const outputEl = block.querySelector('.output-list');
    const fullText = promptEl.dataset.command; // reads the data-command attribute

    outputEl.style.display = 'none'; // hide the output until its command finishes typing

    await typeText(promptEl, fullText);
    await sleep(200); // brief pause before revealing output, feels more natural

    outputEl.style.display = 'block';
    outputEl.classList.add('fade-in');
  }

  // Intro's done — hand control over to the visitor
  const inputLine = document.getElementById('inputLine');
  inputLine.style.display = 'flex';
  document.getElementById('terminalInput').focus();
}

// ---- Auto-fit the ASCII art to the screen width ----
// Rather than guessing a font-size that "should" fit, we measure the art's
// actual rendered width at a known size, then scale proportionally so the
// widest line exactly matches the available space. Works for any ASCII art,
// any screen size, without ever needing horizontal scrolling.
function fitAsciiArt() {
  const el = document.querySelector('.ascii-art');
  if (!el) return;

  const baseline = 16; // an arbitrary reference font-size, in px, to measure against
  el.style.fontSize = `${baseline}px`;

  const naturalWidth = el.scrollWidth;  // how wide the art actually wants to be at 16px
  const availableWidth = el.clientWidth; // how wide the screen actually gives it

  const scale = availableWidth / naturalWidth;
  const fitted = baseline * scale;

  // Clamp so it's never invisible on a tiny screen or absurdly huge on a giant one
  const finalSize = Math.min(40, Math.max(3, fitted));

  el.style.fontSize = `${finalSize}px`;
}

// Resize events can fire dozens of times a second while dragging a window —
// this "debounce" waits until 150ms of silence before actually recalculating,
// so we're not doing expensive layout math on every pixel of movement.
let resizeTimer;
function debouncedFitAsciiArt() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(fitAsciiArt, 150);
}

window.addEventListener('resize', debouncedFitAsciiArt);
const THEMES = ['dracula', 'nord', 'gruvbox', 'tokyo-night', 'catppuccin', 'solarized']; // add more theme names here as you add them to the CSS

function applyTheme(name) {
  document.documentElement.setAttribute('data-theme', name);
  document.getElementById('themeToggle').textContent = `theme: ${name} ▾`;
  localStorage.setItem('preferred-theme', name); // remember choice for next visit

  // Highlight the active option in the menu (if it's been built yet)
  document.querySelectorAll('#themeMenu li').forEach(li => {
    li.classList.toggle('active', li.dataset.theme === name);
  });
}

function buildThemeMenu() {
  const menu = document.getElementById('themeMenu');

  THEMES.forEach(name => {
    const item = document.createElement('li');
    item.textContent = name;
    item.dataset.theme = name; // store the theme name on the element itself

    item.addEventListener('click', () => {
      applyTheme(name);
      menu.classList.remove('open'); // close the menu after picking
    });

    menu.appendChild(item);
  });
}

function initTheme() {
  buildThemeMenu();

  // Use the saved theme if there is one, otherwise default to the first in the list
  const saved = localStorage.getItem('preferred-theme');
  applyTheme(saved && THEMES.includes(saved) ? saved : THEMES[0]);

  const toggleBtn = document.getElementById('themeToggle');
  const menu = document.getElementById('themeMenu');

  // Clicking the button opens/closes the menu
  toggleBtn.addEventListener('click', (event) => {
    event.stopPropagation(); // stop this click from immediately triggering the "close" listener below
    menu.classList.toggle('open');
  });

  // Clicking anywhere else on the page closes the menu
  document.addEventListener('click', () => {
    menu.classList.remove('open');
  });
}

// Builds a text progress bar like "██████████░░░░░░░░░░" out of block
// characters — filled proportional to `percent`, out of a total `width`.
function bar(percent, width = 20) {
  const filled = Math.round((percent / 100) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

// ---- Interactive commands ----
// This is the "registry" pattern: instead of a long if/else or switch
// chain, each command name maps directly to a function that returns its
// output as a string. To add a command later, just add a new entry here.
const commands = {
  help: () => `Available commands:

  help                      Show available commands
  about                     Who is she?
  skills                    Technical skills
  work                      Career history
  contact                   Get in touch
  clear                     Clear the terminal
  theme [name]              Switch color theme (${THEMES.join(', ')})
  catsay <text>             Meow
  dogsay <text>             Woof
  neofetch                  System info
  matcha                    Whisk a cup
  cat pizza.txt             Hungry?
  ls secrets/               Snooping around?
  sudo rm -rf /             You wouldn't dare
  sudo make me a sandwich   ...
  fortune                   A little wisdom
  exit                      Try and leave`,

  about: () => `     .-'''''-.
   .'         '.
  /   O     O   \\
 |       ^       |
 |     \\___/     |
  \\             /
   '.         .'
     '-.....-'

Hi! I’m Levona, a multidisciplinary product designer based in Vancouver, BC with 7 years of experience.

I believe that delightful experiences come from understanding user interactions and learning their mental models and context. This allows me to not only see the entire system, but also discover the smaller experiences in between.

On the side, I love drawing cartoon characters and experimenting through vibe coding small apps. When I’m not designing, I like to relax and read. I enjoy lifting weights, jogging, and going on nature hikes.`,

  skills: () => {
    // Each entry: [skill name, percentage]. Edit freely.
    const skillList = [
      ['Product Design', 90],
      ['Design Systems', 80],
      ['UX Research', 80],
      ['Figma', 90],
      ['Prototyping', 90],
      ['Illustrating', 90],
      ['HTML / CSS', 80],
      ['AI / Prompt Design', 70],
    ];

    // Find the longest name in the list, so the pad width always fits
    // whatever names are here — no more guessing a fixed number that
    // breaks the moment a longer skill gets added.
    const longestName = Math.max(...skillList.map(([name]) => name.length));

    return skillList
      .map(([name, pct]) => `${name.padEnd(longestName + 1)} ${bar(pct)} ${pct}%`)
      .join('\n');
  },

  work: () => `
2021-2025   Lead Product Designer @ FICO
2019–2021   UX Designer & Developer @ Kashoo
2018–2020   Digital Designer @ Mothers Matter Center
2015–2027   UX Web Designer Intern @ City of Surrey
2014–2015   Designer Intern @ Scentuals Body Care `,

  contact: () => `Email:    levona.yim@gmail.com
LinkedIn: https://www.linkedin.com/in/levona-yim/`,

  // Commands below use `args` — the words typed after the command name.

  catsay: (args) => {
    const text = args.join(' ') || 'Meow?';
    const border = '-'.repeat(text.length + 2);
    return ` ${border}
< ${text} >
 ${border}
        \\   /\\_/\\
         \\ ( o.o )
            >   ^ 
           /     \\
          (       )
           \`-----'
`;
},

dogsay: (args) => {
    const text = args.join(' ') || 'Woof?';
    const border = '-'.repeat(text.length + 2);
    return ` ${border}
< ${text} >
 ${border}
         /\\   /\\
        (  . .  )
         )  Y  (
        /|  \u203e  |\\
       (_|     |_)
`;
},

  neofetch: () => `OS:        LevonaYimOS 2026
Host:      levonayim.ca
Shell:     fake-sh 1.0
Theme:     ${document.documentElement.getAttribute('data-theme')}
Languages: HTML, CSS, JavaScript`,

  matcha: () => `      
        ( (
        (  (
         )  )
        (  (
    .-----------.
    |           |
    (  hot tea  )
    |           |
    .-----------.

Enjoy your matcha 🍵`,

  exit: () => `Connection closed.
Just kidding, you can't leave that easily. 😏`,

  fortune: () => {
    // Add as many as you want — one gets picked at random each time.
    const fortunes = [
      'Code never lies, comments sometimes do.',
      'It works on my machine. 😏',
      'The best error message is the one that never shows up.',
      'Ctrl+Z is my best friend',
    ];
    // Math.random() gives a decimal between 0 (inclusive) and 1 (exclusive).
    // Multiplying by the array's length and flooring it gives a random valid index.
    const index = Math.floor(Math.random() * fortunes.length);
    return fortunes[index];
  },
};

// Appends one line of text to the output area, styled as either
// the echoed command ("echo-line") or its result ("output-line").
function printLine(text, className) {
  const container = document.getElementById('terminalOutput');
  const line = document.createElement('pre');
  line.className = className;
  line.textContent = text;
  container.appendChild(line);
  line.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

// Parses and runs whatever the visitor typed
function handleCommand(rawInput) {
  const trimmed = rawInput.trim();
  if (trimmed === '') return;

  // Split "theme nord" into cmd = "theme", args = ["nord"]
  const [cmd, ...args] = trimmed.split(' ');

  // "clear" is special: it wipes the output instead of printing anything
  if (cmd === 'clear') {
    document.getElementById('terminalOutput').innerHTML = '';
    return;
  }

  // Every other command: first echo what was typed, like a real shell
  printLine(`you@site:~$ ${trimmed}`, 'echo-line');

  if (cmd === 'theme') {
    const name = args[0];
    if (name && THEMES.includes(name)) {
      applyTheme(name); // reuses the exact function the dropdown menu calls
      printLine(`Theme switched to ${name}.`, 'output-line');
    } else {
      printLine(`Usage: theme [${THEMES.join('|')}]`, 'output-line');
    }
  } else if (cmd === 'cat') {
    if (args[0] === 'pizza.txt') {
      printLine(
        `     _.-'''''-._
   .'   o   o   '.
  /   o    o    o \\
 |  o    o    o    |
  \\   o    o   o  /
   '.___________.'

Here's your pizza, enjoy!`,
        'output-line'
      );
    } else {
      printLine(`cat: ${args[0] || ''}: No such file or directory`, 'output-line');
    }
  } else if (cmd === 'ls') {
    if (args[0] === 'secrets/') {
      printLine(
        `drwxr-xr-x  origins.txt    "Started off in chemistry in 2010 and entered into the design world in 2012."
drwxr-xr-x  learning.txt   "Trying to keep up with the AI prompt world every day."
drwxr-xr-x  fuel.txt       "Runs on water (not caffeine), broken sleep, and curiosity."`,
        'output-line'
      );
    } else {
      printLine(`ls: cannot access '${args[0] || ''}': No such file or directory`, 'output-line');
    }
  } else if (cmd === 'sudo') {
    if (args.join(' ') === 'make me a sandwich') {
      printLine(`Okay. 🥪`, 'output-line');
    } else {
      printLine(`Nice try. You wouldn't dare 😏`, 'output-line');
    }
  } else if (commands[cmd]) {
    printLine(commands[cmd](args), 'output-line');
  } else {
    printLine(`Command not found: ${cmd}. Type 'help' for available commands.`, 'output-line');
  }
}

function initInteractiveTerminal() {
  const input = document.getElementById('terminalInput');

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      handleCommand(input.value);
      input.value = ''; // clear the field for the next command
    }
  });

  // Clicking anywhere in the terminal refocuses the input,
  // so the visitor can just start typing without hunting for the cursor.
  document.querySelector('.terminal').addEventListener('click', () => {
    input.focus();
  });
}

// Wait until the HTML is fully loaded before running any of this,
// otherwise querySelectorAll might run before the elements exist.
document.addEventListener('DOMContentLoaded', () => {
  fitAsciiArt();
  initTheme();
  initInteractiveTerminal();
  runTerminal();
});


// ---- Halftone dot-grid cursor effect ----
// Wrapped in an IIFE so none of its variable names leak into the global
// scope and risk colliding with anything above.
(function () {
  const canvas = document.getElementById('fx');
  if (!canvas) return; // bail quietly if the canvas markup isn't on the page
  const ctx = canvas.getContext('2d');

  let W, H;
  const dpr = window.devicePixelRatio || 1;

  function resizeCanvas() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildCells();
  }

  const spacing = 14; // px between dots
  const minR = 1.2;
  const maxR = 6;

  // The dot grid's size is driven by a coarse grid of "cells" — each cell
  // oscillates on its own random phase/frequency, and every dot's radius is
  // bilinearly interpolated between its four surrounding cells. That's what
  // produces smooth, blocky-looking patches drifting across the grid,
  // rather than a single uniform wave or pure random noise.
  const cell = 70; // px per coarse cell — bigger cell = bigger patches
  let cols, rows, cellData;

  function buildCells() {
    cols = Math.ceil(W / cell) + 2;
    rows = Math.ceil(H / cell) + 2;
    cellData = [];
    for (let i = 0; i < cols * rows; i++) {
      cellData.push({
        phase: Math.random() * Math.PI * 2,
        freq: 0.4 + Math.random() * 0.5,
      });
    }
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Cursor position, eased slightly so the hover boost doesn't feel too rigid
  let targetMX = -1000, targetMY = -1000;
  let mouseX = -1000, mouseY = -1000;

  document.addEventListener('mousemove', (e) => {
    targetMX = e.clientX;
    targetMY = e.clientY;
  });
  document.addEventListener('mouseleave', () => {
    targetMX = -1000;
    targetMY = -1000;
  });

  function cellValue(cx, cy, t) {
    cx = Math.max(0, Math.min(cols - 1, cx));
    cy = Math.max(0, Math.min(rows - 1, cy));
    const d = cellData[cy * cols + cx];
    return 0.5 + 0.5 * Math.sin(t * d.freq + d.phase);
  }

  let t = 0;

  function draw() {
    t += 0.02;
    mouseX += (targetMX - mouseX) * 0.25;
    mouseY += (targetMY - mouseY) * 0.25;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#5b8def';

    for (let y = 0; y < H; y += spacing) {
      for (let x = 0; x < W; x += spacing) {
        const cx = Math.floor(x / cell);
        const cy = Math.floor(y / cell);
        const fx = (x % cell) / cell;
        const fy = (y % cell) / cell;

        const v00 = cellValue(cx, cy, t);
        const v10 = cellValue(cx + 1, cy, t);
        const v01 = cellValue(cx, cy + 1, t);
        const v11 = cellValue(cx + 1, cy + 1, t);
        const vTop = v00 + (v10 - v00) * fx;
        const vBot = v01 + (v11 - v01) * fx;
        const val = vTop + (vBot - vTop) * fy;

        const dx = x - mouseX, dy = y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const boost = Math.max(0, 1 - dist / 90);

        const r = minR + (maxR - minR) * Math.min(1, val + boost * 0.9);

        ctx.globalAlpha = 0.35 + 0.65 * (r - minR) / (maxR - minR);
        ctx.beginPath();
        ctx.arc(x, y, r / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();
