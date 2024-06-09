import { Persona } from "./persona";

type HistoryToStringProps = {
    includeActions: boolean
}
export class ChatHistory {
    public history: {
        speaker: Persona;
        message?: string;
        action?: string
    }[] = []

    addChat(persona: Persona, message?: string, action?: string) {
        this.history.push({
            speaker: persona,
            message: message,
            action: action
        })
    }

    private defaultHistoryToStringProps: HistoryToStringProps = {
        includeActions: true
    }
    historyToString(props?: HistoryToStringProps) {
        const fullProps: HistoryToStringProps = { ...this.defaultHistoryToStringProps, ...props };

        let historyString = ""
        for (const history of this.history) {
            historyString += `${history.speaker.name}: ${history.message}`
        }

        return historyString;
    }
}