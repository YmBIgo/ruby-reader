type Range = {
    start: {
        line: number,
        character: number
    };
    end: {
        line: number,
        character: number
    }
}

export type Symbol = {
    id?: number
    name: string;
    content: string;
    kind: string;
    range: Range;
    parent: string;
    path: string;
}