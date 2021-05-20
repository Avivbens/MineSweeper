'use strict'
const MINE_IMG = '<img src="img/mine.png">';
const FLAG_IMG = '<img src="img/flag.png">';
const HEART_IMG = '<img class="heart" src="img/heart.png">';
const HINT_IMG = '<img onclick="useHint()" class="hint" src="img/hint.png">';


const PICK_SOUND = new Audio('sounds/pick.wav');
const BOMB_SOUND = new Audio('sounds/bomb.wav');
const WINNING_SOUND = new Audio('sounds/winning.wav');
const LOSER_SOUND = new Audio('sounds/loser.wav');


var gBoard;
var gBlipInterval;

var gClockInterval;
var gVictoryShowInterval;

var gStartTime;
var gNowTime;


var gLivesLeft;
var gHintsLeft;
var gIsTakingHint;

var gSafeClicks;

var gIsPositioningMines;
var gHavePositionedMines;
var gFinishedMinePositioned;

var gGameSaver;


var gLevel = {
    SIZE: 4,
    MINES: 2,
    LIVES: 3
};

var gGame;
var gCanClick;


//////////////////////////////////

/**
 * Start the all game
 */
function init() {
    gGame = {
        isOn: false,
        shownCount: 0,
        markedCount: 0
    };
    gLivesLeft = gLevel.LIVES;
    gHintsLeft = 3;
    gIsTakingHint = false;
    gSafeClicks = 3;
    gCanClick = true;


    gIsPositioningMines = false;
    gHavePositionedMines = false;
    gFinishedMinePositioned = false;

    gGameSaver = [];

    updateHearts();
    updateHints();
    updateSafeClick();
    showBestScore();


    gBlipInterval = null;

    clearInterval(gClockInterval);
    gClockInterval = null;

    clearInterval(gVictoryShowInterval);
    gVictoryShowInterval = null;


    buildBoard();

    renderBoard(gBoard);
}


/**
 * Build the game board 
 */
function buildBoard() {
    gBoard = createMat(gLevel.SIZE, gLevel.SIZE);


    for (let i = 0; i < gBoard.length; i++) {
        for (let j = 0; j < gBoard[0].length; j++) {
            var currentCell = {
                    minesAroundCount: 0,
                    isShown: false,
                    isMine: false,
                    isMarked: false
                }
                // if (i === 1 || j === 1) currentCell.isMine = true;
            gBoard[i][j] = currentCell;
        }
    }
}


/**
 * Render the board
 * @param {*} board 
 */
function renderBoard(board) {
    var strHTML = '';

    for (let i = 0; i < board.length; i++) {
        strHTML += '<tr>';
        for (let j = 0; j < board[0].length; j++) {
            var currentCell = board[i][j];
            strHTML += `<td oncontextmenu="cellMark(this);" 
            onclick="cellClicked(this)" class="cell cell-${i}-${j}">`;
            if (currentCell.isShown) {
                if (currentCell.isMine) {
                    strHTML += MINE_IMG;
                } else {
                    if (!currentCell.minesAroundCount) continue;
                    strHTML += `${currentCell.minesAroundCount}`
                }
            }
            strHTML += `</td>`;
        }
        strHTML += '</tr>';
    }

    var elContainer = document.querySelector('.game-board');
    elContainer.innerHTML = strHTML;
}


/**
 * Operate the click on a cell
 * @param {Element} el - the cell clicked
 */
function cellClicked(el) {
    if (!gCanClick) return;


    if (gIsTakingHint) {
        gIsTakingHint = false;
        showSurround(el);
        return;
    }
    if (el.classList.contains('mark')) return; // Returns and not opening the cell if he is marked


    var locationClass = el.classList[1];
    var location = getLocationFromClass(locationClass);
    var modelCell = gBoard[location.i][location.j];


    // Start the game by first click, start the clock and random the mines
    if (!gGame.isOn) {
        // Case no mines are manually positioned
        if (!gHavePositionedMines) {
            gGame.isOn = true;
            startClock();
            randomMinesInBoard(location.i, location.j);

        } else { // Positioning mines if wanted
            if (gIsPositioningMines) { // Positioning right now
                modelCell.isMine = true;
                el.style.backgroundColor = 'red';
                return;
            }
            if (gFinishedMinePositioned) { // Finished positioning
                gGame.isOn = true;
                startClock();
            }
        }

        updateCounterForAllCells();
    }

    // Saving current position of board
    saveMove(gBoard);

    if (modelCell.isShown) return;

    if (!modelCell.isMine) {
        playAudio(PICK_SOUND);

        expandShownRecursively(gBoard, location.i, location.j);
    } else {
        playAudio(BOMB_SOUND);

        mineExploded(gBoard, el, location.i, location.j);
    }

    updateOpenClasses();

    // Check if that move got a win
    checkVictory();
}


/**
 * expand shown (only neighbors)
 * @param {*} board 
 * @param {Number} iIndex - the location of the cell clicked
 * @param {Number} jIndex - the location of the cell clicked
 * @returns 
 */
function expandShown(board, iIndex, jIndex) {
    // If the cell is marked - it will stay closed
    if (board[iIndex][jIndex].isMarked) return;

    if (!board[iIndex][jIndex].isMine) {
        board[iIndex][jIndex].isShown = true;
    }


    var valueIn = board[iIndex][jIndex].minesAroundCount;
    valueIn = (!valueIn) ? '' : valueIn;
    renderCell({ i: iIndex, j: jIndex }, valueIn);

    var cellsAround = getNearCellLocations(board, iIndex, jIndex);

    for (let i = 0; i < cellsAround.length; i++) {
        var currentCheck = cellsAround[i];
        if (!gBoard[currentCheck.i][currentCheck.j].isMine) {
            gBoard[currentCheck.i][currentCheck.j].isShown = true;
            var valueIn = board[currentCheck.i][currentCheck.j].minesAroundCount;
            valueIn = (!valueIn) ? 0 : valueIn;
            renderCell(currentCheck, valueIn);
        }
    }
}


/**
 * Recursive expand shown by the roles
 * @param {*} board 
 * @param {Number} iIndex - the location of the cell clicked
 * @param {Number} jIndex - the location of the cell clicked
 */
function expandShownRecursively(board, iIndex, jIndex) {
    // If the cell is marked - it will stay closed
    if (board[iIndex][jIndex].isMarked) return;


    board[iIndex][jIndex].isShown = true;

    var valueIn = board[iIndex][jIndex].minesAroundCount;
    valueIn = (!valueIn) ? '' : valueIn;
    renderCell({ i: iIndex, j: jIndex }, valueIn);

    if (board[iIndex][jIndex].minesAroundCount) return;

    var cellsAround = getNearCellLocations(board, iIndex, jIndex);
    var allHidden = getHiddenNonMinesLocationsFromArray(cellsAround, board);

    if (!allHidden.length) return;
    for (let i = 0; i < allHidden.length; i++) {
        var currentHidden = allHidden[i];

        // If the cell is marked - it will stay closed
        if (board[currentHidden.i][currentHidden.j].isMarked) continue;

        board[currentHidden.i][currentHidden.j].isShown = true;


        var valueIn = board[currentHidden.i][currentHidden.j].minesAroundCount;
        valueIn = (!valueIn) ? '' : valueIn;
        renderCell(currentHidden, valueIn);

        // Recursion
        if (!board[currentHidden.i][currentHidden.j].minesAroundCount) {
            expandShownRecursively(board, currentHidden.i, currentHidden.j);
        }
    }
}


/**
 * Updating all cells that opened to be with open class
 */
function updateOpenClasses() {
    gGame.shownCount = 0;
    for (let i = 0; i < gBoard.length; i++) {
        for (let j = 0; j < gBoard[0].length; j++) {
            var currentCell = gBoard[i][j];
            if (currentCell.isShown) {
                addClassToCell({ i, j }, 'open');
                gGame.shownCount++;
            }
        }
    }
}


/**
 * Update all cells that opened with mines to be explosive
 */
function updateOpenMines() {
    for (let i = 0; i < gBoard.length; i++) {
        for (let j = 0; j < gBoard[0].length; j++) {
            var currentCell = gBoard[i][j];
            if (currentCell.isShown && currentCell.isMine) {
                addClassToCell({ i, j }, 'explosive');
            }
        }
    }
}


/**
 * Exploding mine and showing it
 * @param {*} board 
 * @param {Element} elCell - the element clicked
 * @param {Number} indexI - the location of click
 * @param {Number} indexJ - the location of click
 */
function mineExploded(board, elCell, indexI, indexJ) {
    board[indexI][indexJ].isShown = true;
    elCell.innerHTML = MINE_IMG;
    gLivesLeft--;
    updateHearts();
    checkGameOver();


    if (gBlipInterval) {
        clearInterval(gBlipInterval);
        elCell.classList.add('explosive');
        gBlipInterval = null;
    }

    gBlipInterval = setInterval(() => {
        elCell.classList.toggle('explosive');
    }, 200);
    var killInterval = setTimeout(() => {
        clearInterval(gBlipInterval);
        gBlipInterval = null;
        elCell.classList.add('explosive');
    }, 1000 * 2);
}


/**
 * Explode all mines on map
 */
function explodeAllMines() {
    for (let i = 0; i < gBoard.length; i++) {
        for (let j = 0; j < gBoard[0].length; j++) {
            var currentCell = gBoard[i][j];

            if (currentCell.isMine && !currentCell.isShown) {
                var cellClassStr = `.cell-${i}-${j}`;
                var elCell = document.querySelector(cellClassStr);

                mineExploded(gBoard, elCell, i, j);
            }
        }
    }
}


/**
 * Updating counter of mines for all cells
 */
function updateCounterForAllCells() {
    for (var i = 0; i < gBoard.length; i++) {
        for (var j = 0; j < gBoard[0].length; j++) {
            var currentCellCount = countMinesAround(gBoard, { i, j });

            gBoard[i][j].minesAroundCount = currentCellCount;
        }
    }
}


/**
 * @param {*} board 
 * @param {Object} location {i, j}
 * @returns The counter of how much mines are around
 */
function countMinesAround(board, location) {
    var counter = 0;

    for (let i = location.i - 1; i <= location.i + 1; i++) {
        if (i < 0 || i >= board.length) continue;

        for (let j = location.j - 1; j <= location.j + 1; j++) {
            if (j < 0 || j >= board[i].length) continue;
            if (i === location.i && j === location.j) continue;

            var currentCell = board[i][j];
            if (currentCell.isMine) {
                counter++;
            }
        }
    }

    return counter;
}

/**
 * Set the selected cell to mark both at the model and the DOM
 * @param {Element} elCell 
 */
function cellMark(elCell) {
    if (elCell.classList.contains('open')) return;
    if (gIsPositioningMines) return;
    if (!gGame.isOn) return;

    // Update model
    var locationStr = elCell.classList[1];
    var location = getLocationFromClass(locationStr);


    gBoard[location.i][location.j].isMarked = !gBoard[location.i][location.j].isMarked;


    // Update DOM
    elCell.classList.toggle('mark');
    if (gBoard[location.i][location.j].isMarked) {
        gGame.markedCount++;
        elCell.innerHTML = FLAG_IMG;
    } else {
        gGame.markedCount--;
        elCell.innerHTML = '';
    }

    // Check if that move got a win
    checkVictory();
}


/**
 * @param {Object} arrayOfLocations {i, j}
 * @param {*} board 
 * @returns Array of locations {i, j} that not have a mine and not shown
 */
function getHiddenNonMinesLocationsFromArray(arrayOfLocations, board) {
    var res = [];

    for (let i = 0; i < arrayOfLocations.length; i++) {
        var currentLocation = arrayOfLocations[i];
        var currentCell = board[currentLocation.i][currentLocation.j];

        if (!currentCell.isShown && !currentCell.isMine) {
            res.push(currentLocation);
        }
    }

    return res;
}

/**
 * Random if a place will have a mine or not
 * @returns Array of random true or false
 */
function randomInputToBoard() {
    var numberOfCells = gBoard.length * gBoard[0].length;
    var randomInput = [];

    for (let i = 0; i < gLevel.MINES; i++) {
        randomInput.push(true);
    }

    for (let i = gLevel.MINES; i < numberOfCells; i++) {
        randomInput.push(false);
    }

    shuffle(randomInput);

    return randomInput;
}


/**
 * @returns Random Cell without a mine
 */
function findSafeSpot() {
    var allSafeSpots = [];

    for (let i = 0; i < gBoard.length; i++) {
        for (let j = 0; j < gBoard[0].length; j++) {
            if (!gBoard[i][j].isMine) allSafeSpots.push(gBoard[i][j]);
        }
    }

    if (!allSafeSpots.length) return null;
    shuffle(allSafeSpots);


    return allSafeSpots[0];
}


/**
 * @returns Random location {i, j} without a mine
 */
function findSafeLocation() {
    var allSafeSpots = [];

    for (let i = 0; i < gBoard.length; i++) {
        for (let j = 0; j < gBoard[0].length; j++) {
            if (!gBoard[i][j].isMine && !gBoard[i][j].isShown) allSafeSpots.push({ i, j });
        }
    }

    if (!allSafeSpots.length) return null;
    shuffle(allSafeSpots);


    return allSafeSpots[0];
}

/**
 * Random all mines into the board, gets first location so will be always clear
 * @param {Number} indexI - click location
 * @param {Number} indexJ - click location
 */
function randomMinesInBoard(indexI, indexJ) {
    var randIfMine = randomInputToBoard();

    for (let i = 0; i < gBoard.length; i++) {
        for (let j = 0; j < gBoard[0].length; j++) {
            gBoard[i][j].isMine = randIfMine[i * gBoard.length + j];
        }
    }

    if (gBoard[indexI][indexJ].isMine) {
        var safeSpot = findSafeSpot();
        safeSpot.isMine = true;
        gBoard[indexI][indexJ].isMine = false;
    }
}

/**
 * Checks if the game is over
 */
function checkGameOver() {
    if (gLivesLeft <= 0) {
        gameOver();
    }
}

/**
 * Getting amount of all the non-shown cells
 */
function getHiddenCellsAmount() {
    var counter = 0;
    for (let i = 0; i < gBoard.length; i++) {
        for (let j = 0; j < gBoard[0].length; j++) {
            if (!gBoard[i][j].isShown) {
                counter++;
            }
        }
    }

    return counter;
}


/**
 * Getting amount of all mines hidden
 */
function getMineCellsAmount() {
    var counter = 0;
    for (let i = 0; i < gBoard.length; i++) {
        for (let j = 0; j < gBoard[0].length; j++) {
            if (!gBoard[i][j].isShown && gBoard[i][j].isMine) {
                counter++;
            }
        }
    }

    return counter;
}


/**
 * Changing the level
 * @param {Number} gameLevel 
 */
function changeLevel(gameLevel) {
    playAudio(PICK_SOUND);

    gLevel.SIZE = gameLevel;
    switch (gameLevel) {
        case 4:
            gLevel.MINES = 2;
            break;
        case 8:
            gLevel.MINES = 12;
            break;
        case 12:
            gLevel.MINES = 30;
            break;
    }

    cleanWinningLabel();
    init();
}


/**
 * Check if the player won
 */
function checkVictory() {
    var hiddenAmount = getHiddenCellsAmount();
    var minesAmount = getMineCellsAmount();

    if (hiddenAmount === minesAmount &&
        minesAmount === gGame.markedCount &&
        gLivesLeft > 0) {

        showVictory();
    }
}


/**
 * Show the player have won
 */
function showVictory() {
    playAudio(WINNING_SOUND);

    clearInterval(gClockInterval);
    gClockInterval = null;
    gGame.isOn = false;

    updateBestScoreClock();
    gCanClick = false;

    var elWinningLabel = document.querySelector('.over-screen');
    elWinningLabel.style.display = 'block';
    elWinningLabel.querySelector('span').innerText = 'You Won';

    gVictoryShowInterval = setInterval(() => {
        elWinningLabel.querySelector('span').style.textShadow = '0px 0px 20px rgb(182, 171, 14)';
        setTimeout(() => {
            elWinningLabel.querySelector('span').style.textShadow = 'none';
        }, 100);
    }, 200);
}


/**
 * Game over label
 */
function gameOver() {
    clearInterval(gClockInterval);
    gClockInterval = null;
    gGame.isOn = false;

    explodeAllMines();

    playAudio(LOSER_SOUND);

    gCanClick = false;

    var elGameOverLabel = document.querySelector('.over-screen');
    elGameOverLabel.style.display = 'block';
    elGameOverLabel.querySelector('span').innerText = 'You Lost';
}

/**
 * Start the clock when interval
 */
function startClock() {
    gStartTime = Date.now();

    gClockInterval = setInterval(() => {
        gNowTime = Date.now();
        var diff = gNowTime - gStartTime;
        var strClock = convertTimeToClock(diff);

        var elClock = document.querySelector('.time-in-timer');
        elClock.innerText = strClock;
    }, 120);
}


function convertTimeToClock(timeInMills) {
    var secs = parseInt(timeInMills / 1000);
    var minutes = parseInt(secs / 60);

    timeInMills -= secs * 1000;
    secs -= minutes * 60;

    var mills = parseInt(timeInMills / 10);

    minutes = '' + minutes;
    secs = '' + secs;
    mills = '' + mills;


    var strClock = `${minutes.padStart(2, '0')}:${secs.padStart(2, '0')}:${mills.padStart(2, '0')}`


    return strClock;
}


/**
 * Updating the remaining lives in Dom
 */
function updateHearts() {
    var elLifeLabel = document.querySelector('.lives-stack');

    var strHTML = '';

    for (let i = 0; i < gLivesLeft; i++) {
        strHTML += HEART_IMG;
    }

    elLifeLabel.innerHTML = strHTML;
}

/**
 * Updating the remaining hints in Dom
 */
function updateHints() {
    var elLifeLabel = document.querySelector('.hints-stack');

    var strHTML = '';

    for (let i = 0; i < gHintsLeft; i++) {
        strHTML += HINT_IMG;
    }

    elLifeLabel.innerHTML = strHTML;
}


/**
 * Updating safe click button in DOM
 */
function updateSafeClick() {
    var elSafeClickBtn = document.querySelector('.safe-click-remains');
    elSafeClickBtn.innerText = gSafeClicks;
}

/**
 * Show the bst score on DOM
 */
function showBestScore() {
    var currentBestScore = localStorage.getItem(`bestScore${gLevel.SIZE}`);

    var elBestScore = document.querySelector('.best-score');
    var bestScoreInClock = convertTimeToClock(currentBestScore);
    if (!currentBestScore) {
        elBestScore.innerText = 'none';
    } else {
        elBestScore.innerText = bestScoreInClock;
    }
}

/**
 * Update the best score if needed, and show it on DOM
 */
function updateBestScoreClock() {
    updateLocalStorageScore(gNowTime - gStartTime);

    showBestScore();
}


/**
 * @param {Number} score 
 * @returns The updated best score, even if not changed
 */
function updateLocalStorageScore(score) {
    var levelBestScoreStr = `bestScore${gLevel.SIZE}`;

    var currentBestScore = localStorage.getItem(levelBestScoreStr);
    if (score < currentBestScore || !currentBestScore) localStorage.setItem(levelBestScoreStr, score);


    return localStorage.getItem(levelBestScoreStr);
}


/**
 * 
 * @param {*} board 
 * @param {Object} location {i, j}
 * @returns array of all nearby cells - if isShown
 */
function saveSurroundValues(board, location) {
    var values = [];
    for (let i = location.i - 1; i <= location.i + 1; i++) {
        if (i < 0 || i >= board.length) continue;

        for (let j = location.j - 1; j <= location.j + 1; j++) {
            if (j < 0 || j >= board[i].length) continue;
            if (i === location.i && j === location.j) continue;

            values.push(board[i][j].isShown);
        }
    }

    return values;
}

/**
 * Restore all isShown Cells around
 * @param {*} board 
 * @param {Object} location {i, j}
 */
function restoreSurroundValues(board, location, values) {
    var index = 0;
    for (let i = location.i - 1; i <= location.i + 1; i++) {
        if (i < 0 || i >= board.length) continue;

        for (let j = location.j - 1; j <= location.j + 1; j++) {
            if (j < 0 || j >= board[i].length) continue;
            if (i === location.i && j === location.j) continue;

            board[i][j].isShown = values[index];
            index++;

            if (!board[i][j].isShown) renderCell({ i, j }, '');
        }
    }
}


/**
 * Show the all area of the cell hint
 * @param {Element} el - the cell clicked to see
 */
function showSurround(el) {
    var locationClass = el.classList[1];
    var location = getLocationFromClass(locationClass);
    var modelCell = gBoard[location.i][location.j];

    var surroundData = saveSurroundValues(gBoard, location);
    expandShown(gBoard, location.i, location.j);

    var showSurroundTimeout = setTimeout(() => {
        modelCell.isShown = false;
        renderCell({ i: location.i, j: location.j }, '');

        restoreSurroundValues(gBoard, location, surroundData);

    }, 1.5 * 1000);
}


/**
 * Activated hint mode and update label
 */
function useHint() {
    if (gIsTakingHint || !gGame.isOn) return;


    gHintsLeft--;
    updateHints();

    gIsTakingHint = true;
}


/**
 * Displaying none the victory label
 */
function cleanWinningLabel() {
    var elWinningLabel = document.querySelector('.over-screen');
    elWinningLabel.style.display = 'none';
}


/**
 * Activate the safe spot search
 * @param {Element} el - the safe spot button clicked
 */
function activeSafeClick(el) {
    if (gSafeClicks === 0 || !gGame.isOn) return;
    var elSpanBtn = el.querySelector('span');

    gSafeClicks--;
    elSpanBtn.innerText = gSafeClicks;

    var safeSpot = findSafeLocation();

    if (!safeSpot) return; // No safe locations

    var elSpottedCell = document.querySelector(`.cell-${safeSpot.i}-${safeSpot.j}`);
    elSpottedCell.style.backgroundColor = 'rgba(207, 207, 33, 0.76)';

}


/**
 * Undo one move back
 */
function undoMove() {
    if (!gCanClick || !gGame.isOn) return;

    if (gGameSaver.length <= 1) return;
    var gameCopy = gGameSaver.pop();

    gBoard = gameCopy.board;
    gLivesLeft = gameCopy.lives;
    gHintsLeft = gameCopy.hints;
    gSafeClicks = gameCopy.safeClicks;


    renderBoard(gBoard);
    updateOpenClasses();
    updateOpenMines();

    updateHints();
    updateHearts();
    updateSafeClick();
}


/**
 * Save current board position in stack
 * @param {*} board 
 */
function saveMove(board) {
    var boardCopy = copyBoard(board);
    var gameCopy = {
        board: boardCopy,
        lives: gLivesLeft,
        hints: gHintsLeft,
        safeClicks: gSafeClicks
    };

    gGameSaver.push(gameCopy);
}


/**
 * Enable the option to set the mines
 */
function positionedMines() {
    if (!gCanClick || gGame.isOn) return;
    gIsPositioningMines = !gIsPositioningMines;


    // Changing the button color according to the active status
    var elPositionBtn = document.querySelector('.positioned-btn');
    if (gIsPositioningMines) {
        elPositionBtn.style.backgroundColor = 'red';
    } else {
        elPositionBtn.style.backgroundColor = 'rgb(78, 78, 207)';
    }


    gHavePositionedMines = true;
    gFinishedMinePositioned = !gIsPositioningMines;

    if (gFinishedMinePositioned) {
        renderBoard(gBoard);
    }
}



//