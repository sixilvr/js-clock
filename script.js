"use strict";

/*
TODO:
simplify pin control, to individual control
rotation/transpose
*/

/*
c for clocks, b for buttons/dials, p for pins.
Everything on the back has an extra b prefix.
All back positions have the same name as their
front counterparts (eg pul is paired with bpur).
Back corner clocks are driven by their front counterparts
and are not independently controlled. Therefore, to get
a front component's back component, just add a b prefix.
Clicking a back button activates its front counterpart.
Counter/clockwise are always relative to the front face.

Note for hardware implementation:
the pin being up is the write-enable for the clock flip-flop.
An activated button will affect writes to all connected clocks
on its pin side, and just the corner on its other side.
A clock is active if it is next to an active pin. A clock
moves if it is in the corner of the activated button, or
if any clock in its active group moves, or if it is a
corner clock with an active counterpart.
There are "global (counter)clockwise" signals, from the
OR of each button.
Edges and centers have activity given by the nearest pin.
Corners are active-front or active-back, given by the
nearest pin. When a corner's button is pressed, if it
is active-front, it will affect all active-front corners
and active clocks on the front. Vice verse for active-back.
Better naming conventions
Start with ur
*/

// DOM setup

function getElements(ids) {
    let elements = {};
    for (let id of ids) {
        elements[id] = document.getElementById(id);
    }
    return elements;
}

const clkNames = [
    "cul", "cur", "cdr", "cdl", "cu", "cr", "cd", "cl", "cc",
    "bcul", "bcur", "bcdr", "bcdl", "bcu", "bcr", "bcd", "bcl", "bcc"
];
const btnNames = [
    "bulm", "bulp", "burm", "burp", "bdrm", "bdrp", "bdlm", "bdlp",
    "bbulm", "bbulp", "bburm", "bburp", "bbdrm", "bbdrp", "bbdlm", "bbdlp"
];
const pinNames = [
    "pul", "pur", "pdr", "pdl", "bpul", "bpur", "bpdr", "bpdl"
];

const clk = getElements(clkNames);
const btn = getElements(btnNames);
const pin = getElements(pinNames);

const frontFace = document.getElementById("frontFace");
const backFace = document.getElementById("backFace");

// back bindings

function invertPins(pinFront, pinBack) {
    pinFront.onchange = () => {
        pinBack.checked = !pinFront.checked;
    }
    pinBack.onchange = () => {
        pinFront.checked = !pinBack.checked;
    }
}

invertPins(pin.pul, pin.bpul);
invertPins(pin.pur, pin.bpur);
invertPins(pin.pdr, pin.bpdr);
invertPins(pin.pdl, pin.bpdl);

// button assignments

function isBack(clkName) {
    return clkName[0] === "b";
}

function isCorner(clkName) {
    return (clkName.length === 3 && clkName[0] === "c") || (clkName.length === 4);
}

function padTime(num) {
    if (num < 10) {
        return "0" + num;
    }
    return num;
}

function incrementClk(clkName, direction) {
    if (isBack(clkName)) {
        direction *= -1;
    }
    let newNum = parseInt(clk[clkName].innerHTML) + direction;
    if (newNum > 12) {
        newNum = 1;
    } else if (newNum < 1) {
        newNum = 12;
    }
    clk[clkName].innerHTML = padTime(newNum);
}

// front buttons
for (let btnName of btnNames.slice(0, 8)) {
    btn[btnName].onclick = () => {
        let direction = (btnName[3] === "m") ? -1 : 1;
        let corner = btnName.slice(1, 3);
        applyMove(corner, direction);
    };
}

// back button bindings
for (let btnName of btnNames.slice(8)) {
    btn[btnName].onclick = () => {
        let frontName = btnName.slice(1);
        btn[frontName].click();
    }
}

// move logic

const pinClkGraph = {
    pul: ["cul", "cu", "cc", "cl"],
    pur: ["cu", "cur", "cr", "cc"],
    pdr: ["cc", "cr", "cdr", "cd"],
    pdl: ["cl", "cc", "cd", "cdl"],
    bpul: ["bcul", "bcu", "bcc", "bcl"],
    bpur: ["bcu", "bcur", "bcr", "bcc"],
    bpdr: ["bcc", "bcr", "bcdr", "bcd"],
    bpdl: ["bcl", "bcc", "bcd", "bcdl"]
}

function getNeighborsOfPin(pinName) {
    return pinClkGraph[pinName];
}

function getComplementOfClk(clkName) {
    if (isBack(clkName)) {
        return clkName.slice(1);
    } else {
        return "b" + clkName;
    }
}

function getActiveNeighbors(corner) {
    let activeFaceClks = [];
    let targetPins = pin["p" + corner].checked ? pinNames.slice(0, 4) : pinNames.slice(4);
    
    for (let pinName of targetPins) {
        if (pin[pinName].checked) {
            activeFaceClks.push(...getNeighborsOfPin(pinName));
        }
    }
    
    let activeClks = activeFaceClks.slice(); // copy
    for (let clkName of activeFaceClks) {
        if (isCorner(clkName)) {
            activeClks.push(getComplementOfClk(clkName));
        }
    }

    return new Set(activeClks); // removes duplicates
}

function applyMove(corner, direction) {
    let activeNeighbors = getActiveNeighbors(corner);
    for (let clkName of activeNeighbors) {
        incrementClk(clkName, direction);
    }
    if (isSolved()) {
        setTimeout(() => alert("Solved!"), 100);
    }
}

function isSolved() {
    for (let clkName of clkNames) {
        if (clk[clkName].innerHTML !== "12") {
            return false;
        }
    }
    return true;
}

// keyboard controls

function setPinPositions(ur, dr, dl, ul) {
    pin.pur.checked = ur;
    pin.pdr.checked = dr;
    pin.pdl.checked = dl;
    pin.pul.checked = ul;
    pin.bpur.checked = !ur;
    pin.bpdr.checked = !dr;
    pin.bpdl.checked = !dl;
    pin.bpul.checked = !ul;
}

const pinMappings = {
    // home row: single pin
    "j": [1, 0, 0, 0],
    "k": [0, 1, 0, 0],
    "l": [0, 0, 1, 0],
    ";": [0, 0, 0, 1],
    // top row: double pin
    "u": [1, 0, 0, 1],
    "i": [1, 1, 0, 0],
    "o": [0, 1, 1, 0],
    "p": [0, 0, 1, 1],
    // bottom row: 3 pins
    "n": [0, 1, 1, 1],
    "m": [1, 0, 1, 1],
    ",": [1, 1, 0, 1],
    ".": [1, 1, 1, 0],
    // left: diag, all, none
    "h": [0, 1, 0, 1],
    "g": [1, 0, 1, 0],
    "y": [1, 1, 1, 1],
    "t": [0, 0, 0, 0]
};

const btnMappings = {
    "a": "bulm",
    "s": "bulp",
    "d": "burm",
    "f": "burp",
    "z": "bdlp",
    "x": "bdlm",
    "c": "bdrp",
    "v": "bdrm"
};

const keyMappingsBack = {
    // pins
    "j": ".",
    "k": ",",
    "l": "m",
    ";": "n",
    "u": "o",
    "i": "i",
    "o": "u",
    "p": "p",
    "n": ";",
    "m": "l",
    ",": "k",
    ".": "j",
    "h": "h",
    "g": "g",
    "y": "t",
    "t": "y",
    // buttons
    "a": "f",
    "s": "d",
    "d": "s",
    "f": "a",
    "z": "v",
    "x": "c",
    "c": "x",
    "v": "z",
    // switch side
    " ": " "
};

let controllingFront = true;
function toggleControllingFront() {
    controllingFront = !controllingFront;
    if (controllingFront) {
        frontFace.style.borderColor = "red";
        backFace.style.borderColor = "white";
    } else {
        frontFace.style.borderColor = "white";
        backFace.style.borderColor = "red";
    }
}

document.addEventListener("keydown", event => {
    let key = controllingFront ? event.key : keyMappingsBack[event.key];
    if (key in pinMappings) {
        setPinPositions(...pinMappings[key]);
    } else if (key in btnMappings) {
        btn[btnMappings[key]].click();
    } else if (key === " ") {
        toggleControllingFront();
    }
});

setPinPositions(1, 1, 1, 1);

// feature buttons

const solveButton = document.getElementById("solveButton");
solveButton.onclick = () => {
    for (let clkName of clkNames) {
        clk[clkName].innerHTML = "12";
    }
    solveButton.blur();
};

const scrambleButton = document.getElementById("scrambleButton");
scrambleButton.onclick = () => {
    for (let clkName of clkNames) {
        let randomTime = Math.floor(Math.random() * 12) + 1;
        clk[clkName].innerHTML = padTime(randomTime);
    }
    scrambleButton.blur();
};
