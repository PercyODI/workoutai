import ky from "ky";

export type MessageProps = {
    messages: {
        content: string;
        role: "system" | "user"
    }[],
    model: string;
    stream: boolean;
    max_tokens: number;
    stop: string[];

}

export class AiClient {
    constructor() {
    }

    chat(props: MessageProps) {

    }
}