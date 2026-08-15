const test = require("node:test");
const assert = require("node:assert");
const { evaluate } = require("../parser.js");

function close(expression, expected, context) {
    assert.ok(
        Math.abs(evaluate(expression, context) - expected) < 1e-9,
        expression + " => " + evaluate(expression, context) + ", expected " + expected
    );
}

test("arithmetic precedence and implicit multiplication", function () {
    close("2+3\u00d74", 14);
    close("3+4\u00d72\u00f7(1-5)^2", 3.5);
    close("3(4+5)", 27);
    close("2\u03c0", 2 * Math.PI);
    close("-2\u00b2", -4);
});

test("powers, roots and postfix operators", function () {
    close("2^10", 1024);
    close("2^3^2", 512);
    close("\u221a9+1", 4);
    close("\u221b(27)", 3);
    close("4\u207b\u00b9", 0.25);
    close("5!", 120);
    close("100\u00d75%", 5);
    close("3\u00d710^2", 300);
});

test("logarithms and exponentials", function () {
    close("log(100)", 2);
    close("ln(e)", 1);
    close("logb(2,8)", 3);
    close("10^(2)", 100);
    close("e^(1)", Math.E);
});

test("trigonometry honours the angle mode", function () {
    close("sin(30)", 0.5, { angleMode: "DEG" });
    close("cos\u207b\u00b9(0.5)", 60, { angleMode: "DEG" });
    close("sin(\u03c0\u00f72)", 1, { angleMode: "RAD" });
    close("sin(100)", 1, { angleMode: "GRAD" });
    close("tanh(1)", Math.tanh(1));
});

test("combinatorics, integer helpers and modulo", function () {
    close("5nCr2", 10);
    close("5nPr2", 20);
    close("10mod3", 1);
    close("GCD(12,18)+LCM(4,6)", 18);
    close("Abs(-3)+Int(2.7)", 5);
});

test("Ans and lettered variables", function () {
    close("Ans+1", 42, { answer: 41 });
    close("A\u00d72", 42, { variables: { A: 21 } });
});

test("invalid input raises calculator errors", function () {
    assert.throws(function () {
        evaluate("1\u00f70");
    }, /division by zero/);
    assert.throws(function () {
        evaluate("\u221a(-4)");
    }, /negative/);
    assert.throws(function () {
        evaluate("2+");
    }, /Syntax ERROR/);
});
