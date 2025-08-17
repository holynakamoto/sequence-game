// Game constants
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const BOARD_LAYOUT = [
  ['', '2♠', '3♠', '4♠', '5♠', '6♠', '7♠', '8♠', '9♠', ''],
  ['6♣', '5♣', '4♣', '3♣', '2♣', 'A♠', 'K♠', 'Q♠', '10♠', 'J♠'],
  ['7♣', 'A♠', '2♦', '3♦', '4♦', '5♦', '6♦', '7♦', '9♦', 'Q♠'],
  ['8♣', 'K♠', 'A♣', '6♣', '5♣', '4♣', '3♣', '2♣', '8♦', 'K♠'],
  ['9♣', 'Q♠', '7♣', 'A♦', '2♥', '3♥', '4♥', 'A♣', '7♦', 'A♠'],
  ['10♣', '10♠', '8♣', 'K♦', 'A♥', '6♥', '5♥', 'K♣', '6♦', '2♠'],
  ['J♣', 'J♠', '9♣', 'Q♦', '7♥', '8♥', '9♥', 'Q♣', '5♦', '3♠'],
  ['Q♣', '', '10♣', 'J♦', '10♥', 'J♥', 'Q♥', 'J♣', '4♦', '4♠'],
  ['K♣', '', 'J♣', 'Q♣', 'K♣', 'A♦', 'K♦', '10♣', '3♦', '5♠'],
  ['', 'A♥', '2♥', '3♥', '4♥', '5♥', '6♥', '7♥', '8♥', '']
];

// Game state
let currentPlayer = 'red';
let board = [];
let playerHands = { red: [], blue: [] };
let deck = [];
let selectedCard = null;
let removeMode = false;
let sequences = { red: 0, blue: 0 };

// Enhanced visual effects
function createParticles(x, y) {
  for (let i = 0; i < 8; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = x + 'px';
    particle.style.top = y + 'px';
    particle.style.animationDelay = (i * 0.1) + 's';
    particle.style.background = currentPlayer === 'red' 
      ? 'radial-gradient(circle, #dc143c, transparent)' 
      : 'radial-gradient(circle, #1e90ff, transparent)';
    document.body.appendChild(particle);
    
    setTimeout(() => particle.remove(), 3000);
  }
}

function highlightSequence(startRow, startCol, deltaRow, deltaCol, length) {
  for (let i = 0; i < length; i++) {
    const row = startRow + i * deltaRow;
    const col = startCol + i * deltaCol;
    const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    if (cell) {
      cell.classList.add('sequence-highlight');
      setTimeout(() => cell.classList.remove('sequence-highlight'), 1000);
    }
  }
}

// Initialize game
function initGame() {
  createBoard();
  createDeck();
  dealCards();
  updateDisplay();
}

function createBoard() {
  const gameBoard = document.getElementById('gameBoard');
  gameBoard.innerHTML = '';
  board = [];
  
  for (let row = 0; row < 10; row++) {
    board[row] = [];
    for (let col = 0; col < 10; col++) {
      const cell = document.createElement('div');
      cell.className = 'board-cell';
      cell.dataset.row = row;
      cell.dataset.col = col;
      
      if ((row === 0 && (col === 0 || col === 9)) ||
          (row === 9 && (col === 0 || col === 9))) {
        cell.classList.add('free-space');
        cell.textContent = 'FREE';
        board[row][col] = { card: '', chip: 'free' };
      } else {
        const cardValue = BOARD_LAYOUT[row][col];
        cell.textContent = cardValue;
        board[row][col] = { card: cardValue, chip: null };
        if (cardValue.includes('♥') || cardValue.includes('♦')) {
          cell.style.color = '#DC143C';
        }
      }
      
      cell.addEventListener('click', (e) => {
        const rect = cell.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        handleCellClick(row, col, x, y);
      });
      
      gameBoard.appendChild(cell);
    }
  }
}

function createDeck() {
  deck = [];
  for (let suit of SUITS) {
    for (let rank of RANKS) {
      if (rank !== 'J') {
        deck.push({ rank, suit });
        deck.push({ rank, suit });
      } else {
        deck.push({
          rank, suit,
          special: suit === '♠' || suit === '♥' ? 'remove' : 'wild'
        });
      }
    }
  }
  shuffleDeck();
}

function shuffleDeck() {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

function dealCards() {
  playerHands = { red: [], blue: [] };
  const teams = ['red', 'blue'];
  for (let i = 0; i < 7; i++) {
    for (let team of teams) {
      if (deck.length > 0) {
        playerHands[team].push(deck.pop());
      }
    }
  }
}

function handleCellClick(row, col, x, y) {
  if (!selectedCard) {
    if (removeMode && board[row][col].chip === currentPlayer) {
      removeChip(row, col);
      createParticles(x, y);
    }
    return;
  }
  
  if (canPlayCard(selectedCard, row, col)) {
    playCard(selectedCard, row, col);
    removeCardFromHand(selectedCard);
    drawNewCard();
    createParticles(x, y);
    checkForSequences();
    nextTurn();
  }
  
  selectedCard = null;
  updateDisplay();
}

function canPlayCard(card, row, col) {
  const cell = board[row][col];
  if (cell.chip === 'free') return false;
  if (cell.chip) return false;
  
  if (card.rank === 'J') {
    if (card.special === 'wild') {
      return true;
    }
    return false;
  }
  
  return cell.card === `${card.rank}${card.suit}`;
}

function playCard(card, row, col) {
  board[row][col].chip = currentPlayer;
  const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
  cell.classList.add(`${currentPlayer}-chip`);
}

function removeChip(row, col) {
  board[row][col].chip = null;
  const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
  cell.classList.remove('red-chip', 'blue-chip');
  
  const removeJack = playerHands[currentPlayer].find(card =>
    card.rank === 'J' && card.special === 'remove'
  );
  if (removeJack) {
    removeCardFromHand(removeJack);
    drawNewCard();
    nextTurn();
  }
}

function removeCardFromHand(card) {
  const hand = playerHands[currentPlayer];
  const index = hand.findIndex(c =>
    c.rank === card.rank && c.suit === card.suit && c.special === card.special
  );
  if (index !== -1) {
    hand.splice(index, 1);
  }
}

function drawNewCard() {
  if (deck.length > 0) {
    playerHands[currentPlayer].push(deck.pop());
  }
}

function checkForSequences() {
  const newSequences = countSequences();
  sequences.red = newSequences.red;
  sequences.blue = newSequences.blue;
  
  // Check for win condition (2 sequences)
  if (sequences.red >= 2) {
    setTimeout(() => showGameOver('Red'), 500);
  } else if (sequences.blue >= 2) {
    setTimeout(() => showGameOver('Blue'), 500);
  }
}

function countSequences() {
  const sequences = { red: 0, blue: 0 };
  const checked = Array(10).fill().map(() => Array(10).fill(false));
  
  // Check horizontal sequences
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col <= 5; col++) {
      const sequence = checkSequence(row, col, 0, 1, 5);
      if (sequence && !isSequenceChecked(checked, row, col, 0, 1, 5)) {
        sequences[sequence]++;
        markSequenceChecked(checked, row, col, 0, 1, 5);
        highlightSequence(row, col, 0, 1, 5);
      }
    }
  }
  
  // Check vertical sequences
  for (let row = 0; row <= 5; row++) {
    for (let col = 0; col < 10; col++) {
      const sequence = checkSequence(row, col, 1, 0, 5);
      if (sequence && !isSequenceChecked(checked, row, col, 1, 0, 5)) {
        sequences[sequence]++;
        markSequenceChecked(checked, row, col, 1, 0, 5);
        highlightSequence(row, col, 1, 0, 5);
      }
    }
  }
  
  // Check diagonal sequences (top-left to bottom-right)
  for (let row = 0; row <= 5; row++) {
    for (let col = 0; col <= 5; col++) {
      const sequence = checkSequence(row, col, 1, 1, 5);
      if (sequence && !isSequenceChecked(checked, row, col, 1, 1, 5)) {
        sequences[sequence]++;
        markSequenceChecked(checked, row, col, 1, 1, 5);
        highlightSequence(row, col, 1, 1, 5);
      }
    }
  }
  
  // Check diagonal sequences (top-right to bottom-left)
  for (let row = 0; row <= 5; row++) {
    for (let col = 4; col < 10; col++) {
      const sequence = checkSequence(row, col, 1, -1, 5);
      if (sequence && !isSequenceChecked(checked, row, col, 1, -1, 5)) {
        sequences[sequence]++;
        markSequenceChecked(checked, row, col, 1, -1, 5);
        highlightSequence(row, col, 1, -1, 5);
      }
    }
  }
  
  return sequences;
}

function checkSequence(startRow, startCol, deltaRow, deltaCol, length) {
  const firstChip = getChipAt(startRow, startCol);
  if (!firstChip || firstChip === 'free') return null;
  
  for (let i = 0; i < length; i++) {
    const row = startRow + i * deltaRow;
    const col = startCol + i * deltaCol;
    const chip = getChipAt(row, col);
    if (chip !== firstChip && chip !== 'free') return null;
  }
  
  return firstChip;
}

function getChipAt(row, col) {
  if (row < 0 || row >= 10 || col < 0 || col >= 10) return null;
  return board[row][col].chip;
}

function isSequenceChecked(checked, startRow, startCol, deltaRow, deltaCol, length) {
  for (let i = 0; i < length; i++) {
    const row = startRow + i * deltaRow;
    const col = startCol + i * deltaCol;
    if (!checked[row][col]) return false;
  }
  return true;
}

function markSequenceChecked(checked, startRow, startCol, deltaRow, deltaCol, length) {
  for (let i = 0; i < length; i++) {
    const row = startRow + i * deltaRow;
    const col = startCol + i * deltaCol;
    checked[row][col] = true;
  }
}

function nextTurn() {
  currentPlayer = currentPlayer === 'red' ? 'blue' : 'red';
  removeMode = false;
  updateDisplay();
}

function updateDisplay() {
  // Update current player display
  const playerDiv = document.getElementById('currentPlayer');
  playerDiv.textContent = `${currentPlayer === 'red' ? 'Red' : 'Blue'} Team's Turn`;
  playerDiv.className = `current-player team-${currentPlayer}`;
  
  // Update sequences count
  document.getElementById('redSequences').textContent = sequences.red;
  document.getElementById('blueSequences').textContent = sequences.blue;
  
  // Update player hand
  displayPlayerHand();
  
  // Update remove mode button
  const removeModeBtn = document.getElementById('removeModeBtn');
  removeModeBtn.textContent = `Remove Chip Mode: ${removeMode ? 'ON' : 'OFF'}`;
  
  if (removeMode) {
    removeModeBtn.classList.add('active');
  } else {
    removeModeBtn.classList.remove('active');
  }
}

function displayPlayerHand() {
  const handDiv = document.getElementById('playerHand');
  handDiv.innerHTML = '';
  
  playerHands[currentPlayer].forEach((card, index) => {
    const cardDiv = document.createElement('div');
    cardDiv.className = `card ${card.suit.includes('♥') || card.suit.includes('♦') ? 'red-card' : 'black-card'}`;
    
    // Special styling for Jacks
    if (card.rank === 'J') {
      if (card.special === 'wild') {
        cardDiv.classList.add('jack-wild');
        cardDiv.title = 'Wild Jack - play anywhere';
      } else {
        cardDiv.classList.add('jack-remove');
        cardDiv.title = 'Remove Jack - remove opponent chip';
      }
    }
    
    cardDiv.innerHTML = `
      <div class="card-rank">${card.rank}</div>
      <div class="card-suit">${card.suit}</div>
    `;
    
    cardDiv.addEventListener('click', () => selectCard(card, cardDiv));
    handDiv.appendChild(cardDiv);
  });
}

function selectCard(card, cardDiv) {
  // Remove previous selection
  document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
  
  if (selectedCard === card) {
    selectedCard = null;
  } else {
    selectedCard = card;
    cardDiv.classList.add('selected');
  }
}

function toggleRemoveMode() {
  const hasRemoveJack = playerHands[currentPlayer].some(card =>
    card.rank === 'J' && card.special === 'remove'
  );
  
  if (hasRemoveJack) {
    removeMode = !removeMode;
    selectedCard = null;
    updateDisplay();
  }
}

function showGameOver(winner) {
  const gameOverDiv = document.createElement('div');
  gameOverDiv.className = 'game-over';
  gameOverDiv.innerHTML = `
    <h2>🎉 ${winner} Team Wins! 🎉</h2>
    <p>Congratulations on getting 2 sequences!</p>
    <button onclick="newGame(); this.parentElement.remove();" 
            style="margin-top: 20px; padding: 15px 30px; font-size: 18px; 
                   background: linear-gradient(45deg, #32CD32, #228B22); color: white; 
                   border: none; border-radius: 15px; cursor: pointer; text-transform: uppercase;">
        Play Again
    </button>
  `;
  document.body.appendChild(gameOverDiv);
  
  // Create celebration particles
  for (let i = 0; i < 50; i++) {
    setTimeout(() => {
      const x = Math.random() * window.innerWidth;
      const y = Math.random() * window.innerHeight;
      createParticles(x, y);
    }, i * 100);
  }
}

function newGame() {
  // Remove game over screen if present
  const gameOverDiv = document.querySelector('.game-over');
  if (gameOverDiv) gameOverDiv.remove();
  
  // Reset game state
  currentPlayer = 'red';
  selectedCard = null;
  removeMode = false;
  sequences = { red: 0, blue: 0 };
  
  // Reinitialize game
  initGame();
}

// Initialize the game when page loads
document.addEventListener('DOMContentLoaded', () => {
  initGame();
});
