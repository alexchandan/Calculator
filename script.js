const display = document.querySelector("#calculator-display");
const buttons = document.querySelectorAll("button");

let string = "";
buttons.forEach(ele => {
    ele.addEventListener("click", (e) => {
        const key = e.target;
        const action = key.dataset.action;

        if (action === "decimal") {
            if (canAddDecimal(string)) {
                addToString(".");
            }
            return;
        }

        if (action === "clear") {
            string = "";
            display.value = string;
            return;
        }

        if (action === "delete") {
            string = string.substring(0, string.length - 1)
            display.value = string;
            return;
        }

        if (action === "calculate") {
            calculate(string);
            return;
        }

        if (action === "add") {
            if (string === "") {
                return;
            }
            let lastChar = string[string.length - 1];
            if (lastChar === '+' || lastChar === '-' || lastChar === '*' || lastChar === '/')
                return;
            addToString('+')
            return;
        }

        if (action === "subtract") {
            let lastChar = string[string.length - 1];
            if (lastChar === "+" || lastChar === "-" || lastChar === "*" || lastChar === "/") {
                return;
            }
            addToString("-");
            return;
        }

        if (action === "multiply") {
            if (string === "") {
                return;
            }
            let lastChar = string[string.length - 1];
            if (lastChar === "+" || lastChar === "-" || lastChar === "*" || lastChar === "/") {
                return;
            }
            display.value = string + key.innerText;
            addToString("*");
            return;
        }

        if (action === "divide") {
            if (string === '') {
                return
            }
            let lastChar = string[string.length - 1];
            if (lastChar === "+" || lastChar === "-" || lastChar === "*" || lastChar === "/") {
                return;
            }
            display.value = string + key.innerText;
            addToString("/");
            return;
        }
        addToString(key.innerText);
    })
})

function calculate(value) {
    const result = eval(value);
    string = result.toString();
    display.value = result;
}

function addToString(value) {
    string += value;
    display.value = string;
    return;
}

function canAddDecimal(value) {
    if (value === "") {
        return true;
    }
    for (let i = value.length - 1; i >= 0; i--) {
        if (isNaN(value[i])) {
            if (value[i] === ".") {
                return false;
            }
            return true;
        }
        return true;
    }
}