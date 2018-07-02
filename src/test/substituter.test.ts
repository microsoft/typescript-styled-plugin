// @ts-check
import { assert } from 'chai';
import 'mocha';
import { getSubstitutions } from '../substituter';

describe('substituter', () => {
    it('should replace property value with x', () => {
        assert.deepEqual(
            performSubstitutions([
                'width: 1px;',
                `color: \${'red'};`,
                'color: red;',
            ].join('\n')),
            [
                'width: 1px;',
                `color: xxxxxxxx;`,
                'color: red;',
            ].join('\n')
        );
    });

    it('should insert whitespace when placeholder is used a entire property', () => {
        assert.deepEqual(
            performSubstitutions([
                'width: 1px;',
                `\${'color: red;'}`,
                'color: red;',
            ].join('\n')),
            [
                'width: 1px;',
                `                `,
                'color: red;',
            ].join('\n')
        );
    });

    it('should insert a false property when placeholder is used a entire property with trailing semi-colon', () => {
        assert.deepEqual(
            performSubstitutions([
                'width: 1px;',
                `\${'color: red'};`,
                'color: red;',
            ].join('\n')),
            [
                'width: 1px;',
                `$a:0           ;`,
                'color: red;',
            ].join('\n')
        );
    });

    it.skip('should replace entire property when placeholder is used in name', () => {
        assert.deepEqual(
            performSubstitutions([
                'width: 1px;',
                `\${123}: 1px;`,
                'color: red;',
            ].join('\n')),
            [
                'width: 1px;',
                `           `,
                'color: red;',
            ].join('\n')
        );
    });
});

function performSubstitutions(value: string) {
    return getSubstitutions(value, getSpans(value));
}

function getSpans(value: string) {
    const spans: Array<{ start: number, end: number }> = [];
    const re = /(\$\{[^}]*\})/g;
    let match: RegExpExecArray | null = re.exec(value);
    while (match) {
        spans.push({ start: match.index, end: match.index + match[0].length });
        match = re.exec(value);
    }
    return spans;
}
