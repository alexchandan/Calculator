# Scientific Calculator

A browser scientific calculator modelled on the Casio fx-991EX ClassWiz. Plain
HTML/CSS/JavaScript — open `index.html`, no build step or dependencies.

## Features

- Full expression entry with a movable cursor, `DEL`/`AC`, and auto-closing of
  unbalanced parentheses on `=`
- `SHIFT` key exposing the second function printed above each key
- `DEG` / `RAD` / `GRAD` angle modes
- Trigonometric, inverse trigonometric and hyperbolic functions
- `log`, `ln`, `log_a b`, `10^x`, `e^x`, `√`, `∛`, `x²`, `x³`, `x^y`, `x⁻¹`
- `x!`, `nCr`, `nPr`, `mod`, `Abs`, `Int`, `GCD`, `LCM`, `Ran#`, `RanInt`
- Constants `π` and `e`, scientific notation via `×10^`
- `Ans`, independent memory (`M+`, `M−`, `MC`) and lettered variables via
  `STO` / `RCL`
- Calculation history — press `HIST`, click an entry to reload it
- Keyboard input: digits, `+ - * / ^ ( ) ! % .`, `Enter`, `Backspace`, `Esc`,
  arrow keys, `p` for `π` and `r` for `√`

Expressions are parsed by a recursive-descent parser in `parser.js` (no `eval`),
which handles implicit multiplication (`2π`, `3(4+5)`, `sin30`), right
associative powers, and Casio-style error messages.

## Tests

```bash
node --test tests/
```
