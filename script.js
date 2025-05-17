document.addEventListener("DOMContentLoaded", () => {
  // Game state
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
  }

  // DOM elements
  const cells = document.querySelectorAll(".cell")
  const currentPlayerElement = document.getElementById("current-player")
  const moveNumberElement = document.getElementById("move-number")
  const messageArea = document.getElementById("message")
  const resetButton = document.getElementById("resetButton")

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
    }

    // Clear the board
    cells.forEach((cell) => {
      cell.innerHTML = ""
      cell.classList.remove("has-classical")
    })

    // Update UI
    currentPlayerElement.textContent = gameState.currentPlayer
    moveNumberElement.textContent = gameState.moveNumber
    messageArea.textContent = "Select two cells for your quantum move"
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
      messageArea.textContent = `Cell deselected. Select ${2 - gameState.selectedCells.length} cell(s) for your quantum move`
      renderBoard()
      return
    }

    // Add cell to selected cells
    if (gameState.selectedCells.length < 2) {
      gameState.selectedCells.push(index)

      // If we have selected 2 cells, place the quantum move
      if (gameState.selectedCells.length === 2) {
        placeQuantumMove()
      } else {
        messageArea.textContent = "Select one more cell for your quantum move"
      }

      renderBoard()
    }
  }

  // Place quantum move in the selected cells
  function placeQuantumMove() {
    const [cell1, cell2] = gameState.selectedCells
    const quantumMove = `${gameState.currentPlayer}${gameState.moveNumber}`

    // Add quantum move to both cells
    gameState.board[cell1].quantum.push(quantumMove)
    gameState.board[cell2].quantum.push(quantumMove)

    // Check if we need to collapse
    checkForCollapse()

    // Switch player and increment move number
    gameState.currentPlayer = gameState.currentPlayer === "X" ? "O" : "X"
    gameState.moveNumber++

    // Reset selected cells
    gameState.selectedCells = []

    // Update UI
    currentPlayerElement.textContent = gameState.currentPlayer
    moveNumberElement.textContent = gameState.moveNumber
    messageArea.textContent = "Select two cells for your quantum move"

    renderBoard()
  }

  // Check if we need to collapse any moves
  function checkForCollapse() {
    // This is a placeholder for the collapse logic
    // In a real implementation, you would check for entanglement cycles
    // For now, we'll just simulate a collapse after every 3 moves

    if (gameState.moveNumber % 3 === 0) {
      // Get the last quantum move
      const lastMove = `${gameState.currentPlayer}${gameState.moveNumber}`

      // Find cells with this move
      const cellsWithMove = gameState.board
        .map((cell, index) => ({ cell, index }))
        .filter(({ cell }) => cell.quantum.includes(lastMove))

      if (cellsWithMove.length === 2) {
        collapseMove(lastMove, cellsWithMove[0].index, cellsWithMove[1].index)
      }
    }
  }

  // Collapse a quantum move
  async function collapseMove(move, cell1Index, cell2Index) {
    messageArea.textContent = `Collapsing move ${move}...`

    try {
      // Generate a seed based on move number and timestamp
      const seed = gameState.moveNumber * 1000 + (Date.now() % 1000)

      // Send request to the API
      const response = await fetch("http://localhost:8080/quantum-move", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          move: move,
          cell1: cell1Index,
          cell2: cell2Index,
          seed: seed,
        }),
      })

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`)
      }

      const data = await response.json()
      console.log("API response:", data)

      // Use collapse_result from the response
      const collapseResult = data.collapse_result

      // Determine which cell to collapse into
      const collapseIndex = collapseResult === 0 ? cell1Index : cell2Index
      const player = move.charAt(0)

      // Collapse the move
      gameState.board[collapseIndex].classical = player

      // Remove all quantum instances of this move
      gameState.board.forEach((cell) => {
        const moveIndex = cell.quantum.indexOf(move)
        if (moveIndex !== -1) {
          cell.quantum.splice(moveIndex, 1)
        }
      })

      messageArea.textContent = `Move ${move} collapsed to cell ${collapseIndex}`
      renderBoard()

      // Check for win condition
      checkWinCondition()
    } catch (error) {
      console.error("Error during collapse:", error)
      messageArea.textContent = "Error during collapse. Using fallback random collapse."

      // Fallback to random collapse if API fails
      const randomResult = Math.random() > 0.5 ? 1 : 0
      const collapseIndex = randomResult === 0 ? cell1Index : cell2Index
      const player = move.charAt(0)

      // Collapse the move
      gameState.board[collapseIndex].classical = player

      // Remove all quantum instances of this move
      gameState.board.forEach((cell) => {
        const moveIndex = cell.quantum.indexOf(move)
        if (moveIndex !== -1) {
          cell.quantum.splice(moveIndex, 1)
        }
      })

      messageArea.textContent = `Move ${move} collapsed to cell ${collapseIndex} (fallback)`
      renderBoard()

      // Check for win condition
      checkWinCondition()
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

    // Check for draw
    const allCellsFilled = gameState.board.every((cell) => cell.classical !== null || cell.quantum.length > 0)

    if (allCellsFilled) {
      gameState.gameActive = false
      messageArea.textContent = "Game ended in a draw!"
    }
  }

  // Render the board based on current state
  function renderBoard() {
    cells.forEach((cell, index) => {
      const cellState = gameState.board[index]
      let cellContent = ""

      // Render classical move if exists
      if (cellState.classical) {
        cellContent = `<span class="classical-move">${cellState.classical}</span>`
        cell.classList.add("has-classical")
      } else {
        cell.classList.remove("has-classical")

        // Render quantum moves
        cellState.quantum.forEach((move) => {
          cellContent += `<span class="quantum-move">${move}</span>`
        })

        // Highlight selected cells
        if (gameState.selectedCells.includes(index)) {
          cell.style.border = "2px solid #00ff00"
        } else {
          cell.style.border = "1px solid #333"
        }
      }

      cell.innerHTML = cellContent
    })
  }

  // Event listeners
  cells.forEach((cell) => {
    cell.addEventListener("click", () => {
      const index = Number.parseInt(cell.getAttribute("data-index"))
      handleCellClick(index)
    })
  })

  resetButton.addEventListener("click", initGame)

  // Initialize the game
  initGame()
})
