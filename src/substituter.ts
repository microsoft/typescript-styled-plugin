// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export function getSubstitutions(
    contents: string,
    spans: ReadonlyArray<{ start: number, end: number }>
): string {
    const parts: string[] = [];
    let lastIndex = 0;
    for (const span of spans) {
        const pre = contents.slice(lastIndex, span.start);
        const post = contents.slice(span.end);
        const placeholder = contents.slice(span.start, span.end);

        parts.push(pre);
        parts.push(getSubstitution({ pre, placeholder, post }));
        lastIndex = span.end;
    }
    parts.push(contents.slice(lastIndex));
    return parts.join('');
}

function getSubstitution(
    context: {
        placeholder: string,
        pre: string,
        post: string
    }
): string {
    // Check to see if it's an in-property interplation, or a mixin,
    // and determine which character to use in either case
    // if in-property, replace with "xxxxxx"
    // if a mixin, replace with "      "
    const replacementChar = getReplacementCharacter(context.pre, context.post);
    const result = context.placeholder.replace(/./gm, c => c === '\n' ? '\n' : replacementChar);

    // If followed by a semicolon, we may have to eat the semi colon using a false property
    if (replacementChar === ' ' && context.post.match(/^\s*;/)) {
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
        if (context.pre.match(/(;|^|\})[\s|\n]*$/)) {
            // Mixin, replace with a dummy variable declaration, so scss server doesn't complain about rogue semicolon
            return '$a:0' + result.slice(4);
        }
        return context.placeholder.replace(/./gm, c => c === '\n' ? '\n' : 'x');
    }

    // Placeholder used as property name:
    //
    // styled.x`
    //    ${'color'}: red;
    // `
    //
    // Replace with fake property name
    if (context.post.match(/^\s*:/)) {
        return '$a' + result.slice(2);
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
