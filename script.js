/*
 * UI layer for the scientific calculator: entry editing with a cursor,
 * SHIFT/ALPHA modifiers, DEG/RAD/GRAD angle modes, independent and lettered
 * memories, Ans, calculation history and keyboard input.
 */
(function () {
    "use strict";

    const entryElement = document.querySelector("#entry");
    const resultElement = document.querySelector("#result");
    const historyElement = document.querySelector("#history");
    const historyListElement = document.querySelector("#history-list");
    const indicators = {
        shift: document.querySelector("#indicator-shift"),
        alpha: document.querySelector("#indicator-alpha"),
        memory: document.querySelector("#indicator-memory"),
        angle: document.querySelector("#indicator-angle")
    };

    const ANGLE_MODES = ["DEG", "RAD", "GRAD"];
    const VARIABLE_NAMES = ["A", "B", "C", "D", "E", "F", "M", "X", "Y"];
    const MAX_HISTORY = 20;

    const state = {
        entry: "",
        cursor: 0,
        answer: 0,
        angleMode: "DEG",
        shift: false,
        alpha: false,
        pendingVariable: null,
        variables: {},
        history: []
    };

    VARIABLE_NAMES.forEach(function (name) {
        state.variables[name] = 0;
    });

    function formatNumber(value) {
        if (!isFinite(value)) {
            return "Math ERROR";
        }
        if (value !== 0 && (Math.abs(value) >= 1e10 || Math.abs(value) < 1e-9)) {
            return value.toExponential(9).replace(/\.?0+e/, "e");
        }
        const rounded = parseFloat(value.toPrecision(12));
        return String(rounded);
    }

    function render() {
        const before = state.entry.slice(0, state.cursor);
        const after = state.entry.slice(state.cursor);
        entryElement.innerHTML = "";
        entryElement.appendChild(document.createTextNode(before || ""));
        const cursor = document.createElement("span");
        cursor.className = "cursor";
        entryElement.appendChild(cursor);
        entryElement.appendChild(document.createTextNode(after || ""));
        if (state.entry === "") {
            entryElement.classList.add("empty");
        } else {
            entryElement.classList.remove("empty");
        }
        entryElement.scrollLeft = entryElement.scrollWidth;

        indicators.shift.classList.toggle("active", state.shift);
        indicators.alpha.classList.toggle("active", state.alpha || state.pendingVariable !== null);
        indicators.memory.classList.toggle("active", state.variables.M !== 0);
        indicators.angle.textContent = state.angleMode;
    }

    function setResult(text, isError) {
        resultElement.textContent = text;
        resultElement.classList.toggle("error", Boolean(isError));
    }

    function clearModifiers() {
        state.shift = false;
        state.alpha = false;
    }

    function insert(text) {
        state.entry = state.entry.slice(0, state.cursor) + text + state.entry.slice(state.cursor);
        state.cursor += text.length;
        clearModifiers();
        render();
    }

    function deleteAtCursor() {
        if (state.cursor === 0) {
            return;
        }
        state.entry = state.entry.slice(0, state.cursor - 1) + state.entry.slice(state.cursor);
        state.cursor -= 1;
        render();
    }

    function clearAll() {
        state.entry = "";
        state.cursor = 0;
        state.pendingVariable = null;
        clearModifiers();
        setResult("", false);
        render();
    }

    // Auto-closes parentheses the way the ClassWiz does when "=" is pressed.
    function balanceParentheses(expression) {
        let open = 0;
        for (let i = 0; i < expression.length; i += 1) {
            if (expression[i] === "(") {
                open += 1;
            } else if (expression[i] === ")") {
                open -= 1;
            }
        }
        return expression + ")".repeat(Math.max(open, 0));
    }

    function evaluateEntry() {
        if (state.entry.trim() === "") {
            return null;
        }
        return window.CalcParser.evaluate(balanceParentheses(state.entry), {
            angleMode: state.angleMode,
            answer: state.answer,
            variables: state.variables
        });
    }

    function addToHistory(expression, value) {
        state.history.unshift({ expression: expression, value: value });
        state.history = state.history.slice(0, MAX_HISTORY);
        historyListElement.innerHTML = "";
        state.history.forEach(function (item) {
            const listItem = document.createElement("li");
            const expressionSpan = document.createElement("span");
            expressionSpan.className = "history-expression";
            expressionSpan.textContent = item.expression;
            const valueSpan = document.createElement("span");
            valueSpan.className = "history-value";
            valueSpan.textContent = formatNumber(item.value);
            listItem.appendChild(expressionSpan);
            listItem.appendChild(valueSpan);
            listItem.addEventListener("click", function () {
                state.entry = item.expression;
                state.cursor = state.entry.length;
                render();
            });
            historyListElement.appendChild(listItem);
        });
    }

    function calculate() {
        try {
            const value = evaluateEntry();
            if (value === null) {
                return;
            }
            state.answer = value;
            setResult(formatNumber(value), false);
            addToHistory(state.entry, value);
        } catch (error) {
            setResult(error.message, true);
        }
        clearModifiers();
        render();
    }

    function currentValue() {
        if (state.entry.trim() === "") {
            return state.answer;
        }
        return evaluateEntry();
    }

    function updateMemory(sign) {
        try {
            state.variables.M += sign * currentValue();
            setResult("M = " + formatNumber(state.variables.M), false);
            state.entry = "";
            state.cursor = 0;
        } catch (error) {
            setResult(error.message, true);
        }
        clearModifiers();
        render();
    }

    const actions = {
        shift: function () {
            const next = !state.shift;
            clearModifiers();
            state.shift = next;
            render();
        },
        alpha: function () {
            const next = !state.alpha;
            clearModifiers();
            state.alpha = next;
            render();
        },
        "angle-mode": function () {
            const index = ANGLE_MODES.indexOf(state.angleMode);
            state.angleMode = ANGLE_MODES[(index + 1) % ANGLE_MODES.length];
            clearModifiers();
            render();
        },
        history: function () {
            historyElement.classList.toggle("hidden");
            clearModifiers();
            render();
        },
        left: function () {
            state.cursor = Math.max(0, state.cursor - 1);
            render();
        },
        right: function () {
            state.cursor = Math.min(state.entry.length, state.cursor + 1);
            render();
        },
        clear: clearAll,
        delete: function () {
            deleteAtCursor();
        },
        calculate: calculate,
        "memory-store": function () {
            state.pendingVariable = "store";
            setResult("STO: press a variable key (A, B, X, Y)", false);
            render();
        },
        "memory-recall": function () {
            state.pendingVariable = "recall";
            setResult("RCL: press a variable key (A, B, X, Y)", false);
            render();
        },
        "memory-add": function () {
            updateMemory(1);
        },
        "memory-subtract": function () {
            updateMemory(-1);
        },
        "memory-clear": function () {
            state.variables.M = 0;
            setResult("M = 0", false);
            clearModifiers();
            render();
        }
    };

    function handleVariableKey(name) {
        if (state.pendingVariable === "store") {
            try {
                state.variables[name] = currentValue();
                setResult(name + " = " + formatNumber(state.variables[name]), false);
                state.entry = "";
                state.cursor = 0;
            } catch (error) {
                setResult(error.message, true);
            }
            state.pendingVariable = null;
            clearModifiers();
            render();
            return true;
        }
        if (state.pendingVariable === "recall") {
            state.pendingVariable = null;
            setResult(name + " = " + formatNumber(state.variables[name]), false);
            insert(formatNumber(state.variables[name]));
            return true;
        }
        return false;
    }

    document.querySelectorAll(".btn").forEach(function (button) {
        button.addEventListener("click", function () {
            const action = button.dataset.action;
            if (action) {
                actions[action]();
                return;
            }
            const shifted = button.dataset.shiftInsert;
            const text = state.shift && shifted ? shifted : button.dataset.insert;
            if (!text) {
                return;
            }
            if (VARIABLE_NAMES.indexOf(text) !== -1 && handleVariableKey(text)) {
                return;
            }
            insert(text);
        });
    });

    const KEYBOARD_INSERTS = {
        "*": "\u00d7",
        "/": "\u00f7",
        "p": "\u03c0",
        "r": "\u221a("
    };

    document.addEventListener("keydown", function (event) {
        const key = event.key;
        if (key === "Enter" || key === "=") {
            event.preventDefault();
            calculate();
            return;
        }
        if (key === "Backspace") {
            event.preventDefault();
            deleteAtCursor();
            return;
        }
        if (key === "Escape" || key === "Delete") {
            event.preventDefault();
            clearAll();
            return;
        }
        if (key === "ArrowLeft") {
            actions.left();
            return;
        }
        if (key === "ArrowRight") {
            actions.right();
            return;
        }
        if (/^[0-9.+\-()!^,%]$/.test(key)) {
            insert(key);
            return;
        }
        if (Object.prototype.hasOwnProperty.call(KEYBOARD_INSERTS, key)) {
            insert(KEYBOARD_INSERTS[key]);
        }
    });

    render();
})();
