document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const board = document.getElementById("board")
  const cells = document.querySelectorAll(".cell")
  const currentPlayerElement = document.getElementById("current-player")
  const moveNumberElement = document.getElementById("move-number")
  const messageArea = document.getElementById("message-area")
  const resetButton = document.getElementById("reset-button")
  const statusIndicator = document.getElementById("status-indicator")

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
    }

    cells.forEach((cell) => {
      cell.innerHTML = ""
      cell.classList.remove("selected")
    })

    currentPlayerElement.textContent = "X"
    moveNumberElement.textContent = "1"
    messageArea.textContent = "Select two cells for your quantum move"

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
    }
  }

  // Place quantum move in the selected cells
  function placeQuantumMove() {
    const [cell1, cell2] = gameState.selectedCells
    const move = `${gameState.currentPlayer}${gameState.moveNumber}`

    // Add quantum move to both cells
    gameState.board[cell1].quantum.push(move)
    gameState.board[cell2].quantum.push(move)

    // Clear selection
    gameState.selectedCells.forEach((index) => {
      cells[index].classList.remove("selected")
    })
    gameState.selectedCells = []

    // Update UI
    renderBoard()

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
    }
  }

  // Collapse a quantum move
  async function collapseMove(move, cell1, cell2) {
    messageArea.textContent = `Collapsing move ${move}...`

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

      // Update UI
      renderBoard()
      messageArea.textContent = `Move ${move} collapsed to cell ${collapseIndex}`

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

      // Update UI
      renderBoard()
      messageArea.textContent = `Move ${move} collapsed to cell ${collapseIndex} (fallback)`

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
        }, 1500)
      }
    }
  }

  // Check if there's a winner
  function checkWinCondition() {
    const winPatterns = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8], // rows
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8], // columns
      [0, 4, 8],
      [2, 4, 6], // diagonals
    ]

    // Check for win
    for (const pattern of winPatterns) {
      const [a, b, c] = pattern
      if (
        gameState.board[a].classical &&
        gameState.board[a].classical === gameState.board[b].classical &&
        gameState.board[a].classical === gameState.board[c].classical
      ) {
        gameState.gameActive = false
        messageArea.textContent = `Player ${gameState.board[a].classical} wins!`
        return
      }
    }

    // Check for draw (all cells have classical values)
    const allClassical = gameState.board.every((cell) => cell.classical !== null)
    if (allClassical) {
      gameState.gameActive = false
      messageArea.textContent = "Game ended in a draw!"
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
