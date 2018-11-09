// @ts-check
const assert = require('chai').assert;
const path = require('path');
const createServer = require('../server-fixture');
const { openMockFile, getFirstResponseOfType } = require('./_helpers');

const mockFileName = path.join(__dirname, '..', 'project-fixture', 'main.ts');

const getSemanticDiagnosticsForFile = (fileContents) => {
    const server = createServer();
    openMockFile(server, mockFileName, fileContents);
    server.sendCommand('semanticDiagnosticsSync', { file: mockFileName });

    return server.close().then(_ => {
        return getFirstResponseOfType('semanticDiagnosticsSync', server);
    });
}

describe('Errors', () => {
    it('should return error for unknown property', async () => {
        const errorResponse = await getSemanticDiagnosticsForFile('function css(x) { return x; }; const q = css`boarder: 1px solid black;`');
        assert.isTrue(errorResponse.success);
        assert.strictEqual(errorResponse.body.length, 1);
        const error = errorResponse.body[0];
        assert.strictEqual(error.text, "Unknown property: 'boarder'");
        assert.strictEqual(error.start.line, 1);
        assert.strictEqual(error.start.offset, 46);
        assert.strictEqual(error.end.line, 1);
        assert.strictEqual(error.end.offset, 53);
    });

    it('should not return errors for empty rulesets', async () => {
        const errorResponse = await getSemanticDiagnosticsForFile('function css(x) { return x; }; const q = css``');
        assert.isTrue(errorResponse.success);
        assert.strictEqual(errorResponse.body.length, 0);
    });

    it('should not return errors for nested rulesets', async () => {
        const errorResponse = await getSemanticDiagnosticsForFile('function css(x) { return x; }; const q = css`&:hover { border: 1px solid black; }`');
        assert.isTrue(errorResponse.success);
        assert.strictEqual(errorResponse.body.length, 0);
    });

    it('should not return an error for a placeholder in a property', async () => {
        const errorResponse = await getSemanticDiagnosticsForFile('function css(strings, ...) { return ""; }; const q = css`color: ${"red"};`');
        assert.isTrue(errorResponse.success);
        assert.strictEqual(errorResponse.body.length, 0);
    });

    it('should not return an error for a placeholder in a property with a multiline string', async () => {
        const errorResponse = await getSemanticDiagnosticsForFile([
            'function css(strings, ...) { return ""; }; const q = css`',
            '    color: ${"red"};',
            '`'
        ].join('\n'));
        assert.isTrue(errorResponse.success);
        assert.strictEqual(errorResponse.body.length, 0);
    });

    it('should return errors when error occurs in last position', async () => {
        const errorResponse = await getSemanticDiagnosticsForFile('function css(strings, ...) { return ""; }; const q = css`;`');
        assert.isTrue(errorResponse.success);
        assert.strictEqual(errorResponse.body.length, 1);
        const error = errorResponse.body[0];
        assert.strictEqual(error.text, '} expected');
        assert.strictEqual(error.start.line, 1);
        assert.strictEqual(error.start.offset, 58);
        assert.strictEqual(error.end.line, 1);
        assert.strictEqual(error.end.offset, 59);
    });

    it('should return error for multiline unknown property #20', async () => {
        const errorResponse = await getSemanticDiagnosticsForFile([
            'function css(x) { return x; };',
            'const q = css`',
            'boarder: 1px solid black;',
            '`'
        ].join('\n'));
        assert.isTrue(errorResponse.success);
        assert.strictEqual(errorResponse.body.length, 1);
        const error = errorResponse.body[0];
        assert.strictEqual(error.text, "Unknown property: 'boarder'");
        assert.strictEqual(error.start.line, 3);
        assert.strictEqual(error.start.offset, 1);
        assert.strictEqual(error.end.line, 3);
        assert.strictEqual(error.end.offset, 8);
    });

    it('should not error with interpolation at start, followed by semicolon #22', async () => {
        const errorResponse = await getSemanticDiagnosticsForFile([
            "function css(...args){}",
            "const mixin = ''",
            // test single-line
            "css`${mixin}; color: blue;`",
            // test multi-line (normal case)
            "css`",
            "  ${mixin};",
            "  color: blue;",
            "`",
            // test multiple spaces after semi
            "css`",
            "  ${mixin}   ;",
            "  color: blue;",
            "`",
            // test hella semis - will this ever pop up? probably not, but screw it
            "css`",
            "  ${mixin};;; ;; ;",
            "  color: blue;",
            "`",
        ].join('\n'));
        assert.isTrue(errorResponse.success);
        assert.strictEqual(errorResponse.body.length, 0);
    });

    it('should not return an error for a placeholder used as a selector (#30)', async () => {
        const errorResponse = await getSemanticDiagnosticsForFile('function css(strings, ...) { return ""; }; const q = css`${"button"} { color: red;  }`');
        assert.isTrue(errorResponse.success);
        assert.strictEqual(errorResponse.body.length, 0);
    });

    it('should not return an error for a placeholder used as a complex selector (#30)', () => {
        return getSemanticDiagnosticsForFile(`
        function css(strings, ...) { return ""; };
        function fullWidth() { };
        const Button = {};
        const q = css\`
            display: flex;
            \${fullWidth()};
        
            \${Button} {
            width: 100%;
            
            &:not(:first-child):not(:last-child) {
                margin-left: 0;
                margin-right: 0;
                border-radius: 0;
            }
            }
        \``
        ).then(errorResponse => {
            assert.isTrue(errorResponse.success);
            assert.strictEqual(errorResponse.body.length, 0);
        });
    });

    it('should not return an error for a placeholder used as selector part (#39)', async () => {
        const errorResponse = await getSemanticDiagnosticsForFile('function css(strings, ...) { return ""; }; const Content = "button"; const q = css`& > ${Content} { margin-left: 1px; }`');
        assert.isTrue(errorResponse.success);
        assert.strictEqual(errorResponse.body.length, 0);
    });

    it('should not return an error for a placeholder in multiple properties (#39)', () => {
        return getSemanticDiagnosticsForFile(
            `function css(strings, ...) { return ""; }; const Content = "button"; const q = css\`
            & > $\{'content'} {
                color: 1px;
            }

            & > $\{'styledNavBar'} {
                margin-left: $\{1};
            }
        \``
        ).then(errorResponse => {
            assert.isTrue(errorResponse.success);
            assert.strictEqual(errorResponse.body.length, 0);
        });
    });

    it('should not return an error for a placeholder that spans multiple lines (#44)', () => {
        return getSemanticDiagnosticsForFile(
            `let css: any = {}; const q = css.a\`
  color:
    $\{'transparent'};
  border-bottom: 1px;
  &:hover {
    color: inherit;
    text-decoration: none;
  }
}
        \``
        ).then(errorResponse => {
            assert.isTrue(errorResponse.success);
            assert.strictEqual(errorResponse.body.length, 0);
        });
    });


    it('should not return an error for complicated style (#44)', () => {
        return getSemanticDiagnosticsForFile(
            `let css: any = {}; const q = css.a\`
  display: flex;
  width: 6rem;
  height: 5rem;
  margin-right: -3px;
  border-right: 3px solid
    $\{({ active, theme: { colors } }) =>
                active ? colors.yellow : 'transparent'};
  border-bottom: 1px solid rgba(255, 255, 255, 0.5);
  font-weight: bold;
  font-size: 0.875rem;
  color: white;
  cursor: pointer;
  &:not([href]):not([tabindex]) {
    color: white;
  }
  &:hover {
    color: inherit;
    text-decoration: none;
  }
\``
        ).then(errorResponse => {
            assert.isTrue(errorResponse.success);
            assert.strictEqual(errorResponse.body.length, 0);
        });
    });

    it('should not return an error for a placeholder value followed by unit (#48)', () => {
        return getSemanticDiagnosticsForFile(
            `function css(strings, ...) { return ""; }; const value = 1; const q = css\`
            width: $\{value}%;
        \``
        ).then(errorResponse => {
            assert.isTrue(errorResponse.success);
            assert.strictEqual(errorResponse.body.length, 0);
        });
    });

    it('should not return an error for a placeholder as the declaration name (#52)', () => {
        return getSemanticDiagnosticsForFile(
            `function css(strings, ...) { return ""; }; const q = css\`
            $\{'width'}: 1px;
        \``
        ).then(errorResponse => {
            assert.isTrue(errorResponse.success);
            assert.strictEqual(errorResponse.body.length, 0);
        });
    });

    it('should not return an error for a placeholder as part of a rule (#59)', () => {
        return getSemanticDiagnosticsForFile(
            `function css(strings, ...) { return ""; }; const q = css\`
                $\{'a'}, \${'button'} {
                    width: 1px;
                }
        \``
        ).then(errorResponse => {
            assert.isTrue(errorResponse.success);
            assert.strictEqual(errorResponse.body.length, 0);
        });
    });

    it('should not return an error placeholder used as entire property within nested (#54)', () => {
        return getSemanticDiagnosticsForFile(
            `function css(strings, ...) { return ""; }; const q = css\`
                &.buu-foo {
                    \${'baseShape'};
                    &.active {
                        font-size: 2rem;
                    }
                }
            \``
        ).then(errorResponse => {
            assert.isTrue(errorResponse.success);
            assert.strictEqual(errorResponse.body.length, 0);
        });
    });

    it('should not return an error on adjacent variables (#62)', () => {
        return getSemanticDiagnosticsForFile(
            `let css: any = {}; const margin1 = "3px"; const margin2 = "3px"; const q = css.a\`
                margin: $\{margin1} $\{margin2};
            \``
        ).then(errorResponse => {
            assert.isTrue(errorResponse.success);
            assert.strictEqual(errorResponse.body.length, 0);
        });
    });

    it('should not return an error for contextual selector (#71)', () => {
        return getSemanticDiagnosticsForFile(
            `let css: any = {}; const q = css.a\`
                html.test & {
                    display: none;
                }
            \``
        ).then(errorResponse => {
            assert.isTrue(errorResponse.success);
            assert.strictEqual(errorResponse.body.length, 0);
        });
    });

    it('should not return an error for placeholder used in contextual selector (#71)', async () => {
        {
            const errorResponse = await getSemanticDiagnosticsForFile(
                `let css: any = {}; let FlipContainer = 'button'; const q = css.a\`
                position: relative;

                $\{FlipContainer}:hover & {
                    transform: rotateY(180deg);
                }
            \``);
            assert.isTrue(errorResponse.success);
            assert.strictEqual(errorResponse.body.length, 0);
        }
        {
            // #67 part 1
            const errorResponse = await getSemanticDiagnosticsForFile(
                `let css: any = {}; let OtherStyledElm = 'button'; const q = css.a\`
                    \${OtherStyledElm}:not([value=""]) + & {
                        transform: rotateY(180deg);
                    }
                \``);
            assert.isTrue(errorResponse.success);
            assert.strictEqual(errorResponse.body.length, 0);
        }
        {
            // #67 part 2
            const errorResponse = await getSemanticDiagnosticsForFile(
                `let css: any = {}; let OtherStyledElm = 'button'; const q = css.a\`
                    \${OtherStyledElm} + &,
                    \${OtherStyledElm}:not([value=""]) + & {
                        transform: rotateY(180deg);
                    }
                \``);
            assert.isTrue(errorResponse.success);
            assert.strictEqual(errorResponse.body.length, 0);
        }
    });

    it('should not return an error for custom function (#21)', async () => {
        const errorResponse = await getSemanticDiagnosticsForFile(
            `function css<T>(): any {}; const q = css<{}>()(window.blur)\`
                display: none;
            \``);
        assert.isTrue(errorResponse.success);
        assert.strictEqual(errorResponse.body.length, 0);
    });

    it('should not return an error for empty sub-rulesets (#50)', async () => {
        const errorResponse = await getSemanticDiagnosticsForFile(
            `let css: any = {}; const q = css.a\`
                :nth-of-type(1) {
                    \${true ? "display: initial" : "display: hidden"}
                }
            \``);
        assert.isTrue(errorResponse.success);
        assert.strictEqual(errorResponse.body.length, 0);
    });

    it('should not return an error (#74)', async () => {
        const errorResponse = await getSemanticDiagnosticsForFile(
            `let css: any = {};
            const ListNoteItem = 'bla';
            const ListNoteTitle = css.span\`
                font-weight: bold;
                color: \${props => props.theme.primaryColor};
                \${ListNoteItem}:hover & {
                    text-decoration: underline;
                }
            \`;`);
        assert.isTrue(errorResponse.success);
        assert.strictEqual(errorResponse.body.length, 0);
    });
});
