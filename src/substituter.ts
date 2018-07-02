// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { LanguageServiceLogger } from './logger';

export function getSubstitutions(
    contents: string,
    spans: ReadonlyArray<{ start: number, end: number }>
): string {
    const parts: string[] = [];
    let lastIndex = 0;
    for (const span of spans) {
        parts.push(contents.slice(lastIndex, span.start));
        parts.push(getSubstitution(contents, span.start, span.end));
        lastIndex = span.end;
    }
    parts.push(contents.slice(lastIndex));
    return parts.join('');
}

export function getSubstitution(
    templateString: string,
    start: number,
    end: number
): string {
    const placeholder = templateString.slice(start, end);

    // check to see if it's an in-property interplation, or a mixin,
    // and determine which character to use in either case
    // if in-property, replace with "xxxxxx"
    // if a mixin, replace with "      "
    const pre = templateString.slice(0, start);
    const post = templateString.slice(end);
    const replacementChar = getReplacementCharacter(pre, post);
    const result = placeholder.replace(/./gm, c => c === '\n' ? '\n' : replacementChar);

    // If followed by a semicolon, we may have to eat the semi colon using a false property
    if (replacementChar === ' ' && post.match(/^\s*;/)) {
        // Handle case where we need to eat the semi colon:
        //
        // styled.x`
        //     ${'color: red'};
        // `
        //
        // vs. the other case where we do not:
        //
        // styled.x`
        //     color: ${'red'};
        // `
        if (pre.match(/(;|^|\})[\s|\n]*$/)) {
            // Mixin, replace with a dummy variable declaration, so scss server doesn't complain about rogue semicolon
            return '$a:0' + result.slice(4); // replace(/./gm, c => c === '\n' ? '\n' : ' ');
        }
        return placeholder.replace(/./gm, c => c === '\n' ? '\n' : 'x');
    }

    return result;
}

function getReplacementCharacter(
    pre: string,
    post: string
) {
    if (pre.match(/(^|\n)\s*$/g)) {
        if (!post.match(/^\s*[\{\:]/)) {  // ${'button'} {
            return ' ';
        }
    }

    // If the placeholder looks like a unit that would not work when replaced with an identifier,
    // try replaceing with a number.
    if (post.match(/^%/)) {
        return '0';
    }

    // Otherwise replace with an identifier
    return 'x';
}
