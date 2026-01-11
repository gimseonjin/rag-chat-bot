import { convert } from 'html-to-text';

function htmlToText(html: string): string {
    return convert(html, {
        wordwrap: false,
        selectors: [
            { selector: 'a', options: { ignoreHref: true } },
            { selector: 'img', format: 'skip' },
            { selector: 'script', format: 'skip' },
            { selector: 'style', format: 'skip' }
        ]
    });
}

export default htmlToText;
