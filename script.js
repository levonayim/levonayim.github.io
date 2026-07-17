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
  theme [name]              Change theme (${THEMES.join(', ')})
  catsay <text>             Meow
  dogsay <text>             Woof
  neofetch                  System info
  matcha                    Whisk a cup
  cat pizza.txt             Hungry?
  ls secrets/               Snooping around?
  sudo rm -rf /             You wouldn't dare
  sudo make me a sandwich   ...
  random                    Random facts
  exit                      Try and leave`,

  about: () => 
`     .-'''''-.
   .'         '.
  /   O     O   \\
 |       ^       |
  \\    \\___/    /
   '.         .'
     '-.....-'

Hi! I’m Levona, a multidisciplinary Product Designer specializing in B2B enterprise software and user-centric B2C solutions, with 7+ years of end-to-end design experience.

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
      ['AI / Prompt Design', 75],
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
2019–2019   Junior UX Designer @ Rectxt
2018–2020   Digital Designer @ Mothers Matter Center
2015–2017   UX Web Designer Intern @ City of Surrey
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
Just kidding 😏`,

  random: () => {
    // Add as many as you want — one gets picked at random each time.
    const random = [
      'Sloths can hold their breath longer than dolphins.',
      'Honey never spoils.',
      'The heart of a shrimp is located in its head.',
      'Flamingos are not born pink.',
      'A day on Venus is longer than a year.',
    ];
    // Math.random() gives a decimal between 0 (inclusive) and 1 (exclusive).
    // Multiplying by the array's length and flooring it gives a random valid index.
    const index = Math.floor(Math.random() * random.length);
    return random[index];
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
  let trimmed = rawInput.trim();
  if (trimmed === '') return;

  // Normalize alternative back navigation inputs
  if (trimmed === 'cd..' || trimmed === 'cd ..' || trimmed.toLowerCase() === 'go back' || trimmed.toLowerCase() === 'back') {
    goBackToCompanies();
    printLine(`you@site:~$ ${trimmed}`, 'echo-line');
    printLine(`Returned to ~/work.`, 'output-line');
    return;
  }

  // Split "theme nord" into cmd = "theme", args = ["nord"]
  const [cmd, ...args] = trimmed.split(' ');

  // "clear" is special: it wipes the output instead of printing anything
  if (cmd === 'clear') {
    document.getElementById('terminalOutput').innerHTML = '';
    return;
  }
// ---- ADDED: Native handling for 'cd' navigation commands ----
  if (cmd === 'cd') {
    printLine(`you@site:~$ ${trimmed}`, 'echo-line');

    const targetDir = args.join(' ');
    // Strip a leading "./" or "work/" and any trailing slash, so
    // "cd fico", "cd work/fico", and "cd ./work/fico/" all resolve the same way.
    const normalizedDir = targetDir.replace(/^\.\/|^work\//, '').replace(/\/$/, '');

    if (targetDir === '' || targetDir === '..' || targetDir === '../' || targetDir === 'work') {
      goBackToCompanies();
      printLine(`Returned to ~/work.`, 'output-line');
    } else if (workData[normalizedDir]) {
      openCompany(normalizedDir);
      printLine(`Navigated to ~/work/${normalizedDir}.`, 'output-line');
    } else {
      printLine(`cd: no such file or directory: ${targetDir}`, 'output-line');
    }
    return; // Stop processing further command lookups
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
drwxr-xr-x  learning.txt   "Trying to keep up with the AI world every day."
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

// ---- Work section navigation ----
// Three states share the same two-column layout:
//   1. Default: company list fills the left column, right column is empty, layout unsplit.
//   2. A company is clicked: left column swaps to that company's project list, split view opens.
//   3. A project is clicked: right column fills with its case study (left column stays put).
// Clicking the green prompt line at any point in states 2/3 returns to state 1.
//
// NOTE: the "full" case study text below is placeholder copy — replace it with
// your real write-ups whenever you're ready. Keep the same shape (role/tools/
// outcome/body) so renderCaseStudy() below doesn't need to change.
const workData = {
  fico: {
    path: './work/fico',
    total: 4,
    projects: [
      {
        name: 'data-schemas/',
        comment: 'The backbone for building complex, unified data structures',
        role: 'Lead Product Designer',
        tools: 'Figma, Lucidcharts, Claude',
        outcome: 'Adopted across 4 product lines, cutting design-to-dev handoff time by roughly 40%.',
        tldr: 'Designed a centralized schema management system for the FICO platform as well as a self-serve Micro Front-End (MFE) component. I later expanded this work independently into an advanced concept exploring ERD canvas models and AI integrations.',
        link: 'https://www.levonayim.com/project/3f8j2k',
        images: [
          { type: 'figma',
          src: 'assets/fico/btc/btc-fico.png',   // a PNG you export from Figma yourself
          figmaUrl: 'https://www.figma.com/design/xnzxJzrzLVmRC6ZRUU4OMc/Shared---Levona-BTC?node-id=0-1&t=XPd36sKQJH8RXB3R-1',
          caption: `BTC/Data Schemas`},
          { src: 'assets/fico/btc/FICOWorldFinalPresented.png', caption: 'UI presented to clients at FICO World 2025 - ERD + Combining BTC with Aggregations together' },
          { src: 'assets/fico/btc/BTCLight.png', caption: 'Final - BTC UI - Table in light mode' },
          { src: 'assets/fico/btc/BTCDark.png', caption: 'Final - BTC UI - Table in dark mode' },
          { src: 'assets/fico/btc/Light-AddBT.png', caption: 'Final - Adding a new Business Term Set in light mode' },
          { src: 'assets/fico/btc/Dark-AddBT.png', caption: 'Final - Adding a new Business Term Set in dark mode' },
          { src: 'assets/fico/btc/FinalBTCDarkMode.png', caption: 'Bulk actions on the table for BTC but also reused across other capabilities that have tables.' },
        ],
        figmalink: [`https://www.figma.com/design/hhpdUygbGyTenp23CNxK1g/Shared---Levona-s-take-on-BTC-2026?node-id=2-2925&t=oPNBllSaURj90ChR-1`],
        body: [
          'As Lead Product Designer, I designed a centralized schema management system for the FICO platform to eliminate conflicting data definitions and fragile upstream dependencies. Collaborating with PMs, architects, and engineers, I led the end-to-end design of a plug-and-play Micro Front-End (MFE) component that transformed weeks of cross-team coordination into an instant, self-serve setup for both technical and non-technical users.',
          'After my departure from FICO, I independently expanded the project into an advanced design concept exploring ERD canvas models, smart search suggestions, and AI integrations.',
        ],
      },
      {
        name: 'fico-platform/',
        comment: 'Enterprise B2B platform turning complex logic into unlimited service configurations',
        role: 'Lead Product Designer',
        tools: 'Figma, Figjam',
        outcome: 'A visual platform blueprint that aligned siloed teams, and streamlined onboarding new teammates.',
        tldr: `I independently designed FICO's first end-to-end visual platform map and a simplified "House Analogy" framework to translate complex technical architectures into a shared vocabulary. This self-initiated project broke down organizational silos, streamlined cross-functional onboarding, and was used to preview the new platform to clients.`,
        link: 'https://www.levonayim.com/project/fico-platform',
        images: [
          { type: 'video', videoId: '8j4Z873We-o&t=4140s', caption: 'FICO Platform demo walkthrough - FICO World 2026' },
          { type: 'figma',
          src: 'assets/fico/platform/figma-thumbnail.png',   // a PNG you export from Figma yourself
          figmaUrl: 'https://www.figma.com/design/WsEGtkhZA8JJs7UDiBQAHm/Shared---Levona-FICO-Platform?node-id=4-6&t=cZqmnR4I7kw8BHzm-1',
          caption: `Overall FICO Platform early stages`},
          { src: 'assets/fico/platform/SketchyFlow.png', caption: `I took the initial stab on creating a very lofi sketch and flow of the overall platform` },
          { src: 'assets/fico/platform/highlevel-slide.png', caption: 'high level view of the platform in relation to building a house' },
        ],
        body: [
          'Recognizing a critical organizational gap during FICO’s platform transformation, I took initiative to design the first end-to-end visual blueprint and alignment framework to break down internal silos. I translated dense technical documentation into a cohesive visual map of the user journey (Day 0 to Day 2) and created the "House" analogy framework to translate abstract architectures into a shared, layman-friendly vocabulary.',
          'This self-initiated project quickly became the visual backbone of the platform, successfully streamlining cross-functional onboarding and providing the alignment framework used to preview the new FICO Platform to clients.',
        ],
      },
      {
        name: 'feature-aggregation',
        comment: 'No-code aggregations for analyzing massive event and transaction data',
        role: 'Lead Product Designer',
        tools: 'Figma',
        outcome: 'Deliminates weeks of cross-team engineering coordination and allow business analysts have more control and ownership.',
        tldr: `Designed FICO's Feature Management platform, translating complex real-time data coding into an intuitive, step-by-step UI. This plug-and-play architecture empowered non-technical analysts to build advanced risk and fraud configurations instantly, eliminating weeks of cross-team engineering coordination.`,
        link: 'https://www.levonayim.com/project/kj98hv',
        images: [
          { type: 'video', videoId: '8j4Z873We-o&t=4140s', caption: 'FICO Platform demo walkthrough - FICO World 2026' },
          { type: 'figma',
          src: 'assets/fico/fm-agg/figma-agg.png',   // a PNG you export from Figma yourself
          figmaUrl: 'https://www.figma.com/design/UZgDp90Pij0oTZvBH9cmGT/Shared---Levona-Aggregation?node-id=0-1&t=ghf2CgxJKjDhxzeK-1',
          caption: `Feature Management - Aggregations`},
          { src: 'assets/fico/fm-agg/Aggregations.png', caption: 'List of Aggregations - light mode' },
          { src: 'assets/fico/fm-agg/Aggregationsdark.png', caption: 'List of Aggregations - dark mode' },
          { src: 'assets/fico/fm-agg/Windowtype.png', caption: 'List of Aggregations - light mode' },
          { src: 'assets/fico/fm-agg/AddAggregationlight.png', caption: 'List of Aggregations - light mode' },
          { src: 'assets/fico/fm-agg/AddAggregationdark.png', caption: 'List of Aggregations - dark mode' },
          { src: 'assets/fico/fm-agg/Agg-bulkactions.png', caption: 'Aggregations - Bulk actions. Reused in other capabilities as well.' },
        ],
        body: [
          `As Lead Product Designer, I designed the end-to-end experience for FICO's Feature Management platform to streamline how financial institutions track real-time customer data for risk and fraud prevention. Partnering with product management and engineering, I translated complex coding processes into an intuitive, linear form-based interface that guides analysts through configuring advanced parameters independently.`,
           `This capability would eliminates weeks of cross-team engineering coordination, enabling non-technical users to build real-time data configurations instantly and seamlessly across different product environments.`,
        ],
        
      },
      {
        name: 'day0-1-onboarding/',
        comment: 'A seamless entry point for onboarding, feature exploration, and personalization',
        role: 'Lead Product Designer',
        tools: 'Figma, Lucidchart',
        outcome: 'Prototypes were used live in the keynote stage presentation.',
        tldr: 'Turned future-facing product concepts into working prototypes for a live keynote stage demo.',
        link: 'https://www.levonayim.com/project/sfkfma',
        images: [
          { type: 'figma',
          src: 'assets/fico/day01/day01finalscreenszoomedin.png',   // a PNG you export from Figma yourself
          figmaUrl: 'https://www.figma.com/design/yyxSXRYLLIdxAa17IUhV0a/Shared---Levona-Day-01?node-id=0-1&t=cFW71F4ofXYnad3o-1',
          caption: `Day 01 / Onboarding flow`},
          { src: 'assets/fico/day01/DAY01MyAttempt.png', caption: 'Sketch of Day0/1 initial flow' },
          { src: 'assets/fico/day01/JTBD.png', caption: 'JTBD + Flow based on persona' },
          { src: 'assets/fico/day01/Admin.png', caption: 'Homepage - Admin' },
          { src: 'assets/fico/day01/SolutionCreator.png', caption: 'Homepage - Solution Creator' },
          { src: 'assets/fico/day01/ServiceCreator2.png', caption: 'Homepage - Service Creator' },
          { src: 'assets/fico/day01/BA2.png', caption: 'Homepage - Business Analyst' },
        ],
        body: [
          'Built high-fidelity interactive prototypes used in the main keynote stage presentation, translating future-facing product concepts into something audiences could see working.',
        ],
      },
    ],
  },
  kashoo: {
    path: './work/kashoo',
    total: 2,
    projects: [
      {
        name: 'kashoo-web-2.0/',
        comment: 'Cloud accounting dashboard overhaul and responsive web apps',
        role: 'UX Designer & Developer',
        tools: 'Sketch, Figma, HTML,CSS, Github',
        outcome: 'Shipped the highly anticipated redesign of Kashoo 2.0 to our existing customer base.',
        tldr: 'Led the end-to-end UX design and launch of the Kashoo 2.0 web app from discovery to prototyping. I also supported a small team of two engineers by directly contributing CSS UI fixes.',
        link: 'https://www.levonayim.com/project/kashoo-2-web',
        images: [
          { src: 'assets/kashoo/Kashoo-laptop.png', caption: 'Kashoo Web 2.0' },
          { src: 'assets/kashoo/toggletab.gif', caption: 'Different views within the modale depending on the task.' },
          { src: 'assets/kashoo/new-menu.gif', caption: 'New side menu added' },
          { src: 'assets/kashoo/relativedates.gif', caption: 'Making the date selection more dynamic.' },
          { src: 'assets/kashoo/kashoo-bulk-edit.gif', caption: 'Bulk editing feature for faster task completion.' },
          { src: 'assets/kashoo/report.gif', caption: 'Users can see first-hand all reports available once items have been added into the system.' },
          { src: 'assets/kashoo/invoices.gif', caption: 'Users can create invoices easily.' },
           { src: 'assets/kashoo/dashboard-accessibility.gif', caption: 'Accessibility was taken into account when designing the UI.' },
        ],
        body: [
          'As UX Lead, I led the end-to-end design and launch of the Kashoo 2.0 web app, transforming a complex accounting tool into a streamlined experience. I managed the entire product lifecycle from discovery to prototyping while collaborating closely with PMs, engineering, and QA. To support our small team of 2 developers, I also contributed to the codebase by writing CSS UI fixes and coding email templates using Mustache, Golang, and CSS.',
        ],
      },
      {
        name: 'trulysmall-ios/',
        comment: 'Free invoice generator for small businesses, freelancers and startup.',
        role: 'UX Designer & Developer',
        tools: 'Figma, HTML, CSS, {{mustache}}',
        outcome: 'Launched a free user-friendly invoicing app for small business owners.',
        tldr: 'Successfully launched the MVP app in January 2021 on a tight timeline for tax season, establishing the brand’s visual identity and successfully deploying custom, hand-coded HTML/CSS dynamic email templates.',
        link: 'https://www.levonayim.com/project/trulysmall-invoicing',
        images: [
          { src: 'assets/kashoo/ts-screens-static.png', caption: 'TrulySmall Invoicing - Overall screens' },
            { src: 'assets/kashoo/flow1-ts.gif', caption: 'TrulySmall Invoicing - Overall screens' },
          { src: 'assets/kashoo/majorityflow-ts.gif', caption: 'TrulySmall Invoicing - Overall flow' },
          { src: 'assets/kashoo/markaspaid.gif', caption: 'TrulySmall Invoicing - Mark as paid flow' },
          { src: 'assets/kashoo/darkmodeadded.gif', caption: 'TrulySmall Invoicing - Dark Mode' },

        ],
        body: [
          'As UX Lead, I established the visual branding and designed the MVP for the TrulySmall invoicing app, launching it in January 2021 for tax season. I managed the end-to-end UX process, collaborating with a brand designer to craft an approachable aesthetic with warm tones, friendly illustrations, and distinct typography. To bridge design and engineering, I also hand-coded the dynamic, client-facing invoice templates using HTML, CSS, and Mustache.',
        ],
      },
    ],
  },
  mmc: {
    path: './work/mmc',
    total: 1,
    projects: [
      {
        name: 'website-redesign/',
        comment: 'Complete visual identity ecosystem guidelines and website launch',
        role: 'Digital Designer',
        tools: 'Wordpress, CSS, Sketch, Photoshop',
        outcome: 'A new brand identity and launched the redesigned website.',
        tldr: 'Redesigned and developed a responsive WordPress site in under 2.5 months, integrating seamless donation and outreach tools to boost engagement.',
        link: 'https://levonayim.com/mothers-matter-centre',
        images: [
          { src: 'assets/mmc/mmc-home.gif', caption: 'New Homepage for Mothers Matter Center' },
          { src: 'assets/mmc/mmc-oct2020full.png', caption: 'Full view of the new homepage redesign' },
          { src: 'assets/mmc/mmc-hippy.png', caption: 'Inner page: HIPPY is the umbrella for Mothers Matter Center' },
          { src: 'assets/mmc/mmc-stories.png', caption: 'Inner page: Showcasing empowered mothers' },
          { src: 'assets/mmc/mmc-canadahelps.png', caption: 'Inner page: Newly added Canada Helps page to accept donations' },
          { src: 'assets/mmc/mmc-faq.png', caption: 'Inner page: Redid the FAQ page' },
        ],
        body: [
          `As the sole web designer, I led the end-to-end redesign and WordPress development of the Mothers Matter Centre website in under 2.5 months, transforming a dense, hard-to-navigate site into an accessible, mission-driven platform. After facilitating cross-department workshops to align on requirements, I overhauled the site's information architecture and designed fully responsive layouts to simplify complex content. To optimize user engagement and increase fundraising, I integrated MailChimp, Google Analytics, and a seamless, on-site CanadaHelps donation gateway.`,
        ],
      },
    ],
  },
  surrey: {
    path: './work/surrey',
    total: 1,
    projects: [
      {
        name: 'mysurrey-portal/',
        comment: 'Core operational municipal infrastructure interface architecture',
        role: 'UX Web Designer Intern',
        tools: 'Sketch, Axure, Invision, Illustrator, Zeplin, HTML, CSS',
        outcome: 'Helped launch the portal and its first 5 online services.',
        tldr: 'Led the UX design and front-end styling to launch a responsive citizen portal that digitized fragmented, paper-based city services into a unified online platform.',
        link: 'https://www.levonayim.com/project/mysurrey-portal',
        images: [
          { src: 'assets/cos/inside-mysurreyportal.jpg', caption: 'City of Surrey MySurrey Portal' },
          { src: 'assets/cos/brs-final.png', caption: 'Placeholder image 2 — replace with a real screenshot.' },
          { src: 'assets/cos/brs-main-mobile.png', caption: 'Mobile UI for Building Record Search' },
          { src: 'assets/cos/brs-main.png', caption: 'Main screen for Building Record Search, one of the first applications released.' },
          { src: 'assets/cos/fsp-recording.gif', caption: 'Fire Safety Plan UI.' },
        ],
        body: [
          'Designed and launched the initial phase of the MySurrey Portal, transforming fragmented, paper-based city workflows into a responsive, unified citizen platform. As the lead designer and front-end contributor, I designed the secure SSO account architecture, prototyped five core civic services, and implemented step-by-step UIs with integrated payments and smart address lookups to make municipal transactions seamless on any device.',
        ],
      },
    ],
  },
};

let currentCompanyKey = null;
let homeListHtml = null; // captured once at load, so "back" can restore the exact original markup

function renderProjectList(key) {
  const data = workData[key];
  const mainView = document.getElementById('mainWorkView');
  if (!data || !mainView) return;

  const itemsHtml = data.projects
    .map(
      (p, i) => `
      <li class="work-item clickable-dir" onclick="showCaseStudy('${key}', ${i})">
        <strong>📁 ${p.name}</strong>
        <span class="details">→ ${p.comment}</span>
      </li>`
    )
    .join('');

  mainView.innerHTML = `
    <p class="back-line" onclick="goBackToCompanies()">[← Type 'cd ..', 'back' or click here to return]</p>
    <p class="nested-prompt">visitor@levona:~$ <span class="typed-command">cd ${data.path}</span></p>
    <p class="nested-prompt">visitor@levona:~${data.path.replace('.', '')}$ <span class="typed-command">ls -l</span></p>
    <p class="meta-info">total ${data.total}</p>
    ${itemsHtml}
  `;
}

function openCompany(key) {
  const data = workData[key];
  const container = document.querySelector('.work-split');
  const pane = document.getElementById('workDetailPane');
  const hint = document.getElementById('workHintText');
  const homeHeader = document.getElementById('terminal-home-header');
  const terminalWindow = document.querySelector('.terminal');
  if (!data || !container || !pane) return;

  currentCompanyKey = key;
  renderProjectList(key);

  pane.innerHTML = '<p class="detail-placeholder">Select a project to view its case study.</p>';
  container.classList.add('split-active');

  if (hint) {
    hint.style.display = 'none';
  }

  const promptLine = document.getElementById('workPromptLine');
  if (promptLine) {
    promptLine.style.display = 'none';
  }

  // Hide the ASCII art / intro / links block so the work view reads as its
  // own page rather than something the visitor has to scroll past.
  if (homeHeader) {
    homeHeader.style.display = 'none';
  }
  if (terminalWindow) {
    terminalWindow.scrollTop = 0;
  }

  const terminalInput = document.getElementById('terminalInput');
  if (terminalInput) {
    terminalInput.focus();
  }
}

function showCaseStudy(key, index) {
  const data = workData[key];
  const pane = document.getElementById('workDetailPane');
  if (!data || !pane) return;

  const project = data.projects[index];
  if (!project) return;

  const bodyHtml = project.body.map((paragraph) => `<p>${paragraph}</p>`).join('');

  // NEW: build the link markup only if a link exists for this project
  const linkHtml = project.link
    ? `<p class="case-study-link">
         <a href="${project.link}" target="_blank" rel="noopener noreferrer">→ Full case study here if you’re interested.</a>
       </p>`
    : '';
    const figmaLink = project.figmalink
    ? `<p class="figma-link">
         <a href="${project.figmalink}" target="_blank" rel="noopener noreferrer">→ Post-FICO / My version of BTC </a>
       </p>`
    : '';
  const images = project.images || [];
  const galleryHtml = images
    .map((image, i) => {
      if (image.type === 'video') {
        const thumb = `https://img.youtube.com/vi/${image.videoId}/hqdefault.jpg`;
        return `<div class="gallery-video-thumb" onclick="openImageModal('${key}', ${index}, ${i})">
                  <img src="${thumb}" alt="${project.name} video ${i + 1}">
                  <span class="play-icon">▶</span>
                </div>`;
      }
      if (image.type === 'figma') {
        // Opens the live Figma file in a new tab instead of the in-page lightbox —
        // Figma files can't be rendered inside our modal, only linked out to.
        return `<div class="gallery-video-thumb gallery-figma-thumb" onclick="window.open('${image.figmaUrl}', '_blank', 'noopener')">
                  <img src="${image.src}" alt="${project.name} figma thumbnail ${i + 1}">
                  <span class="play-icon figma-icon" aria-hidden="true">${FIGMA_ICON_SVG}</span>
                </div>`;
      }
      return `<img src="${image.src}" alt="${project.name} screenshot ${i + 1}" onclick="openImageModal('${key}', ${index}, ${i})">`;
    })
    .join('');

  const showArrows = images.length > 4;
  const galleryBlock = images.length
    ? `<div class="case-study-gallery-wrapper">
        ${showArrows ? `<button class="gallery-nav gallery-prev" onclick="scrollGallery(this, -1)" aria-label="Scroll left">&#8249;</button>` : ''}
        <div class="case-study-gallery">${galleryHtml}</div>
        ${showArrows ? `<button class="gallery-nav gallery-next" onclick="scrollGallery(this, 1)" aria-label="Scroll right">&#8250;</button>` : ''}
      </div>`
    : '';

  pane.innerHTML = `
    <p class="case-study-title">${project.name}</p>
    <p class="case-study-meta"><strong>Role:</strong> ${project.role}<br><strong>Tools:</strong> ${project.tools}<br><strong>Outcome:</strong> ${project.outcome}</p>
    <p class="tldr-label">TLDR;</p>
    <p class="tldr-text">${project.tldr}</p>
    ${galleryBlock}
    <p class="overview-label">Overview</p>
    <div class="case-study-body">${bodyHtml}</div>
    ${figmaLink}
    ${linkHtml}
  `;

  pane.classList.remove('fade-in');
  void pane.offsetWidth;
  pane.classList.add('fade-in');
}

function scrollGallery(button, direction) {
  const wrapper = button.closest('.case-study-gallery-wrapper');
  const gallery = wrapper && wrapper.querySelector('.case-study-gallery');
  if (!gallery) return;
  const scrollAmount = gallery.clientWidth * 0.8;
  gallery.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
}

// ---- Image modal (lightbox) for case study gallery images ----
// Tracks which project's image array is open and the current index within
// it, so prev/next can step through the whole set without closing the modal.
let modalImages = [];
let modalIndex = 0;

// Small monochrome Figma logo, used as the overlay icon on figma-type thumbnails
const FIGMA_ICON_SVG = `<svg width="20" height="20" viewBox="0 0 38 57" xmlns="http://www.w3.org/2000/svg">
  <path fill="currentColor" d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0Z"/>
  <path fill="currentColor" d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0Z"/>
  <path fill="currentColor" d="M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19Z"/>
  <path fill="currentColor" d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5Z"/>
  <path fill="currentColor" d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5Z"/>
</svg>`;

function renderModalImage() {
  const img = document.getElementById('imageModalImg');
  const videoFrame = document.getElementById('imageModalVideo');
  const counter = document.getElementById('imageModalCounter');
  const caption = document.getElementById('imageModalCaption');
  const prevBtn = document.getElementById('imageModalPrev');
  const nextBtn = document.getElementById('imageModalNext');
  const zoomControls = document.getElementById('imageModalZoomControls');
  if (!modalImages.length) return;

  resetZoom();
  const current = modalImages[modalIndex];

  if (current.type === 'video') {
    img.style.display = 'none';
    videoFrame.style.display = '';
    videoFrame.src = `https://www.youtube.com/embed/${current.videoId}`;
    if (zoomControls) zoomControls.style.display = 'none';
  } else {
    videoFrame.style.display = 'none';
    videoFrame.src = ''; // stops playback when navigating away
    img.style.display = '';
    img.src = current.src;
    img.alt = current.alt;
    img.onload = () => { baseImgWidth = img.clientWidth; };
    if (zoomControls) zoomControls.style.display = '';
  }

  if (caption) {
    caption.textContent = current.caption || '';
    caption.style.display = current.caption ? '' : 'none';
  }
  if (counter) counter.textContent = `${modalIndex + 1} / ${modalImages.length}`;

  const showNav = modalImages.length > 1;
  if (prevBtn) prevBtn.style.display = showNav ? '' : 'none';
  if (nextBtn) nextBtn.style.display = showNav ? '' : 'none';
  if (counter) counter.style.display = showNav ? '' : 'none';
}

function openImageModal(key, projectIndex, imageIndex) {
  const project = workData[key] && workData[key].projects[projectIndex];
  if (!project || !project.images) return;

  // Figma thumbnails open in a new tab (see the gallery click handler) and
  // never call this function directly, but they still need to be filtered
  // out here so they don't end up as "empty" stops when navigating with
  // prev/next through a gallery that mixes types.
  const navigable = project.images
    .map((image, i) => ({ image, i }))
    .filter(({ image }) => image.type !== 'figma');

  modalImages = navigable.map(({ image, i }) => {
    if (image.type === 'video') {
      return { type: 'video', videoId: image.videoId, caption: image.caption || '' };
    }
    return {
      type: 'image',
      src: image.src,
      alt: `${project.name} screenshot ${i + 1}`,
      caption: image.caption || '',
    };
  });

  // imageIndex is the position within the original (unfiltered) images array,
  // so translate it to its position within the filtered navigable list.
  modalIndex = Math.max(0, navigable.findIndex(({ i }) => i === imageIndex));

  const modal = document.getElementById('imageModal');
  if (!modal) return;

  renderModalImage();
  modal.classList.add('open');
}


function closeImageModal() {
  const modal = document.getElementById('imageModal');
  if (!modal) return;
  modal.classList.remove('open');
}

function nextModalImage() {
  if (!modalImages.length) return;
  modalIndex = (modalIndex + 1) % modalImages.length; // wraps around to the start
  renderModalImage();
}

function prevModalImage() {
  if (!modalImages.length) return;
  modalIndex = (modalIndex - 1 + modalImages.length) % modalImages.length; // wraps around to the end
  renderModalImage();
}

// ---- PASTE THE NEW ZOOM CODE HERE ----
let zoomLevel = 1;
const ZOOM_STEP = 0.25;
const ZOOM_MIN = 1;
const ZOOM_MAX = 3;

function applyZoom() {
  const img = document.getElementById('imageModalImg');
  const wrapper = document.getElementById('imageModalImgWrapper');
  const label = document.getElementById('zoomLevel');
  if (img) {
    img.style.transform = zoomLevel > 1 ? `scale(${zoomLevel})` : '';
    img.classList.toggle('zoomed', zoomLevel > 1);
  }
  if (wrapper) {
    wrapper.classList.toggle('zoomed', zoomLevel > 1);
  }
  if (label) {
    label.textContent = `${Math.round(zoomLevel * 100)}%`;
  }
}

function zoomIn() {
  zoomLevel = Math.min(ZOOM_MAX, zoomLevel + ZOOM_STEP);
  applyZoom();
}

function zoomOut() {
  zoomLevel = Math.max(ZOOM_MIN, zoomLevel - ZOOM_STEP);
  applyZoom();
}

function resetZoom() {
  zoomLevel = 1;
  const wrapper = document.getElementById('imageModalImgWrapper');
  if (wrapper) wrapper.classList.remove('zoomed');
  applyZoom();
}

function toggleZoomOnClick() {
  if (window.__imageModalDidDrag && window.__imageModalDidDrag()) return; // was a pan, not a click
  zoomLevel = zoomLevel > 1 ? 1 : 2;
  applyZoom();
}
// ---- END NEW ZOOM CODE ----

document.addEventListener('keydown', (event) => {
  const modal = document.getElementById('imageModal');
  if (!modal || !modal.classList.contains('open')) return;

  if (event.key === 'Escape') {
    closeImageModal();
  } else if (event.key === 'ArrowRight') {
    nextModalImage();
  } else if (event.key === 'ArrowLeft') {
    prevModalImage();
  } else if (event.key === '+' || event.key === '=') {
    zoomIn();
  } else if (event.key === '-' || event.key === '_') {
    zoomOut();
  } else if (event.key === '0') {
    resetZoom();
  }
});

function goBackToCompanies() {
  const container = document.querySelector('.work-split');
  const mainView = document.getElementById('mainWorkView');
  const pane = document.getElementById('workDetailPane');
  const hint = document.getElementById('workHintText');
  const homeHeader = document.getElementById('terminal-home-header');
  const terminalWindow = document.querySelector('.terminal');
  if (!container || !mainView || !pane) return;

  currentCompanyKey = null;
  if (homeListHtml !== null) {
    mainView.innerHTML = homeListHtml;
  }
  pane.innerHTML = '<p class="detail-placeholder">Select a project to view its case study.</p>';
  container.classList.remove('split-active');

  if (hint) {
    hint.style.display = '';
  }

  const promptLine = document.getElementById('workPromptLine');
  if (promptLine) {
    promptLine.style.display = '';
  }

  if (homeHeader) {
    homeHeader.style.display = '';
  }
  if (terminalWindow) {
    terminalWindow.scrollTop = 0;
  }
}

// ---- Drag-to-pan when zoomed in ----
(function () {
  const wrapper = document.getElementById('imageModalImgWrapper');
  if (!wrapper) return;

  let isDragging = false;
  let didDrag = false; // distinguishes a real drag from a simple click
  let startX, startY, startScrollLeft, startScrollTop;

  wrapper.addEventListener('mousedown', (e) => {
    if (!wrapper.classList.contains('zoomed')) return; // only pan when zoomed in
    isDragging = true;
    didDrag = false;
    wrapper.classList.add('dragging');
    startX = e.clientX;
    startY = e.clientY;
    startScrollLeft = wrapper.scrollLeft;
    startScrollTop = wrapper.scrollTop;
    e.preventDefault(); // stops the browser's native image-drag ghost
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDrag = true;

    wrapper.scrollLeft = startScrollLeft - dx;
    wrapper.scrollTop = startScrollTop - dy;
  });

  window.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    wrapper.classList.remove('dragging');
  });

  // Expose so toggleZoomOnClick can skip toggling if the user just finished a drag
  window.__imageModalDidDrag = () => didDrag;
})();

// Capture the original company-list markup once, before anything replaces it,
// so goBackToCompanies() can restore the exact same HTML later.
document.addEventListener('DOMContentLoaded', () => {
  const mainView = document.getElementById('mainWorkView');
  if (mainView) {
    homeListHtml = mainView.innerHTML;
  }

  const promptLine = document.getElementById('workPromptLine');
  if (promptLine) {
    promptLine.addEventListener('click', goBackToCompanies);
  }
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
}


)();
