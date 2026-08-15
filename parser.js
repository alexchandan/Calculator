/*
 * Expression tokenizer and recursive-descent evaluator for the scientific
 * calculator. Supports the operator set of a Casio fx-991EX ClassWiz:
 * implicit multiplication, unary minus, postfix operators (!, %, squares,
 * cubes, reciprocal), infix nCr/nPr, functions, constants and variables.
 */
(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) {
        module.exports = api;
    } else {
        root.CalcParser = api;
    }
})(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    const CONSTANTS = {
        "\u03c0": Math.PI,
        "e": Math.E
    };

    const FUNCTIONS = {
        "sin": true, "cos": true, "tan": true,
        "sin\u207b\u00b9": true, "cos\u207b\u00b9": true, "tan\u207b\u00b9": true,
        "sinh": true, "cosh": true, "tanh": true,
        "sinh\u207b\u00b9": true, "cosh\u207b\u00b9": true, "tanh\u207b\u00b9": true,
        "log": true, "ln": true, "\u221a": true, "\u221b": true,
        "Abs": true, "Int": true, "Intg": true, "Ran#": true,
        "10^": true, "e^": true, "logb": true, "RanInt": true,
        "GCD": true, "LCM": true
    };

    // Longest-first so that multi-character tokens win over their prefixes.
    const SYMBOLS = [
        "sinh\u207b\u00b9", "cosh\u207b\u00b9", "tanh\u207b\u00b9",
        "sin\u207b\u00b9", "cos\u207b\u00b9", "tan\u207b\u00b9",
        "RanInt", "Ran#", "Intg", "Abs", "Int", "GCD", "LCM",
        "sinh", "cosh", "tanh", "sin", "cos", "tan", "logb", "log", "ln",
        "10^", "e^", "\u221a", "\u221b",
        "nCr", "nPr", "Ans", "mod",
        "\u00d710^", "\u00d7", "\u00f7", "\u2212",
        "\u207b\u00b9", "\u00b2", "\u00b3", "\u2070", "\u00b9",
        "+", "-", "*", "/", "^", "(", ")", ",", "!", "%", "\u03c0", "e"
    ];

    const VARIABLES = ["A", "B", "C", "D", "E", "F", "M", "X", "Y"];

    function isDigit(ch) {
        return ch >= "0" && ch <= "9";
    }

    function tokenize(input) {
        const tokens = [];
        let i = 0;
        while (i < input.length) {
            const ch = input[i];
            if (ch === " ") {
                i += 1;
                continue;
            }
            if (isDigit(ch) || ch === ".") {
                let j = i;
                let seenDot = false;
                while (j < input.length && (isDigit(input[j]) || (input[j] === "." && !seenDot))) {
                    if (input[j] === ".") {
                        seenDot = true;
                    }
                    j += 1;
                }
                tokens.push({ type: "number", value: parseFloat(input.slice(i, j)) });
                i = j;
                continue;
            }
            const symbol = SYMBOLS.find(function (candidate) {
                return input.startsWith(candidate, i);
            });
            if (symbol) {
                tokens.push({ type: "symbol", value: symbol });
                i += symbol.length;
                continue;
            }
            if (VARIABLES.indexOf(ch) !== -1) {
                tokens.push({ type: "variable", value: ch });
                i += 1;
                continue;
            }
            throw new SyntaxError("Syntax ERROR: unexpected \"" + ch + "\"");
        }
        return tokens;
    }

    function factorial(n) {
        if (n < 0 || Math.floor(n) !== n) {
            throw new RangeError("Math ERROR: factorial needs a non-negative integer");
        }
        if (n > 170) {
            throw new RangeError("Math ERROR: factorial overflow");
        }
        let result = 1;
        for (let k = 2; k <= n; k += 1) {
            result *= k;
        }
        return result;
    }

    function permutations(n, r) {
        if (n < 0 || r < 0 || Math.floor(n) !== n || Math.floor(r) !== r || r > n) {
            throw new RangeError("Math ERROR: invalid nPr arguments");
        }
        let result = 1;
        for (let k = 0; k < r; k += 1) {
            result *= n - k;
        }
        return result;
    }

    function combinations(n, r) {
        return permutations(n, r) / factorial(r);
    }

    function gcd(a, b) {
        a = Math.abs(Math.round(a));
        b = Math.abs(Math.round(b));
        while (b) {
            const t = b;
            b = a % b;
            a = t;
        }
        return a;
    }

    function Parser(tokens, context) {
        this.tokens = tokens;
        this.position = 0;
        this.context = context;
    }

    Parser.prototype.peek = function () {
        return this.tokens[this.position];
    };

    Parser.prototype.next = function () {
        const token = this.tokens[this.position];
        this.position += 1;
        return token;
    };

    Parser.prototype.accept = function (value) {
        const token = this.peek();
        if (token && token.type === "symbol" && token.value === value) {
            this.position += 1;
            return true;
        }
        return false;
    };

    Parser.prototype.expect = function (value) {
        if (!this.accept(value)) {
            throw new SyntaxError("Syntax ERROR: expected \"" + value + "\"");
        }
    };

    Parser.prototype.toRadians = function (value) {
        if (this.context.angleMode === "DEG") {
            return value * Math.PI / 180;
        }
        if (this.context.angleMode === "GRAD") {
            return value * Math.PI / 200;
        }
        return value;
    };

    Parser.prototype.fromRadians = function (value) {
        if (this.context.angleMode === "DEG") {
            return value * 180 / Math.PI;
        }
        if (this.context.angleMode === "GRAD") {
            return value * 200 / Math.PI;
        }
        return value;
    };

    // expression := term (("+" | "-") term)*
    Parser.prototype.parseExpression = function () {
        let value = this.parseTerm();
        for (;;) {
            if (this.accept("+")) {
                value += this.parseTerm();
            } else if (this.accept("-") || this.accept("\u2212")) {
                value -= this.parseTerm();
            } else {
                return value;
            }
        }
    };

    // term := unary (("×" | "÷" | "mod" | implicit) unary)*
    Parser.prototype.parseTerm = function () {
        let value = this.parseUnary();
        for (;;) {
            if (this.accept("\u00d7") || this.accept("*")) {
                value *= this.parseUnary();
            } else if (this.accept("\u00f7") || this.accept("/")) {
                const divisor = this.parseUnary();
                if (divisor === 0) {
                    throw new RangeError("Math ERROR: division by zero");
                }
                value /= divisor;
            } else if (this.accept("mod")) {
                value %= this.parseUnary();
            } else if (this.startsImplicitProduct()) {
                value *= this.parseUnary();
            } else {
                return value;
            }
        }
    };

    // "2π", "3sin(30)" and "2(3+4)" all multiply implicitly, as on the ClassWiz.
    Parser.prototype.startsImplicitProduct = function () {
        const token = this.peek();
        if (!token) {
            return false;
        }
        if (token.type === "number" || token.type === "variable") {
            return true;
        }
        return token.type === "symbol" &&
            (token.value === "(" || token.value === "\u03c0" || token.value === "e" ||
                token.value === "Ans" ||
                FUNCTIONS[token.value] === true);
    };

    // unary := ("-" | "+")* nCr-level
    Parser.prototype.parseUnary = function () {
        if (this.accept("-") || this.accept("\u2212")) {
            return -this.parseUnary();
        }
        if (this.accept("+")) {
            return this.parseUnary();
        }
        return this.parseChoose();
    };

    // nCr / nPr bind tighter than × but looser than ^
    Parser.prototype.parseChoose = function () {
        let value = this.parsePower();
        for (;;) {
            if (this.accept("nCr")) {
                value = combinations(value, this.parsePower());
            } else if (this.accept("nPr")) {
                value = permutations(value, this.parsePower());
            } else {
                return value;
            }
        }
    };

    // power := postfix ("^" unary)?  — right associative
    Parser.prototype.parsePower = function () {
        const base = this.parsePostfix();
        if (this.accept("^")) {
            return Math.pow(base, this.parseUnary());
        }
        if (this.accept("\u00d710^")) {
            return base * Math.pow(10, this.parseUnary());
        }
        return base;
    };

    Parser.prototype.parsePostfix = function () {
        let value = this.parsePrimary();
        for (;;) {
            if (this.accept("!")) {
                value = factorial(value);
            } else if (this.accept("%")) {
                value /= 100;
            } else if (this.accept("\u00b2")) {
                value = value * value;
            } else if (this.accept("\u00b3")) {
                value = value * value * value;
            } else if (this.accept("\u207b\u00b9")) {
                if (value === 0) {
                    throw new RangeError("Math ERROR: division by zero");
                }
                value = 1 / value;
            } else {
                return value;
            }
        }
    };

    Parser.prototype.parseArguments = function (count) {
        this.expect("(");
        const args = [this.parseExpression()];
        while (args.length < count) {
            this.expect(",");
            args.push(this.parseExpression());
        }
        this.expect(")");
        return args;
    };

    // Functions without parentheses take the tightest following operand, so
    // "sin30" works and "√9+1" is 4 rather than √10.
    Parser.prototype.parseFunctionArgument = function () {
        if (this.peek() && this.peek().type === "symbol" && this.peek().value === "(") {
            this.next();
            const value = this.parseExpression();
            this.expect(")");
            return value;
        }
        return this.parsePower();
    };

    Parser.prototype.parsePrimary = function () {
        const token = this.next();
        if (!token) {
            throw new SyntaxError("Syntax ERROR: unexpected end of expression");
        }
        if (token.type === "number") {
            return token.value;
        }
        if (token.type === "variable") {
            return this.context.variables[token.value] || 0;
        }
        const name = token.value;
        if (name === "(") {
            const value = this.parseExpression();
            this.expect(")");
            return value;
        }
        if (name === "Ans") {
            return this.context.answer || 0;
        }
        if (Object.prototype.hasOwnProperty.call(CONSTANTS, name)) {
            return CONSTANTS[name];
        }
        return this.applyFunction(name);
    };

    Parser.prototype.applyFunction = function (name) {
        switch (name) {
        case "sin":
            return Math.sin(this.toRadians(this.parseFunctionArgument()));
        case "cos":
            return Math.cos(this.toRadians(this.parseFunctionArgument()));
        case "tan":
            return Math.tan(this.toRadians(this.parseFunctionArgument()));
        case "sin\u207b\u00b9":
            return this.fromRadians(Math.asin(this.parseFunctionArgument()));
        case "cos\u207b\u00b9":
            return this.fromRadians(Math.acos(this.parseFunctionArgument()));
        case "tan\u207b\u00b9":
            return this.fromRadians(Math.atan(this.parseFunctionArgument()));
        case "sinh":
            return Math.sinh(this.parseFunctionArgument());
        case "cosh":
            return Math.cosh(this.parseFunctionArgument());
        case "tanh":
            return Math.tanh(this.parseFunctionArgument());
        case "sinh\u207b\u00b9":
            return Math.asinh(this.parseFunctionArgument());
        case "cosh\u207b\u00b9":
            return Math.acosh(this.parseFunctionArgument());
        case "tanh\u207b\u00b9":
            return Math.atanh(this.parseFunctionArgument());
        case "log":
            return Math.log10(this.parseFunctionArgument());
        case "ln":
            return Math.log(this.parseFunctionArgument());
        case "logb": {
            const args = this.parseArguments(2);
            return Math.log(args[1]) / Math.log(args[0]);
        }
        case "\u221a": {
            const value = this.parseFunctionArgument();
            if (value < 0) {
                throw new RangeError("Math ERROR: square root of a negative number");
            }
            return Math.sqrt(value);
        }
        case "\u221b":
            return Math.cbrt(this.parseFunctionArgument());
        case "Abs":
            return Math.abs(this.parseFunctionArgument());
        case "Int":
            return Math.trunc(this.parseFunctionArgument());
        case "Intg":
            return Math.floor(this.parseFunctionArgument());
        case "10^":
            return Math.pow(10, this.parseFunctionArgument());
        case "e^":
            return Math.exp(this.parseFunctionArgument());
        case "Ran#":
            return Math.random();
        case "RanInt": {
            const args = this.parseArguments(2);
            return Math.floor(Math.random() * (args[1] - args[0] + 1)) + args[0];
        }
        case "GCD": {
            const args = this.parseArguments(2);
            return gcd(args[0], args[1]);
        }
        case "LCM": {
            const args = this.parseArguments(2);
            const divisor = gcd(args[0], args[1]);
            return divisor === 0 ? 0 : Math.abs(args[0] * args[1]) / divisor;
        }
        default:
            throw new SyntaxError("Syntax ERROR: unknown token \"" + name + "\"");
        }
    };

    function evaluate(input, context) {
        const settings = context || {};
        const parser = new Parser(tokenize(input), {
            angleMode: settings.angleMode || "DEG",
            answer: settings.answer || 0,
            variables: settings.variables || {}
        });
        const value = parser.parseExpression();
        if (parser.peek()) {
            throw new SyntaxError("Syntax ERROR: unexpected \"" + parser.peek().value + "\"");
        }
        if (!isFinite(value) || isNaN(value)) {
            throw new RangeError("Math ERROR");
        }
        return value;
    }

    return {
        evaluate: evaluate,
        tokenize: tokenize,
        factorial: factorial,
        permutations: permutations,
        combinations: combinations
    };
});
