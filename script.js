document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const board = document.getElementById("board")
  const cells = document.querySelectorAll(".cell")
  const currentPlayerElement = document.getElementById("current-player")
  const moveNumberElement = document.getElementById("move-number")
  const messageArea = document.getElementById("message-area")
  const resetButton = document.getElementById("reset-button")
  const statusIndicator = document.getElementById("status-indicator")
  const currentExplanation = document.getElementById("current-explanation")
  const moveHistory = document.getElementById("move-history")

  // API endpoint - will work both locally and when deployed
  const API_URL = window.location.origin + "/quantum-move"

  // Game State
  let gameState = {
    currentPlayer: "X",
    moveNumber: 1,
    selectedCells: [],
    board: Array(9)
      .fill()
      .map(() => ({
        quantum: [],
        classical: null,
      })),
    gameActive: true,
    backendAvailable: false,
    moveLog: [],
    winLine: null,
    currentExplanationKey: "welcome",
  }

  // Win patterns with their line types
  const winPatterns = [
    { cells: [0, 1, 2], type: "horizontal", position: "top: 16.67%;" },
    { cells: [3, 4, 5], type: "horizontal", position: "top: 50%;" },
    { cells: [6, 7, 8], type: "horizontal", position: "top: 83.33%;" },
    { cells: [0, 3, 6], type: "vertical", position: "left: 16.67%;" },
    { cells: [1, 4, 7], type: "vertical", position: "left: 50%;" },
    { cells: [2, 5, 8], type: "vertical", position: "left: 83.33%;" },
    { cells: [0, 4, 8], type: "diagonal-1", position: "" },
    { cells: [2, 4, 6], type: "diagonal-2", position: "" },
  ]

  // Explanation templates
  const explanations = {
    welcome: `
      <h3>Welcome to Quantum Tic-Tac-Toe!</h3>
      <p>This game demonstrates quantum mechanics principles like superposition and measurement.</p>
      <p>Unlike classical tic-tac-toe, quantum moves exist in multiple places simultaneously until they "collapse" to a single location.</p>
      <p>Select a cell to begin your quantum move.</p>
    `,
    selectingFirst: `
      <h3>Quantum Superposition</h3>
      <p>In quantum mechanics, particles can exist in multiple states simultaneously until measured.</p>
      <p>You're selecting the first cell for your quantum move. This move will exist in two places at once!</p>
      <p>This demonstrates the principle of <strong>quantum superposition</strong>.</p>
    `,
    selectingSecond: `
      <h3>Completing Superposition</h3>
      <p>Now select the second cell for your quantum move.</p>
      <p>Your move will exist in both locations simultaneously - neither position is "real" yet.</p>
      <p>This is similar to Schrödinger's cat being both alive and dead until observed.</p>
    `,
    quantumMove: `
      <h3>Quantum Entanglement</h3>
      <p>Your move now exists in two places at once! These positions are <strong>entangled</strong>.</p>
      <p>When one position is measured (collapses), the other position will be affected instantly.</p>
      <p>Einstein called this "spooky action at a distance."</p>
      <p>As more quantum moves are made, they can form entanglement loops, which in full quantum tic-tac-toe would trigger collapses.</p>
    `,
    collapsing: `
      <h3>Quantum Measurement</h3>
      <p>It's time for a quantum measurement!</p>
      <p>We're using a quantum circuit with a <strong>Hadamard gate</strong> to create a 50/50 superposition.</p>
      <p>When measured, the quantum state will collapse to either position with equal probability.</p>
      <p>The quantum backend is determining which position becomes "real".</p>
    `,
    collapsed: (move, cell) => `
      <h3>Wavefunction Collapse</h3>
      <p>Move ${move} has collapsed to cell ${cell}!</p>
      <p>The quantum superposition has been measured, forcing the system to choose one definite state.</p>
      <p>This demonstrates <strong>wavefunction collapse</strong> - a fundamental quantum mechanics concept.</p>
      <p>All other instances of this move have disappeared, as they were just probability waves.</p>
      <p>In full quantum tic-tac-toe, collapses occur when entanglement loops form. In our simplified version, we collapse every 3rd move.</p>
    `,
    win: (player) => `
      <h3>Game Over - ${player} Wins!</h3>
      <p>Player ${player} has won the game by creating a line of classical (collapsed) moves.</p>
      <p>In quantum computing, the final measurement gives us our answer after quantum operations.</p>
      <p>Similarly, the winner is determined after quantum moves collapse to classical positions.</p>
    `,
    draw: `
      <h3>Game Over - Draw!</h3>
      <p>The game has ended in a draw.</p>
      <p>Even with quantum mechanics, some problems can have no clear winner!</p>
      <p>This is similar to certain quantum algorithms that may not always produce a definitive answer.</p>
    `,
  }

  // Update the explanation area
  function updateExplanation(key, ...args) {
    if (explanations[key]) {
      // Store the current explanation key
      gameState.currentExplanationKey = key

      if (typeof explanations[key] === "function") {
        currentExplanation.innerHTML = explanations[key](...args)
      } else {
        currentExplanation.innerHTML = explanations[key]
      }
    }
  }

  // Add move to history
  function addMoveToHistory(text) {
    const li = document.createElement("li")
    li.textContent = text
    gameState.moveLog.push(text)

    // Add to DOM if element exists
    if (moveHistory) {
      moveHistory.appendChild(li)
      // Scroll to bottom
      moveHistory.scrollTop = moveHistory.scrollHeight
    }
  }

  // Draw win line
  function drawWinLine(pattern) {
    // Remove any existing win line
    const existingLine = document.querySelector(".win-line")
    if (existingLine) {
      existingLine.remove()
    }

    // Create win line element
    const winLine = document.createElement("div")
    winLine.classList.add("win-line", pattern.type)

    // Set position based on pattern
    if (pattern.position) {
      winLine.style.cssText = pattern.position
    }

    // Add to board
    board.appendChild(winLine)

    // Store in game state
    gameState.winLine = pattern
  }

  // Check if backend is available
  async function checkBackendStatus() {
    try {
      const response = await fetch(window.location.origin + "/", { method: "GET" })
      if (response.ok) {
        if (statusIndicator) {
          statusIndicator.textContent = "Connected"
          statusIndicator.style.color = "#00ff00"
        }
        gameState.backendAvailable = true
      } else {
        throw new Error("Backend not available")
      }
    } catch (error) {
      if (statusIndicator) {
        statusIndicator.textContent = "Disconnected (using fallback)"
        statusIndicator.style.color = "#ff0000"
      }
      gameState.backendAvailable = false
    }
  }

  // Initialize game
  function initGame() {
    gameState = {
      currentPlayer: "X",
      moveNumber: 1,
      selectedCells: [],
      board: Array(9)
        .fill()
        .map(() => ({
          quantum: [],
          classical: null,
        })),
      gameActive: true,
      backendAvailable: gameState.backendAvailable,
      moveLog: [],
      winLine: null,
      currentExplanationKey: "welcome",
    }

    cells.forEach((cell) => {
      cell.innerHTML = ""
      cell.classList.remove("selected")
    })

    // Remove any win line
    const existingLine = document.querySelector(".win-line")
    if (existingLine) {
      existingLine.remove()
    }

    currentPlayerElement.textContent = "X"
    moveNumberElement.textContent = "1"
    messageArea.textContent = "Select two cells for your quantum move"

    // Reset move history
    if (moveHistory) {
      moveHistory.innerHTML = ""
    }

    // Update explanation
    updateExplanation("welcome")

    // Check backend status
    checkBackendStatus()
  }

  // Handle cell click
  function handleCellClick(index) {
    // If game is not active or cell has a classical value, ignore click
    if (!gameState.gameActive || gameState.board[index].classical) {
      return
    }

    // If this cell is already selected, deselect it
    const selectedIndex = gameState.selectedCells.indexOf(index)
    if (selectedIndex !== -1) {
      gameState.selectedCells.splice(selectedIndex, 1)
      cells[index].classList.remove("selected")
      messageArea.textContent = `Cell deselected. Select ${2 - gameState.selectedCells.length} cell(s)`

      // Update explanation based on selection state
      if (gameState.selectedCells.length === 0) {
        updateExplanation("selectingFirst")
      } else {
        updateExplanation("selectingSecond")
      }
      return
    }

    // If we already have 2 cells selected, ignore
    if (gameState.selectedCells.length >= 2) {
      return
    }

    // Add cell to selected cells
    gameState.selectedCells.push(index)
    cells[index].classList.add("selected")

    // If we have 2 cells selected, place quantum move
    if (gameState.selectedCells.length === 2) {
      placeQuantumMove()
    } else {
      messageArea.textContent = "Select one more cell"
      updateExplanation("selectingSecond")
    }
  }

  // Place quantum move in the selected cells
  function placeQuantumMove() {
    const [cell1, cell2] = gameState.selectedCells
    const move = `${gameState.currentPlayer}${gameState.moveNumber}`

    // Add quantum move to both cells
    gameState.board[cell1].quantum.push(move)
    gameState.board[cell2].quantum.push(move)

    // Add to move history
    addMoveToHistory(`Move ${move}: Placed in cells ${cell1} and ${cell2} (quantum)`)

    // Clear selection
    gameState.selectedCells.forEach((index) => {
      cells[index].classList.remove("selected")
    })
    gameState.selectedCells = []

    // Update UI
    renderBoard()

    // Update explanation - only if not already showing a collapse explanation
    if (gameState.currentExplanationKey !== "collapsed") {
      updateExplanation("quantumMove")
    }

    // Check if we need to collapse
    if (gameState.moveNumber % 3 === 0) {
      collapseMove(move, cell1, cell2)
    } else {
      // Switch player and increment move
      gameState.currentPlayer = gameState.currentPlayer === "X" ? "O" : "X"
      gameState.moveNumber++
      currentPlayerElement.textContent = gameState.currentPlayer
      moveNumberElement.textContent = gameState.moveNumber
      messageArea.textContent = "Select two cells for your quantum move"

      // Don't update explanation here - let it persist until next user action
    }
  }

  // Collapse a quantum move
  async function collapseMove(move, cell1, cell2) {
    messageArea.textContent = `Collapsing move ${move}...`

    // Update explanation
    updateExplanation("collapsing")

    try {
      let collapseResult

      // Only call the backend if it's available
      if (gameState.backendAvailable) {
        // Call the quantum backend
        const response = await fetch(API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            seed: Date.now(), // Use current timestamp as seed
          }),
        })

        if (!response.ok) {
          throw new Error("API request failed")
        }

        const data = await response.json()
        console.log("API response:", data)
        collapseResult = data.collapse_result
      } else {
        // Fallback to random collapse
        collapseResult = Math.random() > 0.5 ? 1 : 0
        console.log("Using fallback random collapse:", collapseResult)
      }

      // Determine which cell to collapse to
      const collapseIndex = collapseResult === 0 ? cell1 : cell2
      const player = move.charAt(0)

      // Collapse the move
      gameState.board[collapseIndex].classical = player

      // Remove all quantum instances of this move
      for (let i = 0; i < 9; i++) {
        const moveIndex = gameState.board[i].quantum.indexOf(move)
        if (moveIndex !== -1) {
          gameState.board[i].quantum.splice(moveIndex, 1)
        }
      }

      // Add to move history
      addMoveToHistory(`Move ${move}: Collapsed to cell ${collapseIndex} (classical ${player})`)

      // Update UI
      renderBoard()
      messageArea.textContent = `Move ${move} collapsed to cell ${collapseIndex}`

      // Update explanation
      updateExplanation("collapsed", move, collapseIndex)

      // Check for win
      checkWinCondition()

      // Continue game if still active
      if (gameState.gameActive) {
        gameState.currentPlayer = gameState.currentPlayer === "X" ? "O" : "X"
        gameState.moveNumber++
        currentPlayerElement.textContent = gameState.currentPlayer
        moveNumberElement.textContent = gameState.moveNumber
        setTimeout(() => {
          messageArea.textContent = "Select two cells for your quantum move"
          // Don't update explanation here - let it persist until next user action
        }, 1500)
      }
    } catch (error) {
      console.error("Error during collapse:", error)

      // Update backend status
      if (statusIndicator) {
        statusIndicator.textContent = "Disconnected (using fallback)"
        statusIndicator.style.color = "#ff0000"
      }
      gameState.backendAvailable = false

      // Fallback to random collapse
      const randomResult = Math.random() > 0.5 ? 1 : 0
      const collapseIndex = randomResult === 0 ? cell1 : cell2
      const player = move.charAt(0)

      // Collapse the move
      gameState.board[collapseIndex].classical = player

      // Remove all quantum instances of this move
      for (let i = 0; i < 9; i++) {
        const moveIndex = gameState.board[i].quantum.indexOf(move)
        if (moveIndex !== -1) {
          gameState.board[i].quantum.splice(moveIndex, 1)
        }
      }

      // Add to move history
      addMoveToHistory(`Move ${move}: Collapsed to cell ${collapseIndex} (classical ${player}, fallback)`)

      // Update UI
      renderBoard()
      messageArea.textContent = `Move ${move} collapsed to cell ${collapseIndex} (fallback)`

      // Update explanation
      updateExplanation("collapsed", move, collapseIndex)

      // Check for win
      checkWinCondition()

      // Continue game if still active
      if (gameState.gameActive) {
        gameState.currentPlayer = gameState.currentPlayer === "X" ? "O" : "X"
        gameState.moveNumber++
        currentPlayerElement.textContent = gameState.currentPlayer
        moveNumberElement.textContent = gameState.moveNumber
        setTimeout(() => {
          messageArea.textContent = "Select two cells for your quantum move"
          // Don't update explanation here - let it persist until next user action
        }, 1500)
      }
    }
  }

  // Check if there's a winner
  function checkWinCondition() {
    // Check for win
    for (const pattern of winPatterns) {
      const [a, b, c] = pattern.cells
      if (
        gameState.board[a].classical &&
        gameState.board[a].classical === gameState.board[b].classical &&
        gameState.board[a].classical === gameState.board[c].classical
      ) {
        gameState.gameActive = false
        messageArea.textContent = `Player ${gameState.board[a].classical} wins!`

        // Draw win line
        drawWinLine(pattern)

        // Add to move history
        addMoveToHistory(`Game over: Player ${gameState.board[a].classical} wins!`)

        // Update explanation
        updateExplanation("win", gameState.board[a].classical)
        return
      }
    }

    // Check for draw (all cells have classical values)
    const allClassical = gameState.board.every((cell) => cell.classical !== null)
    if (allClassical) {
      gameState.gameActive = false
      messageArea.textContent = "Game ended in a draw!"

      // Add to move history
      addMoveToHistory(`Game over: Draw!`)

      // Update explanation
      updateExplanation("draw")
    }
  }

  // Render the board based on current state
  function renderBoard() {
    cells.forEach((cell, index) => {
      const cellState = gameState.board[index]

      // Clear cell
      cell.innerHTML = ""

      // Add classical move if exists
      if (cellState.classical) {
        const classicalElement = document.createElement("div")
        classicalElement.classList.add("classical-move")
        classicalElement.textContent = cellState.classical
        cell.appendChild(classicalElement)
      }
      // Otherwise add quantum moves
      else {
        cellState.quantum.forEach((move) => {
          const quantumElement = document.createElement("div")
          quantumElement.classList.add("quantum-move")
          quantumElement.textContent = move
          cell.appendChild(quantumElement)
        })
      }
    })
  }

  // Event listeners
  cells.forEach((cell, index) => {
    cell.addEventListener("click", () => handleCellClick(index))
  })

  resetButton.addEventListener("click", initGame)

  // Initialize the game
  initGame()
})
