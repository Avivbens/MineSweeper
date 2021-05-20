/**
 * @param {Number} ROWS - the number of 
 * @param {Number} COLS - the number of 
 * @returns A mat required
 */
function createMat(ROWS, COLS) {
    var mat = []
    for (var i = 0; i < ROWS; i++) {
        var row = []
        for (var j = 0; j < COLS; j++) {
            row.push('')
        }
        mat.push(row)
    }
    return mat
}


/**
 * @param {Object [][]} board 
 * @param {Number} cellI index
 * @param {Number} cellJ index
 * @returns array of all surround objects
 */
function getNearCellLocations(board, cellI, cellJ) {
    var coords = [];

    for (let i = cellI - 1; i <= cellI + 1; i++) {
        if (i < 0 || i >= board.length) continue;

        for (let j = cellJ - 1; j <= cellJ + 1; j++) {
            if (j < 0 || j >= board[i].length) continue;
            if (i === cellI && j === cellJ) continue;

            coords.push({ i, j });
        }
    }

    return coords;
}



/**
 * 
 * @param {String [][]} mat - mat of strings
 * @param {String} selector - getting the element by using this inside querySelector
 */
function printMat(mat, selector) {

    var strHTML = '<table border="0"><tbody>';
    for (var i = 0; i < mat.length; i++) {
        strHTML += '<tr>';
        for (var j = 0; j < mat[0].length; j++) {
            var cell = mat[i][j];
            var className = 'cell cell' + i + '-' + j;
            strHTML += '<td class="' + className + '"> ' + cell + ' </td>'
        }
        strHTML += '</tr>'
    }
    strHTML += '</tbody></table>';

    var elContainer = document.querySelector(selector);
    elContainer.innerHTML = strHTML;
}


/**
 * Shuffles array in place.
 * @param {Array} array items An array containing the items.
 */
function shuffle(array) {
    var j, x, i;
    for (i = array.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = array[i];
        array[i] = array[j];
        array[j] = x;
    }
    return array;
}


/**
 * @param {Object} location - object with {i, j}
 * @param {String} value - value that will be inside the cell
 */
function renderCell(location, value) {
    // Select the elCell and set the value
    var elCell = document.querySelector(`.cell-${location.i}-${location.j}`);
    elCell.innerHTML = value;
}


function getLocationFromClass(strClass) {
    var splitting = strClass.split('-');
    var location = {
        i: +splitting[1],
        j: +splitting[2]
    }

    return location;
}


/**
 * @param {Object {} } location - the location in form of {i, j}
 * @param {String} value - the class name
 */
function addClassToCell(location, value) {
    var elCell = document.querySelector(`.cell-${location.i}-${location.j}`);

    if (!elCell.classList.contains(value)) elCell.classList.add(value);
}

/**
 * @param {Object {}} location - the location in form of {i, j}
 * @param {String} value - the class name
 */
function removeClassToCell(location, value) {
    var elCell = document.querySelector(`.cell-${location.i}-${location.j}`);

    if (elCell.classList.contains(value)) elCell.classList.remove(value);
}

/**
 * @param {Number} min 
 * @param {Number} max 
 * @returns a random number between, inclusive
 */
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1) + min);
}


/**
 * Playing audio from the beginning
 * @param {Audio} audio 
 */
function playAudio(audio) {
    audio.pause();
    setTimeout(() => {
        audio.currentTime = 0;
        audio.play();
    }, 100);
}


/**
 * @param {*} board 
 * @returns Deep copy of board
 */
function copyBoard(board) {
    if (!board) return;
    var res = createMat(board.length, board[0].length);

    for (let i = 0; i < board.length; i++) {
        for (let j = 0; j < board[0].length; j++) {
            var currentObject = board[i][j];
            var newObject = {};

            for (const key in currentObject) {
                newObject[key] = currentObject[key];
            }
            res[i][j] = newObject;
        }
    }

    return res;
}